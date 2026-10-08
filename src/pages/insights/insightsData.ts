// ⚠️ 더미 데이터 — 맞춤 인사이트 API 를 연결하면 이 파일의 함수를 서버 응답으로 교체하세요.
//    (지금은 국가 이름으로 "항상 같은 가짜 숫자"를 만들어서, 국가마다 다른 그래프가 보이게 함)

// 수출/수입 상위 HS 코드 한 줄
export interface TopHsItem {
  code: string;
  name: string;
  value: number;
}

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

// seed 만들기 : 7 + (모든 국가 이름의 글자 코드 합)
// charCodeAt(i) : i 번째 글자의 문자 코드 숫자 (예: '가' → 44032)
function makeSeed(countries: string[]): number {
  let seed = 7;
  for (const country of countries) {
    for (let i = 0; i < country.length; i++) {
      seed = seed + country.charCodeAt(i);
    }
  }
  return seed;
}

// 최근 5년 수출입 더미 데이터 (그래프 2개에 사용)
export function yearlyTradeData(countries: string[]) {
  const rng = seededRng(makeSeed(countries));

  // 1. 기준 수출/수입액 (rng() 로 국가마다 다르게)
  const base = {
    exp: 400 + rng() * 600,
    imp: 300 + rng() * 500,
  };

  // 2. 2021 ~ 2025 년 5개 데이터 만들기 (해마다 조금씩 증가)
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

// Top 2 에 뽑힐 수 있는 HS 품목 후보 (코드는 hscode.csv 의 10자리 , 점 없이 숫자만)
const HS_ITEMS = [
  { code: '8541101000', name: '반도체 다이오드' },
  { code: '8517121090', name: '스마트폰' },
  { code: '8542311000', name: '집적회로(IC)' },
  { code: '8703231010', name: '승용차' },
  { code: '8708999000', name: '자동차 부품' },
  { code: '2710193000', name: '석유제품' },
  { code: '2709001010', name: '원유' },
  { code: '3304991000', name: '기초화장품' },
  { code: '7208519000', name: '열연강판' },
  { code: '3901101000', name: '폴리에틸렌' },
  { code: '8471300000', name: '노트북' },
  { code: '7306402000', name: '강관' },
];

// 후보 중 서로 다른 2개를 골라 금액이 큰 순서로 돌려줌
function pickTop2(rng: () => number): TopHsItem[] {
  const first = Math.floor(rng() * HS_ITEMS.length);
  let second = Math.floor(rng() * HS_ITEMS.length);
  if (second === first) second = (first + 1) % HS_ITEMS.length;   // 같은 품목이 뽑히면 바로 다음 품목으로

  const topValue = Math.round(8000 + rng() * 15000);              // 1위 금액
  const secondValue = Math.round(topValue * (0.4 + rng() * 0.5)); // 2위는 1위보다 작게

  return [
    { ...HS_ITEMS[first], value: topValue },
    { ...HS_ITEMS[second], value: secondValue },
  ];
}

// 국가별 수출 Top 2 / 수입 Top 2 (더미)
export function topHsData(country: string) {
  // 그래프와 다른 난수 순서를 쓰려고 seed 에 1000 을 더함
  const rng = seededRng(makeSeed([country]) + 1000);
  return {
    exportTop: pickTop2(rng),
    importTop: pickTop2(rng),
  };
}
