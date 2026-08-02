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

const FEATURED_BG = 'var(--card-featured-bg)';
const FEATURED_BORDER = 'rgba(232,199,102,.26)';
const FEATURED_SHADOW = 'var(--shadow-luxe), var(--shadow-gold)';
// Honeycomb engraving — An-Nahl's own material. A seamless hex-grid tile
// (flat-top hexes ~35px wide, hairline gold at 7% alpha) drawn UNDER the
// gold washes, so featured surfaces read as etched metal rather than a
// flat tint. Both vertical hex edges are drawn at the tile seams so the
// half-strokes from adjacent tiles combine into one full 1px line.
const FEATURED_HEX_GRID =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'34.64\' height=\'60\'%3E%3Cpath d=\'M0 10 17.32 0 34.64 10v20L17.32 40 0 30V10m17.32 30v20\' fill=\'none\' stroke=\'rgba(232,199,102,0.07)\'/%3E%3C/svg%3E")';
const FEATURED_WASH = `var(--card-featured-wash), ${FEATURED_HEX_GRID}`;
const FEATURED_HAIRLINE = 'rgba(232,199,102,.16)';

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
    // A caller supplying its own `background` is opting out of the featured
    // look wholesale — forcing the wash on top regardless used to layer it
    // over gradients it was never designed against (see Dashboard/Shalat).
    '--card-wash': !background && featured ? FEATURED_WASH : undefined,
    '--card-wash-inset': !background && featured ? '6px' : undefined,
    '--card-hairline': !background && featured ? FEATURED_HAIRLINE : undefined,
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
