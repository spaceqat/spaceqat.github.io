-- Run once after 017. Public pages and private drafts are deliberately separate.
begin;
create table public.campus_spaces(
 id uuid primary key default gen_random_uuid(),school_name text not null,
 school_key text not null unique,created_at timestamptz not null default now(),
 check(char_length(btrim(school_name)) between 2 and 160)
);
create table public.campus_space_pages(
 space_id uuid primary key references public.campus_spaces(id),
 draft jsonb not null default '{}',published jsonb,
 revision integer not null default 0,
 state text not null default 'draft' check(state in ('draft','pending','published','changes_requested')),
 feedback text not null default '',updated_at timestamptz not null default now(),
 updated_by uuid references public.member_profiles(id),published_at timestamptz
);
create table public.campus_space_history(
 id bigint generated always as identity primary key,space_id uuid not null references public.campus_spaces(id),
 revision integer not null,action text not null,actor uuid not null references public.member_profiles(id),
 content jsonb not null,note text not null default '',created_at timestamptz not null default now()
);
alter table public.campus_applications add column space_id uuid references public.campus_spaces(id);
alter table public.campus_appointments add column space_id uuid references public.campus_spaces(id);
create index campus_appointment_space on public.campus_appointments(space_id,member_id);
alter table public.campus_spaces enable row level security;
alter table public.campus_space_pages enable row level security;
alter table public.campus_space_history enable row level security;
revoke all on public.campus_spaces,public.campus_space_pages,public.campus_space_history from public,anon,authenticated;
-- All access goes through bounded RPCs; drafts cannot leak via direct table queries.
create function public.campus_ensure_space(school text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;clean text:=btrim(regexp_replace(school,'[[:space:]]+',' ','g'));
begin
 if clean is null or char_length(clean) not between 2 and 160 then raise exception 'Invalid school';end if;
 insert into public.campus_spaces(school_name,school_key) values(clean,lower(clean))
 on conflict(school_key) do update set school_key=excluded.school_key returning id into result;
 insert into public.campus_space_pages(space_id) values(result) on conflict do nothing;
 return result;
end;$$;
-- Membership follows an approved appointment, never a self-edited profile or badge alone.
create function public.campus_attach_space() returns trigger language plpgsql security definer set search_path='' as $$
declare chosen uuid;school text;
begin
 select a.space_id,a.details->>'school' into chosen,school from public.campus_applications a where a.id=new.application_id;
 new.space_id:=coalesce(chosen,public.campus_ensure_space(school));
 update public.campus_applications set space_id=new.space_id where id=new.application_id;
 return new;
end;$$;
create trigger campus_appointment_space before insert on public.campus_appointments for each row execute function public.campus_attach_space();
-- Backfill existing appointments without publishing a campus or copying any private application fields.
do $$ declare a record;chosen uuid;begin
 for a in select i.id,i.application_id,c.details->>'school' school from public.campus_appointments i join public.campus_applications c on c.id=i.application_id loop
  if char_length(btrim(a.school)) between 2 and 160 then
   chosen:=public.campus_ensure_space(a.school);
   update public.campus_appointments set space_id=chosen where id=a.id;
   update public.campus_applications set space_id=chosen where id=a.application_id;
  end if;
 end loop;
end $$;
create function public.campus_review_at_school(application_id uuid,decision text,note text,school_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.community_is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 perform 1 from public.campus_applications a where a.id=application_id and a.status='pending' for update;
 if not found then raise exception 'Application changed';end if;
 if decision='approved' then
  update public.campus_applications a set space_id=public.campus_ensure_space(school_name) where a.id=application_id;
 end if;
 perform public.campus_review(application_id,decision,note);
end;$$;
create function public.campus_can_edit_space(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.community_is_admin() or exists(
  select 1 from public.campus_appointments a where a.space_id=target and a.member_id=auth.uid()
   and a.status='active' and a.starts_at<=now() and a.ends_at>now()
 ));
$$;
create function public.campus_space_directory(search_text text default '',scope text default 'public',page_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if scope is null or scope not in ('public','mine','review') then raise exception 'Invalid scope';end if;
 if scope<>'public' and auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if scope='review' and not public.community_is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 select coalesce(jsonb_agg(row_data order by school_name,id),'[]'::jsonb) into result from (
  select s.id,s.school_name,jsonb_build_object('id',s.id,'school_name',s.school_name,
   'page',case when scope='public' then p.published else coalesce(p.published,p.draft) end,
   'can_edit',public.campus_can_edit_space(s.id),
   'state',case when scope='public' then 'published' else p.state end,
   'active_count',(select count(*) from public.campus_appointments a where a.space_id=s.id and a.status='active' and a.starts_at<=now() and a.ends_at>now())) row_data
  from public.campus_spaces s join public.campus_space_pages p on p.space_id=s.id
  where (scope='public' and p.published is not null or scope='mine' and public.campus_can_edit_space(s.id) or scope='review')
   and strpos(lower(s.school_name),lower(left(coalesce(search_text,''),160)))>0
  order by s.school_name,s.id limit 24 offset greatest(0,least(coalesce(page_offset,0),10000))
 ) x;
 return result;
end;$$;
create function public.campus_space_detail(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;editable boolean:=public.campus_can_edit_space(target);
begin
 select jsonb_build_object('id',s.id,'school_name',s.school_name,'published',p.published,'published_at',p.published_at,
  'can_edit',editable,'is_admin',auth.uid() is not null and public.community_is_admin(),
  'draft',case when editable then p.draft end,'revision',case when editable then p.revision end,
  'state',case when editable then p.state end,'feedback',case when editable then p.feedback end,
  'team',coalesce((select jsonb_agg(jsonb_build_object('id',m.public_id,'name',m.display_name) order by m.display_name,m.public_id)
   from public.campus_appointments a join public.member_profiles m on m.id=a.member_id
   where a.space_id=s.id and a.status='active' and a.starts_at<=now() and a.ends_at>now()),'[]'::jsonb)) into result
 from public.campus_spaces s join public.campus_space_pages p on p.space_id=s.id
 where s.id=target and (p.published is not null or editable);
 return result;
end;$$;
create function public.campus_space_save(target uuid,payload jsonb,expected_revision integer,submit boolean default false)
returns integer language plpgsql security definer set search_path='' as $$
declare p public.campus_space_pages;k text;v jsonb;maxlen integer;
begin
 if not public.campus_can_edit_space(target) then raise exception 'Campus editor required' using errcode='42501';end if;
 if expected_revision is null or submit is null or payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>40000 then raise exception 'Invalid page';end if;
 for k,v in select * from jsonb_each(payload) loop
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
create function public.campus_space_review(target uuid,expected_revision integer,decision text,note text)
returns void language plpgsql security definer set search_path='' as $$
declare p public.campus_space_pages;
begin
 if auth.uid() is null or not public.community_is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if decision is null or decision not in ('publish','return','unpublish') or nullif(btrim(note),'') is null or char_length(note)>2000 then raise exception 'Review note required';end if;
 select * into p from public.campus_space_pages where space_id=target for update;
 if p.space_id is null or expected_revision is distinct from p.revision then raise exception 'Campus page changed' using errcode='40001';end if;
 if decision<>'unpublish' and p.state<>'pending' then raise exception 'No pending version';end if;
 if decision='publish' and (nullif(btrim(p.draft->>'intro'),'') is null or nullif(btrim(p.draft->>'tagline'),'') is null) then raise exception 'Introduction required';end if;
 update public.campus_space_pages set published=case when decision='publish' then draft when decision='unpublish' then null else published end,
 state=case when decision='publish' then 'published' when decision='return' then 'changes_requested' else 'draft' end,
 revision=revision+1,feedback=btrim(note),updated_at=now(),
 published_at=case when decision='publish' then now() when decision='unpublish' then null else published_at end where space_id=target;
 insert into public.campus_space_history(space_id,revision,action,actor,content,note) values(target,p.revision+1,decision,auth.uid(),p.draft,btrim(note));
end;$$;
create function public.campus_space_changes(target uuid,page_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.campus_can_edit_space(target) then raise exception 'Campus editor required' using errcode='42501';end if;
 select coalesce(jsonb_agg(row_data order by id desc),'[]'::jsonb) into result from (
 select h.id,jsonb_build_object('revision',h.revision,'action',h.action,'name',m.display_name,'note',h.note,'created_at',h.created_at) row_data
 from public.campus_space_history h join public.member_profiles m on m.id=h.actor where h.space_id=target
 order by h.id desc limit 20 offset greatest(0,least(coalesce(page_offset,0),10000))) x;return result;
end;$$;
-- Helpers are not directly callable. No client role can assign their own school.
revoke all on function public.campus_ensure_space(text),public.campus_attach_space(),public.campus_review_at_school(uuid,text,text,text),public.campus_can_edit_space(uuid),public.campus_space_directory(text,text,integer),public.campus_space_detail(uuid),public.campus_space_save(uuid,jsonb,integer,boolean),public.campus_space_review(uuid,integer,text,text),public.campus_space_changes(uuid,integer) from public,anon,authenticated;
grant execute on function public.campus_space_directory(text,text,integer),public.campus_space_detail(uuid) to anon,authenticated;
grant execute on function public.campus_review_at_school(uuid,text,text,text),public.campus_space_save(uuid,jsonb,integer,boolean),public.campus_space_review(uuid,integer,text,text),public.campus_space_changes(uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
