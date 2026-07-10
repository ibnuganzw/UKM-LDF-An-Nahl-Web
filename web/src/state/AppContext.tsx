import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AcademicStatus, MembershipStatus, Profile, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';

interface ProfileRow {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  name: string;
  nim: string;
  angkatan_year: number;
  role: UserRole;
  status: MembershipStatus;
  academic_override: AcademicStatus | null;
  created_at: string;
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    emailConfirmedAt: row.email_confirmed_at,
    name: row.name,
    nim: row.nim,
    angkatanYear: row.angkatan_year,
    role: row.role,
    status: row.status,
    academicOverride: row.academic_override,
    createdAt: row.created_at,
  };
}

interface AppContextValue {
  session: Session | null;
  profile: Profile | null;
  authLoading: boolean;
  profileLoading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    // This callback must stay synchronous (state update only) — calling other
    // supabase-js methods (e.g. awaiting a DB query) directly inside it risks
    // a documented deadlock. Profile fetching happens in the effect below
    // instead, keyed off the resulting session.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single<ProfileRow>();
    setProfile(error || !data ? null : toProfile(data));
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    void fetchProfile(userId);
  }, [session?.user.id, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user.id) await fetchProfile(session.user.id);
  }, [session?.user.id, fetchProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({ session, profile, authLoading, profileLoading, logout, refreshProfile }),
    [session, profile, authLoading, profileLoading, logout, refreshProfile],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
