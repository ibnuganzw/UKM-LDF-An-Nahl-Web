import { useMemo } from 'react';
import { AGENDAS } from '../data/agendas';
import { useApp } from '../state/AppContext';
import type { Agenda, AttendanceRecord, EnrichedAgenda, QRSessionMap } from '../types';
import { MON3, dayOffsetToDate, formatAgendaDate, formatRelative, startOfToday } from '../lib/dates';
import { STATUS_COLORS, TYPE_COLORS } from '../lib/colors';

function enrich(agenda: Agenda, qrs: QRSessionMap, att: AttendanceRecord[]): EnrichedAgenda {
  const date = dayOffsetToDate(agenda.dayOffset);
  const today = startOfToday().getTime();
  const t = date.getTime();
  const statusLabel = t < today ? 'Selesai' : t === today ? 'Hari ini' : 'Akan datang';

  return {
    ...agenda,
    date,
    typeColor: TYPE_COLORS[agenda.type],
    dateLabel: formatAgendaDate(date),
    dayNum: date.getDate(),
    monShort: MON3[date.getMonth()],
    relLabel: formatRelative(date),
    statusLabel,
    statusColor: STATUS_COLORS[statusLabel],
    timeLabel: `${agenda.time}–${agenda.end} WIB`,
    hasPemateri: !!agenda.pemateri,
    footerLabel: agenda.pemateri ? `Pemateri: ${agenda.pemateri}` : `PJ: ${agenda.pj}`,
    qrActive: !!qrs[agenda.id],
    attended: att.some((x) => x.id === agenda.id),
  };
}

export interface AgendaCollections {
  all: EnrichedAgenda[];
  upcoming: EnrichedAgenda[];
  past: EnrichedAgenda[];
  soon: EnrichedAgenda[];
  byId: (id: string | null | undefined) => EnrichedAgenda | undefined;
}

export function useAgendas(): AgendaCollections {
  const { qrs, att } = useApp();

  return useMemo(() => {
    const today = startOfToday().getTime();
    const all = AGENDAS.map((a) => enrich(a, qrs, att));
    const upcoming = all.filter((a) => a.date.getTime() >= today).sort((x, y) => x.date.getTime() - y.date.getTime());
    const past = all.filter((a) => a.date.getTime() < today).sort((x, y) => y.date.getTime() - x.date.getTime());
    const byId = (id: string | null | undefined) => all.find((a) => a.id === id);
    return { all, upcoming, past, soon: upcoming.slice(0, 3), byId };
  }, [qrs, att]);
}
