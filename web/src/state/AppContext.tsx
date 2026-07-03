import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AttendanceRecord, AuthUser, QRSessionMap, UserRole } from '../types';
import { loadJSON, removeKey, saveJSON } from '../lib/storage';
import { dayOffsetToDate } from '../lib/dates';
import { generateQrCode } from '../lib/qr';

const USER_KEY = 'annahl_user';
const QRS_KEY = 'annahl_qrs';
const ATT_KEY = 'annahl_att';

function seedAttendance(): AttendanceRecord[] {
  return [
    { id: 'p1', ts: dayOffsetToDate(-6).getTime() },
    { id: 'p3', ts: dayOffsetToDate(-9).getTime() },
    { id: 'p2', ts: dayOffsetToDate(-12).getTime() },
  ];
}

interface AppContextValue {
  user: AuthUser | null;
  qrs: QRSessionMap;
  att: AttendanceRecord[];
  login: (name: string, role: UserRole) => void;
  logout: () => void;
  makeQR: (agendaId: string) => void;
  killQR: (agendaId: string) => void;
  checkIn: (agendaId: string) => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadJSON<AuthUser | null>(USER_KEY, null));
  const [qrs, setQrs] = useState<QRSessionMap>(() => loadJSON<QRSessionMap>(QRS_KEY, {}));
  const [att, setAtt] = useState<AttendanceRecord[]>(() => {
    const existing = loadJSON<AttendanceRecord[] | null>(ATT_KEY, null);
    if (existing) return existing;
    const seeded = seedAttendance();
    saveJSON(ATT_KEY, seeded);
    return seeded;
  });

  const login = useCallback((name: string, role: UserRole) => {
    const nextUser: AuthUser = {
      name: role === 'admin' ? 'Admin An-Nahl' : name.trim() || 'Sahabat An-Nahl',
      role,
    };
    saveJSON(USER_KEY, nextUser);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    removeKey(USER_KEY);
    setUser(null);
  }, []);

  const makeQR = useCallback((agendaId: string) => {
    setQrs((prev) => {
      if (prev[agendaId]) return prev;
      const next = { ...prev, [agendaId]: generateQrCode(agendaId) };
      saveJSON(QRS_KEY, next);
      return next;
    });
  }, []);

  const killQR = useCallback((agendaId: string) => {
    setQrs((prev) => {
      if (!(agendaId in prev)) return prev;
      const next = { ...prev };
      delete next[agendaId];
      saveJSON(QRS_KEY, next);
      return next;
    });
  }, []);

  const checkIn = useCallback(
    (agendaId: string): boolean => {
      if (!qrs[agendaId]) return false;
      setAtt((prev) => {
        if (prev.some((x) => x.id === agendaId)) return prev;
        const next = [...prev, { id: agendaId, ts: Date.now() }];
        saveJSON(ATT_KEY, next);
        return next;
      });
      return true;
    },
    [qrs],
  );

  const value = useMemo<AppContextValue>(
    () => ({ user, qrs, att, login, logout, makeQR, killQR, checkIn }),
    [user, qrs, att, login, logout, makeQR, killQR, checkIn],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
