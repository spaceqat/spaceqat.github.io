-- Run once AFTER 019. Private campus media; only approved snapshots are public.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('campus-media','campus-media',false,2097152,array['image/webp']);

create function public.campus_media_access(object_name text,writing boolean default false)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare target uuid;
begin
 if object_name is null or object_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$' then return false;end if;
 target:=split_part(object_name,'/',1)::uuid;
 if public.campus_can_edit_space(target) then return true;end if;
 if writing is distinct from false then return false;end if;
 return exists(select 1 from public.campus_space_pages p where p.space_id=target and (
  p.published->'design'->'cover'->>'path'=object_name or exists(
   select 1 from jsonb_array_elements(coalesce(p.published->'design'->'gallery','[]')) image where image->>'path'=object_name)));
end;$$;
revoke all on function public.campus_media_access(text,boolean) from public,anon,authenticated;
grant execute on function public.campus_media_access(text,boolean) to anon,authenticated;
create policy campus_media_read on storage.objects for select to anon,authenticated
 using(bucket_id='campus-media' and public.campus_media_access(name,false));
create policy campus_media_insert on storage.objects for insert to authenticated
 with check(bucket_id='campus-media' and public.campus_media_access(name,true));
-- No UPDATE/DELETE policy: an approved file cannot be overwritten or removed by an editor.
-- Removing a photo from a draft changes only the next reviewed snapshot.

create function public.campus_validate_design(target uuid,d jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb;k text;seen text[]:='{}';path text;
begin
 if d is null then return;end if;
 if jsonb_typeof(d)<>'object' then raise exception 'Invalid campus design';end if;
 for k in select jsonb_object_keys(d) loop
  if k not in ('cover','gallery','modules','cover_style','title_style') then raise exception 'Unknown design field';end if;
 end loop;
 if coalesce(d->>'cover_style','editorial') not in ('editorial','postcard') or coalesce(d->>'title_style','sans') not in ('sans','serif') then raise exception 'Invalid style';end if;
 if d ? 'gallery' and (jsonb_typeof(d->'gallery')<>'array') then raise exception 'Invalid gallery';end if;
 if jsonb_array_length(coalesce(d->'gallery','[]'))>8 then raise exception 'Maximum 8 gallery images';end if;
 if d ? 'modules' then
  if jsonb_typeof(d->'modules')<>'array' then raise exception 'Invalid modules';end if;
  if jsonb_array_length(d->'modules')<>4 then raise exception 'Four modules required';end if;
  for item in select * from jsonb_array_elements(d->'modules') loop
   if jsonb_typeof(item)<>'object' then raise exception 'Invalid module';end if;
   if (item - array['id','visible'])<>'{}'::jsonb or (item->>'id') is null or item->>'id' not in ('intro','news','resources','gallery') or jsonb_typeof(item->'visible') is distinct from 'boolean' or item->>'id'=any(seen) then raise exception 'Invalid module';end if;
   seen:=array_append(seen,item->>'id');
  end loop;
 end if;
 for item in select * from jsonb_array_elements(coalesce(d->'gallery','[]') || case when d ? 'cover' then jsonb_build_array(d->'cover') else '[]'::jsonb end) loop
  if jsonb_typeof(item)<>'object' then raise exception 'Invalid image';end if;
  if (item - array['path','caption','x','y'])<>'{}'::jsonb then raise exception 'Invalid image field';end if;
  path:=item->>'path';
  if path is null or split_part(path,'/',1)<>target::text or not public.campus_media_access(path,true) then raise exception 'Invalid campus image';end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='campus-media' and o.name=path) then raise exception 'Upload image first';end if;
  if item ? 'caption' and (jsonb_typeof(item->'caption')<>'string' or char_length(item->>'caption')>160) then raise exception 'Invalid image caption';end if;
  foreach k in array array['x','y'] loop
   if item ? k then
    if jsonb_typeof(item->k)<>'number' then raise exception 'Invalid crop position';end if;
    if (item->>k)::numeric not between 0 and 100 then raise exception 'Invalid crop position';end if;
   end if;
  end loop;
 end loop;
end;$$;
revoke all on function public.campus_validate_design(uuid,jsonb) from public,anon,authenticated;

create or replace function public.campus_space_save(target uuid,payload jsonb,expected_revision integer,submit boolean default false)
returns integer language plpgsql security definer set search_path='' as $$
declare p public.campus_space_pages;k text;v jsonb;maxlen integer;
begin
 if not public.campus_can_edit_space(target) then raise exception 'Campus editor required' using errcode='42501';end if;
 if expected_revision is null or submit is null or payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>60000 then raise exception 'Invalid page';end if;
 for k,v in select * from jsonb_each(payload) loop
  if k='design' then perform public.campus_validate_design(target,v);continue;end if;
  maxlen:=case k when 'tagline' then 100 when 'city' then 80 when 'topics' then 200 when 'intro' then 3000 when 'join_text' then 1500 when 'news' then 4000 when 'resources' then 2500 when 'theme' then 10 else null end;
  if maxlen is null or jsonb_typeof(v)<>'string' or char_length(v#>>'{}')>maxlen then raise exception 'Invalid page field';end if;
 end loop;
 if coalesce(payload->>'theme','sage') not in ('sage','sky','apricot') then raise exception 'Invalid theme';end if;
 if submit and (nullif(btrim(payload->>'intro'),'') is null or nullif(btrim(payload->>'tagline'),'') is null) then raise exception 'Introduction required';end if;
 select * into p from public.campus_space_pages where space_id=target for update;
 if p.space_id is null or p.revision<>expected_revision then raise exception 'Campus page changed' using errcode='40001';end if;
 update public.campus_space_pages set draft=payload,revision=revision+1,state=case when submit then 'pending' else 'draft' end,
 feedback='',updated_at=now(),updated_by=auth.uid() where space_id=target;
 insert into public.campus_space_history(space_id,revision,action,actor,content) values(target,p.revision+1,case when submit then 'submit' else 'save' end,auth.uid(),payload);
 return p.revision+1;
end;$$;
notify pgrst,'reload schema';
commit;
