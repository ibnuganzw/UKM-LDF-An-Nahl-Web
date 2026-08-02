export interface AttendanceExportRow {
  name: string;
  nim: string;
  registered: boolean;
  registeredAt: string;
  attended: boolean;
  checkedInAt: string;
  method: string;
}

export function escapeCsvCell(input: unknown): string {
  let value = input == null ? '' : String(input);
  if (/^[\t\r ]*[=+\-@]/.test(value)) value = `'${value}`;
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildAttendanceCsv(rows: AttendanceExportRow[]): string {
  const header = ['Nama', 'NIM', 'Terdaftar', 'Waktu Daftar', 'Hadir', 'Waktu Hadir', 'Metode'];
  const body = rows.map((row) => [
    row.name,
    row.nim,
    row.registered ? 'Ya' : 'Tidak',
    row.registeredAt,
    row.attended ? 'Ya' : 'Tidak',
    row.checkedInAt,
    row.method === 'self_scan' ? 'Pindai QR' : row.method === 'admin_marked' ? 'Ditandai admin' : row.method,
  ]);
  return [header, ...body].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
}
