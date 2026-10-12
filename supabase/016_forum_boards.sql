-- Requires 013. Optional filter preserves callers that request the whole feed.
begin;
drop function if exists public.community_member_feed(integer);
create or replace function public.community_member_feed(page_offset integer default 0,category_filter text default null) returns setof jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'title',p.title,'body',left(p.body,280),
 'category',p.category,'published_at',p.published_at,'author_name',m.display_name,'author_profile_id',m.public_id,
 'badges',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name) order by b.sort_order)
 from public.member_badges mb join public.badge_catalog b on b.id=mb.badge_id where mb.user_id=p.author_id),'[]'::jsonb))
 from public.community_posts p join public.member_profiles m on m.id=p.author_id
 where auth.uid() is not null and p.status='published' and p.deleted_at is null
 and (category_filter is null or p.category=category_filter)
 order by p.published_at desc,p.id limit 20 offset greatest(0,least(coalesce(page_offset,0),10000));
$$;
revoke all on function public.community_member_feed(integer,text) from public,anon,authenticated;
grant execute on function public.community_member_feed(integer,text) to authenticated;
notify pgrst,'reload schema';
commit;
