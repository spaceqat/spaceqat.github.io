-- Public avatar images only; never store private documents in this bucket.
begin;
alter table public.member_profiles add column if not exists avatar_path text;
alter table public.member_profiles drop constraint if exists member_avatar_path;
alter table public.member_profiles add constraint member_avatar_path check(avatar_path is null or avatar_path ~ ('^'||public_id::text||'/[0-9a-f-]{36}[.]webp$'));
grant update(avatar_path) on public.member_profiles to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('member-avatars','member-avatars',true,2097152,array['image/webp'])
on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/webp'];
drop policy if exists "Upload own avatar" on storage.objects;
create policy "Upload own avatar" on storage.objects for insert to authenticated with check(
 bucket_id='member-avatars' and exists(select 1 from public.member_profiles m where m.id=auth.uid()
 and name ~ ('^'||m.public_id::text||'/[0-9a-f-]{36}[.]webp$')));
drop policy if exists "Remove own avatar" on storage.objects;
create policy "Remove own avatar" on storage.objects for delete to authenticated using(
 bucket_id='member-avatars' and exists(select 1 from public.member_profiles m where m.id=auth.uid() and split_part(name,'/',1)=m.public_id::text));
drop policy if exists "Read own avatar objects" on storage.objects;
create policy "Read own avatar objects" on storage.objects for select to authenticated using(
 bucket_id='member-avatars' and exists(select 1 from public.member_profiles m where m.id=auth.uid() and split_part(name,'/',1)=m.public_id::text));
-- Batch lookup exposes no email, auth IDs, or private profile fields.
create or replace function public.community_avatar_paths(member_ids uuid[]) returns table(id uuid,avatar_path text)
language sql stable security definer set search_path='' as $$
 select m.public_id,m.avatar_path from public.member_profiles m
 where auth.uid() is not null and m.public_id=any(member_ids[1:100]);
$$;
revoke all on function public.community_avatar_paths(uuid[]) from public,anon,authenticated;
grant execute on function public.community_avatar_paths(uuid[]) to authenticated;
commit;
