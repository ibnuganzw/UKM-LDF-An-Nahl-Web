import type { CSSProperties, ReactNode } from 'react';
import styles from './DashedNote.module.css';
import { cx } from '../../lib/cx';

export function DashedNote({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={cx(styles.note, className)} style={style}>
      {children}
    </div>
  );
}
