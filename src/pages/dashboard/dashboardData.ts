// 누적 무역 카드의 데이터 구조
// [TS] interface = 객체 모양 설계도 (가이드 2-2). StatCard 가 이 모양의 값을 props 로 받음
export interface KpiStat {
  label: string;
  value: string;
  unit: string;
  change: number | null;   // 전년 대비 증감률(%) , 비교 데이터가 없으면 null
  changeLabel: string;
  accent: string;          // 카드 위쪽 색 띠 색상
}

// 아래 데이터는 기존 차트와 맞춤 인사이트용 더미 데이터.
// 각 기능의 API를 연결할 때 교체.

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
// seededRng : "씨앗 숫자(seed)가 같으면 항상 같은 순서의 가짜 난수"를 만드는 함수
//             (Math.random 은 새로고침마다 값이 바뀌지만, 이건 같은 국가면 항상 같은 그래프가 나옴)
//             안의 계산식은 난수 공식이라 몰라도 됩니다. rng() 를 부를 때마다 0~1 사이 숫자가 나온다는 것만 기억!
function seededRng(seed: number) {
  let s = seed;

  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// 맞춤 인사이트 — 최근 5년 수출입 더미 데이터
export function yearlyTradeData(countries: string[]) {
  // 1. seed 만들기 : 7 + (모든 국가 이름의 글자 코드 합)
  //    charCodeAt(i) : i 번째 글자의 문자 코드 숫자 (예: '가' → 44032)
  let seed = 7;
  for (const country of countries) {
    for (let i = 0; i < country.length; i++) {
      seed = seed + country.charCodeAt(i);
    }
  }

  const rng = seededRng(seed);

  // 2. 기준 수출/수입액 (rng() 로 국가마다 다르게)
  const base = {
    exp: 400 + rng() * 600,
    imp: 300 + rng() * 500,
  };

  // 3. 2021 ~ 2025 년 5개 데이터 만들기 (해마다 조금씩 증가)
  return [2021, 2022, 2023, 2024, 2025].map((year) => {
    const t = (year - 2021) / 4;          // 0, 0.25, 0.5, 0.75, 1 (첫 해 → 마지막 해 진행 정도)
    const drift = rng() * 0.12 - 0.04;    // 해마다 조금씩 흔들리는 값

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
      balance: exp - imp,   // 무역수지 = 수출 - 수입
    };
  });
}
