-- Requires 012. Public profile IDs are separate from authentication IDs.
begin;
alter table public.member_profiles add column if not exists public_id uuid not null default gen_random_uuid() unique;
create table if not exists public.member_follows(
 follower_id uuid not null references public.member_profiles(id) on delete cascade,
 followed_id uuid not null references public.member_profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower_id,followed_id),check(follower_id<>followed_id)
);
create index if not exists member_follows_followed on public.member_follows(followed_id,created_at desc);
alter table public.member_follows enable row level security;
revoke all on public.member_follows from public,anon,authenticated;

create or replace function public.community_member_profile(member_id uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.public_id,'display_name',m.display_name,'bio',m.bio,
 'is_self',m.id=auth.uid(),
 'following_count',(select count(*) from public.member_follows where follower_id=m.id),
 'follower_count',(select count(*) from public.member_follows where followed_id=m.id),
 'is_following',exists(select 1 from public.member_follows where follower_id=auth.uid() and followed_id=m.id),
 'badges',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name) order by b.sort_order)
 from public.member_badges mb join public.badge_catalog b on b.id=mb.badge_id where mb.user_id=m.id),'[]'::jsonb))
 from public.member_profiles m where auth.uid() is not null
 and ((member_id is null and m.id=auth.uid()) or m.public_id=member_id);
$$;
create or replace function public.set_member_follow(member_id uuid,following boolean) returns boolean
language plpgsql security definer set search_path='' as $$
declare target uuid;actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501';end if;
 select id into target from public.member_profiles where public_id=member_id;
 if target is null or target=actor or following is null then raise exception 'Invalid follow target';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
 if following then insert into public.member_follows(follower_id,followed_id) values(actor,target) on conflict do nothing;
 else delete from public.member_follows where follower_id=actor and followed_id=target;end if;
 return following;
end;
$$;
-- No target-user parameter: only the signed-in member's own connections.
create or replace function public.my_member_connections(connection_kind text,page_offset integer default 0)
returns table(id uuid,display_name text,bio text)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if connection_kind not in ('following','followers') or connection_kind is null then raise exception 'Invalid kind';end if;
 return query select m.public_id,m.display_name,m.bio from public.member_follows f
 join public.member_profiles m on m.id=case when connection_kind='following' then f.followed_id else f.follower_id end
 where case when connection_kind='following' then f.follower_id=auth.uid() else f.followed_id=auth.uid() end
 order by f.created_at desc,m.public_id limit 20 offset greatest(0,least(coalesce(page_offset,0),10000));
end;
$$;
create or replace function public.community_member_posts(member_id uuid,page_offset integer default 0)
returns table(id uuid,title text,body text,category text,published_at timestamptz)
language sql stable security definer set search_path='' as $$
 select p.id,p.title,left(p.body,280),p.category,p.published_at from public.community_posts p
 join public.member_profiles m on m.id=p.author_id where m.public_id=member_id
 and auth.uid() is not null and p.status='published' and p.deleted_at is null
 order by p.published_at desc,p.id limit 20 offset greatest(0,least(coalesce(page_offset,0),10000));
$$;
-- Wrappers preserve existing APIs and expose only a public navigation identifier.
create or replace function public.community_member_feed(page_offset integer default 0) returns setof jsonb
language sql stable security definer set search_path='' as $$
 select to_jsonb(f)||jsonb_build_object('author_profile_id',m.public_id)
 from public.community_feed(page_offset) f join public.community_posts p on p.id=f.id
 join public.member_profiles m on m.id=p.author_id order by f.published_at desc,f.id;
$$;
create or replace function public.community_member_post_detail(thread_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select public.community_post_detail(thread_id)||jsonb_build_object('author_profile_id',m.public_id)
 from public.community_posts p join public.member_profiles m on m.id=p.author_id where p.id=thread_id;
$$;
create or replace function public.community_member_replies(thread_id uuid,page_offset integer default 0) returns setof jsonb
language sql stable security definer set search_path='' as $$
 select to_jsonb(f)||jsonb_build_object('author_profile_id',m.public_id)
 from public.community_thread_replies(thread_id,page_offset) f join public.community_replies r on r.id=f.id
 join public.member_profiles m on m.id=r.author_id order by f.published_at,f.id;
$$;
revoke all on function public.community_member_profile(uuid),public.set_member_follow(uuid,boolean),public.my_member_connections(text,integer),public.community_member_posts(uuid,integer),public.community_member_feed(integer),public.community_member_post_detail(uuid),public.community_member_replies(uuid,integer) from public,anon,authenticated;
grant execute on function public.community_member_profile(uuid),public.set_member_follow(uuid,boolean),public.my_member_connections(text,integer),public.community_member_posts(uuid,integer),public.community_member_feed(integer),public.community_member_post_detail(uuid),public.community_member_replies(uuid,integer) to authenticated;
commit;
