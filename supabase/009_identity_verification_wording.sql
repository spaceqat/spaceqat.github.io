-- Identity verification wording only; no awards or permissions are changed.
begin;
update public.badge_catalog set description='提供本人属于委员单位的有效证明，或直接联系量立方工作人员核验，经确认后授予。成员身份不含代表的活动申请权限。' where id='committee_member';
update public.badge_catalog set description='提供本人属于共建单位的有效证明，或直接联系量立方工作人员核验，经确认后授予。成员身份不含代表的活动申请权限。' where id='partner_member';
update public.badge_catalog set description='提供本人属于委员单位的有效证明，或直接联系量立方工作人员核验，经确认后授予。代表可申请发起活动或 host/cohost/sponsor，活动须另行审核。' where id='committee_representative';
update public.badge_catalog set description='提供本人属于共建单位的有效证明，或直接联系量立方工作人员核验，经确认后授予。代表可申请发起活动或 host/cohost/sponsor，活动须另行审核。' where id='partner_representative';
commit;
