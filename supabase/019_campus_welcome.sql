-- Run once after 018. One read receipt per appointment; no email delivery.
begin;
alter table public.campus_appointments add column notice_read_at timestamptz;
create function public.my_campus_welcome() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'id',a.id,'name',c.details->>'name','school',coalesce(s.school_name,c.details->>'school'),
  'space_id',a.space_id,'starts_at',a.starts_at,'ends_at',a.ends_at,'read_at',a.notice_read_at,
  'status',case when a.status in ('active','paused') and a.ends_at<=now() then 'expired'
    when a.status='active' and a.starts_at>now() then 'scheduled' else a.status end)
 from public.campus_appointments a join public.campus_applications c on c.id=a.application_id
 left join public.campus_spaces s on s.id=a.space_id
 where auth.uid() is not null and a.member_id=auth.uid()
 order by a.starts_at desc,a.id desc limit 1;
$$;
create function public.read_campus_welcome(appointment_id uuid) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare receipt timestamptz;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 update public.campus_appointments a set notice_read_at=coalesce(a.notice_read_at,now())
 where a.id=appointment_id and a.member_id=auth.uid() returning notice_read_at into receipt;
 if not found then raise exception 'Notice unavailable' using errcode='42501';end if;
 return receipt;
end;$$;
revoke all on function public.my_campus_welcome(),public.read_campus_welcome(uuid) from public,anon,authenticated;
grant execute on function public.my_campus_welcome(),public.read_campus_welcome(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
