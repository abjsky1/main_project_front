import type { CSSProperties } from 'react';
import type { KpiStat } from '../dashboardData';

export default function StatCard({
  label,
  value,
  unit,
  change,
  changeLabel,
  accent,
}: KpiStat) {
  let badgeClass = 'change-badge';
  let changeText = '—';

  if (change !== null) {
    if (change > 0) {
      badgeClass += ' is-up';
      changeText = `▲ ${change.toFixed(2)}%`;
    } else if (change < 0) {
      badgeClass += ' is-down';
      changeText = `▼ ${Math.abs(change).toFixed(2)}%`;
    } else {
      changeText = '0.00%';
    }
  }

  return (
    <div className="stat-card">
      <div
        className="stat-card__accent"
        style={{ '--accent': accent } as CSSProperties}
      />

      <p className="eyebrow">{label}</p>

      <p className="stat-card__value">
        {value}
        <span className="stat-card__unit">{unit}</span>
      </p>

      <div className="stat-card__change">
        <span className={badgeClass}>
          {changeText}
        </span>

        <span className="stat-card__change-text">
          {change === null
            ? '비교 데이터 없음'
            : changeLabel}
        </span>
      </div>
    </div>
  );
}