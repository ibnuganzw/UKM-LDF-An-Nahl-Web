import type { CSSProperties } from 'react';
import styles from './Divider.module.css';
import { Hex } from './Hex';

export function Divider({ style }: { style?: CSSProperties }) {
  return (
    <div className={styles.divider} style={style}>
      <span className={styles.line} />
      <span className={styles.cluster}>
        <Hex width={10} height={11} bg="rgba(232,199,102,.35)" />
        <Hex width={14} height={16} bg="rgba(232,199,102,.7)" />
        <Hex width={10} height={11} bg="rgba(232,199,102,.35)" />
      </span>
      <span className={styles.lineReverse} />
    </div>
  );
}
