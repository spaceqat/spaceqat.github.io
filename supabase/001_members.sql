-- Run once in Supabase SQL Editor. No passwords or private keys required.
begin;
create table public.member_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'SpaceQat Member' check (char_length(btrim(display_name)) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 500),
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default now()
);
alter table public.member_profiles enable row level security;
revoke all on public.member_profiles from anon, authenticated;
grant select on public.member_profiles to authenticated;
grant update (display_name, bio) on public.member_profiles to authenticated;
create policy "Read own profile" on public.member_profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Edit own profile" on public.member_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create function public.spaceqat_create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.member_profiles (id, display_name) values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data->>'display_name'),40),''),'SpaceQat Member'));
  return new;
end;
$$;
revoke all on function public.spaceqat_create_profile() from public, anon, authenticated;
create trigger spaceqat_user_created after insert on auth.users for each row execute procedure public.spaceqat_create_profile();
-- Include accounts created before this migration. Never import Demo identities.
insert into public.member_profiles (id,display_name)
select id, coalesce(nullif(left(btrim(raw_user_meta_data->>'display_name'),40),''),'SpaceQat Member') from auth.users on conflict (id) do nothing;
commit;
