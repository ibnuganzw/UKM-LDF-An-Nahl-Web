import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isInternalTestAgenda } from './contentHygiene';
import { getIslamicHolidayCountdown } from './islamicCalendar';
import { getNextPrayer } from './prayer';

describe('Phase 0 publication guards', () => {
  it('filters only the exact known internal agenda signatures', () => {
    expect(isInternalTestAgenda({ title: 'Ibnu Ganteng', eventDate: '2026-07-10' })).toBe(true);
    expect(isInternalTestAgenda({ title: 'Review', eventDate: '2026-07-10' })).toBe(true);
    expect(isInternalTestAgenda({ title: 'Review', eventDate: '2026-08-10' })).toBe(false);
  });

  it('never re-labels the final past holiday as today', () => {
    const result = getIslamicHolidayCountdown(new Date(2027, 0, 1, 12));
    expect(result).toEqual({
      name: 'Kalender Hijriah',
      countdown: 'Menunggu tanggal resmi berikutnya',
      available: false,
    });
  });

  it('recognises an observance for the whole local calendar day', () => {
    const result = getIslamicHolidayCountdown(new Date(2026, 7, 25, 18, 30));
    expect(result.name).toBe('Maulid Nabi SAW');
    expect(result.countdown).toBe('Hari ini');
  });

  it('does not manufacture a prayer time when no verified schedule exists', () => {
    expect(getNextPrayer(new Date(), [], 7)).toEqual({
      index: -1,
      name: 'Jadwal',
      time: 'Belum tersedia',
      countdown: 'Belum tersedia',
    });
  });

  it('protects the requested hero bees and both floating markers', () => {
    const hero = readFileSync(new URL('../components/home/Hero.tsx', import.meta.url), 'utf8');
    const motion = readFileSync(new URL('../styles/globals.css', import.meta.url), 'utf8');
    for (const token of ['beeA', 'beeB', 'beeC', 'chipF', 'chipF2']) {
      expect(hero).toContain(token);
      expect(motion).toContain(`.${token}`);
    }
  });
});
