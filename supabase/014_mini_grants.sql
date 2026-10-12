-- Private applications. Format declarations are verified manually by reviewers.
begin;
create or replace function public.mini_grant_eligible() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.member_badges where user_id=auth.uid() and badge_id in ('L3','L4','L5'));
$$;
create table if not exists public.mini_grant_applications(
 id uuid primary key,applicant_id uuid not null references public.member_profiles(id),
 title text not null check(char_length(btrim(title)) between 3 and 160),
 applicant_name text not null check(char_length(btrim(applicant_name)) between 1 and 80),
 school text not null check(char_length(btrim(school)) between 1 and 160),
 phone text not null check(char_length(btrim(phone)) between 5 and 40),
 contact_email text not null check(char_length(contact_email)<=254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 requested_amount numeric(10,2) not null check(requested_amount>0 and requested_amount<=3000),
 proposal_path text not null unique,
 declared_pages integer not null check(declared_pages between 2 and 4),
 declared_font integer not null check(declared_font in (10,11)),
 status text not null default 'submitted' check(status in ('submitted')),
 created_at timestamptz not null default now()
);
alter table public.mini_grant_applications enable row level security;
revoke all on public.mini_grant_applications from public,anon,authenticated;
grant select on public.mini_grant_applications to authenticated;
drop policy if exists "Private grant applications" on public.mini_grant_applications;
create policy "Private grant applications" on public.mini_grant_applications for select to authenticated
 using(applicant_id=(select auth.uid()) or (select public.community_is_admin()));
create index if not exists mini_grants_applicant on public.mini_grant_applications(applicant_id,created_at desc);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('mini-grant-proposals','mini-grant-proposals',false,10485760,array['application/pdf'])
 on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf'];
drop policy if exists "Eligible proposal upload" on storage.objects;
create policy "Eligible proposal upload" on storage.objects for insert to authenticated with check(
 bucket_id='mini-grant-proposals' and public.mini_grant_eligible()
 and name ~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}[.]pdf$'));
drop policy if exists "Private proposal read" on storage.objects;
create policy "Private proposal read" on storage.objects for select to authenticated using(
 bucket_id='mini-grant-proposals' and (split_part(name,'/',1)=auth.uid()::text or
 (public.community_is_admin() and exists(select 1 from public.mini_grant_applications a where a.proposal_path=name))));
drop policy if exists "Unsubmitted proposal cleanup" on storage.objects;
create policy "Unsubmitted proposal cleanup" on storage.objects for delete to authenticated using(
 bucket_id='mini-grant-proposals' and split_part(name,'/',1)=auth.uid()::text
 and not exists(select 1 from public.mini_grant_applications a where a.proposal_path=name));

create or replace function public.submit_mini_grant(request_id uuid,project_title text,full_name text,school_name text,contact_phone text,email_address text,amount numeric,pages integer,font_size integer,format_confirmed boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();path text;existing_owner uuid;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501';end if;
 if request_id is null then raise exception 'Request ID required';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
 select applicant_id into existing_owner from public.mini_grant_applications where id=request_id;
 if found then if existing_owner<>actor then raise exception 'Not allowed' using errcode='42501';end if;return request_id;end if;
 if not public.mini_grant_eligible() then raise exception 'L3 or above required' using errcode='42501';end if;
 if format_confirmed is distinct from true then raise exception 'Format declaration required';end if;
 if amount is null or amount<=0 or amount>3000 or amount<>round(amount,2) then raise exception 'Amount must be between 0.01 and 3000 CNY with at most two decimals';end if;
 if exists(select 1 from public.mini_grant_applications where applicant_id=actor and created_at>now()-interval '60 seconds')
 or (select count(*) from public.mini_grant_applications where applicant_id=actor and created_at>now()-interval '1 day')>=5 then raise exception 'Please wait before applying again';end if;
 path:=actor::text||'/'||request_id::text||'.pdf';
 if not exists(select 1 from storage.objects where bucket_id='mini-grant-proposals' and name=path
 and metadata->>'mimetype'='application/pdf' and (metadata->>'size')::bigint between 1 and 10485760) then raise exception 'Upload a PDF proposal first';end if;
 insert into public.mini_grant_applications(id,applicant_id,title,applicant_name,school,phone,contact_email,requested_amount,proposal_path,declared_pages,declared_font)
 values(request_id,actor,btrim(project_title),btrim(full_name),btrim(school_name),btrim(contact_phone),btrim(email_address),amount,path,pages,font_size);
 return request_id;
end;
$$;
revoke all on function public.mini_grant_eligible(),public.submit_mini_grant(uuid,text,text,text,text,text,numeric,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.mini_grant_eligible(),public.submit_mini_grant(uuid,text,text,text,text,text,numeric,integer,integer,boolean) to authenticated;
commit;
