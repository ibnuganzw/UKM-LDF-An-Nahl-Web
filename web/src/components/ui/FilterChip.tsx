import styles from './FilterChip.module.css';

export interface FilterChipProps {
  label: string;
  active?: boolean;
  bg: string;
  color: string;
  border: string;
  onClick: () => void;
}

export function FilterChip({ label, active, bg, color, border, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={styles.chip}
      aria-pressed={active}
      style={{ background: bg, color, borderColor: border }}
    >
      {label}
    </button>
  );
}
