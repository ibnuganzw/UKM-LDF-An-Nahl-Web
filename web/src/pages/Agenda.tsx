import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Agenda.module.css';
import { Badge, FilterChip, GlassCard } from '../components/ui';
import { useAgendas } from '../hooks/useAgendas';
import { AGENDA_FILTERS } from '../lib/filters';
import { soft } from '../lib/colors';
import type { AgendaType } from '../types';

export default function Agenda() {
  const { upcoming, past, loading } = useAgendas();
  const [filter, setFilter] = useState<'Semua' | AgendaType>('Semua');

  const rows = [...upcoming, ...past].filter((a) => filter === 'Semua' || a.type === filter);

  return (
    <div className={styles.page}>
      <div className={styles.eyebrow}>Agenda</div>
      <h1 className={styles.heading}>Kegiatan LDF An-Nahl</h1>
      <p className={styles.lead}>Dari kajian dan mentoring sampai rihlah dan gotong royong — seluruh kegiatan An-Nahl terangkum di sini.</p>

      <div className={styles.chipRow} role="group" aria-label="Filter agenda">
        {AGENDA_FILTERS.map((f) => {
          const active = filter === f;
          return (
            <FilterChip
              key={f}
              label={f}
              active={active}
              onClick={() => setFilter(f)}
              bg={active ? 'linear-gradient(135deg,#E8C766,#C9A227)' : 'rgba(255,255,255,.05)'}
              color={active ? '#241B04' : '#A9B3D1'}
              border={active ? '#C9A227' : 'rgba(232,199,102,.22)'}
            />
          );
        })}
      </div>

      <div className={styles.list}>
        {loading && (
          <div className={styles.loadingList} role="status" aria-label="Memuat agenda">
            {[0, 1, 2].map((item) => <span key={item} className={styles.loadingRow} />)}
          </div>
        )}
        {!loading && rows.map((a) => (
          <GlassCard key={a.id} to={`/agenda/${a.id}`} hover radius={20} padding="16px 18px" className={styles.row}>
            <div className={styles.dateBadge} style={{ background: soft(a.typeColor), borderColor: soft(a.typeColor, '36') }}>
              <span className={styles.dateNum} style={{ color: a.typeColor }}>{a.dayNum}</span>
              <span className={styles.dateMon} style={{ color: a.typeColor }}>{a.monShort}</span>
            </div>
            <div className={styles.rowBody}>
              <div className={styles.badgeLine}>
                <Badge color={a.typeColor} style={{ padding: '3px 10px' }}>{a.type}</Badge>
                <Badge color={a.statusColor} uppercase={false} style={{ fontSize: 11.5, padding: '3px 10px' }}>
                  {a.statusLabel}
                </Badge>
                {a.qrActive && (
                  <Badge color="#5CCBA0" uppercase={false} pulse style={{ fontSize: 11.5, padding: '3px 10px' }}>
                    ● QR aktif
                  </Badge>
                )}
              </div>
              <div className={styles.rowTitle}>{a.title}</div>
              <div className={styles.rowMeta}>{a.timeLabel} · {a.location}</div>
            </div>
            <div className={styles.chevron}>›</div>
          </GlassCard>
        ))}
        {!loading && rows.length === 0 && (
          <section className={styles.empty} role="status">
            <div className={styles.emptyIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
                <path d="M8 3.5v4M16 3.5v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01" />
              </svg>
            </div>
            <h2>{filter === 'Semua' ? 'Belum ada agenda terjadwal.' : `Belum ada agenda ${filter}.`}</h2>
            <p>Jadwal baru akan tampil di sini setelah diumumkan oleh pengurus.</p>
            {filter === 'Semua' ? (
              <Link to="/profil" className={styles.emptyAction}>Kenali kegiatan kami →</Link>
            ) : (
              <button type="button" className={styles.emptyAction} onClick={() => setFilter('Semua')}>Tampilkan semua agenda</button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
