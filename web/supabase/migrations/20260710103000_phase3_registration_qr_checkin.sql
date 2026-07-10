-- Registration-mode agendas also get self-service QR check-in: admin still
-- opens/closes the QR same as universal mode, but check_in() additionally
-- requires an existing event_registrations row for that member. Without this,
-- a PJ/admin who isn't personally attending a niche review session (e.g. a
-- subject-specific study review) would have to manually mark every attendee
-- from the roster page instead of just handing off a QR at the door.
create or replace function public.check_in(p_agenda_id uuid, p_token text)
returns public.event_attendance
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agenda public.agendas;
  v_profile public.profiles;
  v_result public.event_attendance;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null or not public.is_member_currently_active(v_profile) then
    raise exception 'Hanya anggota aktif yang bisa absen';
  end if;

  select * into v_agenda from public.agendas where id = p_agenda_id;
  if v_agenda.id is null then
    raise exception 'Agenda tidak ditemukan';
  end if;

  if v_agenda.qr_token is null or v_agenda.qr_token <> p_token then
    raise exception 'QR tidak valid atau sudah tidak aktif';
  end if;

  if v_agenda.mode = 'registration' and not exists (
    select 1 from public.event_registrations
    where agenda_id = p_agenda_id and member_id = auth.uid()
  ) then
    raise exception 'Kamu belum terdaftar untuk agenda ini';
  end if;

  if (now() at time zone 'Asia/Jakarta') > (v_agenda.event_date + v_agenda.end_time + interval '2 hours') then
    raise exception 'Sesi absensi sudah berakhir';
  end if;

  insert into public.event_attendance (agenda_id, member_id, method)
  values (p_agenda_id, auth.uid(), 'self_scan')
  on conflict (agenda_id, member_id) do nothing;

  select * into v_result from public.event_attendance
    where agenda_id = p_agenda_id and member_id = auth.uid();
  return v_result;
end;
$$;

revoke execute on function public.check_in(uuid, text) from public;
grant execute on function public.check_in(uuid, text) to authenticated;
