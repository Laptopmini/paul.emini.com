import type { ContributionTone } from '@/lib/resume';
import styles from './StatusPill.module.css';

export function StatusPill({
  label,
  tone,
  className,
}: {
  label: string;
  tone: ContributionTone;
  className?: string;
}) {
  return (
    <span className={[styles.pill, styles[tone], className].filter(Boolean).join(' ')}>
      {label}
    </span>
  );
}
