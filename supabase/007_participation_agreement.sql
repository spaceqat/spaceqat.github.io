-- Apply after 001_members.sql and 002_community.sql. No historical awards are changed.
begin;
create table if not exists public.member_agreements (
 user_id uuid not null references public.member_profiles(id) on delete cascade,
 version text not null,
 accepted_at timestamptz not null default now(),
 primary key(user_id,version)
);
alter table public.member_agreements enable row level security;
revoke all on public.member_agreements from public,anon,authenticated;
grant select on public.member_agreements to authenticated;
drop policy if exists "Read own agreement" on public.member_agreements;
create policy "Read own agreement" on public.member_agreements for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.accept_participation_agreement(agreement_version text)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); receipt timestamptz;
begin
 if actor is null then raise exception 'Sign in required'; end if;
 if agreement_version is distinct from '2026-10-12-v1' then raise exception 'Unsupported agreement version'; end if;
 insert into public.member_agreements(user_id,version) values(actor,agreement_version) on conflict do nothing;
 insert into public.member_badges(user_id,badge_id) values(actor,'L0') on conflict do nothing;
 select accepted_at into receipt from public.member_agreements where user_id=actor and version=agreement_version;
 return receipt;
end;
$$;
revoke all on function public.accept_participation_agreement(text) from public,anon;
grant execute on function public.accept_participation_agreement(text) to authenticated;
commit;
