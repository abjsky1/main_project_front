// ⚠️ 더미 데이터 — 백엔드 API 연결 시 이 파일의 값/함수를 서버 응답으로 교체하세요.

// [TS] 'a' | 'b' : 이 글자들 중 하나만 들어갈 수 있는 타입 (가이드 2-3)
export type Currency = 'USD' | 'EUR' | 'CNH' | 'JPY';
export type SortField = 'exportAmt' | 'importAmt' | 'balance' | null;   // 정렬 기준 열 (null = 정렬 안 함)
export type SortDir = 'asc' | 'desc';                                   // asc = 오름차순, desc = 내림차순

/* ───────────── 환율 ───────────── */

// 상단 카드로 보여주는 주요 통화 4개
export const MAIN_CURRENCIES: Currency[] = ['USD', 'EUR', 'CNH', 'JPY'];

// 아래 버튼으로 보여주는 기타 통화
export const EXTRA_CURRENCIES = ['AED','AUD','BHD','BND','CAD','CHF','DKK','GBP','HKD','IDR','KWD','MYR','NOK','NZD','SAR','SEK','SGD','THB','XOF'];

export const START_YEAR = 2000;
export const END_YEAR = 2026;

// 연도 선택 목록 [2000, 2001, ... , 2026]
export const YEARS: number[] = [];
for (let year = START_YEAR; year <= END_YEAR; year++) {
  YEARS.push(year);
}

export const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

// seed(씨앗 숫자)가 같으면 항상 같은 순서의 가짜 난수를 만드는 함수 (dashboardData.ts 의 seededRng 와 같음)
// 계산식은 난수 공식이라 몰라도 됩니다. rng() 를 부를 때마다 0~1 사이 숫자가 나옵니다.
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// 통화별 가짜 월별 환율 (2000년 1월 ~ 2025년 12월)
// base : 시작 환율 , currency : 통화 코드 (글자 코드 합을 seed 로 써서 통화마다 다른 그래프)
function genRates(base: number, currency: string): number[] {
  // seed = 통화 코드 글자들의 문자 코드 합 (예: 'USD' → 85 + 83 + 68)
  let seed = 0;
  for (let i = 0; i < currency.length; i++) {
    seed = seed + currency.charCodeAt(i);
  }
  const rng = seededRandom(seed);
  const data: number[] = [];
  let val = base;
  const years = END_YEAR - START_YEAR;
  for (let i = 0; i < years * 12; i++) {
    val = val * (1 + (rng() - 0.49) * 0.015);   // 매달 조금씩 오르내림
    data.push(Math.round(val * 100) / 100);     // 소수점 2자리로 반올림
  }
  return data;
}

// 통화 코드 → 월별 환율 배열
// [TS] Record<string, number[]> : 키는 글자, 값은 숫자 배열인 객체 (가이드 2-8)
const RATE_DATA: Record<string, number[]> = {
  USD: genRates(1180, 'USD'), EUR: genRates(1320, 'EUR'),
  CNH: genRates(160, 'CNH'), JPY: genRates(9.2, 'JPY'),
  AED: genRates(320, 'AED'), AUD: genRates(820, 'AUD'),
  BHD: genRates(3100, 'BHD'), BND: genRates(850, 'BND'),
  CAD: genRates(900, 'CAD'), CHF: genRates(1250, 'CHF'),
  DKK: genRates(175, 'DKK'), GBP: genRates(1550, 'GBP'),
  HKD: genRates(150, 'HKD'), IDR: genRates(0.085, 'IDR'),
  KWD: genRates(3800, 'KWD'), MYR: genRates(290, 'MYR'),
  NOK: genRates(135, 'NOK'), NZD: genRates(730, 'NZD'),
  SAR: genRates(315, 'SAR'), SEK: genRates(125, 'SEK'),
  SGD: genRates(870, 'SGD'), THB: genRates(34, 'THB'),
};

// 특정 통화의 특정 연도 12개월 환율
// 배열은 2000년 1월부터 차례로 들어 있으므로, (연도 - 2000) × 12 번째부터 12개를 잘라냄
// 데이터가 없는 통화(XOF 등)는 0 이 12개인 배열
// 데이터 범위(2000~2025년)를 벗어난 연도(예: 2026)는 잘라낼 게 없어서 빈 배열 [] 이 됨
export function getRatesForYear(currency: string, year: number): number[] {
  const offset = (year - START_YEAR) * 12;
  return RATE_DATA[currency]?.slice(offset, offset + 12) ?? Array(12).fill(0);
}

// 통화별 표시 정보 (이름, 국기, 단위)
export const CURRENCY_INFO: Record<string, { name: string; flag: string; unit: string }> = {
  USD: { name: '미국 달러', flag: '🇺🇸', unit: '원/USD' },
  EUR: { name: '유로', flag: '🇪🇺', unit: '원/EUR' },
  CNH: { name: '중국 위안(역외)', flag: '🇨🇳', unit: '원/CNH' },
  JPY: { name: '일본 엔', flag: '🇯🇵', unit: '원/JPY' },
  AED: { name: '아랍에미리트 디르함', flag: '🇦🇪', unit: '원/AED' },
  AUD: { name: '호주 달러', flag: '🇦🇺', unit: '원/AUD' },
  BHD: { name: '바레인 디나르', flag: '🇧🇭', unit: '원/BHD' },
  BND: { name: '브루나이 달러', flag: '🇧🇳', unit: '원/BND' },
  CAD: { name: '캐나다 달러', flag: '🇨🇦', unit: '원/CAD' },
  CHF: { name: '스위스 프랑', flag: '🇨🇭', unit: '원/CHF' },
  DKK: { name: '덴마크 크로네', flag: '🇩🇰', unit: '원/DKK' },
  GBP: { name: '영국 파운드', flag: '🇬🇧', unit: '원/GBP' },
  HKD: { name: '홍콩 달러', flag: '🇭🇰', unit: '원/HKD' },
  IDR: { name: '인도네시아 루피아', flag: '🇮🇩', unit: '원/IDR' },
  KWD: { name: '쿠웨이트 디나르', flag: '🇰🇼', unit: '원/KWD' },
  MYR: { name: '말레이시아 링깃', flag: '🇲🇾', unit: '원/MYR' },
  NOK: { name: '노르웨이 크로네', flag: '🇳🇴', unit: '원/NOK' },
  NZD: { name: '뉴질랜드 달러', flag: '🇳🇿', unit: '원/NZD' },
  SAR: { name: '사우디 리얄', flag: '🇸🇦', unit: '원/SAR' },
  SEK: { name: '스웨덴 크로나', flag: '🇸🇪', unit: '원/SEK' },
  SGD: { name: '싱가포르 달러', flag: '🇸🇬', unit: '원/SGD' },
  THB: { name: '태국 바트', flag: '🇹🇭', unit: '원/THB' },
};

/* ───────────── 조건 검색 ───────────── */

// 국가 선택 목록 (맨 끝의 .sort() 로 가나다 순 정렬)
export const SEARCH_COUNTRIES = [
  '가나','가봉','감비아','건지섬','과들루프','과테말라','괌','그레나다','그린란드','그리스',
  '기니','기니비사우','나미비아','나우루','나이지리아','남극','남수단','남아프리카 공화국',
  '네덜란드','네팔','노르웨이','노퍽섬','누벨칼레도니','뉴질랜드','니우에','니제르','니카라과',
  '대만','대한민국','덴마크','도미니카 공화국','도미니카 연방','독일','동티모르','라오스',
  '라이베리아','라트비아','러시아','레바논','레소토','레위니옹','루마니아','룩셈부르크',
  '르완다','리비아','리히텐슈타인','리투아니아','마다가스카르','마르티니크','마셜 제도',
  '마요트','마카오','말라위','말레이시아','말리','맨섬','멕시코','모나코','모로코','모리셔스',
  '모리타니','모잠비크','몬테네그로','몬트세랫','몰디브','몰타','몰도바','몽골','미국',
  '미국령 군소 제도','미국령 버진아일랜드','미얀마','미크로네시아 연방','바누아투','바레인',
  '바베이도스','바하마','바티칸 시국','방글라데시','버뮤다','벨기에','벨라루스','벨리즈',
  '베냉','베네수엘라','베트남','보네르섬','보스니아 헤르체고비나','보츠와나','볼리비아',
  '부룬디','부르키나파소','부베섬','부탄','북마리아나 제도','북마케도니아','불가리아',
  '브라질','브루나이','사모아','사우디아라비아','산마리노','상투메 프린시페',
  '생마르탱','생바르텔레미','생피에르 미클롱','서사하라','세네갈','세르비아','세이셸',
  '세인트루시아','세인트빈센트 그레나딘','세인트키츠 네비스','세인트헬레나','소말리아',
  '솔로몬 제도','수단','수리남','스리랑카','스발바르 얀마옌 제도','스웨덴','스위스',
  '스페인','슬로바키아','슬로베니아','시에라리온','시리아','신트마르턴','싱가포르',
  '아르메니아','아르헨티나','아루바','아메리칸사모아','아이슬란드','아이티','아일랜드',
  '아제르바이잔','아프가니스탄','안도라','알바니아','알제리','앙골라','앤티가 바부다',
  '앵귈라','에리트레아','에스와티니','에스토니아','에콰도르','에티오피아','엘살바도르',
  '예멘','오만','오스트리아','온두라스','요르단','우간다','우루과이','우즈베키스탄',
  '우크라이나','이라크','이란','이스라엘','이집트','이탈리아','인도','인도네시아',
  '일본','자메이카','잠비아','저지섬','적도 기니','중국','중앙아프리카 공화국',
  '지부티','지브롤터','짐바브웨','차드','칠레','카메룬','카보베르데','카자흐스탄',
  '카타르','캄보디아','캐나다','케냐','케이맨 제도','코모로','코스타리카','코코스 제도',
  '코트디부아르','콜롬비아','콩고 공화국','콩고 민주 공화국','쿠바','쿠웨이트',
  '퀴라소','크로아티아','크리스마스섬','키르기스스탄','키리바시','키프로스','타지키스탄',
  '탄자니아','태국','터크스 케이커스 제도','통가','투르크메니스탄','투발루','튀니지',
  '튀르키예','트리니다드 토바고','파나마','파라과이','파키스탄','파푸아뉴기니','팔라우',
  '팔레스타인','페로 제도','페루','포르투갈','포클랜드 제도','폴란드','푸에르토리코',
  '프랑스','프랑스령 기아나','프랑스령 남방 및 남극 지역','프랑스령 폴리네시아',
  '핀란드','필리핀','헝가리','홍콩','허드 맥도널드 제도','호주','영국','영국령 버진아일랜드',
  '영국령 인도양 지역',
].sort();

// 검색 결과 표 한 줄
export interface TradeResult {
  id: number;
  hsCode: string;
  product: string;
  country: string;
  exportAmt: number;   // 수출액 (백만$)
  importAmt: number;   // 수입액 (백만$)
  balance: number;     // 무역수지
  period: string;
}

export const TRADE_RESULTS: TradeResult[] = [
  { id: 1, hsCode: '3304.99', product: '기초화장품류', country: '미국', exportAmt: 2345.8, importAmt: 123.4, balance: 2222.4, period: '2025-12' },
  { id: 2, hsCode: '8517.12', product: '스마트폰 및 통신기기', country: '중국', exportAmt: 12458.2, importAmt: 8952.1, balance: 3506.1, period: '2025-12' },
  { id: 3, hsCode: '8708.99', product: '자동차 부품', country: '독일', exportAmt: 1823.4, importAmt: 3241.5, balance: -1418.1, period: '2025-12' },
  { id: 4, hsCode: '8541.10', product: '반도체 다이오드', country: '미국', exportAmt: 18942.3, importAmt: 2134.8, balance: 16807.5, period: '2025-12' },
  { id: 5, hsCode: '6203.42', product: '면혼방 바지', country: '베트남', exportAmt: 456.2, importAmt: 1823.4, balance: -1367.2, period: '2025-12' },
  { id: 6, hsCode: '2710.19', product: '기타 석유류', country: '사우디아라비아', exportAmt: 823.1, importAmt: 15234.8, balance: -14411.7, period: '2025-12' },
  { id: 7, hsCode: '8473.30', product: '컴퓨터 부품', country: '일본', exportAmt: 3241.5, importAmt: 4523.8, balance: -1282.3, period: '2025-12' },
  { id: 8, hsCode: '3002.90', product: '의약품 원료', country: '인도', exportAmt: 1234.5, importAmt: 892.3, balance: 342.2, period: '2025-12' },
];
