-- Run after 004_github_contributions.sql. The account must already be registered.
-- This is an explicit one-time bootstrap, not an email-domain authorization rule.
do $$
declare target uuid;
begin
 select id into target from auth.users where lower(email)=lower('ADMIN_EMAIL_HERE');
 if target is null then raise exception 'Replace ADMIN_EMAIL_HERE with the registered administrator email'; end if;
 insert into public.member_roles(user_id,role) values(target,'admin') on conflict do nothing;
 if found then
  insert into public.community_audit(actor_id,action,subject,detail)
  values(null,'bootstrap_admin',target::text,jsonb_build_object('reason','Community owner explicitly designated this first administrator'));
 end if;
end;
$$;
