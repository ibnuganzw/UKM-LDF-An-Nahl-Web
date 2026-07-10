import { useCallback, useEffect, useState } from 'react';
import type { OrgPosition, OrgPositionKey } from '../types';
import { supabase } from '../lib/supabaseClient';

interface OrgPositionRow {
  id: string;
  position_key: OrgPositionKey | null;
  tier: number;
  name: string;
  role_title: string | null;
  division_desc: string | null;
  division_color: string | null;
  photo_url: string | null;
  sort_order: number;
  created_at: string;
}

function toOrgPosition(row: OrgPositionRow): OrgPosition {
  return {
    id: row.id,
    positionKey: row.position_key,
    tier: row.tier,
    name: row.name,
    roleTitle: row.role_title,
    divisionDesc: row.division_desc,
    divisionColor: row.division_color,
    photoUrl: row.photo_url,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export interface OrgPositionCollections {
  all: OrgPosition[];
  loading: boolean;
  refresh: () => void;
}

export function useOrgPositions(): OrgPositionCollections {
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('org_positions')
      .select('id, position_key, tier, name, role_title, division_desc, division_color, photo_url, sort_order, created_at')
      .order('tier', { ascending: true })
      .order('sort_order', { ascending: true });
    setPositions(((data as OrgPositionRow[] | null) ?? []).map(toOrgPosition));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { all: positions, loading, refresh };
}
