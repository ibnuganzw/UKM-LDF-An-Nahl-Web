export function generateQrCode(agendaId: string): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ANH-${agendaId.toUpperCase()}-${rand}`;
}

/**
 * Renders a 21x21 module grid that looks like a QR code (incl. 3 finder-pattern
 * corners). Non-finder modules are pseudo-random but seeded from the code string
 * via FNV-1a + mulberry32, so the same code always renders the same pattern.
 * This is decorative only — not a real, scannable QR code.
 */
export function generateQrCells(code: string): boolean[] {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  const rnd = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const n = 21;
  const inFinder = (r: number, c: number): 0 | 1 | 2 => {
    const corners: [number, number][] = [
      [0, 0],
      [0, n - 7],
      [n - 7, 0],
    ];
    for (const [cr, cc] of corners) {
      if (r >= cr && r < cr + 7 && c >= cc && c < cc + 7) {
        const rr = r - cr;
        const ccc = c - cc;
        const ring = rr === 0 || rr === 6 || ccc === 0 || ccc === 6;
        const core = rr >= 2 && rr <= 4 && ccc >= 2 && ccc <= 4;
        return ring || core ? 1 : 2;
      }
    }
    return 0;
  };

  const cells: boolean[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const f = inFinder(r, c);
      const on = f === 1 ? true : f === 2 ? false : rnd() > 0.52;
      cells.push(on);
    }
  }
  return cells;
}
