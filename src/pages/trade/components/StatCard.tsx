import type { CSSProperties } from 'react';
import type { KpiStat } from '../tradeData';

// 누적 무역 카드 1개 (라벨 / 값 / 전년 대비 증감 배지) — 무역 데이터 분석 탭 줄 오른쪽 (TradeKpi)
// props 의 모양은 tradeData.ts 의 KpiStat 과 같음
export default function StatCard({
  label,
  value,
  unit,
  change,
  changeLabel,
  accent,
}: KpiStat) {
  // 증감률에 따라 배지 색(클래스)과 글자 정하기 : 증가 ▲ / 감소 ▼ / 0 / 데이터 없음 —
  // toFixed(2) : 소수점 2자리 글자로 (52.9 → '52.90')
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
      {/* 카드 위쪽 색 띠 : CSS 변수 --accent 에 색을 넣으면 TradeAnalysis.css 가 그 색으로 칠함
          [TS] as CSSProperties : '--accent' 같은 CSS 변수 이름도 style 에 넣을 수 있게 해 주는 표시 */}
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