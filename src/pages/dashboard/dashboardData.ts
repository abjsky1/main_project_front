// 누적 무역 카드의 데이터 구조
// [TS] interface = 객체 모양 설계도 (가이드 2-2). StatCard 가 이 모양의 값을 props 로 받음
// (맞춤 인사이트 더미 데이터는 pages/insights/insightsData.ts 로 옮김)
export interface KpiStat {
  label: string;
  value: string;
  unit: string;
  change: number | null;   // 전년 대비 증감률(%) , 비교 데이터가 없으면 null
  changeLabel: string;
  accent: string;          // 카드 위쪽 색 띠 색상
}
