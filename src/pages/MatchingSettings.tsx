import { useState, useRef, useEffect } from 'react';
import type { User } from '../App';
import { COUNTRIES_LIST } from '../data/countries';

interface MatchingSettingsProps {
  user: User | null;
  onLoginClick: () => void;
  onMatchingUpdate?: (countries: string[]) => void;
  shipperRows: ShipperCondition[];
  logisticsRows: LogisticsCondition[];
  onShipperRowsChange: (rows: ShipperCondition[]) => void;
  onLogisticsRowsChange: (rows: LogisticsCondition[]) => void;
}

/* ── Port/Airport data ─────────────────────────────────────────────────────── */
const KR_AIR = ['대구공항','김포공항','김해공항','인천공항','제주공항','청주공항'].sort();
const KR_SEA = ['광양항','대산항','동해항','마산항','부산항','울산항','인천항','평택당진항','포항항'].sort();
const INT_AIR = [
  '가고시마','간사이','고마쓰','고베','구마모토','기타규슈','나가사키','나고야','나리타/도쿄','니가타',
  '다카마쓰','도쿠시마','마쓰야마','미야자키','사가','삿포로','센다이','시모지시마','시즈오카','아오모리',
  '오이타','오카야마','오키나와','요나고','이시가키','하네다','후쿠오카','히로시마',
  '가목사','계림','광저우','난퉁 싱둥','남경','닝보','다통','대련','린이','베이징','베이징 다싱','산야',
  '샤먼 가오치','석가장','선전','수난 슈오팡','시안','심양','양저우','어저우화후','연길','연대','옌청',
  '오르도스','우루무치','우한','원저우','위해','윈청','이창','장가계','장춘','정저우','지난','창사',
  '천진','청도','청두 티안푸','청두','충칭','쿤밍','푸동','푸저우','하얼빈','하이라얼','하이커우',
  '항저우','허페이','후허하오터',
  '가오슝','마카오','타오위안','타이중','홍콩',
  '깜라인/나트랑','노이바이/하노이','다낭','떤선녓/호찌민','카트비','푸꾸옥',
  '마닐라','세부','칼리보','클라크','팡라오',
  '수완나품/방콕','치앙마이','푸껫','싱가포르',
  '코타키나발루','쿠알라룸푸르','페낭',
  '덴파사/발리','마나도','발릭파판','자카르타',
  '델리','비엔티안','프놈펜','양곤','반다라나이케/콜롬보','카트만두','반다르스리베가완',
  '칭기즈칸/울란바토르',
  '뉴어크','뉴욕/JFK','댈러스','디트로이트','라스베이거스','로스앤젤레스','루이즈빌','마이애미',
  '멤피스','미니애폴리스','보스턴','샌버너디노','산호세','샌프란시스코','솔트레이크시티','시애틀',
  '시카고','시카고 록퍼드','신시내티','애틀랜타','앵커리지','오클랜드','워싱턴 덜레스','인디애나폴리스',
  '호놀룰루','괌','사이판',
  '몬트리올','밴쿠버','캘거리','토론토',
  '과달라하라','멕시코시티','몬테레이','펠리페 앙헬레스','비라코푸스',
  '런던 히드로','라이프치히','뮌헨','프랑크푸르트','마르세유','파리','로마','밀라노',
  '마드리드','바르셀로나','암스테르담','바르샤바','브로츠와프','프라하','비엔나','브뤼셀',
  '부다페스트','취리히','리스본','룩셈부르크 핀델','헬싱키','스톡홀름','오슬로','코펜하겐',
  '자그레브','이스탄불','두바이','아부다비','도하','베이루트','헤이다르 알리예프/바쿠',
  '누르술탄 나자르바예프','쉼켄트','알마티','타슈켄트','마나스/비슈케크','아시가바트',
  '아디스아바바','브리즈번','시드니','오클랜드',
].sort();
const INT_SEA = [
  '가오슝항','고베항','광저우항','나고야항','나바셰바항','담맘항','대련항','도쿄항','두바이 제벨알리항',
  '두반 제벨알리항','닝보-저우산항','라스페치아항','롄윈강항','롱비치항','로스앤젤레스항','루아이브르항',
  '르아브르항','린이항','마닐라항','만사니요항','만드라항','문드라항','밀라노항','반쿠버항','발렌시아항',
  '벨라완항','브리즈번항','브레머하펜항','비에나항','빌헬름스하펜항','산투스항','상하이항','샤먼항',
  '선전항','서배너항','시드니항','시애틀항','싱가포르항','암스테르담항','알헤시라스항','안트베르펜항',
  '잉커우항','오사카항','오클랜드항','요코하마항','울산항','제노바항','제다항','제벨알리항','제브뤼헤항',
  '조이아타우로항','찰스턴항','창원항','천진항','체나이항','첸나이항','청도항','카와사키항','칭다오항',
  '타이완항','타코마항','탄중펠레파스항','탄중프리오크(자카르타)항','타이중항','타이베이항','톈진항',
  '파아항','페낭항','펠릭스토우항','포트클랑','프리맨틀항','프린스루퍼트항','하이퐁항','하카타항',
  '함부르크항','까이멥항','광양항','나고야항','노퍽항(버지니아)','뉴욕/뉴저지항','달리안항','다낭항',
  '둥관항','라사로카르데나스항','람차방항','런던게이트웨이항','로테르담항','마드리드항','마르세유항',
  '만다나우항','모지항','몬트리올항','문드라항','미야자키항','방콕항','베라크루스항','보스니아항',
  '부산항','사우샘프턴항','상하이푸동항','선전공항','솔트레이크항','수라바야항','스리랑카항',
  '시미즈항','아부다비항','앤트워프항','에버글레이즈항','우드항','인천항','일본항','자카르타항',
  '제주항','지룽항','태국항','테헤란항','텍사스항','투르크항','티모르항','파나마항','포트엘리자베스항',
  '호찌민항','홍콩항','휴스턴항',
  // 원문 리스트
  '로스앤젤레스항','롱비치항','뉴욕/뉴저지항','서배너항','휴스턴항','오클랜드항','찰스턴항',
  '시애틀항','타코마항','마이애미항','노퍽항(버지니아)',
  '상하이항','닝보-저우산항','선전항','광저우항','칭다오항','톈진항','샤먼항','다롄항','롄윈강항',
  '잉커우항','타이창항','둥관항','난징항','푸저우항',
  '도쿄항','요코하마항','나고야항','오사카항','고베항','하카타항','시미즈항','모지항','가와사키항','니가타항',
  '가오슝항','지룽항','타이중항','타이베이항',
  '호찌민항','하이퐁항','다낭항','까이멥항',
  '포트클랑','탄중펠레파스항','페낭항',
  '탄중프리오크(자카르타)항','수라바야항','벨라완항',
  '람차방항','방콕항','싱가포르항','마닐라항',
  '나바셰바항','문드라항','첸나이항','콜카타항',
  '제벨알리항','아부다비항','제다항','담맘항',
  '함부르크항','브레머하펜항','빌헬름스하펜항','로테르담항','암스테르담항','안트베르펜항','제브뤼헤항',
  '발렌시아항','알헤시라스항','바르셀로나항','펠릭스토우항','사우샘프턴항','런던게이트웨이항',
  '르아브르항','마르세유항','제노바항','라스페치아항','조이아타우로항',
  '멜버른항','시드니항','브리즈번항','프리맨틀항',
  '산투스항','리우데자네이루항','만사니요항','라사로카르데나스항','베라크루스항',
  '밴쿠버항','몬트리올항','프린스루퍼트항',
].filter((v, i, a) => a.indexOf(v) === i).sort();

type PortType = '한국 항공' | '한국 해상' | '해외 항공' | '해외 해상';
function getPortList(pt: PortType): string[] {
  if (pt === '한국 항공') return KR_AIR;
  if (pt === '한국 해상') return KR_SEA;
  if (pt === '해외 항공') return INT_AIR;
  return INT_SEA;
}
function getCompatible(pt: PortType): PortType[] {
  if (pt === '한국 항공') return ['해외 항공'];
  if (pt === '한국 해상') return ['해외 해상'];
  if (pt === '해외 항공') return ['한국 항공'];
  return ['한국 해상'];
}
function portTypeToTransport(pt: PortType): '해상' | '항공' {
  return pt.includes('항공') ? '항공' : '해상';
}

/* ── Searchable multi-select ───────────────────────────────────────────────── */
function CountrySelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const sorted = [...COUNTRIES_LIST].sort((a, b) => a.localeCompare(b, 'ko'));
  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)} className="w-full px-3 py-2 rounded-xl text-sm cursor-pointer flex items-center justify-between" style={{ border: '1px solid #eaeaf2', background: '#fff', minHeight: 38 }}>
        <span style={{ color: value.length ? '#1a1a2e' : '#9090a8', fontSize: 13 }}>
          {value.length === 0 ? '국가 선택 (복수 선택)' : `${value.slice(0, 2).join(', ')}${value.length > 2 ? ` 외 ${value.length - 2}개` : ''}`}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: '#9090a8', transform: open ? 'rotate(180deg)' : '', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      {open && (
        <div className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #eaeaf2', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 240, overflowY: 'auto' }}>
          {sorted.map((c) => (
            <div key={c} onClick={() => toggle(c)} className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors" style={{ color: value.includes(c) ? '#9333ea' : '#1a1a2e', background: value.includes(c) ? 'rgba(100,50,220,0.04)' : 'transparent' }}>
              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: value.includes(c) ? '#9333ea' : 'transparent', border: `1.5px solid ${value.includes(c) ? '#9333ea' : '#d1d1e0'}` }}>
                {value.includes(c) && <svg width="10" height="8" viewBox="0 0 10 8" fill="white"><path d="M1 4l3 3 5-6"/></svg>}
              </div>
              {c}
            </div>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {value.map((c) => (
            <span key={c} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(100,50,220,0.08)', color: '#9333ea' }}>
              {c}<button onClick={() => toggle(c)} className="ml-0.5 font-bold hover:opacity-60">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Port/Airport searchable select ────────────────────────────────────────── */
function PortSelect({ portType, value, onChange, placeholder }: { portType: PortType; value: string; onChange: (v: string, pt: PortType) => void; placeholder?: string }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const ports = getPortList(portType);
  const filtered = ports.filter((p) => p.includes(search));
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)} className="w-full px-3 py-2 rounded-xl text-sm cursor-pointer flex items-center justify-between" style={{ border: '1px solid #eaeaf2', background: '#fff', minHeight: 38 }}>
        <span style={{ color: value ? '#1a1a2e' : '#9090a8', fontSize: 13 }}>{value || (placeholder ?? '선택')}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: '#9090a8', transform: open ? 'rotate(180deg)' : '', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      {open && (
        <div className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #eaeaf2', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 240 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="검색..." className="w-full px-3 py-2 text-sm outline-none" style={{ borderBottom: '1px solid #eaeaf2', fontFamily: 'Plus Jakarta Sans, sans-serif' }} onClick={(e) => e.stopPropagation()} />
          <div className="overflow-y-auto" style={{ maxHeight: 192 }}>
            {filtered.map((p) => (
              <div key={p} onClick={() => { onChange(p, portType); setOpen(false); setSearch(''); }} className="px-3 py-2 cursor-pointer text-sm transition-colors" style={{ color: value === p ? '#9333ea' : '#1a1a2e', background: value === p ? 'rgba(100,50,220,0.04)' : 'transparent' }}
                onMouseEnter={(e) => { if (value !== p) (e.currentTarget as HTMLDivElement).style.background = '#f9f9fc'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = value === p ? 'rgba(100,50,220,0.04)' : 'transparent'; }}>
                {p}
              </div>
            ))}
            {filtered.length === 0 && <div className="px-3 py-4 text-sm text-center" style={{ color: '#9090a8' }}>검색 결과 없음</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Toggle switch ─────────────────────────────────────────────────────────── */
function ToggleSwitch({ value, onChange, labelOn = 'O', labelOff = 'X' }: { value: boolean; onChange: (v: boolean) => void; labelOn?: string; labelOff?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold" style={{ color: !value ? '#1a1a2e' : '#9090a8' }}>{labelOff}</span>
      <button onClick={() => onChange(!value)} className="relative w-10 h-5 rounded-full transition-all" style={{ background: value ? 'linear-gradient(135deg, #9333ea, #06b6d4)' : '#d1d1e0' }}>
        <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: value ? '22px' : '2px' }} />
      </button>
      <span className="text-sm font-semibold" style={{ color: value ? '#9333ea' : '#9090a8' }}>{labelOn}</span>
    </div>
  );
}

/* ── Field wrapper ─────────────────────────────────────────────────────────── */
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>{label}</label>
      {children}
    </div>
  );
}

const inputCls: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 12, border: '1px solid #eaeaf2', fontSize: 13, color: '#1a1a2e', background: '#fff', outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif' };
const selectCls: React.CSSProperties = { ...inputCls, appearance: 'none', cursor: 'pointer' };

/* ── Types ─────────────────────────────────────────────────────────────────── */
export interface ShipperCondition {
  id: number;
  countries: string[];
  hsCode: string;
  tradeType: '수출' | '수입';
  transport: '해상' | '항공';
  departure: string;
  departurePortType: PortType;
  destination: string;
  destinationPortType: PortType;
  volume: string;
  schedule: string;
  cargoType: '일반' | '특수';
  refrigeration: boolean;
  hazmat: boolean;
  heavy: boolean;
  special: boolean;
}

export interface LogisticsCondition {
  id: number;
  countries: string[];
  tradeType: '수출' | '수입';
  transport: '해상' | '항공';
  departure: string;
  departurePortType: PortType;
  destination: string;
  destinationPortType: PortType;
  regularRoute: boolean;
  directRoute: boolean;
  leadTime: string;
  availableDate: string;
  maxCapacity: string;
  general: boolean;
  refrigeration: boolean;
  hazmat: boolean;
  heavy: boolean;
  special: boolean;
  hsCode: string;
  experience: string;
}

const emptyShipper = (): Omit<ShipperCondition, 'id'> => ({
  countries: [], hsCode: '', tradeType: '수출', transport: '해상',
  departure: '', departurePortType: '한국 해상', destination: '', destinationPortType: '해외 해상',
  volume: '', schedule: '', cargoType: '일반',
  refrigeration: false, hazmat: false, heavy: false, special: false,
});

const emptyLogistics = (): Omit<LogisticsCondition, 'id'> => ({
  countries: [], tradeType: '수출', transport: '해상',
  departure: '', departurePortType: '한국 해상', destination: '', destinationPortType: '해외 해상',
  regularRoute: false, directRoute: false, leadTime: '', availableDate: '',
  maxCapacity: '', general: true, refrigeration: false, hazmat: false, heavy: false, special: false,
  hsCode: '', experience: '',
});

/* ── Port pair selector component ─────────────────────────────────────────── */
function PortPairSelector({
  departurePortType, departure, destinationPortType, destination,
  onDepartureChange, onDestinationChange
}: {
  departurePortType: PortType; departure: string;
  destinationPortType: PortType; destination: string;
  onDepartureChange: (val: string, pt: PortType) => void;
  onDestinationChange: (val: string, pt: PortType) => void;
}) {
  const PORT_TYPE_OPTIONS: PortType[] = ['한국 항공', '한국 해상', '해외 항공', '해외 해상'];
  return (
    <div className="grid grid-cols-2 gap-4 md:col-span-2">
      <FormField label={`출발지 (${departurePortType})`}>
        <div className="space-y-1.5">
          <select
            value={departurePortType}
            onChange={(e) => {
              const pt = e.target.value as PortType;
              const compatible = getCompatible(pt)[0];
              onDepartureChange('', pt);
              onDestinationChange('', compatible);
            }}
            style={selectCls}
          >
            {PORT_TYPE_OPTIONS.map((pt) => <option key={pt}>{pt}</option>)}
          </select>
          <PortSelect portType={departurePortType} value={departure} onChange={onDepartureChange} placeholder="출발지 선택" />
        </div>
      </FormField>
      <FormField label={`도착지 (${destinationPortType})`}>
        <div className="space-y-1.5">
          <select
            value={destinationPortType}
            onChange={(e) => {
              const pt = e.target.value as PortType;
              const compatible = getCompatible(pt)[0];
              onDestinationChange('', pt);
              onDepartureChange('', compatible);
            }}
            style={selectCls}
          >
            {getCompatible(departurePortType).map((pt) => <option key={pt}>{pt}</option>)}
          </select>
          <PortSelect portType={destinationPortType} value={destination} onChange={onDestinationChange} placeholder="도착지 선택" />
        </div>
      </FormField>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function MatchingSettings({ user, onLoginClick, onMatchingUpdate, shipperRows, logisticsRows, onShipperRowsChange, onLogisticsRowsChange }: MatchingSettingsProps) {
  const [consented, setConsented] = useState(false);
  const [shipperForm, setShipperForm] = useState(emptyShipper());
  const [logisticsForm, setLogisticsForm] = useState(emptyLogistics());
  const setShipperRows = onShipperRowsChange;
  const setLogisticsRows = onLogisticsRowsChange;

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-7">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>Matching</p>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: '#1a1a2e' }}>매칭 조건 설정</h1>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(100,50,220,0.07)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>로그인이 필요합니다</h2>
            <p className="text-sm mt-1" style={{ color: '#9090a8' }}>매칭 조건 설정은 로그인 후 이용 가능합니다.</p>
          </div>
          <button onClick={onLoginClick} className="px-6 py-2.5 rounded-full text-sm font-bold text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>
            로그인 / 회원가입
          </button>
        </div>
      </div>
    );
  }

  const isShipper = user.companyType === '수출입기업';
  const setSF = (key: string, val: any) => setShipperForm((p) => ({ ...p, [key]: val }));
  const setLF = (key: string, val: any) => setLogisticsForm((p) => ({ ...p, [key]: val }));

  const handleSFDepartureChange = (val: string, pt: PortType) => {
    const compatiblePt = getCompatible(pt)[0];
    setShipperForm((p) => {
      const destCompatible = getCompatible(pt).includes(p.destinationPortType);
      return { ...p, departure: val, departurePortType: pt, transport: portTypeToTransport(pt), destinationPortType: compatiblePt, destination: destCompatible ? p.destination : '' };
    });
  };
  const handleSFDestinationChange = (val: string, pt: PortType) => {
    const compatiblePt = getCompatible(pt)[0];
    setShipperForm((p) => {
      const depCompatible = getCompatible(pt).includes(p.departurePortType);
      return { ...p, destination: val, destinationPortType: pt, transport: portTypeToTransport(pt), departurePortType: compatiblePt, departure: depCompatible ? p.departure : '' };
    });
  };
  const handleLFDepartureChange = (val: string, pt: PortType) => {
    const compatiblePt = getCompatible(pt)[0];
    setLogisticsForm((p) => {
      const destCompatible = getCompatible(pt).includes(p.destinationPortType);
      return { ...p, departure: val, departurePortType: pt, transport: portTypeToTransport(pt), destinationPortType: compatiblePt, destination: destCompatible ? p.destination : '' };
    });
  };
  const handleLFDestinationChange = (val: string, pt: PortType) => {
    const compatiblePt = getCompatible(pt)[0];
    setLogisticsForm((p) => {
      const depCompatible = getCompatible(pt).includes(p.departurePortType);
      return { ...p, destination: val, destinationPortType: pt, transport: portTypeToTransport(pt), departurePortType: compatiblePt, departure: depCompatible ? p.departure : '' };
    });
  };

  const addShipperRow = () => {
    if (!shipperForm.hsCode || !shipperForm.departure || !shipperForm.destination) return;
    const newRows = [...shipperRows, { ...shipperForm, id: Date.now() }];
    setShipperRows(newRows);
    setShipperForm(emptyShipper());
    const allCountries = [...new Set(newRows.flatMap((r) => r.countries))];
    onMatchingUpdate?.(allCountries);
  };
  const addLogisticsRow = () => {
    if (!logisticsForm.departure || !logisticsForm.destination) return;
    const newRows = [...logisticsRows, { ...logisticsForm, id: Date.now() }];
    setLogisticsRows(newRows);
    setLogisticsForm(emptyLogistics());
    const allCountries = [...new Set([...shipperRows, ...newRows].flatMap((r) => r.countries))];
    onMatchingUpdate?.(allCountries);
  };

  const bool = (v: boolean) => v ? <span style={{ color: '#1a9e5c', fontWeight: 700 }}>O</span> : <span style={{ color: '#d93025' }}>X</span>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>Matching</p>
        <h1 className="text-[28px] font-bold tracking-tight" style={{ color: '#1a1a2e' }}>매칭 조건 설정</h1>
        <p className="text-sm mt-1.5" style={{ color: '#9090a8' }}>{user.companyName} · {user.companyType}</p>
      </div>

      {/* Consent */}
      <div className="rounded-2xl p-5 mb-8 flex items-start gap-4" style={{ background: consented ? 'linear-gradient(135deg, rgba(147,51,234,0.06), rgba(6,182,212,0.04))' : '#f9f9fc', border: consented ? '1.5px solid rgba(147,51,234,0.2)' : '1px solid #eaeaf2' }}>
        <button onClick={() => setConsented(!consented)} className="mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all" style={{ background: consented ? '#9333ea' : 'transparent', border: `2px solid ${consented ? '#9333ea' : '#d1d1e0'}` }}>
          {consented && <svg width="10" height="8" viewBox="0 0 10 8" fill="white"><path d="M1 4l3 3 5-6" strokeWidth="2" stroke="white" fill="none"/></svg>}
        </button>
        <div>
          <p className="text-sm font-bold" style={{ color: '#1a1a2e' }}>매칭 서비스 참여 동의</p>
          <p className="text-xs mt-1" style={{ color: '#9090a8' }}>MACROSS AI 매칭 서비스에 참여하여 적합한 파트너를 추천받는 데 동의합니다. 수집된 매칭 조건은 관리자 검토 후 상대 기업에게 선택적으로 공개됩니다.</p>
        </div>
        {consented && <span className="ml-auto shrink-0 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(147,51,234,0.1)', color: '#9333ea' }}>동의됨</span>}
      </div>

      {!consented && <div className="text-center py-12" style={{ color: '#9090a8' }}><p className="text-sm">매칭 서비스 참여에 동의하시면 조건을 설정할 수 있습니다.</p></div>}

      {consented && (
        <>
          {/* ─── Shipper form ─── */}
          {isShipper && (
            <div>
              <div className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>수출입기업 매칭 조건</p>
                <div className="w-10 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #9333ea, #06b6d4)' }} />
              </div>
              <div className="rounded-2xl p-6 mb-6" style={{ background: '#fff', border: '1px solid #eaeaf2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
                  <FormField label="타겟 국가">
                    <CountrySelect value={shipperForm.countries} onChange={(v) => setSF('countries', v)} />
                  </FormField>
                  <FormField label="타겟 HS코드">
                    <input value={shipperForm.hsCode} onChange={(e) => setSF('hsCode', e.target.value)} placeholder="예: 3304.99" style={inputCls} />
                  </FormField>
                  <FormField label="수출/수입 구분">
                    <select value={shipperForm.tradeType} onChange={(e) => setSF('tradeType', e.target.value)} style={selectCls}>
                      <option>수출</option><option>수입</option>
                    </select>
                  </FormField>
                  <FormField label="운송 방식">
                    <div className="px-3 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(100,50,220,0.04)', border: '1px solid rgba(100,50,220,0.12)', color: '#9333ea' }}>
                      {shipperForm.transport} (출발/도착지 선택에 따라 자동 결정)
                    </div>
                  </FormField>
                  <FormField label="물량 (톤)">
                    <input type="number" value={shipperForm.volume} onChange={(e) => setSF('volume', e.target.value)} placeholder="예: 12.5" style={inputCls} />
                  </FormField>
                  <FormField label="희망 일정 (월)">
                    <input type="month" value={shipperForm.schedule} onChange={(e) => setSF('schedule', e.target.value)} style={inputCls} />
                  </FormField>
                </div>

                {/* Port pair */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <PortPairSelector
                    departurePortType={shipperForm.departurePortType} departure={shipperForm.departure}
                    destinationPortType={shipperForm.destinationPortType} destination={shipperForm.destination}
                    onDepartureChange={handleSFDepartureChange} onDestinationChange={handleSFDestinationChange}
                  />
                </div>

                {/* All switches in one row */}
                <div className="pt-4 mb-5" style={{ borderTop: '1px solid #f0f0f8' }}>
                  <div className="grid grid-cols-5 gap-4">
                    <FormField label="화물 유형">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: shipperForm.cargoType === '일반' ? '#1a1a2e' : '#9090a8' }}>일반</span>
                        <button onClick={() => setSF('cargoType', shipperForm.cargoType === '일반' ? '특수' : '일반')} className="relative w-10 h-5 rounded-full transition-all" style={{ background: shipperForm.cargoType === '특수' ? 'linear-gradient(135deg, #9333ea, #06b6d4)' : '#d1d1e0' }}>
                          <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: shipperForm.cargoType === '특수' ? '22px' : '2px' }} />
                        </button>
                        <span className="text-sm font-semibold" style={{ color: shipperForm.cargoType === '특수' ? '#9333ea' : '#9090a8' }}>특수</span>
                      </div>
                    </FormField>
                    {[
                      { key: 'refrigeration', label: '냉장/냉동 여부' },
                      { key: 'hazmat', label: '위험물 여부' },
                      { key: 'heavy', label: '중량물 여부' },
                      { key: 'special', label: '특수화물 여부' },
                    ].map(({ key, label }) => (
                      <FormField key={key} label={label}>
                        <ToggleSwitch value={shipperForm[key as keyof typeof shipperForm] as boolean} onChange={(v) => setSF(key, v)} />
                      </FormField>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={addShipperRow} className="px-6 py-2 rounded-full text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>+ 조건 추가</button>
                </div>
              </div>

              {shipperRows.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #eaeaf2' }}>
                  <div className="px-5 py-3" style={{ background: 'rgba(100,50,220,0.02)', borderBottom: '1px solid #eaeaf2' }}>
                    <p className="text-sm font-bold" style={{ color: '#1a1a2e' }}>등록된 매칭 조건 ({shipperRows.length}건)</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #eaeaf2' }}>
                          {['타겟국가','HS코드','구분','운송','출발지','도착지','물량(t)','일정','화물','냉동','위험','중량','특수',''].map((h) => (
                            <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap" style={{ color: '#9090a8', background: 'rgba(100,50,220,0.02)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shipperRows.map((row) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid #f2f2f8' }}>
                            <td className="px-3 py-2.5">{row.countries.slice(0, 2).join(', ')}{row.countries.length > 2 ? ` +${row.countries.length - 2}` : ''}</td>
                            <td className="px-3 py-2.5 font-mono" style={{ color: '#9090a8' }}>{row.hsCode}</td>
                            <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: row.tradeType === '수출' ? 'rgba(147,51,234,0.08)' : 'rgba(6,182,212,0.08)', color: row.tradeType === '수출' ? '#9333ea' : '#06b6d4' }}>{row.tradeType}</span></td>
                            <td className="px-3 py-2.5">{row.transport}</td>
                            <td className="px-3 py-2.5" style={{ color: '#5e5e7a' }}>{row.departure}</td>
                            <td className="px-3 py-2.5" style={{ color: '#5e5e7a' }}>{row.destination}</td>
                            <td className="px-3 py-2.5 font-mono">{row.volume}</td>
                            <td className="px-3 py-2.5 font-mono">{row.schedule}</td>
                            <td className="px-3 py-2.5">{row.cargoType}</td>
                            <td className="px-3 py-2.5">{bool(row.refrigeration)}</td>
                            <td className="px-3 py-2.5">{bool(row.hazmat)}</td>
                            <td className="px-3 py-2.5">{bool(row.heavy)}</td>
                            <td className="px-3 py-2.5">{bool(row.special)}</td>
                            <td className="px-3 py-2.5"><button onClick={() => setShipperRows(shipperRows.filter((r) => r.id !== row.id))} className="text-xs px-2 py-0.5 rounded hover:opacity-70" style={{ color: '#d93025' }}>삭제</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Logistics form ─── */}
          {!isShipper && (
            <div>
              <div className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>물류업체 매칭 조건</p>
                <div className="w-10 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #9333ea, #06b6d4)' }} />
              </div>
              <div className="rounded-2xl p-6 mb-6" style={{ background: '#fff', border: '1px solid #eaeaf2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
                  <FormField label="타겟 국가">
                    <CountrySelect value={logisticsForm.countries} onChange={(v) => setLF('countries', v)} />
                  </FormField>
                  <FormField label="수출/수입 구분">
                    <select value={logisticsForm.tradeType} onChange={(e) => setLF('tradeType', e.target.value)} style={selectCls}>
                      <option>수출</option><option>수입</option>
                    </select>
                  </FormField>
                  <FormField label="운송 방식">
                    <div className="px-3 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(100,50,220,0.04)', border: '1px solid rgba(100,50,220,0.12)', color: '#9333ea' }}>
                      {logisticsForm.transport} (출발/도착지 선택에 따라 자동 결정)
                    </div>
                  </FormField>
                  <FormField label="평균 리드타임 (일)">
                    <input type="number" value={logisticsForm.leadTime} onChange={(e) => setLF('leadTime', e.target.value)} placeholder="예: 14" style={inputCls} />
                  </FormField>
                  <FormField label="운송 가능일">
                    <input type="date" value={logisticsForm.availableDate} onChange={(e) => setLF('availableDate', e.target.value)} style={inputCls} />
                  </FormField>
                  <FormField label="최대 가용 물량 (톤)">
                    <input type="number" value={logisticsForm.maxCapacity} onChange={(e) => setLF('maxCapacity', e.target.value)} placeholder="예: 50" style={inputCls} />
                  </FormField>
                  <FormField label="타겟 HS코드">
                    <input value={logisticsForm.hsCode} onChange={(e) => setLF('hsCode', e.target.value)} placeholder="예: 3304.99" style={inputCls} />
                  </FormField>
                  <FormField label="HS코드 취급 경험 (회)">
                    <input type="number" value={logisticsForm.experience} onChange={(e) => setLF('experience', e.target.value)} placeholder="예: 24" style={inputCls} />
                  </FormField>
                </div>

                {/* Port pair */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <PortPairSelector
                    departurePortType={logisticsForm.departurePortType} departure={logisticsForm.departure}
                    destinationPortType={logisticsForm.destinationPortType} destination={logisticsForm.destination}
                    onDepartureChange={handleLFDepartureChange} onDestinationChange={handleLFDestinationChange}
                  />
                </div>

                {/* Route toggles + cargo capabilities aligned in 5-col grid */}
                <div className="pt-4" style={{ borderTop: '1px solid #f0f0f8' }}>
                  {/* Row 1 (5 cols): 정기노선(col1), 직항(col2) — 직항이 아래 냉장/냉동(col2)과 x축 일치 */}
                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <FormField label="정기노선 여부">
                      <ToggleSwitch value={logisticsForm.regularRoute} onChange={(v) => setLF('regularRoute', v)} />
                    </FormField>
                    <FormField label="직항 여부">
                      <ToggleSwitch value={logisticsForm.directRoute} onChange={(v) => setLF('directRoute', v)} />
                    </FormField>
                  </div>
                  {/* Row 2 (5 cols): 일반(col1), 냉동(col2), 위험(col3), 중량(col4), 특수(col5) */}
                  <div className="grid grid-cols-5 gap-4 mb-5">
                    {[
                      { key: 'general', label: '일반화물 취급' },
                      { key: 'refrigeration', label: '냉장/냉동 취급' },
                      { key: 'hazmat', label: '위험물 취급' },
                      { key: 'heavy', label: '중량물 취급' },
                      { key: 'special', label: '특수화물 취급' },
                    ].map(({ key, label }) => (
                      <FormField key={key} label={label}>
                        <ToggleSwitch value={logisticsForm[key as keyof typeof logisticsForm] as boolean} onChange={(v) => setLF(key, v)} />
                      </FormField>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={addLogisticsRow} className="px-6 py-2 rounded-full text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>+ 조건 추가</button>
                </div>
              </div>

              {logisticsRows.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #eaeaf2' }}>
                  <div className="px-5 py-3" style={{ background: 'rgba(100,50,220,0.02)', borderBottom: '1px solid #eaeaf2' }}>
                    <p className="text-sm font-bold" style={{ color: '#1a1a2e' }}>등록된 매칭 조건 ({logisticsRows.length}건)</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #eaeaf2' }}>
                          {['타겟국가','구분','운송','출발','도착','리드타임','운송가능일','물량(t)','정기','직항','일반','냉동','위험','중량','특수','HS코드','경험',''].map((h) => (
                            <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap" style={{ color: '#9090a8', background: 'rgba(100,50,220,0.02)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {logisticsRows.map((row) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid #f2f2f8' }}>
                            <td className="px-3 py-2.5">{row.countries.slice(0, 1).join(', ')}{row.countries.length > 1 ? ` +${row.countries.length - 1}` : ''}</td>
                            <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: row.tradeType === '수출' ? 'rgba(147,51,234,0.08)' : 'rgba(6,182,212,0.08)', color: row.tradeType === '수출' ? '#9333ea' : '#06b6d4' }}>{row.tradeType}</span></td>
                            <td className="px-3 py-2.5 font-semibold" style={{ color: '#9333ea' }}>{row.transport}</td>
                            <td className="px-3 py-2.5" style={{ color: '#5e5e7a' }}>{row.departure}</td>
                            <td className="px-3 py-2.5" style={{ color: '#5e5e7a' }}>{row.destination}</td>
                            <td className="px-3 py-2.5 font-mono">{row.leadTime}일</td>
                            <td className="px-3 py-2.5 font-mono">{row.availableDate}</td>
                            <td className="px-3 py-2.5 font-mono">{row.maxCapacity}</td>
                            <td className="px-3 py-2.5">{bool(row.regularRoute)}</td>
                            <td className="px-3 py-2.5">{bool(row.directRoute)}</td>
                            <td className="px-3 py-2.5">{bool(row.general)}</td>
                            <td className="px-3 py-2.5">{bool(row.refrigeration)}</td>
                            <td className="px-3 py-2.5">{bool(row.hazmat)}</td>
                            <td className="px-3 py-2.5">{bool(row.heavy)}</td>
                            <td className="px-3 py-2.5">{bool(row.special)}</td>
                            <td className="px-3 py-2.5 font-mono" style={{ color: '#9090a8' }}>{row.hsCode}</td>
                            <td className="px-3 py-2.5">{row.experience}회</td>
                            <td className="px-3 py-2.5"><button onClick={() => setLogisticsRows(logisticsRows.filter((r) => r.id !== row.id))} className="text-xs px-2 py-0.5 rounded hover:opacity-70" style={{ color: '#d93025' }}>삭제</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
