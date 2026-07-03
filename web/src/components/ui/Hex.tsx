import type { CSSProperties, ReactNode } from 'react';
import styles from './Hex.module.css';
import { cx } from '../../lib/cx';

export interface HexProps {
  width: number;
  height: number;
  bg: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  glow?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** The hexagon — the app's signature shape, used as icon frame, bullet, avatar, badge, and number marker. */
export function Hex({ width, height, bg, color, fontSize, fontFamily, glow, className, style, children }: HexProps) {
  return (
    <span
      className={cx(styles.hex, className)}
      style={{
        width,
        height,
        background: bg,
        color,
        fontSize,
        fontFamily,
        boxShadow: glow ? `0 0 12px ${bg}` : undefined,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
