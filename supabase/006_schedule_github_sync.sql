-- Optional: run only AFTER the Edge Function is deployed and tested.
-- Enable Cron (pg_cron) and pg_net in the Supabase dashboard first.
-- In Supabase Vault create github_sync_secret with the SAME value as the
-- Edge Function GITHUB_SYNC_SECRET. Do not paste that value into this file.
do $$
begin
 if not exists(select 1 from vault.decrypted_secrets where name='github_sync_secret') then
  raise exception 'Create github_sync_secret in Supabase Vault before scheduling';
 end if;
end;
$$;
select cron.schedule(
 'spaceqat-github-reconcile',
 '*/15 * * * *',
 $job$
 select net.http_post(
  url:='https://hvwsqebpeabfnndoxmwh.supabase.co/functions/v1/github-contributions',
  headers:=jsonb_build_object('Content-Type','application/json','x-spaceqat-cron',
   (select decrypted_secret from vault.decrypted_secrets where name='github_sync_secret' limit 1)),
  body:='{}'::jsonb,
  timeout_milliseconds:=120000
 );
 $job$
);
