const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table member_profiles(id uuid,public_id uuid,display_name text);
 create table community_posts(id uuid default gen_random_uuid(),author_id uuid,title text,body text,category text,published_at timestamptz default now(),status text,deleted_at timestamptz);
 create table badge_catalog(id text,name text,sort_order integer);create table member_badges(user_id uuid,badge_id text);
 insert into member_profiles values('00000000-0000-0000-0000-000000000001',gen_random_uuid(),'Member');
 insert into community_posts(author_id,title,body,category,status) select id,'Post '||n,'Body',case when n%2=0 then 'help' else 'knowledge' end,'published' from member_profiles cross join generate_series(1,50) n;
 insert into community_posts(author_id,title,body,category,status) select id,'Private','Body','help','pending' from member_profiles;
 update community_posts set deleted_at=now() where title='Post 2';`);
 const migration=fs.readFileSync('supabase/016_forum_boards.sql','utf8');await db.exec(migration);await db.exec(migration);
 await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);set role authenticated");
 const feed=async(offset,board)=>(await db.query('select * from community_member_feed($1,$2)',[offset,board])).rows.map(r=>r.community_member_feed);
 const first=await feed(0,'help'),second=await feed(20,'help');assert.equal(first.length,20);assert.equal(second.length,4);assert.ok([...first,...second].every(p=>p.category==='help'&&p.title!=='Private'&&p.title!=='Post 2'));assert.equal(new Set([...first,...second].map(p=>p.id)).size,24);
 assert.equal((await feed(0,null)).length,20);assert.equal((await feed(0,'event')).length,0);
 await db.exec("reset role;select set_config('request.jwt.claim.sub','',false);set role authenticated");assert.equal((await feed(0,null)).length,0);
 console.log('PASS: category filter before pagination, no duplicates, pending/deleted excluded, empty board, signed-out denial, repeatable migration.');
}finally{await db.close()}})().catch(e=>{console.error(e);process.exit(1)});
