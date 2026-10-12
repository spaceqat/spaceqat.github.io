-- Run once AFTER 001_members.sql in Supabase SQL Editor.
-- No automatic contribution awards: badges are granted by verified community review.
begin;
create table public.badge_catalog (
  id text primary key,
  name text not null,
  category text not null,
  description text not null,
  sort_order integer not null default 0
);
create table public.member_badges (
  user_id uuid not null references public.member_profiles(id) on delete cascade,
  badge_id text not null references public.badge_catalog(id),
  granted_at timestamptz not null default now(),
  primary key(user_id,badge_id)
);
create table public.community_moderators (
  user_id uuid primary key references public.member_profiles(id) on delete cascade
);
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.member_profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  body text not null check (char_length(btrim(body)) between 10 and 20000),
  category text not null check (category in ('help','fatqat','campus','knowledge','community')),
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  reviewed_by uuid references public.member_profiles(id),
  review_note text not null default '' check (char_length(review_note)<=1000)
);
create index community_posts_author_date on public.community_posts(author_id,created_at desc);
create index community_posts_status_date on public.community_posts(status,published_at desc);
alter table public.badge_catalog enable row level security;
alter table public.member_badges enable row level security;
alter table public.community_moderators enable row level security;
alter table public.community_posts enable row level security;
revoke all on public.badge_catalog, public.member_badges, public.community_moderators, public.community_posts from public,anon,authenticated;
grant select on public.badge_catalog, public.member_badges, public.community_moderators, public.community_posts to authenticated;

create function public.community_can_review() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.community_moderators where user_id=(select auth.uid()));
$$;
revoke all on function public.community_can_review() from public,anon;
grant execute on function public.community_can_review() to authenticated;
create policy "Members see badge catalog" on public.badge_catalog for select to authenticated using (true);
create policy "Members see their badges" on public.member_badges for select to authenticated using (user_id=(select auth.uid()));
create policy "Members see own review role" on public.community_moderators for select to authenticated using (user_id=(select auth.uid()));
create policy "Authors and reviewers see submissions" on public.community_posts for select to authenticated using (author_id=(select auth.uid()) or (select public.community_can_review()));

-- The feed reveals only published text, public display names and granted badges.
-- Private profile fields, email addresses and review notes are never returned.
create function public.community_feed(page_offset integer default 0) returns table (
  id uuid,title text,body text,category text,published_at timestamptz,author_name text,badges jsonb
) language sql stable security definer set search_path='' as $$
  select p.id,p.title,p.body,p.category,p.published_at,m.display_name,
    coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name) order by b.sort_order)
      from public.member_badges mb join public.badge_catalog b on b.id=mb.badge_id where mb.user_id=p.author_id),'[]'::jsonb)
  from public.community_posts p join public.member_profiles m on m.id=p.author_id
  where p.status='published' and (select auth.uid()) is not null
  order by p.published_at desc,p.id limit 20 offset greatest(0,least(page_offset,10000));
$$;
revoke all on function public.community_feed(integer) from public,anon;
grant execute on function public.community_feed(integer) to authenticated;

create function public.submit_community_post(post_title text,post_body text,post_category text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result uuid;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
  if exists(select 1 from public.community_posts where author_id=actor and created_at>now()-interval '30 seconds')
    or (select count(*) from public.community_posts where author_id=actor and created_at>now()-interval '1 hour')>=5 then
    raise exception 'Please wait before submitting again' using errcode='P0001';
  end if;
  insert into public.community_posts(author_id,title,body,category)
    values(actor,btrim(post_title),btrim(post_body),post_category) returning id into result;
  return result;
end;
$$;
revoke all on function public.submit_community_post(text,text,text) from public,anon;
grant execute on function public.submit_community_post(text,text,text) to authenticated;

create function public.review_community_post(post_id uuid,decision text,note text default '')
returns void language plpgsql security definer set search_path='' as $$
declare target public.community_posts; actor uuid:=auth.uid();
begin
  if not public.community_can_review() then raise exception 'Reviewer access required' using errcode='42501'; end if;
  if decision not in ('published','rejected') or decision is null then raise exception 'Invalid decision'; end if;
  if decision='rejected' and coalesce(char_length(btrim(note)),0)=0 then raise exception 'Rejection reason required'; end if;
  select * into target from public.community_posts where id=post_id for update;
  if not found or target.status<>'pending' then raise exception 'Submission is no longer pending'; end if;
  if target.author_id=actor then raise exception 'Cannot review own submission' using errcode='42501'; end if;
  update public.community_posts set status=decision,reviewed_by=actor,review_note=coalesce(note,''),
    published_at=case when decision='published' then now() else null end where id=post_id;
end;
$$;
revoke all on function public.review_community_post(uuid,text,text) from public,anon;
grant execute on function public.review_community_post(uuid,text,text) to authenticated;

-- Catalog entries are added below; none are granted automatically.
insert into public.badge_catalog(id,name,category,description,sort_order) values
('L0','好奇猫','个人等级','完成账户与参与约定；L0是欢迎身份，不等同于贡献认证。',0),
('L1','开箱猫','个人等级','累计40 XP，至少1项个人基础分达到15 XP的有效贡献。',1),
('L2','叠加猫','个人等级','累计160 XP；4项有效贡献；跨度28天、覆盖2个自然周；主路线60 XP；A90至少60。',2),
('L3','纠缠猫','个人等级','累计420 XP；8项有效贡献；跨度56天、覆盖4个自然周；2项代表成果；主路线180 XP；A90至少120。',3),
('L4','跃迁猫','个人等级','累计900 XP；15项有效贡献；跨度112天、覆盖6个自然周；2项代表成果；银阶专长；A180至少240；通过项目责任评审。',4),
('L5','星图猫','个人等级','累计1800 XP；25项有效贡献；跨度224天、覆盖10个自然周；金阶专长；A180至少300；完成复用与传承证明。',5),
('T0','开源炼金师 · 铜阶','专长徽章','路线80 XP，3项本路线有效贡献，来自至少2个成果根ID。 另须满足手册对应路线的能力证明。',6),
('T1','开源炼金师 · 银阶','专长徽章','路线240 XP，6项有效贡献；3项个人基础分至少40 XP的独立成果；跨度56天，至少1项被他人使用。 另须满足手册对应路线的能力证明。',7),
('T2','开源炼金师 · 金阶','专长徽章','路线600 XP，12项有效贡献；4项代表成果；跨度112天，2项独立成果有外部使用证据，完成带教或交接。 另须满足手册对应路线的能力证明。',8),
('C0','量子翻译官 · 铜阶','专长徽章','路线80 XP，3项本路线有效贡献，来自至少2个成果根ID。 另须满足手册对应路线的能力证明。',9),
('C1','量子翻译官 · 银阶','专长徽章','路线240 XP，6项有效贡献；3项个人基础分至少40 XP的独立成果；跨度56天，至少1项被他人使用。 另须满足手册对应路线的能力证明。',10),
('C2','量子翻译官 · 金阶','专长徽章','路线600 XP，12项有效贡献；4项代表成果；跨度112天，2项独立成果有外部使用证据，完成带教或交接。 另须满足手册对应路线的能力证明。',11),
('O0','纠缠搭桥师 · 铜阶','专长徽章','路线80 XP，3项本路线有效贡献，来自至少2个成果根ID。 另须满足手册对应路线的能力证明。',12),
('O1','纠缠搭桥师 · 银阶','专长徽章','路线240 XP，6项有效贡献；3项个人基础分至少40 XP的独立成果；跨度56天，至少1项被他人使用。 另须满足手册对应路线的能力证明。',13),
('O2','纠缠搭桥师 · 金阶','专长徽章','路线600 XP，12项有效贡献；4项代表成果；跨度112天，2项独立成果有外部使用证据，完成带教或交接。 另须满足手册对应路线的能力证明。',14),
('M0','新手引航员 · 铜阶','专长徽章','路线80 XP，3项本路线有效贡献，来自至少2个成果根ID。 另须满足手册对应路线的能力证明。',15),
('M1','新手引航员 · 银阶','专长徽章','路线240 XP，6项有效贡献；3项个人基础分至少40 XP的独立成果；跨度56天，至少1项被他人使用。 另须满足手册对应路线的能力证明。',16),
('M2','新手引航员 · 金阶','专长徽章','路线600 XP，12项有效贡献；4项代表成果；跨度112天，2项独立成果有外部使用证据，完成带教或交接。 另须满足手册对应路线的能力证明。',17),
('A0','Hello Qat','成就徽章','首次完成 T、C、O 或 M 类有效贡献。 每种只颁发一次，不额外赠送XP。',18),
('A1','首个合并','成就徽章','首次被维护者接纳且个人基础分至少15 XP的开源贡献。 每种只颁发一次，不额外赠送XP。',19),
('A2','一人也开场','成就徽章','校园大使独立组织首次合格小组交流，满足O01证据。 每种只颁发一次，不额外赠送XP。',20),
('A3','点亮一校','成就徽章','参与校园节点首次稳定启动，有实际分工且O05已验收。 每种只颁发一次，不额外赠送XP。',21),
('A4','文档补光灯','成就徽章','至少5项实质文档贡献，T03或相关文档工作累计150 XP。 每种只颁发一次，不额外赠送XP。',22),
('A5','接力火炬','成就徽章','完成O08或等价交接，新接任者独立运行1个周期。 每种只颁发一次，不额外赠送XP。',23),
('A6','捉虫小能手','成就徽章','至少5个被确认的不同有效问题反馈或修复。 每种只颁发一次，不额外赠送XP。',24),
('A7','跨校虫洞','成就徽章','两个及以上校园共同完成可用成果，本人有有效贡献。 每种只颁发一次，不额外赠送XP。',25),
('A8','复用引力场','成就徽章','一份成果达到两个独立团队复用的R奖励标准。 每种只颁发一次，不额外赠送XP。',26),
('A9','长跑猫','成就徽章','三个不同自然月，每月实际完成至少40 XP。 每种只颁发一次，不额外赠送XP。',27),
('A10','幕后守护者','成就徽章','同一资源完成三个不重叠的M05维护周期。 每种只颁发一次，不额外赠送XP。',28),
('A11','新星点灯人','成就徽章','帮助两位不同新人各完成两项有效贡献，带教已独立核验。 每种只颁发一次，不额外赠送XP。',29),
('campus','校园大使','认证身份','完成校园联系资料与活动规范说明后启用。身份与个人等级分离，不自动获得审核或发布权限。',30);
commit;
