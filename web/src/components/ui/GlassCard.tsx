import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './GlassCard.module.css';
import { cx } from '../../lib/cx';
import type { CSSVarStyle } from '../../lib/cssVars';

export interface GlassCardProps {
  variant?: 'default' | 'featured';
  hover?: boolean;
  radius?: number;
  padding?: string;
  blur?: number;
  borderColor?: string;
  background?: string;
  shadow?: string;
  className?: string;
  style?: CSSVarStyle;
  onClick?: () => void;
  to?: string;
  children?: ReactNode;
}

const FEATURED_BG = 'linear-gradient(150deg, rgba(201,162,39,.14), rgba(255,255,255,.03))';
const FEATURED_BORDER = 'rgba(232,199,102,.3)';
const FEATURED_SHADOW = 'inset 0 1px 0 rgba(255,255,255,.07)';

export function GlassCard({
  variant = 'default',
  hover = false,
  radius,
  padding,
  blur,
  borderColor,
  background,
  shadow,
  className,
  style,
  onClick,
  to,
  children,
}: GlassCardProps) {
  const featured = variant === 'featured';
  const vars: CSSVarStyle = {
    '--card-bg': background ?? (featured ? FEATURED_BG : undefined),
    '--card-border': borderColor ?? (featured ? FEATURED_BORDER : undefined),
    '--card-shadow': shadow ?? (featured ? FEATURED_SHADOW : undefined),
    '--card-radius': radius !== undefined ? `${radius}px` : undefined,
    '--card-padding': padding,
    '--card-blur': blur !== undefined ? `${blur}px` : undefined,
    ...style,
  };
  const cls = cx(styles.card, hover && styles.hover, className);

  if (to) {
    return (
      <Link to={to} className={cx(cls, styles.asLink)} style={vars} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <div className={cls} style={vars} onClick={onClick}>
      {children}
    </div>
  );
}
