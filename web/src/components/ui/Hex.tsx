import { useId, type CSSProperties, type ReactNode } from 'react';
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

const HEX_VIEWBOX_WIDTH = 100;
const HEX_VIEWBOX_HEIGHT = 115.47;
const HEX_POINTS = `50 0 ${HEX_VIEWBOX_WIDTH} 28.87 ${HEX_VIEWBOX_WIDTH} 86.6 50 ${HEX_VIEWBOX_HEIGHT} 0 86.6 0 28.87`;
const HEX_TOP_FACET = `50 0 ${HEX_VIEWBOX_WIDTH} 28.87 50 57.74 0 28.87`;
const HEX_BOTTOM_FACET = `0 86.6 50 57.74 ${HEX_VIEWBOX_WIDTH} 86.6 50 ${HEX_VIEWBOX_HEIGHT}`;

/** The app's honeycomb cell, used as icon frame, bullet, avatar, badge, and number marker. */
export function Hex({ width, height, bg, color, fontSize, fontFamily, glow, className, style, children }: HexProps) {
  const clipId = `hex-${useId().replace(/:/g, '')}`;

  return (
    <span
      className={cx(styles.hex, className)}
      style={{
        width,
        height,
        color,
        fontSize,
        fontFamily,
        filter: glow ? `drop-shadow(0 0 10px ${bg})` : undefined,
        ...style,
      }}
    >
      <svg
        className={styles.cell}
        viewBox={`0 0 ${HEX_VIEWBOX_WIDTH} ${HEX_VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <polygon points={HEX_POINTS} />
          </clipPath>
        </defs>
        <foreignObject x="0" y="0" width={HEX_VIEWBOX_WIDTH} height={HEX_VIEWBOX_HEIGHT} clipPath={`url(#${clipId})`}>
          <div className={styles.fill} style={{ background: bg }} />
        </foreignObject>
        <polygon className={styles.topFacet} points={HEX_TOP_FACET} />
        <polygon className={styles.bottomFacet} points={HEX_BOTTOM_FACET} />
        <polygon className={styles.innerWall} points={HEX_POINTS} />
        <polygon className={styles.outerWall} points={HEX_POINTS} />
      </svg>
      <span className={styles.content}>{children}</span>
    </span>
  );
}
