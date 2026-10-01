import { useState } from 'react';
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type TabType = 'search' | 'exchange';
type Currency = 'USD' | 'EUR' | 'CNH' | 'JPY';
type SortField = 'exportAmt' | 'importAmt' | 'balance' | null;
type SortDir = 'asc' | 'desc';

const EXTRA_CURRENCIES = ['AED','AUD','BHD','BND','CAD','CHF','DKK','GBP','HKD','IDR','KWD','MYR','NOK','NZD','SAR','SEK','SGD','THB','XOF'];

const START_YEAR = 2000;
const END_YEAR = 2026;

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function genRates(base: number, currency: string): number[] {
  const rng = seededRandom(currency.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const data: number[] = [];
  let val = base;
  const years = END_YEAR - START_YEAR;
  for (let i = 0; i < years * 12; i++) {
    val = val * (1 + (rng() - 0.49) * 0.015);
    data.push(Math.round(val * 100) / 100);
  }
  return data;
}

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

function getRatesForYear(currency: string, year: number): number[] {
  const offset = (year - START_YEAR) * 12;
  return RATE_DATA[currency]?.slice(offset, offset + 12) ?? Array(12).fill(0);
}

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const CURRENCY_INFO: Record<string, { name: string; flag: string; unit: string }> = {
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

const SEARCH_COUNTRIES = [
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

const TRADE_RESULTS = [
  { id: 1, hsCode: '3304.99', product: '기초화장품류', country: '미국', exportAmt: 2345.8, importAmt: 123.4, balance: 2222.4, period: '2025-12' },
  { id: 2, hsCode: '8517.12', product: '스마트폰 및 통신기기', country: '중국', exportAmt: 12458.2, importAmt: 8952.1, balance: 3506.1, period: '2025-12' },
  { id: 3, hsCode: '8708.99', product: '자동차 부품', country: '독일', exportAmt: 1823.4, importAmt: 3241.5, balance: -1418.1, period: '2025-12' },
  { id: 4, hsCode: '8541.10', product: '반도체 다이오드', country: '미국', exportAmt: 18942.3, importAmt: 2134.8, balance: 16807.5, period: '2025-12' },
  { id: 5, hsCode: '6203.42', product: '면혼방 바지', country: '베트남', exportAmt: 456.2, importAmt: 1823.4, balance: -1367.2, period: '2025-12' },
  { id: 6, hsCode: '2710.19', product: '기타 석유류', country: '사우디아라비아', exportAmt: 823.1, importAmt: 15234.8, balance: -14411.7, period: '2025-12' },
  { id: 7, hsCode: '8473.30', product: '컴퓨터 부품', country: '일본', exportAmt: 3241.5, importAmt: 4523.8, balance: -1282.3, period: '2025-12' },
  { id: 8, hsCode: '3002.90', product: '의약품 원료', country: '인도', exportAmt: 1234.5, importAmt: 892.3, balance: 342.2, period: '2025-12' },
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #eaeaf2',
  fontSize: 13, color: '#1a1a2e', background: '#ffffff', outline: 'none',
  fontFamily: 'Plus Jakarta Sans, sans-serif',
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>{children}</p>;
}

function FilterBtn({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{ background: active ? 'rgba(100,50,220,0.08)' : '#f9f9fc', color: active ? '#9333ea' : '#5e5e7a', border: active ? '1px solid rgba(100,50,220,0.2)' : '1px solid #eaeaf2' }}>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M4 8h8M6 12h4"/></svg>
      필터
    </button>
  );
}

export default function TradeAnalysis() {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [country, setCountry] = useState('전체');
  const [startDate, setStartDate] = useState('2025-01');
  const [endDate, setEndDate] = useState('2025-12');
  const [searched, setSearched] = useState(true);
  const [results, setResults] = useState(TRADE_RESULTS);
  const [colFilterOpen, setColFilterOpen] = useState(false);
  const [filterHs, setFilterHs] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [activeCurrency, setActiveCurrency] = useState<string>('USD');
  const [selectedYear, setSelectedYear] = useState(2026);

  const handleSearch = () => {
    const filtered = TRADE_RESULTS.filter((r) => {
      if (country !== '전체' && r.country !== country) return false;
      return true;
    });
    setResults(filtered);
    setSearched(true);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const colFiltersActive = !!(filterHs || filterProduct || filterCountry || sortField);
  const resetColFilters = () => { setFilterHs(''); setFilterProduct(''); setFilterCountry(''); setSortField(null); };

  const displayedResults = results
    .filter((r) => {
      if (filterHs && !r.hsCode.includes(filterHs)) return false;
      if (filterProduct && !r.product.includes(filterProduct)) return false;
      if (filterCountry && !r.country.includes(filterCountry)) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const diff = a[sortField] - b[sortField];
      return sortDir === 'asc' ? diff : -diff;
    });

  const rateChartData = MONTHS.map((month, i) => ({
    month,
    rate: getRatesForYear(activeCurrency, selectedYear)[i] ?? 0,
  }));

  const mainCurrencies: Currency[] = ['USD', 'EUR', 'CNH', 'JPY'];
  const years = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <SectionLabel>Analysis</SectionLabel>
        <h1 className="text-[28px] font-bold tracking-tight" style={{ color: '#1a1a2e' }}>무역 데이터 분석</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: 'rgba(100,50,220,0.06)', border: '1px solid rgba(100,50,220,0.1)' }}>
        {[{ id: 'search' as TabType, label: '조건 검색 & 조회' }, { id: 'exchange' as TabType, label: '환율 동향 & 실거래가' }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150"
            style={{ background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? '#1a1a2e' : '#9090a8', boxShadow: activeTab === tab.id ? '0 1px 5px rgba(100,50,220,0.12)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Search tab ─── */}
      {activeTab === 'search' && (
        <div>
          <div className="rounded-2xl p-6 mb-6" style={{ background: '#fff', border: '1px solid #eaeaf2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <SectionLabel>검색 조건</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#5e5e7a' }}>시작 기간</label>
                <input type="month" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#5e5e7a' }}>종료 기간</label>
                <input type="month" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#5e5e7a' }}>국가</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                  <option>전체</option>
                  {SEARCH_COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={handleSearch} className="px-6 py-2 rounded-full text-sm font-semibold text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>검색</button>
            </div>
          </div>

          {searched && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <SectionLabel>검색 결과</SectionLabel>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(100,50,220,0.08)', color: '#9333ea' }}>{displayedResults.length}건</span>
                </div>
                <div className="flex items-center gap-2">
                  {colFiltersActive && (
                    <button onClick={resetColFilters} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ color: '#d93025', background: 'rgba(217,48,37,0.06)', border: '1px solid rgba(217,48,37,0.15)' }}>필터 초기화</button>
                  )}
                  <FilterBtn active={colFilterOpen} onClick={() => setColFilterOpen(!colFilterOpen)} />
                  <button onClick={() => alert('엑셀 파일 다운로드가 시작됩니다. (데모)')} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white hover:opacity-80" style={{ background: '#1a9e5c' }}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12L3 7h3V2h4v5h3L8 12z"/><path d="M2 14h12v1H2z"/></svg>
                    엑셀 다운로드
                  </button>
                </div>
              </div>

              {colFilterOpen && (
                <div className="rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-3 gap-4" style={{ background: '#f9f9fc', border: '1px solid #eaeaf2' }}>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>HS 코드</label>
                    <input value={filterHs} onChange={(e) => setFilterHs(e.target.value)} placeholder="예: 3304" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ border: '1px solid #eaeaf2', background: '#fff', color: '#1a1a2e', fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>품목명</label>
                    <input value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} placeholder="예: 반도체" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ border: '1px solid #eaeaf2', background: '#fff', color: '#1a1a2e', fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>국가</label>
                    <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ border: '1px solid #eaeaf2', background: '#fff', color: filterCountry ? '#1a1a2e' : '#9090a8', fontFamily: 'Plus Jakarta Sans, sans-serif', appearance: 'none', cursor: 'pointer' }}>
                      <option value="">전체 국가</option>
                      {SEARCH_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>금액 정렬</label>
                    <div className="flex gap-2 flex-wrap">
                      {[{ field: 'exportAmt' as SortField, label: '수출액' }, { field: 'importAmt' as SortField, label: '수입액' }, { field: 'balance' as SortField, label: '무역수지' }].map((s) => (
                        <button key={s.field!} onClick={() => toggleSort(s.field)}
                          className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
                          style={{ background: sortField === s.field ? 'rgba(100,50,220,0.08)' : '#fff', color: sortField === s.field ? '#9333ea' : '#5e5e7a', border: sortField === s.field ? '1px solid rgba(100,50,220,0.2)' : '1px solid #eaeaf2' }}>
                          {s.label} {sortField === s.field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="h-px mb-0" style={{ background: 'linear-gradient(90deg, rgba(100,50,220,0.2), transparent)' }} />
              <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid #eaeaf2' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eaeaf2' }}>
                      {['HS 코드', '품목명', '국가'].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: '#9090a8', background: 'rgba(100,50,220,0.02)' }}>{h}</th>
                      ))}
                      {[{ label: '수출액 (백만$)', field: 'exportAmt' as SortField }, { label: '수입액 (백만$)', field: 'importAmt' as SortField }, { label: '무역수지', field: 'balance' as SortField }].map(({ label, field }) => (
                        <th key={label} onClick={() => toggleSort(field)} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none"
                          style={{ color: sortField === field ? '#9333ea' : '#9090a8', background: 'rgba(100,50,220,0.02)' }}>
                          {label} <span style={{ opacity: 0.7 }}>{sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                        </th>
                      ))}
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#9090a8', background: 'rgba(100,50,220,0.02)' }}>기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedResults.map((row) => (
                      <tr key={row.id} className="transition-colors" style={{ borderBottom: '1px solid #f2f2f8' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(100,50,220,0.025)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-5 py-3.5 text-xs font-mono" style={{ color: '#9090a8' }}>{row.hsCode}</td>
                        <td className="px-5 py-3.5 font-semibold" style={{ color: '#1a1a2e' }}>{row.product}</td>
                        <td className="px-5 py-3.5" style={{ color: '#5e5e7a' }}>{row.country}</td>
                        <td className="px-5 py-3.5 font-mono text-sm" style={{ color: '#1a1a2e' }}>{row.exportAmt.toLocaleString()}</td>
                        <td className="px-5 py-3.5 font-mono text-sm" style={{ color: '#1a1a2e' }}>{row.importAmt.toLocaleString()}</td>
                        <td className="px-5 py-3.5 font-mono font-bold text-sm" style={{ color: row.balance >= 0 ? '#d93025' : '#1a9e5c' }}>
                          {row.balance >= 0 ? '+' : ''}{row.balance.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono" style={{ color: '#9090a8' }}>{row.period}</td>
                      </tr>
                    ))}
                    {displayedResults.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-8 text-sm" style={{ color: '#9090a8' }}>검색 결과가 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 환율 동향 & 실거래가 ─── */}
      {activeTab === 'exchange' && (
        <div>
          {/* 연도 선택 */}
          <div className="mb-7 flex items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#5e5e7a' }}>연도</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-4 py-2 rounded-xl text-sm font-semibold outline-none"
              style={{ border: '1px solid rgba(100,50,220,0.15)', background: '#fff', color: '#1a1a2e', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {years.map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
          </div>

          {/* 주요 4개국 통화 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {mainCurrencies.map((c) => {
              const info = CURRENCY_INFO[c];
              const rates = getRatesForYear(c, selectedYear);
              const current = rates[11] ?? rates[rates.length - 1] ?? 0;
              const prev = rates[10] ?? current;
              const change = prev ? ((current - prev) / prev * 100).toFixed(2) : '0.00';
              const isUp = current >= prev;
              const isActive = activeCurrency === c;
              return (
                <button key={c} onClick={() => setActiveCurrency(c)} className="rounded-2xl p-4 text-left transition-all"
                  style={{ background: isActive ? 'linear-gradient(135deg, rgba(147,51,234,0.07), rgba(6,182,212,0.05))' : '#fff', border: isActive ? '1.5px solid rgba(147,51,234,0.25)' : '1px solid #eaeaf2', boxShadow: isActive ? '0 4px 16px rgba(147,51,234,0.1)' : 'none' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold" style={{ color: '#1a1a2e' }}>{c}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto" style={{ background: isUp ? 'rgba(217,48,37,0.08)' : 'rgba(26,158,92,0.1)', color: isUp ? '#d93025' : '#1a9e5c' }}>
                      {isUp ? '▲' : '▼'} {Math.abs(Number(change))}%
                    </span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: isActive ? '#9333ea' : '#1a1a2e' }}>{current.toLocaleString()}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#9090a8' }}>{info.unit}</p>
                </button>
              );
            })}
          </div>

          {/* 19개국 통화 버튼 */}
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            {EXTRA_CURRENCIES.map((c) => (
              <button key={c} onClick={() => setActiveCurrency(c)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{ background: activeCurrency === c ? 'rgba(6,182,212,0.1)' : '#f9f9fc', color: activeCurrency === c ? '#06b6d4' : '#5e5e7a', border: activeCurrency === c ? '1px solid rgba(6,182,212,0.25)' : '1px solid #eaeaf2' }}>
                {c}
              </button>
            ))}
          </div>

          {/* 환율 그래프 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-1">
              <p className="text-base font-bold" style={{ color: '#1a1a2e' }}>{activeCurrency} · {selectedYear}년 월별 환율 추이</p>
            </div>
            <p className="text-xs mb-4" style={{ color: '#9090a8' }}>{CURRENCY_INFO[activeCurrency]?.unit ?? `원/${activeCurrency}`}</p>
            <div className="w-10 h-0.5 mb-5 rounded-full" style={{ background: 'linear-gradient(90deg, #9333ea, #06b6d4)' }} />
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={rateChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f8" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9090a8', fontFamily: 'Plus Jakarta Sans, sans-serif' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9090a8', fontFamily: 'Plus Jakarta Sans, sans-serif' }} axisLine={false} tickLine={false} width={65} />
                <Tooltip contentStyle={{ fontFamily: 'Plus Jakarta Sans, sans-serif', borderRadius: 12, border: '1px solid #eaeaf2', fontSize: 12 }} formatter={(val: any) => [`${val?.toLocaleString()} 원`, activeCurrency]} />
                <Line type="monotone" dataKey="rate" name={activeCurrency} stroke="#9333ea" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 월 평균 환율 */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(100,50,220,0.035)', border: '1px solid rgba(100,50,220,0.12)' }}>
            <p className="font-bold mb-3" style={{ color: '#1a1a2e' }}>{activeCurrency} — {CURRENCY_INFO[activeCurrency]?.name ?? activeCurrency} · {selectedYear}년 월 평균</p>
            <div className="grid grid-cols-6 gap-2">
              {MONTHS.map((m, i) => {
                const v = getRatesForYear(activeCurrency, selectedYear)[i];
                return (
                  <div key={m} className="text-center">
                    <p className="text-[10px]" style={{ color: '#9090a8' }}>{m}</p>
                    <p className="text-xs font-mono font-bold" style={{ color: '#9333ea' }}>{v?.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
