import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './Button.module.css';
import { cx } from '../../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'success' | 'scanning';
export type ButtonSize = 'lg' | 'md' | 'sm';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  to?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'lg',
  fullWidth,
  to,
  onClick,
  type = 'button',
  disabled,
  className,
  style,
  children,
}: ButtonProps) {
  const cls = cx(styles.btn, styles[variant], styles[size], fullWidth && styles.full, className);

  if (to) {
    return (
      <Link to={to} className={cls} style={style} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} style={style} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
