import type { CSSProperties } from 'react';
import styles from './Divider.module.css';

export function Divider({ style }: { style?: CSSProperties }) {
  return (
    <div className={styles.divider} style={style} aria-hidden="true">
      <span className={styles.line} />
      <span className={styles.mark} />
      <span className={styles.lineReverse} />
    </div>
  );
}
