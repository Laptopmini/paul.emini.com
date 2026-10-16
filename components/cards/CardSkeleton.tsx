import { Card } from './Card';
import s from './cards.module.css';

/** Placeholder while tool arguments stream in. */
export function CardSkeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <Card as="div" interactive={false} role="status" aria-busy="true">
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className={s.bone} style={{ width: '30%', height: 12 }} />
        <div className={s.bone} style={{ width: '60%', height: 22, borderRadius: 8 }} />
        <div className={`${s.bone} ${s.boneSoft}`} style={{ width: '100%', height: 12 }} />
        <div className={`${s.bone} ${s.boneSoft}`} style={{ width: '85%', height: 12 }} />
        <div className={s.boneRow}>
          <div
            className={`${s.bone} ${s.boneSoft}`}
            style={{ width: 64, height: 22, borderRadius: 999 }}
          />
          <div
            className={`${s.bone} ${s.boneSoft}`}
            style={{ width: 80, height: 22, borderRadius: 999 }}
          />
        </div>
      </div>
    </Card>
  );
}
