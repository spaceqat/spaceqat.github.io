-- New migration; replaces the UNDEPLOYED draft. Requires 013. Enrollment starts closed.
begin;
create table public.campus_policies(
 id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),
 operator_name text not null,contact text not null,audience text not null,min_age integer not null check(min_age between 18 and 100),
 term_months integer not null check(term_months between 1 and 60),activity_rule text not null,retention_rule text not null,
 code_text text not null,privacy_text text not null,published_by uuid not null references public.member_profiles(id),
 check(least(char_length(btrim(operator_name)),char_length(btrim(contact)),char_length(btrim(audience)),char_length(btrim(activity_rule)),char_length(btrim(retention_rule)))>0),
 check(char_length(code_text) between 100 and 30000 and char_length(privacy_text) between 100 and 30000)
);
create table public.campus_settings(id boolean primary key default true check(id),policy_id uuid references public.campus_policies(id),enrollment_open boolean not null default false);
insert into public.campus_settings(id) values(true);
create table public.campus_applications(
 id uuid primary key,applicant_id uuid not null references public.member_profiles(id),details jsonb not null default '{}',
 status text not null default 'draft' check(status in ('draft','pending','needs_info','approved','rejected','withdrawn')),
 revision integer not null default 0,draft_policy_id uuid references public.campus_policies(id),draft_privacy_snapshot text,privacy_confirmed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 review_note text not null default '',reviewed_by uuid references public.member_profiles(id),reviewed_at timestamptz
);
create unique index campus_open_application on public.campus_applications(applicant_id) where status in ('draft','pending','needs_info');
create table public.campus_confirmations(
 id uuid primary key,application_id uuid not null references public.campus_applications(id),revision integer not null,
 policy_id uuid not null references public.campus_policies(id),details_snapshot jsonb not null,
 code_snapshot text not null,privacy_snapshot text not null,confirmed_at timestamptz not null default now(),unique(application_id,revision)
);
create table public.campus_appointments(
 id uuid primary key default gen_random_uuid(),application_id uuid not null unique references public.campus_applications(id),
 member_id uuid not null references public.member_profiles(id),starts_at timestamptz not null default now(),ends_at timestamptz not null,
 status text not null default 'active' check(status in ('active','paused','exited','revoked')),
 reason text not null default '',notice text not null,created_by uuid not null references public.member_profiles(id)
);
create unique index campus_one_identity on public.campus_appointments(member_id) where status in ('active','paused');
create table public.campus_requests(
 id uuid primary key,member_id uuid not null references public.member_profiles(id),appointment_id uuid references public.campus_appointments(id),
 kind text not null check(kind in ('support','restore','renew','correction','deletion','appeal')),
 body text not null check(char_length(btrim(body)) between 5 and 4000),status text not null default 'pending' check(status in ('pending','handled')),
 response text not null default '',created_at timestamptz not null default now(),handled_by uuid references public.member_profiles(id)
);
create table public.campus_audit(id bigint generated always as identity primary key,actor uuid not null,application_id uuid,action text not null,note text not null default '',created_at timestamptz not null default now());
alter table public.campus_policies enable row level security;
alter table public.campus_settings enable row level security;
alter table public.campus_applications enable row level security;
alter table public.campus_confirmations enable row level security;
alter table public.campus_appointments enable row level security;
alter table public.campus_requests enable row level security;
alter table public.campus_audit enable row level security;
revoke all on public.campus_policies,public.campus_settings,public.campus_applications,public.campus_confirmations,public.campus_appointments,public.campus_requests,public.campus_audit from public,anon,authenticated;
grant select on public.campus_policies,public.campus_settings,public.campus_applications,public.campus_confirmations,public.campus_appointments,public.campus_requests,public.campus_audit to authenticated;
create policy campus_policy_read on public.campus_policies for select to authenticated using(true);
create policy campus_settings_read on public.campus_settings for select to authenticated using(true);
create policy campus_application_read on public.campus_applications for select to authenticated using(applicant_id=auth.uid() or public.community_is_admin());
create policy campus_confirmation_read on public.campus_confirmations for select to authenticated using(exists(select 1 from public.campus_applications a where a.id=application_id and (a.applicant_id=auth.uid() or public.community_is_admin())));
create policy campus_appointment_read on public.campus_appointments for select to authenticated using(member_id=auth.uid() or public.community_is_admin());
create policy campus_request_read on public.campus_requests for select to authenticated using(member_id=auth.uid() or public.community_is_admin());
create policy campus_audit_read on public.campus_audit for select to authenticated using(public.community_is_admin());

create function public.campus_publish_policy(config jsonb,open_enrollment boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null or not public.community_is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if config->>'reviewed' is distinct from 'true' or config->>'privacy' ~ '待填|待运营' or octet_length(config::text)>100000 then raise exception 'Operator review required';end if;
 insert into public.campus_policies(operator_name,contact,audience,min_age,term_months,activity_rule,retention_rule,code_text,privacy_text,published_by)
 values(config->>'operator',config->>'contact',config->>'audience',(config->>'min_age')::integer,(config->>'term_months')::integer,config->>'activity',config->>'retention',config->>'code',config->>'privacy',auth.uid()) returning id into result;
 update public.campus_settings set policy_id=result,enrollment_open=coalesce(open_enrollment,false) where id;
 insert into public.campus_audit(actor,action) values(auth.uid(),'publish_policy');return result;
end;$$;
create function public.campus_close_enrollment() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.community_is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 update public.campus_settings set enrollment_open=false where id;
end;$$;
create function public.campus_save_application(application_id uuid,payload jsonb,policy_version uuid,privacy_accepted boolean,code_accepted boolean,submit boolean,expected_revision integer,request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();a public.campus_applications;p public.campus_policies;k text;v jsonb;receipt uuid;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
 if submit and request_id is not null then
 select c.application_id into receipt from public.campus_confirmations c join public.campus_applications x on x.id=c.application_id where c.id=request_id and x.applicant_id=actor;
 if found then return receipt;end if;
 end if;
 select cp.* into p from public.campus_settings s join public.campus_policies cp on cp.id=s.policy_id where s.id and s.enrollment_open;
 if p.id is null or policy_version is distinct from p.id then raise exception 'Enrollment closed or policy changed';end if;
 if privacy_accepted is distinct from true then raise exception 'Privacy acknowledgement required before saving';end if;
 if application_id is null or expected_revision is null or submit is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>30000 then raise exception 'Invalid application';end if;
 for k,v in select * from jsonb_each(payload) loop
 if k not in ('name','age','gender','school','department','major','degree','grade','graduation','email','contact','lab','interests','papers','code','events','bio','motivation','first_action','directions','hours','peers','support','opportunity','signature') or jsonb_typeof(v)<>'string' or char_length(v#>>'{}')>2000 then raise exception 'Invalid field';end if;
 end loop;
 if coalesce(payload->>'age','') !~ '^[0-9]{1,3}$' then raise exception 'Age required';end if;
 if (payload->>'age')::integer<p.min_age or (payload->>'age')::integer>100 then raise exception 'Outside supported age range';end if;
 if submit then
 if code_accepted is distinct from true or request_id is null then raise exception 'Both confirmations required';end if;
 foreach k in array array['name','school','department','major','degree','grade','graduation','email','interests','motivation','first_action','directions','hours','signature'] loop
 if nullif(btrim(payload->>k),'') is null then raise exception 'Required field: %',k;end if;
 end loop;
 if payload->>'signature' is distinct from payload->>'name' then raise exception 'Signature mismatch';end if;
 if char_length(payload->>'name')>80 or char_length(payload->>'bio')>500 or char_length(payload->>'email')>254 or payload->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Invalid personal details';end if;
 if payload->>'degree' not in ('undergraduate','masters','phd','other') or coalesce(payload->>'gender','undisclosed') not in ('female','male','other','undisclosed') or coalesce(payload->>'opportunity','') not in ('','yes','no') then raise exception 'Invalid selection';end if;
 if payload->>'graduation' !~ '^[0-9]{4}$' or payload->>'hours' !~ '^[0-9]{1,3}$' then raise exception 'Invalid year or hours';end if;
 if (payload->>'hours')::integer>744 or (payload->>'graduation')::integer<extract(year from now()) or (payload->>'graduation')::integer>extract(year from now())+20 then raise exception 'Invalid year or hours';end if;
 end if;
 select * into a from public.campus_applications where id=application_id for update;
 if found then
 if a.applicant_id<>actor or a.status not in ('draft','needs_info') or a.revision<>expected_revision then raise exception 'Application changed or locked';end if;
 else
 if (select count(*) from public.campus_applications where applicant_id=actor and created_at>now()-interval '1 day')>=5 then raise exception 'Please wait before applying again';end if;
 if expected_revision<>0 or exists(select 1 from public.campus_appointments where member_id=actor and status in ('active','paused') and ends_at>now()) then raise exception 'Existing appointment';end if;
 insert into public.campus_applications(id,applicant_id) values(application_id,actor) returning * into a;
 end if;
 update public.campus_applications set details=payload,revision=revision+1,draft_policy_id=p.id,draft_privacy_snapshot=p.privacy_text,privacy_confirmed_at=now(),status=case when submit then 'pending' else a.status end,updated_at=now() where id=a.id;
 if submit then insert into public.campus_confirmations(id,application_id,revision,policy_id,details_snapshot,code_snapshot,privacy_snapshot)
 values(request_id,a.id,a.revision+1,p.id,payload,p.code_text,p.privacy_text);end if;
 insert into public.campus_audit(actor,application_id,action) values(actor,a.id,case when submit then 'submit' else 'save_draft' end);return a.id;
end;$$;
create function public.campus_withdraw(application_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.campus_applications set status='withdrawn',updated_at=now() where id=application_id and applicant_id=auth.uid() and status in ('draft','pending','needs_info');
 if not found then raise exception 'Cannot withdraw';end if;
 insert into public.campus_audit(actor,application_id,action) values(auth.uid(),application_id,'withdraw');
end;$$;
create function public.campus_review(application_id uuid,decision text,note text) returns void language plpgsql security definer set search_path='' as $$
declare a public.campus_applications;p public.campus_policies;end_date timestamptz;identity_id uuid:=gen_random_uuid();
begin
 if auth.uid() is null or not public.community_is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if decision is null or decision not in ('needs_info','approved','rejected') or nullif(btrim(note),'') is null or char_length(note)>2000 then raise exception 'Review note required';end if;
 select * into a from public.campus_applications where id=application_id for update;
 if a.id is null or a.applicant_id=auth.uid() or a.status<>'pending' then raise exception 'Unavailable or own application';end if;
 if decision='approved' then
 select cp.* into p from public.campus_confirmations c join public.campus_policies cp on cp.id=c.policy_id where c.application_id=a.id and c.revision=a.revision;
 if p.id is null then raise exception 'Confirmation missing';end if;
 update public.campus_appointments set status='exited',reason='Previous term ended' where member_id=a.applicant_id and status in ('active','paused') and ends_at<=now();
 end_date:=now()+make_interval(months=>p.term_months);
 insert into public.campus_appointments(id,application_id,member_id,ends_at,notice,created_by)
 values(identity_id,a.id,a.applicant_id,end_date,'量立方校园大使任命通知'||E'\n姓名：'||(a.details->>'name')||E'\n学校：'||(a.details->>'school')||E'\n身份编号：'||identity_id::text||E'\n任期：'||now()::date::text||' — '||end_date::date::text||E'\n参与范围：社区认可的校园交流与开源共建。不自动授权签约、收款、募资或发布官方声明。'||E'\n联系：'||p.contact,auth.uid());
 insert into public.member_badges(user_id,badge_id) values(a.applicant_id,'campus') on conflict do nothing;
 end if;
 update public.campus_applications set status=decision,review_note=btrim(note),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=a.id;
 insert into public.campus_audit(actor,application_id,action,note) values(auth.uid(),a.id,decision,note);
end;$$;
create function public.campus_identity_status(appointment_id uuid,new_status text,note text) returns void language plpgsql security definer set search_path='' as $$
declare a public.campus_appointments;admin boolean:=public.community_is_admin();
begin
 select * into a from public.campus_appointments where id=appointment_id for update;
 if auth.uid() is null or a.id is null or (not admin and (a.member_id<>auth.uid() or new_status is distinct from 'exited')) then raise exception 'Not allowed' using errcode='42501';end if;
 if new_status is null or new_status not in ('active','paused','exited','revoked') or nullif(btrim(note),'') is null or char_length(note)>2000 or a.status not in ('active','paused') then raise exception 'Invalid change';end if;
 if new_status='active' and a.ends_at<=now() then raise exception 'Expired; new application required';end if;
 update public.campus_appointments set status=new_status,reason=note where id=a.id;
 if new_status='active' then insert into public.member_badges(user_id,badge_id) values(a.member_id,'campus') on conflict do nothing;
 else delete from public.member_badges where user_id=a.member_id and badge_id='campus';end if;
 insert into public.campus_audit(actor,application_id,action,note) values(auth.uid(),a.application_id,new_status,note);
end;$$;
create function public.campus_request(request_id uuid,request_kind text,request_body text) returns void language plpgsql security definer set search_path='' as $$
declare identity_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
 if not exists(select 1 from public.campus_applications where applicant_id=auth.uid()) and not exists(select 1 from public.campus_appointments where member_id=auth.uid()) then raise exception 'An application record is required';end if;
 if exists(select 1 from public.campus_requests where id=request_id and member_id=auth.uid()) then return;end if;
 select id into identity_id from public.campus_appointments where member_id=auth.uid() order by starts_at desc limit 1;
 if request_kind='support' and not exists(select 1 from public.campus_appointments where id=identity_id and status='active' and ends_at>now()) then raise exception 'Active ambassador required';end if;
 if (select count(*) from public.campus_requests where member_id=auth.uid() and created_at>now()-interval '1 day')>=5 then raise exception 'Please wait';end if;
 insert into public.campus_requests(id,member_id,appointment_id,kind,body) values(request_id,auth.uid(),identity_id,request_kind,btrim(request_body));
end;$$;
create function public.campus_handle_request(request_id uuid,reply text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.community_is_admin() then raise exception 'Admin required';end if;
 if nullif(btrim(reply),'') is null or char_length(reply)>4000 then raise exception 'Response required';end if;
 update public.campus_requests set status='handled',response=reply,handled_by=auth.uid() where id=request_id and status='pending';
 if not found then raise exception 'Request already handled';end if;
end;$$;
-- Public verification intentionally excludes names, schools and contact details.
create function public.campus_verify(appointment_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',id,'starts_at',starts_at,'ends_at',ends_at,'status',case when status in ('active','paused') and ends_at<=now() then 'expired' else status end)
 from public.campus_appointments where id=appointment_id;
$$;
create function public.campus_badge_valid(member_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.campus_appointments a where a.member_id=$1)
 or exists(select 1 from public.campus_appointments a where a.member_id=$1 and a.status='active' and a.ends_at>now());
$$;
-- Retain the existing API signatures; only suppress expired managed campus badges.
do $$ declare f record;definition text;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('community_feed','community_post_detail','community_thread_replies','community_reply_submissions','community_member_profile','community_member_feed') loop
 definition:=pg_get_functiondef(f.oid);
 definition:=regexp_replace(definition,'where mb.user_id=([a-z]+[.]author_id|m[.]id)','where (mb.badge_id<>''campus'' or public.campus_badge_valid(mb.user_id)) and mb.user_id=\1','g');
 execute definition;
 end loop;
end $$;
create policy campus_badge_expiry on public.member_badges as restrictive for select to authenticated using(badge_id<>'campus' or public.campus_badge_valid(user_id));
revoke all on function public.campus_publish_policy(jsonb,boolean),public.campus_close_enrollment(),public.campus_save_application(uuid,jsonb,uuid,boolean,boolean,boolean,integer,uuid),public.campus_withdraw(uuid),public.campus_review(uuid,text,text),public.campus_identity_status(uuid,text,text),public.campus_request(uuid,text,text),public.campus_handle_request(uuid,text),public.campus_verify(uuid),public.campus_badge_valid(uuid) from public,anon,authenticated;
grant execute on function public.campus_publish_policy(jsonb,boolean),public.campus_close_enrollment(),public.campus_save_application(uuid,jsonb,uuid,boolean,boolean,boolean,integer,uuid),public.campus_withdraw(uuid),public.campus_review(uuid,text,text),public.campus_identity_status(uuid,text,text),public.campus_request(uuid,text,text),public.campus_handle_request(uuid,text),public.campus_verify(uuid),public.campus_badge_valid(uuid) to authenticated;
grant execute on function public.campus_verify(uuid) to anon;
notify pgrst,'reload schema';
commit;
