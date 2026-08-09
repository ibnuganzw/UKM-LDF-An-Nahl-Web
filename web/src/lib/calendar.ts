import type { Agenda } from '../types';

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function localIcsDate(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

function googleUtcDate(date: string, time: string): string {
  return new Date(`${date}T${time}:00+07:00`).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildAgendaIcs(agenda: Pick<Agenda, 'id' | 'title' | 'description' | 'eventDate' | 'startTime' | 'endTime' | 'location' | 'pj'>): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LDF An-Nahl FKH USK//Agenda//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(agenda.id)}@ldf-annahl`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Asia/Jakarta:${localIcsDate(agenda.eventDate, agenda.startTime)}`,
    `DTEND;TZID=Asia/Jakarta:${localIcsDate(agenda.eventDate, agenda.endTime)}`,
    `SUMMARY:${escapeIcs(agenda.title)}`,
    `DESCRIPTION:${escapeIcs(`${agenda.description}\n\nPenanggung jawab: ${agenda.pj}`)}`,
    `LOCATION:${escapeIcs(agenda.location)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(`Pengingat: ${agenda.title}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function buildGoogleCalendarUrl(agenda: Pick<Agenda, 'title' | 'description' | 'eventDate' | 'startTime' | 'endTime' | 'location' | 'pj'>): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: agenda.title,
    dates: `${googleUtcDate(agenda.eventDate, agenda.startTime)}/${googleUtcDate(agenda.eventDate, agenda.endTime)}`,
    details: `${agenda.description}\n\nPenanggung jawab: ${agenda.pj}`,
    location: agenda.location,
    ctz: 'Asia/Jakarta',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadAgendaIcs(agenda: Agenda): void {
  const blob = new Blob([buildAgendaIcs(agenda)], { type: 'text/calendar;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `agenda-${agenda.eventDate}-${agenda.id.slice(0, 8)}.ics`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
}

export { escapeIcs };
