-- Run AFTER 002_community.sql in Supabase SQL Editor. Safe to rerun.
-- Applies to new posts. Existing pending submissions keep their review status.
begin;

insert into public.badge_catalog(id,name,category,description,sort_order) values
('committee_member','委员单位成员','认证身份','提交所属委员单位及任职证明，经社区管理员审核后授予。成员身份不含活动提交权限。',210),
('committee_representative','委员单位代表','认证身份','提交委员单位授权及代表任职证明，经社区管理员审核后授予。可提交活动及 host/cohost/sponsor 申请，仍须审核。',211),
('partner_member','共建单位成员','认证身份','提交所属共建单位及任职证明，经社区管理员审核后授予。成员身份不含活动提交权限。',212),
('partner_representative','共建单位代表','认证身份','提交共建单位授权及代表任职证明，经社区管理员审核后授予。可提交活动及 host/cohost/sponsor 申请，仍须审核。',213)
on conflict(id) do update set name=excluded.name,category=excluded.category,description=excluded.description,sort_order=excluded.sort_order;
alter table public.community_posts drop constraint if exists community_posts_category_check;
alter table public.community_posts add constraint community_posts_category_check check(category in ('help','fatqat','campus','knowledge','community','event'));
create or replace function public.community_can_submit_event() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.member_badges where user_id=auth.uid() and badge_id in ('committee_representative','partner_representative'));
$$;
revoke all on function public.community_can_submit_event() from public,anon;
grant execute on function public.community_can_submit_event() to authenticated;

create or replace function public.submit_community_post(post_title text,post_body text,post_category text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result uuid; needs_review boolean;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if post_category is null or post_category not in ('help','fatqat','campus','knowledge','community','event') then
    raise exception 'Invalid category' using errcode='22023';
  end if;
  if post_category='event' and not public.community_can_submit_event() then raise exception 'Verified representative required' using errcode='42501'; end if;
  needs_review:=post_category in ('knowledge','community','event');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
  if exists(select 1 from public.community_posts where author_id=actor and created_at>now()-interval '30 seconds')
    or (select count(*) from public.community_posts where author_id=actor and created_at>now()-interval '1 hour')>=5 then
    raise exception 'Please wait before submitting again' using errcode='P0001';
  end if;
  insert into public.community_posts(author_id,title,body,category,status,published_at)
    values(actor,btrim(post_title),btrim(post_body),post_category,
      case when needs_review then 'pending' else 'published' end,
      case when needs_review then null else now() end) returning id into result;
  return result;
end;
$$;
revoke all on function public.submit_community_post(text,text,text) from public,anon;
grant execute on function public.submit_community_post(text,text,text) to authenticated;
create or replace function public.submit_community_event(post_title text,post_body text,event_role text) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if event_role is null or event_role not in ('organize','host','cohost','sponsor') then raise exception 'Invalid event role' using errcode='22023'; end if;
 if coalesce(char_length(btrim(post_body)),0) not between 10 and 19000 then raise exception 'Invalid event description' using errcode='22023'; end if;
 return public.submit_community_post(post_title,'[活动申请 / Event request: '||event_role||']'||chr(10)||post_body,'event');
end;
$$;
revoke all on function public.submit_community_event(text,text,text) from public,anon;
grant execute on function public.submit_community_event(text,text,text) to authenticated;
commit;
