// 누적 무역 카드의 데이터 구조
export interface KpiStat {
  label: string;
  value: string;
  unit: string;
  change: number | null;
  changeLabel: string;
  accent: string;
}

// 아래 데이터는 기존 차트와 맞춤 인사이트용 더미 데이터.
// 각 기능의 API를 연결할 때 교체.

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
  {code: '8541.10', name: '반도체 다이오드', value: 18942,},
  {code: '8517.12', name: '스마트폰', value: 12458,},
];

export const TOP_HS_IMPORT: TopHsItem[] = [
  {code: '2709.00', name: '원유', value: 22341,},
  {code: '8542.31', name: '집적회로(IC)', value: 9871,},
];

// 국가 이름을 이용해 일정한 더미 데이터를 생성
function seededRng(seed: number) {
  let s = seed;

  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// 맞춤 인사이트 — 최근 5년 수출입 더미 데이터
export function yearlyTradeData(countries: string[]) {
  const seed = countries.reduce(
    (a, c) =>
      a +
      c.split('').reduce(
        (x, y) => x + y.charCodeAt(0),
        0
      ),
    7
  );

  const rng = seededRng(seed);

  const base = {
    exp: 400 + rng() * 600,
    imp: 300 + rng() * 500,
  };

  return [2021, 2022, 2023, 2024, 2025].map((year) => {
    const t = (year - 2021) / 4;
    const drift = rng() * 0.12 - 0.04;

    const exp = Math.round(
      base.exp * (1 + t * 0.3 + drift)
    );

    const imp = Math.round(
      base.imp * (1 + t * 0.25 + rng() * 0.08)
    );

    return {
      year: `${year}`,
      export: exp,
      import: imp,
      balance: exp - imp,
    };
  });
}