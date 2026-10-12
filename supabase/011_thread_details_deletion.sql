-- Requires 004 and 010. Soft deletion: retain evidence, never expose removed content.
begin;
alter table public.community_posts add column if not exists deleted_at timestamptz;
alter table public.community_posts add column if not exists deleted_by uuid references public.member_profiles(id);
alter table public.community_replies add column if not exists deleted_at timestamptz;
alter table public.community_replies add column if not exists deleted_by uuid references public.member_profiles(id);
drop policy if exists "Authors and reviewers see submissions" on public.community_posts;
create policy "Authors and reviewers see submissions" on public.community_posts for select to authenticated
 using(deleted_at is null and (author_id=(select auth.uid()) or (select public.community_can_review())));
drop policy if exists "Own replies and review queue" on public.community_replies;
create policy "Own replies and review queue" on public.community_replies for select to authenticated
 using(deleted_at is null and (author_id=(select auth.uid()) or (select public.community_can_review())));

create or replace function public.community_feed(page_offset integer default 0)
returns table(id uuid,title text,body text,category text,published_at timestamptz,author_name text,badges jsonb)
language sql stable security definer set search_path='' as $$
 select p.id,p.title,left(p.body,280),p.category,p.published_at,m.display_name,
 coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name) order by b.sort_order)
 from public.member_badges mb join public.badge_catalog b on b.id=mb.badge_id where mb.user_id=p.author_id),'[]'::jsonb)
 from public.community_posts p join public.member_profiles m on m.id=p.author_id
 where p.status='published' and p.deleted_at is null and auth.uid() is not null
 order by p.published_at desc,p.id limit 20 offset greatest(0,least(coalesce(page_offset,0),10000));
$$;

create or replace function public.community_post_detail(thread_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'title',p.title,'body',p.body,'category',p.category,'status',p.status,
 'created_at',p.created_at,'published_at',p.published_at,'author_name',m.display_name,
 'can_delete',p.author_id=auth.uid() or public.community_is_admin(),'can_reply',p.status='published',
 'badges',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name) order by b.sort_order)
 from public.member_badges mb join public.badge_catalog b on b.id=mb.badge_id where mb.user_id=p.author_id),'[]'::jsonb))
 from public.community_posts p join public.member_profiles m on m.id=p.author_id
 where p.id=thread_id and p.deleted_at is null and auth.uid() is not null
 and (p.status='published' or p.author_id=auth.uid() or public.community_can_review());
$$;

create or replace function public.community_replies(thread_id uuid,page_offset integer default 0)
returns table(id uuid,body text,published_at timestamptz,author_name text,badges jsonb)
language sql stable security definer set search_path='' as $$
 select r.id,r.body,r.published_at,m.display_name,
 coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name) order by b.sort_order)
 from public.member_badges mb join public.badge_catalog b on b.id=mb.badge_id where mb.user_id=r.author_id),'[]'::jsonb)
 from public.community_replies r join public.member_profiles m on m.id=r.author_id join public.community_posts p on p.id=r.post_id
 where r.post_id=thread_id and r.status='published' and p.status='published' and r.deleted_at is null and p.deleted_at is null and auth.uid() is not null
 order by r.published_at,r.id limit 20 offset greatest(0,least(coalesce(page_offset,0),10000));
$$;

create or replace function public.community_thread_replies(thread_id uuid,page_offset integer default 0)
returns table(id uuid,body text,published_at timestamptz,author_name text,badges jsonb,can_delete boolean)
language sql stable security definer set search_path='' as $$
 select f.*,r.author_id=auth.uid() from public.community_replies(thread_id,page_offset) f join public.community_replies r on r.id=f.id order by f.published_at,f.id;
$$;

create or replace function public.community_reply_submissions(review_queue boolean default false)
returns table(id uuid,post_id uuid,post_title text,body text,status text,created_at timestamptz,review_note text,author_name text,badges jsonb,is_own boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if review_queue and not public.community_can_review() then raise exception 'Reviewer access required' using errcode='42501'; end if;
 return query select r.id,r.post_id,p.title,r.body,r.status,r.created_at,r.review_note,m.display_name,
 coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name) order by b.sort_order)
 from public.member_badges mb join public.badge_catalog b on b.id=mb.badge_id where mb.user_id=r.author_id),'[]'::jsonb),r.author_id=auth.uid()
 from public.community_replies r join public.community_posts p on p.id=r.post_id join public.member_profiles m on m.id=r.author_id
 where r.deleted_at is null and p.deleted_at is null and ((coalesce(review_queue,false) and r.status='pending') or (not coalesce(review_queue,false) and r.author_id=auth.uid()))
 order by r.created_at desc,r.id limit 100;
end;
$$;

create or replace function public.delete_community_post(thread_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare target public.community_posts; actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into target from public.community_posts where id=thread_id for update;
 if not found or (target.author_id<>actor and not public.community_is_admin()) then raise exception 'Not allowed' using errcode='42501'; end if;
 if target.deleted_at is not null then return; end if;
 update public.community_posts set deleted_at=now(),deleted_by=actor where id=thread_id;
 insert into public.community_audit(actor_id,action,subject,detail) values(actor,'delete_post',thread_id::text,jsonb_build_object('soft_delete',true));
end;
$$;
create or replace function public.delete_community_reply(reply_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare target public.community_replies; actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into target from public.community_replies where id=reply_id for update;
 if not found or target.author_id<>actor then raise exception 'Only the reply author can delete' using errcode='42501'; end if;
 if target.deleted_at is not null then return; end if;
 update public.community_replies set deleted_at=now(),deleted_by=actor where id=reply_id;
 insert into public.community_audit(actor_id,action,subject,detail) values(actor,'delete_reply',reply_id::text,jsonb_build_object('soft_delete',true));
end;
$$;

-- Guard existing submit/review RPCs too: old clients cannot resurrect removed content.
create or replace function public.guard_removed_community_content() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and old.deleted_at is not null and (new.status is distinct from old.status or new.deleted_at is null) then raise exception 'Content was removed'; end if;
 if TG_TABLE_NAME='community_replies' and (TG_OP='INSERT' or new.status is distinct from old.status) then
   perform 1 from public.community_posts where id=new.post_id and deleted_at is null and status='published' for share;
   if not found then raise exception 'Published post required' using errcode='42501'; end if;
 end if;
 return new;
end;
$$;
drop trigger if exists guard_removed_post on public.community_posts;
create trigger guard_removed_post before update on public.community_posts for each row execute function public.guard_removed_community_content();
drop trigger if exists guard_removed_reply on public.community_replies;
create trigger guard_removed_reply before insert or update on public.community_replies for each row execute function public.guard_removed_community_content();
revoke all on function public.guard_removed_community_content() from public,anon,authenticated;
revoke all on function public.community_post_detail(uuid),public.community_thread_replies(uuid,integer),public.delete_community_post(uuid),public.delete_community_reply(uuid) from public,anon,authenticated;
grant execute on function public.community_post_detail(uuid),public.community_thread_replies(uuid,integer),public.delete_community_post(uuid),public.delete_community_reply(uuid) to authenticated;
commit;
