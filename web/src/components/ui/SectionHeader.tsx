import type { CSSProperties } from 'react';
import styles from './SectionHeader.module.css';
import { cx } from '../../lib/cx';

export interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  as?: 'h1' | 'h2';
  align?: 'left' | 'center';
  titleStyle?: CSSProperties;
  className?: string;
}

export function SectionHeader({ eyebrow, title, as = 'h2', align = 'left', titleStyle, className }: SectionHeaderProps) {
  const Tag = as;
  return (
    <div className={cx(align === 'center' && styles.center, className)}>
      <div className={styles.eyebrow}>{eyebrow}</div>
      <Tag className={styles.title} style={titleStyle}>
        {title}
      </Tag>
    </div>
  );
}
