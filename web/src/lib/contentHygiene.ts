import type { Agenda } from '../types';

/**
 * Temporary publication guard for rows that are known to be internal test
 * records in the current Supabase project. Admin screens intentionally bypass
 * this guard so an authorised pengurus can review and delete the rows at source.
 *
 * Keep the signature exact: a generic title such as "Review" may be legitimate
 * on another date and must not be hidden accidentally.
 */
const INTERNAL_TEST_AGENDA_SIGNATURES = new Set([
  'Ibnu Ganteng|2026-07-10',
  'Review|2026-07-10',
]);

export function isInternalTestAgenda(agenda: Pick<Agenda, 'title' | 'eventDate'>): boolean {
  return INTERNAL_TEST_AGENDA_SIGNATURES.has(`${agenda.title.trim()}|${agenda.eventDate}`);
}
