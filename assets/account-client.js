/* Shared Supabase client: public key only; permissions are enforced by database RLS. */
(() => {
  if (!window.supabase) return;
  window.spaceqatClient = window.supabase.createClient(
    'https://hvwsqebpeabfnndoxmwh.supabase.co',
    'sb_publishable_NfSbd12D_UQwwPfnAPVKIw_CKyxv0-Y',
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:location.pathname.endsWith('/account.html'),flowType:'implicit'}}
  );
})();
