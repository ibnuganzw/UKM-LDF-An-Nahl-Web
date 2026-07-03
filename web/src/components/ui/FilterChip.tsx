import styles from './FilterChip.module.css';

export interface FilterChipProps {
  label: string;
  bg: string;
  color: string;
  border: string;
  onClick: () => void;
}

export function FilterChip({ label, bg, color, border, onClick }: FilterChipProps) {
  return (
    <button onClick={onClick} className={styles.chip} style={{ background: bg, color, borderColor: border }}>
      {label}
    </button>
  );
}
