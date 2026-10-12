-- Replies share existing forum review permissions. Run after 002 (and current migrations).
begin;
create table if not exists public.community_replies (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.community_posts(id) on delete cascade,
 author_id uuid not null references public.member_profiles(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 10000),
 status text not null default 'pending' check(status in ('pending','published','rejected')),
 created_at timestamptz not null default now(), published_at timestamptz,
 reviewed_by uuid references public.member_profiles(id),
 review_note text not null default '' check(char_length(review_note)<=1000)
);
create index if not exists community_replies_thread on public.community_replies(post_id,status,published_at,id);
create index if not exists community_replies_author on public.community_replies(author_id,created_at desc);
alter table public.community_replies enable row level security;
revoke all on public.community_replies from public,anon,authenticated;
grant select on public.community_replies to authenticated;
drop policy if exists "Own replies and review queue" on public.community_replies;
create policy "Own replies and review queue" on public.community_replies for select to authenticated
 using(author_id=(select auth.uid()) or (select public.community_can_review()));

create or replace function public.community_replies(thread_id uuid,page_offset integer default 0)
returns table(id uuid,body text,published_at timestamptz,author_name text,badges jsonb)
language sql stable security definer set search_path='' as $$
 select r.id,r.body,r.published_at,m.display_name,
 coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name) order by b.sort_order)
 from public.member_badges mb join public.badge_catalog b on b.id=mb.badge_id where mb.user_id=r.author_id),'[]'::jsonb)
 from public.community_replies r join public.member_profiles m on m.id=r.author_id
 join public.community_posts p on p.id=r.post_id
 where r.post_id=thread_id and r.status='published' and p.status='published' and auth.uid() is not null
 order by r.published_at,r.id limit 20 offset greatest(0,least(coalesce(page_offset,0),10000));
$$;

create or replace function public.submit_community_reply(thread_id uuid,reply_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result uuid;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if reply_body is null or char_length(btrim(reply_body)) not between 1 and 10000 then raise exception 'Invalid reply'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
 perform 1 from public.community_posts where id=thread_id and status='published' for share;
 if not found then raise exception 'Published post required' using errcode='42501'; end if;
 if exists(select 1 from public.community_replies where author_id=actor and created_at>now()-interval '30 seconds')
 or (select count(*) from public.community_replies where author_id=actor and created_at>now()-interval '1 hour')>=10 then
 raise exception 'Please wait before replying again' using errcode='P0001'; end if;
 insert into public.community_replies(post_id,author_id,body) values(thread_id,actor,btrim(reply_body)) returning id into result;
 return result;
end;
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
 where (coalesce(review_queue,false) and r.status='pending') or (not coalesce(review_queue,false) and r.author_id=auth.uid())
 order by r.created_at desc,r.id limit 100;
end;
$$;

create or replace function public.review_community_reply(reply_id uuid,decision text,note text default '')
returns void language plpgsql security definer set search_path='' as $$
declare target public.community_replies; actor uuid:=auth.uid();
begin
 if actor is null or not public.community_can_review() then raise exception 'Reviewer access required' using errcode='42501'; end if;
 if decision is null or decision not in ('published','rejected') then raise exception 'Invalid decision'; end if;
 if char_length(coalesce(note,''))>1000 then raise exception 'Note too long'; end if;
 if decision='rejected' and coalesce(char_length(btrim(note)),0)=0 then raise exception 'Rejection reason required'; end if;
 select * into target from public.community_replies where id=reply_id for update;
 if not found or target.status<>'pending' then raise exception 'Reply is no longer pending'; end if;
 if target.author_id=actor then raise exception 'Cannot review own reply' using errcode='42501'; end if;
 if decision='published' and not exists(select 1 from public.community_posts where id=target.post_id and status='published') then raise exception 'Post is not published'; end if;
 update public.community_replies set status=decision,reviewed_by=actor,review_note=coalesce(note,''),
 published_at=case when decision='published' then now() else null end where id=reply_id;
end;
$$;
revoke all on function public.community_replies(uuid,integer),public.submit_community_reply(uuid,text),public.community_reply_submissions(boolean),public.review_community_reply(uuid,text,text) from public,anon,authenticated;
grant execute on function public.community_replies(uuid,integer),public.submit_community_reply(uuid,text),public.community_reply_submissions(boolean),public.review_community_reply(uuid,text,text) to authenticated;
commit;
