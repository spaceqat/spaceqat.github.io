/* Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite package. */
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;
 create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 await db.exec(fs.readFileSync('supabase/001_members.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/002_community.sql','utf8'));
 const a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002',mod='00000000-0000-0000-0000-000000000003';
 for(const id of [a,b,mod])await db.query('insert into auth.users values ($1,$2)',[id,JSON.stringify({display_name:'Member '+id.slice(-1)})]);
 await db.query('insert into public.community_moderators values ($1)',[mod]);
 await db.query("insert into public.member_badges(user_id,badge_id) values ($1,'L0')",[a]);
 async function as(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role);}
 async function denied(sql,values=[]){await assert.rejects(()=>db.query(sql,values));}
 await as(a);
 assert.equal((await db.query('select * from member_profiles')).rows.length,1);
 assert.equal((await db.query('select * from badge_catalog')).rows.length,31);
 await denied('update member_profiles set points=1000');
 await denied("insert into member_badges(user_id,badge_id) values ($1,'L5')",[a]);
 await denied('insert into community_moderators values ($1)',[a]);
 await denied("insert into community_posts(author_id,title,body,category,status) values ($1,'Title','Enough body text','help','published')",[a]);
 const postA=(await db.query("select submit_community_post('First post','A useful community post','help') as id")).rows[0].id;
 await denied("select submit_community_post('Next post','Another useful post','help')");
 assert.equal((await db.query('select * from community_posts')).rows[0].status,'pending');
 assert.equal((await db.query('select * from community_feed()')).rows.length,0);
 await as(b);
 assert.equal((await db.query('select * from community_posts')).rows.length,0);
 assert.equal((await db.query('select * from member_badges')).rows.length,0);
 await denied("select review_community_post($1,'published','')",[postA]);
 const postB=(await db.query("select submit_community_post('Second post','Another community post','campus') as id")).rows[0].id;
 await as(mod);
 assert.equal((await db.query('select * from community_posts')).rows.length,2);
 await db.query("select review_community_post($1,'published','Approved')",[postA]);
 await denied("select review_community_post($1,'published','')",[postA]);
 await denied("select review_community_post($1,'rejected','')",[postB]);
 await db.query("select review_community_post($1,'rejected','Please add evidence')",[postB]);
 const own=(await db.query("select submit_community_post('Reviewer post','A reviewer can also post','help') as id")).rows[0].id;
 await denied("select review_community_post($1,'published','')",[own]);
 await as(b);
 const feed=(await db.query('select * from community_feed()')).rows;
 assert.equal(feed.length,1);assert.equal(feed[0].id,postA);assert.equal(feed[0].author_name,'Member 1');assert.equal(feed[0].badges[0].name,'好奇猫');
 assert.equal('author_id' in feed[0],false);assert.equal('review_note' in feed[0],false);assert.equal('email' in feed[0],false);
 assert.equal((await db.query('select * from community_posts')).rows[0].review_note,'Please add evidence');
 await as(null,'anon');await denied('select * from community_feed()');await denied('select * from member_profiles');
 await db.exec('reset role');
 await db.exec(fs.readFileSync('supabase/003_category_publication.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/003_category_publication.sql','utf8'));
 assert.equal((await db.query('select status from community_posts where id=$1',[own])).rows[0].status,'pending');
 for(const category of ['help','fatqat','campus','knowledge','community']){
   await db.exec('reset role');await db.query("update community_posts set created_at=now()-interval '2 hours' where author_id=$1",[a]);
   await as(a);
   const id=(await db.query('select submit_community_post($1,$2,$3) as id',['Category '+category,'A valid post in this category',category])).rows[0].id;
   const row=(await db.query('select * from community_posts where id=$1',[id])).rows[0];
   const review=['knowledge','community'].includes(category);
   assert.equal(row.status,review?'pending':'published');assert.equal(row.published_at!==null,!review);assert.equal(row.reviewed_by,null);
   await denied("select submit_community_post('Too soon','Another post body','help')");
   await denied("update community_posts set status='published' where id=$1",[id]);
   await as(b);assert.equal((await db.query('select * from community_feed()')).rows.some(p=>p.id===id),!review);
 }
 await as(a);await denied("select submit_community_post('Invalid category','A valid body for this test','unknown')");
 await as(null,'anon');await denied("select submit_community_post('Anonymous post','A valid body for this test','help')");
 await db.close();console.log('PASS: SQL permissions, category-based publication for all five categories, pending privacy, preserved historical status, idempotent migration, throttling and review access.');
})().catch(e=>{console.error(e);process.exit(1)});
