import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { useNow } from './useNow';
import type { Agenda, AgendaStatus, AgendaType, EnrichedAgenda } from '../types';
import { MON3, formatAgendaDate, formatRelative, startOfToday } from '../lib/dates';
import { STATUS_COLORS, TYPE_COLORS } from '../lib/colors';
import { supabase } from '../lib/supabaseClient';

interface AgendaRow {
  id: string;
  title: string;
  type: AgendaType;
  mode: 'universal' | 'registration';
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  pj: string;
  pemateri: string | null;
  description: string;
  qr_opened_at: string | null;
  created_by: string | null;
  created_at: string;
}

function toAgenda(row: AgendaRow): Agenda {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    mode: row.mode,
    eventDate: row.event_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    location: row.location,
    pj: row.pj,
    pemateri: row.pemateri,
    description: row.description,
    qrOpenedAt: row.qr_opened_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function enrich(agenda: Agenda, attendedIds: Set<string>, registeredIds: Set<string>): EnrichedAgenda {
  const date = new Date(`${agenda.eventDate}T00:00:00`);
  const today = startOfToday().getTime();
  const t = date.getTime();
  const statusLabel: AgendaStatus = t < today ? 'Selesai' : t === today ? 'Hari ini' : 'Akan datang';

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
    timeLabel: `${agenda.startTime}–${agenda.endTime} WIB`,
    hasPemateri: !!agenda.pemateri,
    footerLabel: agenda.pemateri ? `Pemateri: ${agenda.pemateri}` : `PJ: ${agenda.pj}`,
    qrActive: !!agenda.qrOpenedAt,
    attended: attendedIds.has(agenda.id),
    registered: registeredIds.has(agenda.id),
  };
}

export interface AgendaCollections {
  all: EnrichedAgenda[];
  upcoming: EnrichedAgenda[];
  past: EnrichedAgenda[];
  soon: EnrichedAgenda[];
  byId: (id: string | null | undefined) => EnrichedAgenda | undefined;
  loading: boolean;
  refresh: () => void;
}

export function useAgendas(): AgendaCollections {
  const { session } = useApp();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [attendedIds, setAttendedIds] = useState<Set<string>>(new Set());
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const userId = session?.user.id;

  const load = useCallback(async () => {
    setLoading(true);
    const { data: agendaRows } = await supabase
      .from('agendas')
      .select(
        'id, title, type, mode, event_date, start_time, end_time, location, pj, pemateri, description, qr_opened_at, created_by, created_at',
      )
      .order('event_date', { ascending: true });
    setAgendas(((agendaRows as AgendaRow[] | null) ?? []).map(toAgenda));

    if (userId) {
      const [{ data: attRows }, { data: regRows }] = await Promise.all([
        supabase.from('event_attendance').select('agenda_id').eq('member_id', userId),
        supabase.from('event_registrations').select('agenda_id').eq('member_id', userId),
      ]);
      setAttendedIds(new Set(((attRows ?? []) as { agenda_id: string }[]).map((r) => r.agenda_id)));
      setRegisteredIds(new Set(((regRows ?? []) as { agenda_id: string }[]).map((r) => r.agenda_id)));
    } else {
      setAttendedIds(new Set());
      setRegisteredIds(new Set());
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // A page can stay mounted across midnight with no data change at all —
  // ticking once a minute (not every second, day labels don't need that)
  // makes the memo below re-check the actual calendar day.
  const now = useNow(60_000);
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  return useMemo(() => {
    const today = startOfToday().getTime();
    const all = agendas.map((a) => enrich(a, attendedIds, registeredIds));
    const upcoming = all.filter((a) => a.date.getTime() >= today).sort((x, y) => x.date.getTime() - y.date.getTime());
    const past = all.filter((a) => a.date.getTime() < today).sort((x, y) => y.date.getTime() - x.date.getTime());
    const byId = (id: string | null | undefined) => all.find((a) => a.id === id);
    return { all, upcoming, past, soon: upcoming.slice(0, 3), byId, loading, refresh };
  }, [agendas, attendedIds, registeredIds, dayKey, loading, refresh]);
}
