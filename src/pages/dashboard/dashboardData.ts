// ⚠️ 더미 데이터 — 백엔드 API 연결 시 이 파일의 값들을 서버 응답으로 교체하세요.

// 상단 KPI 카드 4개
export interface KpiStat {
  label: string;
  value: string;
  unit: string;
  change: number;   // 전월 대비 증감률(%)
  sublabel: string;
  accent: string;   // 카드 위쪽 강조선 색
}

export const KPI_STATS: KpiStat[] = [
  { label: '총 수출액', value: '7,535', unit: '억 달러', change: 4.2, sublabel: '2025년 누적', accent: '#9333ea' },
  { label: '총 수입액', value: '6,568', unit: '억 달러', change: 3.8, sublabel: '2025년 누적', accent: '#7c3aed' },
  { label: '무역 수지', value: '+967', unit: '억 달러', change: 8.1, sublabel: '수출 & 수입', accent: '#06b6d4' },
  { label: '당일 환율', value: '1,318', unit: '원/USD', change: -0.3, sublabel: '2025-12-31 기준', accent: '#06b6d4' },
];

// 월별 수출입 추이 (단위: 억 달러)
export const MONTHLY_TRADE = [
  { month: '1월', export: 523, import: 467, balance: 56 },
  { month: '2월', export: 498, import: 445, balance: 53 },
  { month: '3월', export: 556, import: 478, balance: 78 },
  { month: '4월', export: 584, import: 501, balance: 83 },
  { month: '5월', export: 612, import: 534, balance: 78 },
  { month: '6월', export: 598, import: 512, balance: 86 },
  { month: '7월', export: 634, import: 548, balance: 86 },
  { month: '8월', export: 652, import: 567, balance: 85 },
  { month: '9월', export: 619, import: 532, balance: 87 },
  { month: '10월', export: 665, import: 574, balance: 91 },
  { month: '11월', export: 682, import: 598, balance: 84 },
  { month: '12월', export: 712, import: 612, balance: 100 },
];

// 맞춤 인사이트 — 수출/수입 상위 HS 코드
export interface TopHsItem {
  code: string;
  name: string;
  value: number;
}

export const TOP_HS_EXPORT: TopHsItem[] = [
  { code: '8541.10', name: '반도체 다이오드', value: 18942 },
  { code: '8517.12', name: '스마트폰', value: 12458 },
];

export const TOP_HS_IMPORT: TopHsItem[] = [
  { code: '2709.00', name: '원유', value: 22341 },
  { code: '8542.31', name: '집적회로(IC)', value: 9871 },
];

// 맞춤 인사이트 — 최근 5년 수출입 (국가 이름으로 만든 가짜 난수 데이터)
function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

export function yearlyTradeData(countries: string[]) {
  const seed = countries.reduce((a, c) => a + c.split('').reduce((x, y) => x + y.charCodeAt(0), 0), 7);
  const rng = seededRng(seed);
  const base = { exp: 400 + rng() * 600, imp: 300 + rng() * 500 };
  return [2021, 2022, 2023, 2024, 2025].map((year) => {
    const t = (year - 2021) / 4;
    const drift = rng() * 0.12 - 0.04;
    const exp = Math.round(base.exp * (1 + t * 0.3 + drift));
    const imp = Math.round(base.imp * (1 + t * 0.25 + rng() * 0.08));
    return { year: `${year}`, export: exp, import: imp, balance: exp - imp };
  });
}
