import styles from './ThemeToggle.module.css';
import { useTheme } from '../../state/useTheme';

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const actionLabel = isLight ? 'Gunakan tema gelap' : 'Gunakan tema terang';

  return (
    <button
      type="button"
      className={compact ? `${styles.toggle} ${styles.compact}` : styles.toggle}
      aria-label={actionLabel}
      title={actionLabel}
      aria-pressed={isLight}
      onClick={toggleTheme}
    >
      <span key={theme} className={styles.glyph} aria-hidden="true">
        {isLight ? '☀' : '☾'}
      </span>
      <span className={styles.srLabel}>{isLight ? 'Tema terang' : 'Tema gelap'}</span>
    </button>
  );
}
