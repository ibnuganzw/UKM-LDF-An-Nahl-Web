import type { CSSProperties } from 'react';

/** CSSProperties plus arbitrary custom-property keys (e.g. `--card-bg`), for inline style objects that set CSS variables. */
export type CSSVarStyle = CSSProperties & Record<string, string | number | undefined>;
