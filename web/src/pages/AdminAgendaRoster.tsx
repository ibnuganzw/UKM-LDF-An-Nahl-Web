import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styles from './AdminAgendaRoster.module.css';
import { Badge, GlassCard } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../state/AppContext';
import { buildAttendanceCsv, downloadCsv, type AttendanceExportRow } from '../lib/csv';
import type { AgendaMode } from '../types';

interface RegistrantRow {
  member_id: string;
  registered_at: string;
  profiles: { name: string; nim: string } | null;
}

interface MemberOption {
  id: string;
  name: string;
  nim: string;
}

interface AttendanceRow {
  member_id: string;
  checked_in_at: string;
  method: 'self_scan' | 'admin_marked';
  profiles: { name: string; nim: string } | null;
}

export default function AdminAgendaRoster() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useApp();
  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaMode, setAgendaMode] = useState<AgendaMode>('registration');
  const [registrants, setRegistrants] = useState<RegistrantRow[]>([]);
  const [attendedIds, setAttendedIds] = useState<Set<string>>(new Set());
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [candidates, setCandidates] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const [
      { data: agenda, error: agendaErr },
      { data: regs, error: regsErr },
      { data: att, error: attErr },
      { data: members, error: membersErr },
    ] = await Promise.all([
      supabase.from('agendas').select('title, mode').eq('id', id).single(),
      // event_registrations has two FKs into profiles (member_id, registered_by), so the
      // embed target must be disambiguated with `!member_id` or PostgREST errors out.
      supabase.from('event_registrations').select('member_id, registered_at, profiles!member_id(name, nim)').eq('agenda_id', id),
      supabase.from('event_attendance').select('member_id, checked_in_at, method, profiles!member_id(name, nim)').eq('agenda_id', id),
      supabase.from('profiles').select('id, name, nim').eq('role', 'member').eq('status', 'active'),
    ]);
    const firstErr = agendaErr || regsErr || attErr || membersErr;
    if (firstErr) {
      setError(firstErr.message);
      setLoading(false);
      return;
    }
    const agendaRow = agenda as { title: string; mode: AgendaMode } | null;
    setAgendaTitle(agendaRow?.title ?? '');
    setAgendaMode(agendaRow?.mode ?? 'registration');
    const regRows = (regs as unknown as RegistrantRow[] | null) ?? [];
    const attRows = (att as unknown as AttendanceRow[] | null) ?? [];
    const memberRows = (members as MemberOption[] | null) ?? [];
    setRegistrants(regRows);
    setAttendanceRows(attRows);
    setAttendedIds(new Set(attRows.map((r) => r.member_id)));
    setMembers(memberRows);
    const registeredIds = new Set(regRows.map((r) => r.member_id));
    setCandidates(memberRows.filter((m) => !registeredIds.has(m.id)));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (memberId: string, action: () => PromiseLike<{ error: { message: string } | null }>) => {
    setError(null);
    setBusyId(memberId);
    try {
      const { error: err } = await action();
      if (err) {
        setError(err.message);
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const addRegistrant = (memberId: string) =>
    runAction(memberId, () =>
      supabase.from('event_registrations').insert({ agenda_id: id, member_id: memberId, registered_by: profile?.id ?? null }),
    );
  const removeRegistrant = (memberId: string) =>
    runAction(memberId, () => supabase.from('event_registrations').delete().eq('agenda_id', id).eq('member_id', memberId));
  const markPresent = (memberId: string) =>
    runAction(memberId, () => supabase.rpc('mark_attendance', { p_agenda_id: id, p_member_id: memberId }));
  const unmarkPresent = (memberId: string) =>
    runAction(memberId, () => supabase.rpc('unmark_attendance', { p_agenda_id: id, p_member_id: memberId }));

  const exportRoster = () => {
    const registrationByMember = new Map(registrants.map((row) => [row.member_id, row]));
    const attendanceByMember = new Map(attendanceRows.map((row) => [row.member_id, row]));
    const baseMembers = agendaMode === 'universal'
      ? members
      : Array.from(new Map([
          ...registrants.map((row) => [row.member_id, { id: row.member_id, name: row.profiles?.name ?? '', nim: row.profiles?.nim ?? '' }] as const),
          ...attendanceRows.map((row) => [row.member_id, { id: row.member_id, name: row.profiles?.name ?? '', nim: row.profiles?.nim ?? '' }] as const),
        ]).values());
    const rows: AttendanceExportRow[] = baseMembers
      .map((member) => {
        const registration = registrationByMember.get(member.id);
        const attendance = attendanceByMember.get(member.id);
        return {
          name: member.name || attendance?.profiles?.name || '(tidak diketahui)',
          nim: member.nim || attendance?.profiles?.nim || '-',
          registered: agendaMode === 'universal' || Boolean(registration),
          registeredAt: registration?.registered_at ?? '',
          attended: Boolean(attendance),
          checkedInAt: attendance?.checked_in_at ?? '',
          method: attendance?.method ?? '',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'id-ID'));
    downloadCsv(`absensi-${id ?? 'agenda'}.csv`, buildAttendanceCsv(rows));
  };

  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.back}>← Panel admin</Link>
      <div className={styles.eyebrow}>Panel Admin</div>
      <div className={styles.titleRow}>
        <h1 className={styles.h1}>{agendaMode === 'universal' ? 'Kehadiran' : 'Peserta'}: {agendaTitle}</h1>
        <button type="button" className={styles.exportBtn} onClick={exportRoster} disabled={loading}>
          Ekspor CSV
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.loading}>Memuat…</div>}

      {!loading && (
        <>
          <div className={styles.subHeading}>{agendaMode === 'universal' ? `Anggota aktif (${members.length})` : `Terdaftar (${registrants.length})`}</div>
          <div className={styles.list}>
            {(agendaMode === 'universal' ? members : registrants).length === 0 && <div className={styles.empty}>{agendaMode === 'universal' ? 'Belum ada anggota aktif.' : 'Belum ada yang mendaftar.'}</div>}
            {(agendaMode === 'universal' ? members : registrants).map((entry) => {
              const memberId = 'member_id' in entry ? entry.member_id : entry.id;
              const memberName = 'member_id' in entry ? entry.profiles?.name : entry.name;
              const memberNim = 'member_id' in entry ? entry.profiles?.nim : entry.nim;
              const present = attendedIds.has(memberId);
              return (
                <GlassCard key={memberId} radius={20} padding="16px 18px" className={styles.row}>
                  <div className={styles.rowInfo}>
                    <div className={styles.rowName}>{memberName ?? '(tidak diketahui)'}</div>
                    <div className={styles.rowMeta}>NIM {memberNim ?? '-'}</div>
                  </div>
                  <div className={styles.rowActions}>
                    {present ? (
                      <>
                        <Badge color="var(--success-light)" uppercase={false}>Hadir</Badge>
                        <button
                          className={styles.rejectBtn}
                          disabled={busyId === memberId}
                          onClick={() => unmarkPresent(memberId)}
                        >
                          Batalkan Hadir
                        </button>
                      </>
                    ) : (
                      <button
                        className={styles.approveBtn}
                        disabled={busyId === memberId}
                        onClick={() => markPresent(memberId)}
                      >
                        Tandai Hadir
                      </button>
                    )}
                    {agendaMode === 'registration' && (
                      <button className={styles.rejectBtn} disabled={busyId === memberId} onClick={() => removeRegistrant(memberId)}>
                        Keluarkan
                      </button>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {agendaMode === 'registration' && <><div className={styles.subHeading}>Tambah peserta manual</div>
          <div className={styles.list}>
            {candidates.length === 0 && <div className={styles.empty}>Tidak ada anggota aktif lain.</div>}
            {candidates.map((m) => (
              <GlassCard key={m.id} radius={20} padding="16px 18px" className={styles.row}>
                <div className={styles.rowInfo}>
                  <div className={styles.rowName}>{m.name}</div>
                  <div className={styles.rowMeta}>NIM {m.nim}</div>
                </div>
                <div className={styles.rowActions}>
                  <button className={styles.approveBtn} disabled={busyId === m.id} onClick={() => addRegistrant(m.id)}>
                    Tambahkan
                  </button>
                </div>
              </GlassCard>
            ))}
          </div></>}
        </>
      )}
    </div>
  );
}
