import { useState } from 'react';
import styles from './Agenda.module.css';
import { Badge, FilterChip, GlassCard, Hex } from '../components/ui';
import { useAgendas } from '../hooks/useAgendas';
import { AGENDA_FILTERS } from '../lib/filters';
import { soft } from '../lib/colors';
import type { AgendaType } from '../types';

export default function Agenda() {
  const { upcoming, past } = useAgendas();
  const [filter, setFilter] = useState<'Semua' | AgendaType>('Semua');

  const rows = [...upcoming, ...past].filter((a) => filter === 'Semua' || a.type === filter);

  return (
    <div className={styles.page}>
      <div className={styles.eyebrow}>Agenda</div>
      <h1 className={styles.heading}>Kegiatan LDF An-Nahl</h1>
      <p className={styles.lead}>Dari kajian dan mentoring sampai rihlah dan gotong royong — semua agenda koloni ada di sini.</p>

      <div className={styles.chipRow}>
        {AGENDA_FILTERS.map((f) => {
          const active = filter === f;
          return (
            <FilterChip
              key={f}
              label={f}
              onClick={() => setFilter(f)}
              bg={active ? 'linear-gradient(135deg,#E8C766,#C9A227)' : 'rgba(255,255,255,.05)'}
              color={active ? '#241B04' : '#A9B3D1'}
              border={active ? '#C9A227' : 'rgba(232,199,102,.22)'}
            />
          );
        })}
      </div>

      <div className={styles.list}>
        {rows.map((a) => (
          <GlassCard key={a.id} to={`/agenda/${a.id}`} hover radius={20} padding="16px 18px" className={styles.row}>
            <Hex width={60} height={66} bg={soft(a.typeColor)} className={styles.dateBadge}>
              <span className={styles.dateNum} style={{ color: a.typeColor }}>{a.dayNum}</span>
              <span className={styles.dateMon} style={{ color: a.typeColor }}>{a.monShort}</span>
            </Hex>
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
        {rows.length === 0 && <div className={styles.empty}>Belum ada agenda untuk kategori ini.</div>}
      </div>
    </div>
  );
}
