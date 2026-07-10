import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styles from './AdminAgendaRoster.module.css';
import { Badge, GlassCard } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../state/AppContext';

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

export default function AdminAgendaRoster() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useApp();
  const [agendaTitle, setAgendaTitle] = useState('');
  const [registrants, setRegistrants] = useState<RegistrantRow[]>([]);
  const [attendedIds, setAttendedIds] = useState<Set<string>>(new Set());
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
      supabase.from('agendas').select('title').eq('id', id).single(),
      // event_registrations has two FKs into profiles (member_id, registered_by), so the
      // embed target must be disambiguated with `!member_id` or PostgREST errors out.
      supabase.from('event_registrations').select('member_id, registered_at, profiles!member_id(name, nim)').eq('agenda_id', id),
      supabase.from('event_attendance').select('member_id').eq('agenda_id', id),
      supabase.from('profiles').select('id, name, nim').eq('role', 'member').eq('status', 'active'),
    ]);
    const firstErr = agendaErr || regsErr || attErr || membersErr;
    if (firstErr) {
      setError(firstErr.message);
      setLoading(false);
      return;
    }
    setAgendaTitle((agenda as { title: string } | null)?.title ?? '');
    const regRows = (regs as unknown as RegistrantRow[] | null) ?? [];
    setRegistrants(regRows);
    setAttendedIds(new Set(((att ?? []) as { member_id: string }[]).map((r) => r.member_id)));
    const registeredIds = new Set(regRows.map((r) => r.member_id));
    setCandidates(((members as MemberOption[] | null) ?? []).filter((m) => !registeredIds.has(m.id)));
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

  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.back}>← Panel admin</Link>
      <div className={styles.eyebrow}>Panel Admin</div>
      <h1 className={styles.h1}>Peserta: {agendaTitle}</h1>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.loading}>Memuat…</div>}

      {!loading && (
        <>
          <div className={styles.subHeading}>Terdaftar ({registrants.length})</div>
          <div className={styles.list}>
            {registrants.length === 0 && <div className={styles.empty}>Belum ada yang mendaftar.</div>}
            {registrants.map((r) => {
              const present = attendedIds.has(r.member_id);
              return (
                <GlassCard key={r.member_id} radius={20} padding="16px 18px" className={styles.row}>
                  <div className={styles.rowInfo}>
                    <div className={styles.rowName}>{r.profiles?.name ?? '(tidak diketahui)'}</div>
                    <div className={styles.rowMeta}>NIM {r.profiles?.nim ?? '-'}</div>
                  </div>
                  <div className={styles.rowActions}>
                    {present ? (
                      <>
                        <Badge color="#5CCBA0" uppercase={false}>Hadir</Badge>
                        <button
                          className={styles.rejectBtn}
                          disabled={busyId === r.member_id}
                          onClick={() => unmarkPresent(r.member_id)}
                        >
                          Batalkan Hadir
                        </button>
                      </>
                    ) : (
                      <button
                        className={styles.approveBtn}
                        disabled={busyId === r.member_id}
                        onClick={() => markPresent(r.member_id)}
                      >
                        Tandai Hadir
                      </button>
                    )}
                    <button
                      className={styles.rejectBtn}
                      disabled={busyId === r.member_id}
                      onClick={() => removeRegistrant(r.member_id)}
                    >
                      Keluarkan
                    </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          <div className={styles.subHeading}>Tambah peserta manual</div>
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
          </div>
        </>
      )}
    </div>
  );
}
