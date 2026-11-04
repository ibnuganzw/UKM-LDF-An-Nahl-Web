import mammoth from 'mammoth';
import type { DivisionRole, OrgPositionKey } from '../types';

export interface ImportedCorePosition {
  name: string;
  roleTitle: string;
}

export interface ImportedDivisionMember {
  name: string;
  role: DivisionRole;
}

export interface ImportedDivision {
  name: string;
  description: string;
  color: string;
  members: ImportedDivisionMember[];
}

export interface OrgStructureImportDraft {
  core: Partial<Record<OrgPositionKey, ImportedCorePosition>>;
  divisions: ImportedDivision[];
  warnings: string[];
}

export interface OrgStructureImportIssue {
  level: 'error' | 'warning';
  message: string;
}

const DIVISION_COLORS = ['#5CCBA0', '#8FAAF5', '#5FC6DE', '#E8C766', '#EE9AC0', '#C39BE8'];

const CORE_LABELS: Array<{ key: OrgPositionKey; label: string }> = [
  { key: 'dosen_pembina', label: 'Dosen Pembina' },
  { key: 'ketua_umum', label: 'Ketua Umum' },
  { key: 'sekretaris_umum', label: 'Sekretaris Umum' },
  { key: 'bendahara_umum', label: 'Bendahara Umum' },
];

const ROLE_MARKER = /(?:^|[\n\r;]|\s)(wakil\s*(?:ketua\s*)?(?:divisi|bidang|departemen)?|wakadiv|wakabid|wakadep|ketua\s*(?:divisi|bidang|departemen)?|kadiv|kabid|kadep|sekretaris\s*(?:divisi|bidang|departemen)?|sekdiv|sekbid|sekdep|bendahara\s*(?:divisi|bidang|departemen)?|bendiv|bendahari|anggota)\s*:/gi;
const DIVISION_MARKER = /(?:^|[\n\r;]|\s)(?:\d+\s*[.)]\s*)?(?:divisi|departemen|bidang|biro)\s+([^:\n]+?)\s*:/gi;

function cleanText(value: string): string {
  return value
    .replace(/[\u00a0\t]+/g, ' ')
    .replace(/(\S)&(\S)/g, '$1 & $2')
    .replace(/&(?=\S)/g, '& ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonical(value: string): string {
  return cleanText(value).toLocaleLowerCase('id-ID');
}

function roleFromLabel(label: string): DivisionRole {
  const normalized = canonical(label).replace(/\s/g, '');
  if (normalized.startsWith('wakil') || normalized.startsWith('waka')) return 'wakil';
  if (normalized.startsWith('sek')) return 'sekretaris';
  if (normalized.startsWith('bend')) return 'bendahara';
  if (normalized.startsWith('anggota')) return 'anggota';
  return 'ketua';
}

function splitNames(value: string): string[] {
  const normalized = value
    .replace(/(?:^|\s)\d+\s*[.)]\s*/g, '\n')
    .replace(/[•▪◦]/g, '\n')
    .replace(/\s*;\s*/g, '\n');

  return normalized
    .split('\n')
    .map(cleanText)
    .filter(Boolean);
}

function parseCore(text: string): Partial<Record<OrgPositionKey, ImportedCorePosition>> {
  const markers = Array.from(text.matchAll(/(?:Dosen Pembina|Ketua Umum|Sekretaris Umum|Bendahara Umum)\s*:/gi));
  const result: Partial<Record<OrgPositionKey, ImportedCorePosition>> = {};

  markers.forEach((marker, index) => {
    const label = cleanText(marker[0].replace(/:$/, ''));
    const core = CORE_LABELS.find((candidate) => canonical(candidate.label) === canonical(label));
    if (!core || marker.index === undefined) return;

    const nextStart = markers[index + 1]?.index ?? text.search(DIVISION_MARKER);
    const end = nextStart >= 0 ? nextStart : text.length;
    const name = cleanText(text.slice(marker.index + marker[0].length, end));
    if (name) result[core.key] = { name, roleTitle: core.label };
  });

  return result;
}

function parseDivisionMembers(segment: string): ImportedDivisionMember[] {
  const markers = Array.from(segment.matchAll(ROLE_MARKER));
  const members: ImportedDivisionMember[] = [];

  markers.forEach((marker, index) => {
    if (marker.index === undefined) return;
    const end = markers[index + 1]?.index ?? segment.length;
    const names = splitNames(segment.slice(marker.index + marker[0].length, end));
    const role = roleFromLabel(marker[1] ?? '');
    names.forEach((name) => members.push({ name, role }));
  });

  return members;
}

/**
 * Turns Word's extracted text into a conservative organisational draft. The
 * draft never changes data on its own: an admin can correct every detected
 * division, role, and name before applying it.
 */
export function parseOrgStructureText(input: string): OrgStructureImportDraft {
  const text = input.replace(/\r\n?/g, '\n').replace(/[\u00a0\t]+/g, ' ');
  const divisionMatches = Array.from(text.matchAll(DIVISION_MARKER));
  const divisions: ImportedDivision[] = [];
  const warnings: string[] = [];

  divisionMatches.forEach((match, index) => {
    if (match.index === undefined) return;
    const name = cleanText(match[1] ?? '');
    if (!name) return;

    const end = divisionMatches[index + 1]?.index ?? text.length;
    const members = parseDivisionMembers(text.slice(match.index + match[0].length, end));
    if (members.length === 0) warnings.push(`Tidak menemukan jabatan atau anggota untuk divisi ${name}.`);

    divisions.push({
      name,
      description: `Struktur dan kepengurusan ${name}.`,
      color: DIVISION_COLORS[index % DIVISION_COLORS.length] ?? '#8FAAF5',
      members,
    });
  });

  if (divisionMatches.length === 0) {
    warnings.push('Tidak menemukan penanda divisi. Gunakan nama seperti “Divisi Syiar:” atau koreksi hasil secara manual.');
  }

  const core = parseCore(text);
  const missingCore = CORE_LABELS.filter((item) => !core[item.key]).map((item) => item.label);
  if (missingCore.length > 0) {
    warnings.push(`${missingCore.join(', ')} tidak ditemukan dan akan dibiarkan seperti susunan yang sedang aktif.`);
  }

  return { core, divisions, warnings };
}

function textFromDocxHtml(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const prose = Array.from(document.body.querySelectorAll('h1, h2, h3, h4, p, li'))
    .filter((element) => !element.closest('table'))
    .map((element) => cleanText(element.textContent ?? ''))
    .filter(Boolean);

  const tableLines = Array.from(document.body.querySelectorAll('table')).flatMap((table) => {
    const rows = Array.from(table.querySelectorAll('tr'))
      .map((row) => Array.from(row.querySelectorAll('th, td')).map((cell) => cleanText(cell.textContent ?? '')))
      .filter((cells) => cells.some(Boolean));
    if (rows.length === 0) return [];

    const headers = rows[0]?.map(canonical) ?? [];
    const divisionColumn = headers.findIndex((header) => /^(divisi|departemen|bidang|biro)$/.test(header));
    const roleColumn = headers.findIndex((header) => /^(jabatan|posisi|peran)$/.test(header));
    const nameColumn = headers.findIndex((header) => /^(nama|pengurus|anggota)$/.test(header));

    if (roleColumn < 0 || nameColumn < 0) return rows.map((cells) => cells.join(': '));

    const groupedDivisions = new Map<string, string[]>();
    const coreLines: string[] = [];
    rows.slice(1).forEach((cells) => {
      const role = cells[roleColumn] ?? '';
      const name = cells[nameColumn] ?? '';
      if (!role || !name) return;
      const division = divisionColumn >= 0 ? cells[divisionColumn] ?? '' : '';
      if (!division) {
        coreLines.push(`${role}: ${name}`);
        return;
      }
      const key = cleanText(division);
      groupedDivisions.set(key, [...(groupedDivisions.get(key) ?? []), `${role}: ${name}`]);
    });

    return [
      ...coreLines,
      ...Array.from(groupedDivisions, ([division, people]) => `Divisi ${division}: ${people.join(' ')}`),
    ];
  });

  return [...prose, ...tableLines].join('\n');
}

export async function parseOrgStructureDocx(file: File): Promise<OrgStructureImportDraft> {
  if (!file.name.toLocaleLowerCase('id-ID').endsWith('.docx')) {
    throw new Error('Gunakan file Word berformat .docx.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const draft = parseOrgStructureText(textFromDocxHtml(result.value));
  const conversionWarnings = result.messages.map((message) => message.message).filter(Boolean);
  return { ...draft, warnings: [...draft.warnings, ...conversionWarnings] };
}

export function validateOrgStructureImport(draft: OrgStructureImportDraft): OrgStructureImportIssue[] {
  const issues: OrgStructureImportIssue[] = [];
  const seenDivisions = new Set<string>();

  if (draft.divisions.length === 0) {
    issues.push({ level: 'error', message: 'Tambahkan setidaknya satu divisi sebelum menerapkan struktur.' });
  }

  draft.divisions.forEach((division) => {
    const divisionKey = canonical(division.name);
    if (!divisionKey) {
      issues.push({ level: 'error', message: 'Ada divisi tanpa nama.' });
      return;
    }
    if (seenDivisions.has(divisionKey)) {
      issues.push({ level: 'error', message: `Nama divisi “${division.name}” muncul lebih dari sekali.` });
    }
    seenDivisions.add(divisionKey);

    if (!division.description.trim()) {
      issues.push({ level: 'error', message: `Deskripsi ${division.name} tidak boleh kosong.` });
    }

    const officers = new Set<DivisionRole>();
    division.members.forEach((member) => {
      if (!member.name.trim()) {
        issues.push({ level: 'error', message: `Ada nama kosong di ${division.name}.` });
      }
      if (member.role !== 'anggota') {
        if (officers.has(member.role)) {
          issues.push({ level: 'error', message: `${division.name} memiliki lebih dari satu ${member.role}.` });
        }
        officers.add(member.role);
      }
    });

    if (division.members.length === 0) {
      issues.push({ level: 'warning', message: `${division.name} belum memiliki pengurus atau anggota.` });
    }
  });

  return issues;
}
