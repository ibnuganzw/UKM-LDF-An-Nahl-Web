import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './EmptyState.module.css';
import { cx } from '../../lib/cx';

export interface EmptyStateAction {
  label: string;
  /** Renders a router Link when set; otherwise a button using onClick. */
  to?: string;
  onClick?: () => void;
}

export interface EmptyStateProps {
  /** Stroke SVG on a 24×24 viewBox, tinted gold by the icon tile. */
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: EmptyStateAction;
  className?: string;
}

/** The one empty-state look for public pages: gold icon tile, serif title,
 *  muted body, single quiet action. Used for both "nothing here yet" and
 *  "this link points nowhere" moments. */
export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <section className={cx(styles.root, className)} role="status">
      {icon && (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className={styles.title}>{title}</h2>
      {body && <p className={styles.body}>{body}</p>}
      {action &&
        (action.to ? (
          <Link to={action.to} className={styles.action}>
            {action.label}
          </Link>
        ) : (
          <button type="button" className={styles.action} onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </section>
  );
}
