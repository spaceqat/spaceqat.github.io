import { createClient } from '@supabase/supabase-js';
import { importPKCS8, SignJWT } from 'jose';
import { REPOSITORY, ACTIONS, verifySignature, eligiblePull, trustedPermission, ingestArgs } from './policy.mjs';

const env=(name:string)=>{const value=Deno.env.get(name);if(!value)throw new Error(`Missing ${name}`);return value;};
const json=(body:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json',...headers}});
const cors=(request:Request):Record<string,string>=>{
  const allowed=(Deno.env.get('ALLOWED_ORIGINS')||'https://space-qat.com,http://127.0.0.1:8765').split(',');
  const origin=request.headers.get('origin')||'';
  return allowed.includes(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'}:{};
};
const service=()=>createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});

async function github(path:string,token:string,method='GET') {
  const response=await fetch('https://api.github.com'+path,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'SpaceQat-contributions'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`GitHub ${response.status}`);
  return response.json();
}
async function installationToken() {
  // PKCS8 private key stays in Edge Function secrets. Never sent to the browser.
  const key=await importPKCS8(env('GITHUB_APP_PRIVATE_KEY').replace(/\\n/g,'\n'),'RS256');
  const now=Math.floor(Date.now()/1000);
  const jwt=await new SignJWT({}).setProtectedHeader({alg:'RS256'}).setIssuer(env('GITHUB_APP_ID')).setIssuedAt(now-60).setExpirationTime(now+540).sign(key);
  const installation=env('GITHUB_INSTALLATION_ID');
  if(!/^\d+$/.test(installation))throw new Error('Invalid installation');
  return (await github(`/app/installations/${installation}/access_tokens`,jwt,'POST')).token;
}
async function ingest(db:ReturnType<typeof service>,pr:any,repoId:number,trusted=false,maintainerId:number|null=null) {
  const {error}=await db.rpc('ingest_github_contribution',ingestArgs(pr,repoId,trusted,maintainerId));
  if(error)throw new Error('Unable to save contribution');
}
async function webhook(request:Request) {
  if(Number(request.headers.get('content-length')||0)>2_000_000)return json({error:'Payload too large'},413);
  const raw=await request.arrayBuffer();
  if(raw.byteLength>2_000_000)return json({error:'Payload too large'},413);
  if(!await verifySignature(raw,request.headers.get('x-hub-signature-256'),env('GITHUB_WEBHOOK_SECRET')))return json({error:'Invalid signature'},401);
  const event=request.headers.get('x-github-event');
  if(event==='ping')return json({ok:true});
  const payload=JSON.parse(new TextDecoder().decode(raw));
  if(event!=='pull_request'||!ACTIONS.has(payload.action)||payload.repository?.full_name?.toLowerCase()!==REPOSITORY||String(payload.installation?.id)!==env('GITHUB_INSTALLATION_ID'))return json({ignored:true});
  if(!Number.isSafeInteger(payload.number))return json({error:'Invalid PR'},400);
  const token=await installationToken();
  // Re-fetch canonical state; webhook payloads can arrive late or out of order.
  const pr=await github(`/repos/${REPOSITORY}/pulls/${payload.number}`,token);
  if(!eligiblePull(pr))return json({ignored:true});
  const repoId=pr.base.repo.id;
  if(repoId!==payload.repository.id)return json({error:'Repository mismatch'},400);
  let trusted=false;
  // A merge or scoring-label action must come from a maintainer other than the author.
  // Require unchanged scoring labels since the event to avoid trusting an unrelated later edit.
  const eventLabels=(payload.pull_request?.labels||[]).map((l:any)=>l.name).filter((s:string)=>s.startsWith('spaceqat:')).sort();
  const liveLabels=pr.labels.map((l:any)=>l.name).filter((s:string)=>s.startsWith('spaceqat:')).sort();
  if(payload.sender?.type==='User'&&payload.sender.id!==pr.user.id&&JSON.stringify(eventLabels)===JSON.stringify(liveLabels)&&
    (payload.action==='closed'||String(payload.label?.name||'').startsWith('spaceqat:'))) {
    try {trusted=trustedPermission(await github(`/repos/${REPOSITORY}/collaborators/${encodeURIComponent(payload.sender.login)}/permission`,token));} catch {trusted=false;}
  }
  await ingest(service(),pr,repoId,trusted,payload.sender?.id||null);
  return json({ok:true});
}
async function reconcile(request:Request,headers:Record<string,string>) {
  const db=service();
  const cron=request.headers.get('x-spaceqat-cron');
  const cronSecret=Deno.env.get('GITHUB_SYNC_SECRET');
  const scheduled=!!cronSecret&&cron===cronSecret;
  if(!scheduled){
    const jwt=request.headers.get('authorization')?.replace(/^Bearer /i,'');
    if(!jwt)return json({error:'Sign in required'},401,headers);
    const {data,error}=await db.auth.getUser(jwt);
    if(error||!data.user)return json({error:'Sign in required'},401,headers);
    const caller=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:`Bearer ${jwt}`}},auth:{persistSession:false}});
    const role=await caller.rpc('community_is_admin');
    if(role.error||role.data!==true)return json({error:'Admin required'},403,headers);
  }
  // Atomic lease prevents parallel scans and rapid repeated administrator requests.
  const claimed=await db.from('github_sync_state').update({started_at:new Date().toISOString(),last_error:null})
    .eq('id',true).or(`started_at.is.null,started_at.lt.${new Date(Date.now()-5*60*1000).toISOString()}`).select('*').maybeSingle();
  if(claimed.error)throw new Error('Sync state unavailable');
  if(!claimed.data)return json({error:'Sync already running or cooling down'},429,headers);
  let imported=0;
  try {
    const token=await installationToken();
    const repo=await github(`/repos/${REPOSITORY}`,token);
    let page=claimed.data.page;
    // A bounded batch; the persisted cursor resumes historical imports on the next run.
    const list=await github(`/repos/${REPOSITORY}/pulls?state=closed&sort=created&direction=asc&per_page=20&page=${page}`,token);
    for(let start=0;start<list.length;start+=4){await Promise.all(list.slice(start,start+4).map(async(entry:any)=>{const pr=await github(`/repos/${REPOSITORY}/pulls/${entry.number}`,token);if(eligiblePull(pr)){await ingest(db,pr,repo.id);imported++;}}));}
    page=list.length<20?1:page+1;
    const updated=await db.from('github_sync_state').update({page,completed_at:new Date().toISOString(),last_error:null}).eq('id',true);
    if(updated.error)throw new Error('Unable to checkpoint sync');
    return json({ok:true,imported,next_page:page},200,headers);
  }catch(error){
    await db.from('github_sync_state').update({last_error:'Sync failed; check Edge Function logs and GitHub configuration.'}).eq('id',true);
    throw error;
  }
}
Deno.serve(async(request:Request)=>{
  const headers=cors(request);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'Method not allowed'},405,headers);
  try{
    if(new URL(request.url).pathname.endsWith('/webhook'))return await webhook(request);
    return await reconcile(request,headers);
  }catch(error){console.error('Contribution integration failed:',error instanceof Error?error.message:'Unknown error');return json({error:'Integration unavailable. Please try again later.'},503,headers);}
});
