import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, GlassCard } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import styles from './AdminAudit.module.css';

interface AuditRow {
  id: number;
  actor_id: string | null;
  action: 'insert' | 'update' | 'delete';
  entity_type: string;
  entity_id: string | null;
  details: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  created_at: string;
  actor: { name: string; email: string } | null;
}

const ENTITY_LABELS: Record<string, string> = {
  agendas: 'Agenda',
  event_registrations: 'Pendaftaran acara',
  event_attendance: 'Absensi',
  articles: 'Artikel',
  profiles: 'Anggota',
  org_positions: 'Struktur organisasi',
  division_members: 'Anggota divisi',
};

const ACTION_LABELS = { insert: 'Membuat', update: 'Mengubah', delete: 'Menghapus' } as const;

function changedFields(row: AuditRow): string[] {
  const before = row.details?.before ?? {};
  const after = row.details?.after ?? {};
  if (row.action === 'insert') return Object.keys(after);
  if (row.action === 'delete') return Object.keys(before);
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

export default function AdminAudit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [migrationMissing, setMigrationMissing] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('admin_audit_logs')
      .select('id, actor_id, action, entity_type, entity_id, details, created_at, actor:profiles!actor_id(name, email)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (queryError) {
      const missing = queryError.code === '42P01' || /admin_audit_logs/i.test(queryError.message);
      setMigrationMissing(missing);
      if (!missing) setError(queryError.message);
      setRows([]);
    } else {
      setRows((data as unknown as AuditRow[] | null) ?? []);
      setMigrationMissing(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleRows = useMemo(
    () => filter === 'all' ? rows : rows.filter((row) => row.entity_type === filter),
    [filter, rows],
  );

  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.back}>← Panel admin</Link>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Jejak pengelolaan</div>
          <h1>Audit Aktivitas Admin</h1>
          <p>100 perubahan terbaru, dicatat dari database dan tidak dapat diedit melalui aplikasi.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}>Muat ulang</button>
      </div>

      {migrationMissing ? (
        <EmptyState title="Audit log belum aktif di database." body="Terapkan migration phase10_admin_audit_log terlebih dahulu. Fitur admin lain tetap dapat digunakan." />
      ) : error ? (
        <EmptyState title="Audit log belum dapat dimuat." body={error} action={{ label: 'Coba lagi', onClick: load }} />
      ) : (
        <>
          <label className={styles.filter}>
            <span>Jenis data</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">Semua aktivitas</option>
              {Object.entries(ENTITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {loading && <div className={styles.loading}>Memuat aktivitas…</div>}
          {!loading && visibleRows.length === 0 && <div className={styles.loading}>Belum ada aktivitas admin yang tercatat.</div>}
          <div className={styles.list}>
            {visibleRows.map((row) => {
              const fields = changedFields(row).filter((field) => !['updated_at', 'created_at'].includes(field));
              return (
                <GlassCard key={row.id} radius={18} padding="16px 18px" className={styles.row}>
                  <div className={styles.action} data-action={row.action}>{ACTION_LABELS[row.action]}</div>
                  <div className={styles.body}>
                    <strong>{ENTITY_LABELS[row.entity_type] ?? row.entity_type}</strong>
                    <span>{row.actor?.name ?? row.actor?.email ?? 'Admin yang telah dihapus'} · {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(row.created_at))} WIB</span>
                    {fields.length > 0 && <small>Bidang: {fields.slice(0, 8).join(', ')}{fields.length > 8 ? '…' : ''}</small>}
                  </div>
                  {row.entity_id && <code>{row.entity_id.slice(0, 12)}</code>}
                </GlassCard>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
