-- Run AFTER 002_community.sql in Supabase SQL Editor. Safe to rerun.
-- Applies to new posts. Existing pending submissions keep their review status.
begin;
create or replace function public.submit_community_post(post_title text,post_body text,post_category text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result uuid; needs_review boolean;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if post_category is null or post_category not in ('help','fatqat','campus','knowledge','community') then
    raise exception 'Invalid category' using errcode='22023';
  end if;
  needs_review:=post_category in ('knowledge','community');
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
commit;
