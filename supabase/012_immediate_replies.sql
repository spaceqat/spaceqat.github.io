-- Run after 011. Replies publish immediately; post category rules stay unchanged.
begin;
create or replace function public.submit_community_reply(thread_id uuid,reply_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result uuid;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if reply_body is null or char_length(btrim(reply_body)) not between 1 and 10000 then raise exception 'Invalid reply'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
 perform 1 from public.community_posts where id=thread_id and status='published' and deleted_at is null for share;
 if not found then raise exception 'Published post required' using errcode='42501'; end if;
 if exists(select 1 from public.community_replies where author_id=actor and created_at>now()-interval '30 seconds')
 or (select count(*) from public.community_replies where author_id=actor and created_at>now()-interval '1 hour')>=10 then
 raise exception 'Please wait before replying again' using errcode='P0001'; end if;
 insert into public.community_replies(post_id,author_id,body,status,published_at)
 values(thread_id,actor,btrim(reply_body),'published',now()) returning id into result;
 return result;
end;
$$;
-- Release existing pending replies only on currently visible posts. Never restore
-- rejected replies, removed replies, or replies belonging to removed/private posts.
update public.community_replies r set status='published',published_at=now()
where r.status='pending' and r.deleted_at is null
and exists(select 1 from public.community_posts p where p.id=r.post_id and p.status='published' and p.deleted_at is null);
revoke all on function public.submit_community_reply(uuid,text) from public,anon;
grant execute on function public.submit_community_reply(uuid,text) to authenticated;
commit;
