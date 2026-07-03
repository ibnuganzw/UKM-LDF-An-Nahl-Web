import type { CSSProperties, ReactNode } from 'react';
import styles from './Badge.module.css';
import { cx } from '../../lib/cx';
import { soft } from '../../lib/colors';

export interface BadgeProps {
  color: string;
  background?: string;
  border?: string;
  uppercase?: boolean;
  pulse?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function Badge({ color, background, border, uppercase = true, pulse, className, style, children }: BadgeProps) {
  return (
    <span
      className={cx(styles.badge, uppercase && styles.uppercase, pulse && styles.pulse, className)}
      style={{
        color,
        background: background ?? soft(color),
        borderColor: border ?? 'transparent',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
