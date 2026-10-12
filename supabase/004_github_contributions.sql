-- Run once after 003_category_publication.sql. No credentials belong in this file.
begin;
create table public.member_roles (
 user_id uuid not null references public.member_profiles(id) on delete cascade,
 role text not null check(role in ('admin','contribution_reviewer')), primary key(user_id,role)
);
create table public.community_audit (
 id bigint generated always as identity primary key, actor_id uuid references public.member_profiles(id),
 action text not null, subject text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.github_accounts (
 user_id uuid primary key references public.member_profiles(id) on delete cascade,
 github_id text not null unique check(github_id ~ '^[0-9]+$'), login text not null,
 linked_at timestamptz not null default now()
);
create table public.contribution_rules (
 label text primary key check(label ~ '^spaceqat:[a-z0-9:_-]{1,60}$'),
 route text not null check(route in ('T','C','O','M')), points integer not null check(points between 1 and 1000),
 description text not null check(char_length(btrim(description)) between 1 and 500),
 enabled boolean not null default false
);
create table public.github_contributions (
 id uuid primary key default gen_random_uuid(), source_key text not null unique,
 repository_id bigint not null, pr_number integer not null check(pr_number>0),
 github_id text not null, github_login text not null,
 user_id uuid references public.member_profiles(id), title text not null, url text not null,
 merged_at timestamptz not null, labels text[] not null default '{}',
 status text not null default 'pending' check(status in ('pending','approved','rejected','reversed')),
 route text not null default 'T' check(route in ('T','C','O','M')),
 points integer not null default 0 check(points between 0 and 1000),
 review_note text not null default '', reviewed_by uuid references public.member_profiles(id),
 reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(repository_id,pr_number)
);
create table public.contribution_ledger (
 id bigint generated always as identity primary key,
 contribution_id uuid not null references public.github_contributions(id),
 user_id uuid not null references public.member_profiles(id),
 kind text not null check(kind in ('award','reversal')), delta integer not null,
 created_at timestamptz not null default now(), unique(contribution_id,kind)
);
create index on public.github_contributions(user_id,merged_at desc);
create index on public.github_contributions(status,created_at desc);
create table public.github_sync_state (
 id boolean primary key default true check(id), page integer not null default 1,
 started_at timestamptz, completed_at timestamptz, last_error text
);
insert into public.github_sync_state(id) values(true);

create function public.community_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.member_roles where user_id=auth.uid() and role='admin');
$$;
create function public.community_can_review_contributions() returns boolean language sql stable security definer set search_path='' as $$
 select public.community_is_admin() or exists(select 1 from public.member_roles where user_id=auth.uid() and role='contribution_reviewer');
$$;
create or replace function public.community_can_review() returns boolean language sql stable security definer set search_path='' as $$
 select public.community_is_admin() or exists(select 1 from public.community_moderators where user_id=auth.uid());
$$;
create function public.my_community_permissions() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('admin',public.community_is_admin(),'forum',public.community_can_review(),'contributions',public.community_can_review_contributions());
$$;

alter table public.member_roles enable row level security;
alter table public.community_audit enable row level security;
alter table public.github_accounts enable row level security;
alter table public.contribution_rules enable row level security;
alter table public.github_contributions enable row level security;
alter table public.contribution_ledger enable row level security;
alter table public.github_sync_state enable row level security;
revoke all on public.member_roles,public.community_audit,public.github_accounts,public.contribution_rules,public.github_contributions,public.contribution_ledger,public.github_sync_state from public,anon,authenticated;
grant select on public.member_roles,public.community_audit,public.github_accounts,public.contribution_rules,public.github_contributions,public.contribution_ledger,public.github_sync_state to authenticated;
grant all on public.github_sync_state to service_role;
create policy "Own roles or admin" on public.member_roles for select to authenticated using(user_id=auth.uid() or public.community_is_admin());
create policy "Audit for admins" on public.community_audit for select to authenticated using(public.community_is_admin());
create policy "Own GitHub or reviewers" on public.github_accounts for select to authenticated using(user_id=auth.uid() or public.community_can_review_contributions());
create policy "Read scoring rules" on public.contribution_rules for select to authenticated using(true);
create policy "Own contributions or reviewers" on public.github_contributions for select to authenticated using(user_id=auth.uid() or public.community_can_review_contributions());
create policy "Own ledger or reviewers" on public.contribution_ledger for select to authenticated using(user_id=auth.uid() or public.community_can_review_contributions());
create policy "Sync status for admins" on public.github_sync_state for select to authenticated using(public.community_is_admin());

create function public.admin_set_member_role(member_email text,role_name text,enabled boolean,reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if not public.community_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if enabled is null or role_name not in ('admin','contribution_reviewer','forum_reviewer') or role_name is null or coalesce(length(btrim(reason)),0) not between 1 and 1000 then raise exception 'Invalid role or reason'; end if;
 perform pg_catalog.pg_advisory_xact_lock(782340);
 select id into target from auth.users where lower(email)=lower(btrim(member_email));
 if target is null then raise exception 'Registered member not found'; end if;
 if role_name='forum_reviewer' then
  if enabled then insert into public.community_moderators values(target) on conflict do nothing;
  else delete from public.community_moderators where user_id=target; end if;
 else
  if not enabled and role_name='admin' and exists(select 1 from public.member_roles where user_id=target and role='admin') and (select count(*) from public.member_roles where role='admin')<=1 then raise exception 'Cannot remove the last administrator'; end if;
  if enabled then insert into public.member_roles values(target,role_name) on conflict do nothing;
  else delete from public.member_roles where user_id=target and role=role_name; end if;
 end if;
 insert into public.community_audit(actor_id,action,subject,detail) values(auth.uid(),'set_role',target::text,jsonb_build_object('role',role_name,'enabled',enabled,'reason',reason));
 return target;
end;
$$;
create function public.admin_member_access(member_email text) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; result jsonb;
begin
 if not public.community_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 select id into target from auth.users where lower(email)=lower(btrim(member_email));
 if target is null then raise exception 'Registered member not found'; end if;
 select jsonb_build_object('name',display_name,'points',points,'roles',coalesce((select jsonb_agg(role) from public.member_roles where user_id=target),'[]'::jsonb),'forum',exists(select 1 from public.community_moderators where user_id=target),'badges',coalesce((select jsonb_agg(badge_id) from public.member_badges where user_id=target),'[]'::jsonb)) into result from public.member_profiles where id=target;
 return result;
end;
$$;
create function public.admin_set_badge(member_email text,badge text,enabled boolean,reason text) returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if not public.community_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if enabled is null or coalesce(length(btrim(reason)),0) not between 1 and 1000 then raise exception 'Reason required'; end if;
 select id into target from auth.users where lower(email)=lower(btrim(member_email));
 if target is null then raise exception 'Registered member not found'; end if;
 if not exists(select 1 from public.badge_catalog where id=badge) then raise exception 'Unknown badge'; end if;
 if enabled then insert into public.member_badges(user_id,badge_id) values(target,badge) on conflict do nothing;
 else delete from public.member_badges where user_id=target and badge_id=badge; end if;
 insert into public.community_audit(actor_id,action,subject,detail) values(auth.uid(),'set_badge',target::text,jsonb_build_object('badge',badge,'enabled',enabled,'reason',reason));
end;
$$;
create function public.admin_set_contribution_rule(rule_label text,rule_route text,rule_points integer,rule_description text,rule_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.community_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 insert into public.contribution_rules values(rule_label,rule_route,rule_points,rule_description,rule_enabled)
 on conflict(label) do update set route=excluded.route,points=excluded.points,description=excluded.description,enabled=excluded.enabled;
 insert into public.community_audit(actor_id,action,subject,detail) values(auth.uid(),'set_rule',rule_label,jsonb_build_object('route',rule_route,'points',rule_points,'enabled',rule_enabled,'description',rule_description));
end;
$$;

-- Identity comes only from Supabase's verified provider record, never a typed username.
create function public.sync_my_github_identity() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); identity_row record; existing text;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select provider_id,identity_data into identity_row from auth.identities where user_id=actor and provider='github' limit 1;
 if not found then return null; end if;
 if identity_row.provider_id !~ '^[0-9]+$' then raise exception 'Invalid GitHub identity'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,44));
 select github_id into existing from public.github_accounts where user_id=actor;
 if existing is not null and existing<>identity_row.provider_id then raise exception 'Contact an administrator to change the linked account'; end if;
 insert into public.github_accounts(user_id,github_id,login) values(actor,identity_row.provider_id,coalesce(identity_row.identity_data->>'user_name',identity_row.identity_data->>'preferred_username',identity_row.provider_id))
 on conflict(user_id) do update set login=excluded.login;
 update public.github_contributions set user_id=actor where github_id=identity_row.provider_id and user_id is null;
 return (select jsonb_build_object('github_id',github_id,'login',login) from public.github_accounts where user_id=actor);
end;
$$;

-- Internal transaction helper: no API role can execute it directly.
create function public.apply_contribution_award(item uuid,award_points integer,award_route text,note text,reviewer uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.github_contributions;
begin
 select * into c from public.github_contributions where id=item for update;
 if not found or c.status<>'pending' or c.user_id is null then raise exception 'Contribution is not ready for review'; end if;
 if reviewer=c.user_id then raise exception 'Cannot review own contribution' using errcode='42501'; end if;
 if award_points is null or award_points not between 1 and 1000 or award_route is null or award_route not in ('T','C','O','M') or coalesce(length(btrim(note)),0) not between 1 and 1000 then raise exception 'Invalid award'; end if;
 insert into public.contribution_ledger(contribution_id,user_id,kind,delta) values(c.id,c.user_id,'award',award_points);
 update public.member_profiles set points=points+award_points where id=c.user_id;
 update public.github_contributions set status='approved',points=award_points,route=award_route,review_note=note,reviewed_by=reviewer,reviewed_at=now(),updated_at=now() where id=c.id;
 insert into public.community_audit(actor_id,action,subject,detail) values(reviewer,'award_contribution',c.id::text,jsonb_build_object('points',award_points,'route',award_route,'reason',note));
end;
$$;
create function public.review_github_contribution(item uuid,decision text,award_points integer,award_route text,note text) returns void language plpgsql security definer set search_path='' as $$
declare c public.github_contributions;
begin
 if not public.community_can_review_contributions() then raise exception 'Contribution reviewer required' using errcode='42501'; end if;
 if decision is null or decision not in ('approved','rejected') or coalesce(length(btrim(note)),0) not between 1 and 1000 then raise exception 'Decision and reason required'; end if;
 if decision='approved' then perform public.apply_contribution_award(item,award_points,award_route,note,auth.uid()); return; end if;
 select * into c from public.github_contributions where id=item for update;
 if not found or c.status<>'pending' then raise exception 'Contribution is no longer pending'; end if;
 if c.user_id=auth.uid() then raise exception 'Cannot review own contribution' using errcode='42501'; end if;
 update public.github_contributions set status='rejected',review_note=note,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=item;
 insert into public.community_audit(actor_id,action,subject,detail) values(auth.uid(),'reject_contribution',item::text,jsonb_build_object('reason',note));
end;
$$;
create function public.admin_reverse_contribution(item uuid,reason text) returns void language plpgsql security definer set search_path='' as $$
declare c public.github_contributions;
begin
 if not public.community_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if coalesce(length(btrim(reason)),0) not between 1 and 1000 then raise exception 'Reason required'; end if;
 select * into c from public.github_contributions where id=item for update;
 if not found or c.status<>'approved' then raise exception 'Only credited contributions can be reversed'; end if;
 insert into public.contribution_ledger(contribution_id,user_id,kind,delta) values(c.id,c.user_id,'reversal',-c.points);
 update public.member_profiles set points=points-c.points where id=c.user_id;
 update public.github_contributions set status='reversed',review_note=reason,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=item;
 insert into public.community_audit(actor_id,action,subject,detail) values(auth.uid(),'reverse_contribution',item::text,jsonb_build_object('points',-c.points,'reason',reason));
end;
$$;

-- Only the server-side GitHub integration may call this RPC.
create function public.ingest_github_contribution(repo_id bigint,pr integer,author_github_id text,author_login text,pr_title text,merged_at_value timestamptz,pr_labels text[],trusted_maintainer boolean default false,maintainer_github_id text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare item public.github_contributions; member uuid; rule public.contribution_rules; matches integer;
begin
 if author_github_id is null or author_github_id !~ '^[0-9]+$' or merged_at_value is null or pr_title is null or repo_id is null then raise exception 'Invalid contribution'; end if;
 select user_id into member from public.github_accounts where github_id=author_github_id;
 insert into public.github_contributions(source_key,repository_id,pr_number,github_id,github_login,user_id,title,url,merged_at,labels)
 values(repo_id::text||':'||pr::text,repo_id,pr,author_github_id,left(author_login,100),member,left(pr_title,500),'https://github.com/spaceqat/fatqat/pull/'||pr,merged_at_value,coalesce(pr_labels,'{}'))
 on conflict(source_key) do nothing;
 select * into item from public.github_contributions where source_key=repo_id::text||':'||pr::text for update;
 if item.github_id<>author_github_id then raise exception 'Author identity mismatch'; end if;
 if item.status<>'pending' then return item.id; end if;
 update public.github_contributions set title=left(pr_title,500),labels=coalesce(pr_labels,'{}'),user_id=coalesce(user_id,member),updated_at=now() where id=item.id;
 select count(*) into matches from public.contribution_rules where enabled and label=any(coalesce(pr_labels,'{}'));
 if trusted_maintainer and maintainer_github_id is not null and maintainer_github_id<>author_github_id and member is not null and matches=1 then
  select * into rule from public.contribution_rules where enabled and label=any(pr_labels);
  perform public.apply_contribution_award(item.id,rule.points,rule.route,'GitHub maintainer '||maintainer_github_id||' confirmed rule '||rule.label,null);
 end if;
 return item.id;
end;
$$;

create function public.my_contribution_summary() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('count',count(*),'span_days',case when count(*)=0 then 0 else (max(merged_at)::date-min(merged_at)::date)+1 end,
 'recent',coalesce((select jsonb_agg(row_to_json(r)) from (select title,pr_number,points,merged_at,route from public.github_contributions where user_id=auth.uid() and status='approved' order by merged_at desc limit 5) r),'[]'::jsonb))
 from public.github_contributions where user_id=auth.uid() and status='approved';
$$;
revoke all on function public.my_contribution_summary() from public,anon;
grant execute on function public.my_contribution_summary() to authenticated;
revoke all on function public.apply_contribution_award(uuid,integer,text,text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.ingest_github_contribution(bigint,integer,text,text,text,timestamptz,text[],boolean,text) from public,anon,authenticated;
grant execute on function public.ingest_github_contribution(bigint,integer,text,text,text,timestamptz,text[],boolean,text) to service_role;
revoke all on function public.community_is_admin(),public.community_can_review_contributions(),public.my_community_permissions(),public.admin_set_member_role(text,text,boolean,text),public.admin_member_access(text),public.admin_set_badge(text,text,boolean,text),public.admin_set_contribution_rule(text,text,integer,text,boolean),public.sync_my_github_identity(),public.review_github_contribution(uuid,text,integer,text,text),public.admin_reverse_contribution(uuid,text) from public,anon;
grant execute on function public.community_is_admin(),public.community_can_review_contributions(),public.my_community_permissions(),public.admin_set_member_role(text,text,boolean,text),public.admin_member_access(text),public.admin_set_badge(text,text,boolean,text),public.admin_set_contribution_rule(text,text,integer,text,boolean),public.sync_my_github_identity(),public.review_github_contribution(uuid,text,integer,text,text),public.admin_reverse_contribution(uuid,text) to authenticated;
commit;
