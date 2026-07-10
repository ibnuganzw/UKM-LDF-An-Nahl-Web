import { useCallback, useEffect, useState } from 'react';
import styles from './AdminAnggota.module.css';
import { Badge, GlassCard } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import { isMemberCurrentlyActive } from '../lib/memberStatus';
import type { AcademicStatus, MembershipStatus, UserRole } from '../types';

interface MemberRow {
  id: string;
  name: string;
  nim: string;
  angkatan_year: number;
  email: string;
  email_confirmed_at: string | null;
  role: UserRole;
  status: MembershipStatus;
  academic_override: AcademicStatus | null;
  created_at: string;
}

type Tab = 'pending' | 'admins' | 'roster';

const ADMIN_SEAT_LIMIT = 2;

export default function AdminAnggota() {
  const [tab, setTab] = useState<Tab>('pending');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, name, nim, angkatan_year, email, email_confirmed_at, role, status, academic_override, created_at')
      .order('created_at', { ascending: false });
    setMembers((data as MemberRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingRows = members.filter((m) => m.status === 'pending' && m.email_confirmed_at);
  const rejectedRows = members.filter((m) => m.status === 'rejected');
  const adminRows = members.filter((m) => m.role === 'admin' || m.role === 'super_admin');
  const promotableRows = members.filter((m) => m.role === 'member' && m.status === 'active');
  const adminSeatsUsed = adminRows.filter((m) => m.role === 'admin').length;
  const rosterRows = members.filter((m) => m.role === 'member' && m.status === 'active');

  const runAction = async (id: string, action: () => PromiseLike<{ error: { message: string } | null }>) => {
    setActionError(null);
    setBusyId(id);
    try {
      const { error } = await action();
      if (error) {
        setActionError(error.message);
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const approve = (id: string) =>
    runAction(id, () => supabase.rpc('set_member_status', { p_target_id: id, p_new_status: 'active' }));
  const reject = (id: string) =>
    runAction(id, () => supabase.rpc('set_member_status', { p_target_id: id, p_new_status: 'rejected' }));
  const reconsider = (id: string) =>
    runAction(id, () => supabase.rpc('set_member_status', { p_target_id: id, p_new_status: 'pending' }));
  const promote = (id: string) =>
    runAction(id, () => supabase.rpc('set_member_role', { p_target_id: id, p_new_role: 'admin' }));
  const demote = (id: string) =>
    runAction(id, () => supabase.rpc('set_member_role', { p_target_id: id, p_new_role: 'member' }));
  const setOverride = (id: string, value: AcademicStatus | null) =>
    runAction(id, () => supabase.rpc('set_academic_override', { p_target_id: id, p_value: value }));

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.eyebrow}>Panel Admin</div>
        <h1 className={styles.h1}>Kelola Anggota</h1>
      </div>

      <div className={styles.tabs}>
        <button className={tab === 'pending' ? styles.tabActive : styles.tab} onClick={() => setTab('pending')}>
          Menunggu Persetujuan{pendingRows.length > 0 ? ` (${pendingRows.length})` : ''}
        </button>
        <button className={tab === 'admins' ? styles.tabActive : styles.tab} onClick={() => setTab('admins')}>
          Kelola Admin
        </button>
        <button className={tab === 'roster' ? styles.tabActive : styles.tab} onClick={() => setTab('roster')}>
          Semua Anggota
        </button>
      </div>

      {actionError && <div className={styles.error}>{actionError}</div>}
      {loading && <div className={styles.loading}>Memuat…</div>}

      {!loading && tab === 'pending' && (
        <div className={styles.list}>
          <div className={styles.subHeading}>Menunggu persetujuan</div>
          {pendingRows.length === 0 && <div className={styles.empty}>Tidak ada pendaftaran yang menunggu.</div>}
          {pendingRows.map((m) => (
            <GlassCard key={m.id} radius={20} padding="16px 18px" className={styles.row}>
              <div className={styles.rowInfo}>
                <div className={styles.rowName}>{m.name}</div>
                <div className={styles.rowMeta}>
                  NIM {m.nim} · Angkatan {m.angkatan_year} · {m.email}
                </div>
              </div>
              <div className={styles.rowActions}>
                <button className={styles.approveBtn} disabled={busyId === m.id} onClick={() => approve(m.id)}>
                  Setujui
                </button>
                <button className={styles.rejectBtn} disabled={busyId === m.id} onClick={() => reject(m.id)}>
                  Tolak
                </button>
              </div>
            </GlassCard>
          ))}

          {rejectedRows.length > 0 && (
            <>
              <div className={styles.subHeading}>Ditolak</div>
              {rejectedRows.map((m) => (
                <GlassCard key={m.id} radius={20} padding="16px 18px" className={styles.row}>
                  <div className={styles.rowInfo}>
                    <div className={styles.rowName}>{m.name}</div>
                    <div className={styles.rowMeta}>
                      NIM {m.nim} · Angkatan {m.angkatan_year} · {m.email}
                    </div>
                  </div>
                  <div className={styles.rowActions}>
                    <button className={styles.approveBtn} disabled={busyId === m.id} onClick={() => reconsider(m.id)}>
                      Pertimbangkan lagi
                    </button>
                  </div>
                </GlassCard>
              ))}
            </>
          )}
        </div>
      )}

      {!loading && tab === 'admins' && (
        <div className={styles.list}>
          <div className={styles.subHeading}>Admin saat ini ({adminSeatsUsed}/{ADMIN_SEAT_LIMIT} slot)</div>
          {adminRows.map((m) => (
            <GlassCard key={m.id} radius={20} padding="16px 18px" className={styles.row}>
              <div className={styles.rowInfo}>
                <div className={styles.rowName}>{m.name}</div>
                <div className={styles.rowMeta}>NIM {m.nim} · {m.email}</div>
              </div>
              <div className={styles.rowActions}>
                {m.role === 'super_admin' ? (
                  <Badge color="#E8C766" uppercase={false}>Pemilik — tidak bisa diubah</Badge>
                ) : (
                  <button className={styles.rejectBtn} disabled={busyId === m.id} onClick={() => demote(m.id)}>
                    Turunkan ke anggota
                  </button>
                )}
              </div>
            </GlassCard>
          ))}

          <div className={styles.subHeading}>
            Angkat admin baru{adminSeatsUsed >= ADMIN_SEAT_LIMIT ? ' (kuota penuh)' : ''}
          </div>
          {promotableRows.length === 0 && <div className={styles.empty}>Tidak ada anggota aktif lain.</div>}
          {promotableRows.map((m) => (
            <GlassCard key={m.id} radius={20} padding="16px 18px" className={styles.row}>
              <div className={styles.rowInfo}>
                <div className={styles.rowName}>{m.name}</div>
                <div className={styles.rowMeta}>NIM {m.nim} · Angkatan {m.angkatan_year}</div>
              </div>
              <div className={styles.rowActions}>
                <button
                  className={styles.approveBtn}
                  disabled={busyId === m.id || adminSeatsUsed >= ADMIN_SEAT_LIMIT}
                  onClick={() => promote(m.id)}
                >
                  Jadikan admin
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {!loading && tab === 'roster' && (
        <div className={styles.list}>
          <div className={styles.subHeading}>Semua anggota ({rosterRows.length})</div>
          {rosterRows.length === 0 && <div className={styles.empty}>Belum ada anggota aktif.</div>}
          {rosterRows.map((m) => {
            const active = isMemberCurrentlyActive({
              status: m.status,
              role: m.role,
              angkatanYear: m.angkatan_year,
              academicOverride: m.academic_override,
            });
            return (
              <GlassCard key={m.id} radius={20} padding="16px 18px" className={styles.row}>
                <div className={styles.rowInfo}>
                  <div className={styles.rowName}>{m.name}</div>
                  <div className={styles.rowMeta}>NIM {m.nim} · Angkatan {m.angkatan_year}</div>
                </div>
                <div className={styles.rowActions}>
                  <Badge color={active ? '#5CCBA0' : '#8E99BB'} uppercase={false}>
                    {active ? 'Aktif' : 'Alumni'}
                  </Badge>
                  {m.academic_override && (
                    <Badge color="#E8C766" uppercase={false}>Override manual</Badge>
                  )}
                  {active ? (
                    <button className={styles.rejectBtn} disabled={busyId === m.id} onClick={() => setOverride(m.id, 'inactive')}>
                      Set Alumni
                    </button>
                  ) : (
                    <button className={styles.approveBtn} disabled={busyId === m.id} onClick={() => setOverride(m.id, 'active')}>
                      Set Aktif
                    </button>
                  )}
                  {m.academic_override && (
                    <button className={styles.rejectBtn} disabled={busyId === m.id} onClick={() => setOverride(m.id, null)}>
                      Reset Otomatis
                    </button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
