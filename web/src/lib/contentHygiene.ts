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

// Staging acceptance record observed in the public feed after project restore.
// Use its ID so edits to the test title/date cannot publish it accidentally.
const INTERNAL_TEST_AGENDA_IDS = new Set([
  '5ca48413-2ddf-4708-96bd-8669b2ceb768',
  '32e2bd52-4000-4438-bc10-3ef1c76b04db',
]);

export function isInternalTestAgenda(agenda: Pick<Agenda, 'title' | 'eventDate'> & Partial<Pick<Agenda, 'id'>>): boolean {
  return (agenda.id !== undefined && INTERNAL_TEST_AGENDA_IDS.has(agenda.id))
    || INTERNAL_TEST_AGENDA_SIGNATURES.has(`${agenda.title.trim()}|${agenda.eventDate}`);
}
