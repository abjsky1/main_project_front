import type { CSSProperties } from 'react';
import type { KpiStat } from '../dashboardData';

// 대시보드 상단 KPI 카드 1개
export default function StatCard({ label, value, unit, change, sublabel, accent = '#9333ea' }: KpiStat) {
  const isPositive = change > 0;
  return (
    <div className="stat-card">
      {/* 위쪽 강조선 — 카드마다 색이 달라서 CSS 변수(--accent)로 전달 */}
      <div className="stat-card__accent" style={{ '--accent': accent } as CSSProperties} />
      <p className="eyebrow">{label}</p>
      <div>
        <p className="stat-card__value">
          {value}
          <span className="stat-card__unit">{unit}</span>
        </p>
        <p className="stat-card__sublabel">{sublabel}</p>
      </div>
      <div className="stat-card__change">
        <span className={isPositive ? 'change-badge is-up' : 'change-badge is-down'}>
          {isPositive ? '▲' : '▼'} {Math.abs(change)}%
        </span>
        <span className="stat-card__change-text">전월 대비</span>
      </div>
    </div>
  );
}
