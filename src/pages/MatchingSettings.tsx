import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { User } from '../App';

interface MatchingSettingsProps {
  user: User | null;
  onLoginClick: () => void;
  onMatchingUpdate?: (countries: string[]) => void;
  shipperRows: ShipperCondition[];
  logisticsRows: LogisticsCondition[];
  onShipperRowsChange: (rows: ShipperCondition[]) => void;
  onLogisticsRowsChange: (rows: LogisticsCondition[]) => void;
}


/* ── Backend CSV reference data ─────────────────────────────────────────────── */
interface CountryData {
  countryId: number;
  countryCode: string;
  currencyId: number | null;
  countryName: string;
}

interface RouteData {
  routeId: number;
  countryId: number;
  transportType: number; // CSV: 1=해상, 2=항공
  routeName: string;
}

type PortType = '한국 항공' | '한국 해상' | '해외 항공' | '해외 해상';

const KOREA_ID = 1122;

function parseCountryCsv(csv: string): CountryData[] {
  const rows: CountryData[] = [];
  const lines = csv.trim().split(/\r?\n/).slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;

    const [countryId, countryCode, currencyId, ...nameParts] = line.split(',');
    rows.push({
      countryId: Number(countryId),
      countryCode: countryCode.trim(),
      currencyId: currencyId.trim() === '' ? null : Number(currencyId),
      countryName: nameParts.join(',').trim(),
    });
  }

  return rows;
}

function parseRouteCsv(csv: string): RouteData[] {
  const rows: RouteData[] = [];
  const lines = csv.trim().split(/\r?\n/).slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;

    const [routeId, countryId, transportType, ...nameParts] = line.split(',');
    rows.push({
      routeId: Number(routeId),
      countryId: Number(countryId),
      transportType: Number(transportType),
      routeName: nameParts.join(',').trim(),
    });
  }

  return rows;
}

function getCountryId(countries: CountryData[], countryName: string): number | undefined {
  return countries.find((country) => country.countryName === countryName)?.countryId;
}

function getCountryName(countries: CountryData[], countryId: number): string {
  return countries.find((country) => country.countryId === countryId)?.countryName ?? '';
}

function getRouteById(routes: RouteData[], routeId: number): RouteData | undefined {
  return routes.find((route) => route.routeId === routeId);
}

function getRouteByName(
  routes: RouteData[],
  routeName: string,
  countryId: number,
  transportType: number,
): RouteData | undefined {
  return routes.find(
    (route) =>
      route.routeName === routeName &&
      route.countryId === countryId &&
      route.transportType === transportType,
  );
}

function getRouteName(routes: RouteData[], routeId: number): string {
  return getRouteById(routes, routeId)?.routeName ?? '';
}

function getPortType(route: RouteData): PortType {
  const location = route.countryId === KOREA_ID ? '한국' : '해외';
  const transport = route.transportType === 1 ? '해상' : '항공';
  return `${location} ${transport}` as PortType;
}

function getPortList(
  routes: RouteData[],
  portType: PortType,
  countryId?: number,
): string[] {
  const result: string[] = [];

  for (const route of routes) {
    if (getPortType(route) !== portType) continue;

    // 프로젝트 범위: 한국 항공은 인천공항만 사용
    if (portType === '한국 항공' && route.routeName !== '인천공항') continue;

    if (portType.startsWith('해외')) {
      if (countryId === undefined || route.countryId !== countryId) continue;
    }

    result.push(route.routeName);
  }

  return [...new Set(result)].sort((a, b) => a.localeCompare(b, 'ko'));
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

/* ── Country single-select ───────────────────────────────────────────────── */
function CountrySelect({
  value,
  onChange,
  countries,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  countries: CountryData[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const sorted = countries
    .filter((country) => country.countryId !== KOREA_ID)
    .map((country) => country.countryName)
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const toggle = (country: string) => {
    onChange(value.includes(country) ? [] : [country]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)} className="w-full px-3 py-2 rounded-xl text-sm cursor-pointer flex items-center justify-between" style={{ border: '1px solid #eaeaf2', background: '#fff', minHeight: 38 }}>
        <span style={{ color: value.length ? '#1a1a2e' : '#9090a8', fontSize: 13 }}>
          {value.length === 0 ? '국가 선택 (1개)' : value[0]}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: '#9090a8', transform: open ? 'rotate(180deg)' : '', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {open && (
        <div className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #eaeaf2', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 240, overflowY: 'auto' }}>
          {sorted.map((country) => (
            <div key={country} onClick={() => toggle(country)} className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors" style={{ color: value.includes(country) ? '#9333ea' : '#1a1a2e', background: value.includes(country) ? 'rgba(100,50,220,0.04)' : 'transparent' }}>
              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: value.includes(country) ? '#9333ea' : 'transparent', border: `1.5px solid ${value.includes(country) ? '#9333ea' : '#d1d1e0'}` }}>
                {value.includes(country) && <svg width="10" height="8" viewBox="0 0 10 8" fill="white"><path d="M1 4l3 3 5-6"/></svg>}
              </div>
              {country}
            </div>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(100,50,220,0.08)', color: '#9333ea' }}>
            {value[0]}<button onClick={() => toggle(value[0])} className="ml-0.5 font-bold hover:opacity-60">×</button>
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Port/Airport searchable select ────────────────────────────────────────── */
function PortSelect({
  routes,
  portType,
  countryId,
  value,
  onChange,
  placeholder,
}: {
  routes: RouteData[];
  portType: PortType;
  countryId?: number;
  value: string;
  onChange: (v: string, pt: PortType) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const ports = getPortList(routes, portType, countryId);
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
              <div
                key={p}
                onClick={() => { onChange(p, portType); setOpen(false); setSearch(''); }}
                className="px-3 py-2 cursor-pointer text-sm transition-colors"
                style={{ color: value === p ? '#9333ea' : '#1a1a2e', background: value === p ? 'rgba(100,50,220,0.04)' : 'transparent' }}
                onMouseEnter={(e) => { if (value !== p) (e.currentTarget as HTMLDivElement).style.background = '#f9f9fc'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = value === p ? 'rgba(100,50,220,0.04)' : 'transparent'; }}
              >
                {p}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-center" style={{ color: '#9090a8' }}>
                {!countryId && portType.startsWith('해외') ? '타겟 국가를 먼저 선택해 주세요.' : '검색 결과 없음'}
              </div>
            )}
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
  availableCapacity: string;
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
  availableCapacity: '', general: true, refrigeration: false, hazmat: false, heavy: false, special: false,
  hsCode: '', experience: '',
});

/* ── Port pair selector component ─────────────────────────────────────────── */
function PortPairSelector({
  routes, departurePortType, departure, destinationPortType, destination, countryId,
  onDepartureChange, onDestinationChange
}: {
  routes: RouteData[];
  countryId?: number;
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

          <PortSelect
            routes={routes}
            countryId={countryId}
            portType={departurePortType}
            value={departure}
            onChange={onDepartureChange}
            placeholder="출발지 선택"
          />
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

          <PortSelect
            routes={routes}
            countryId={countryId}
            portType={destinationPortType}
            value={destination}
            onChange={onDestinationChange}
            placeholder="도착지 선택"
          />
        </div>
      </FormField>
    </div>
  );
}

// 실제 Spring DTO 필드 타입입니다.
interface Score1Dto {
  memberId: string; countryId: number; hsCode: string;
  tradeType: boolean; transportType: boolean;
  departure: number; arrival: number; matchingAgree: boolean;
}
interface Cscore1Dto extends Score1Dto { cscore1Id: number }
interface Lscore1Dto extends Score1Dto {
  lscore1Id: number; experienceCount: number; regularRoute: boolean; directRoute: boolean;
}
interface Cscore2Dto { requestWeight: number; desiredDate: string }
interface Lscore2Dto { availableCapacity: number; availableDate: string; averageTransitDays: number }
interface CargoDto {
  generalContainer: boolean; refrigerated: boolean; dangerous: boolean;
  heavyCargo: boolean; specialCargo: boolean;
}

function readNumber(value: string, label: string, integer = false, allowZero = false): number {
  const number = Number(value);
  if (!value.trim() || !Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)
    || (integer && (!Number.isInteger(number) || number > 2147483647))) {
    throw new Error(`${label}: ${allowZero ? '0 이상' : '0 초과'}의 ${integer ? '정수' : '숫자'}를 입력해 주세요.`);
  }
  return number;
}
function checkDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())
    || date.toISOString().slice(0, 10) !== value) throw new Error('올바른 운송 날짜를 입력해 주세요.');
  return value;
}
function makeBaseDto(
  form: Omit<ShipperCondition, 'id'> | Omit<LogisticsCondition, 'id'>,
  memberId: string,
  consented: boolean,
  countries: CountryData[],
  routes: RouteData[],
): Score1Dto {
  // 1. 회원 확인
  if (!memberId) throw new Error('DB 회원 ID가 없습니다. 실제 회원으로 로그인해 주세요.');

  // 2. 입력값 확인
  if (!consented) throw new Error('매칭 정보 제공에 동의해 주세요.');
  if (!form.hsCode.trim() || form.hsCode.trim().length > 15) throw new Error('HS코드를 1~15자로 입력해 주세요.');
  if (form.countries.length !== 1) throw new Error('타겟 국가를 한 개 선택해 주세요.');

  // 3. 국가 ID 찾기
  const countryId = getCountryId(countries, form.countries[0]);
  if (countryId === undefined || countryId === KOREA_ID) throw new Error('타겟 국가는 해외 국가를 선택해 주세요.');

  // 4. Route ID 찾기 (CSV: 1=해상, 2=항공)
  const exporting = form.tradeType === '수출';
  const routeTransportType = form.transport === '해상' ? 1 : 2;

  const departure = getRouteByName(
    routes,
    form.departure,
    exporting ? KOREA_ID : countryId,
    routeTransportType,
  );

  const arrival = getRouteByName(
    routes,
    form.destination,
    exporting ? countryId : KOREA_ID,
    routeTransportType,
  );

  if (
    !departure ||
    !arrival ||
    getPortType(departure) !== form.departurePortType ||
    getPortType(arrival) !== form.destinationPortType
  ) {
    throw new Error('수출은 대한민국 → 타겟 국가, 수입은 타겟 국가 → 대한민국이어야 합니다. 국가와 운송 방식에 맞는 출발·도착지를 선택해 주세요.');
  }

  // Spring Boolean: true=수출, true=해상
  return {
    memberId,
    countryId,
    hsCode: form.hsCode.trim(),
    tradeType: exporting,
    transportType: form.transport === '해상',
    departure: departure.routeId,
    arrival: arrival.routeId,
    matchingAgree: consented,
  };
}

function readBaseRow(
  dto: Score1Dto,
  countries: CountryData[],
  routes: RouteData[],
) {
  const departure = getRouteById(routes, dto.departure);
  const arrival = getRouteById(routes, dto.arrival);
  const tradeType: '수출' | '수입' = dto.tradeType ? '수출' : '수입';
  const transport: '해상' | '항공' = dto.transportType ? '해상' : '항공';

  return {
    countries: [getCountryName(countries, dto.countryId)],
    hsCode: dto.hsCode,
    tradeType,
    transport,
    departure: getRouteName(routes, dto.departure),
    destination: getRouteName(routes, dto.arrival),
    departurePortType: departure
      ? getPortType(departure)
      : `${dto.tradeType ? '한국' : '해외'} ${transport}` as PortType,
    destinationPortType: arrival
      ? getPortType(arrival)
      : `${dto.tradeType ? '해외' : '한국'} ${transport}` as PortType,
  };
}
function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) return `서버 요청에 실패했습니다${error.response ? ` (HTTP ${error.response.status})` : ''}. Spring 서버(8080) 실행 상태를 확인해 주세요.`;
  return error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.';
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function MatchingSettings({ user, onLoginClick, onMatchingUpdate, shipperRows, logisticsRows, onShipperRowsChange, onLogisticsRowsChange }: MatchingSettingsProps) {
  const [consented, setConsented] = useState(false);
  const [shipperForm, setShipperForm] = useState(emptyShipper());
  const [logisticsForm, setLogisticsForm] = useState(emptyLogistics());

  // 백엔드 static CSV에서 받아오는 기준 데이터
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState('');

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const saving = useRef(false);
  const mounted = useRef(false);
  const memberId = user?.memberId;
  const companyType = user?.companyType;

  // DB 목록과 연결된 2·3번 DTO를 조회합니다.
  const loadRows = useCallback(async (signal?: AbortSignal) => {
    if (!memberId || !companyType || countries.length === 0 || routes.length === 0) return;
    setLoading(true);
    setLoadError('');
    try {
      if (companyType === '수출입기업') {
        const { data } = await axios.get<Cscore1Dto[]>('/api/cscore', { params: { memberId }, signal });
        const rows = await Promise.all(data.filter((dto) => dto.memberId === memberId).map(async (dto): Promise<ShipperCondition> => {
          const [second, third] = await Promise.all([
            axios.get<Cscore2Dto | null>(`/api/cscore/${dto.cscore1Id}/cscore2`, { signal }),
            axios.get<CargoDto | null>(`/api/cscore/${dto.cscore1Id}/cscore3`, { signal }),
          ]);
          if (!second.data || !third.data) throw new Error(`조건 ${dto.cscore1Id}의 상세 데이터가 없습니다.`);
          return { ...readBaseRow(dto, countries, routes), id: dto.cscore1Id,
            volume: String(second.data.requestWeight), schedule: second.data.desiredDate,
            cargoType: third.data.generalContainer ? '일반' : '특수',
            refrigeration: third.data.refrigerated, hazmat: third.data.dangerous,
            heavy: third.data.heavyCargo, special: third.data.specialCargo };
        }));
        if (!mounted.current || signal?.aborted) return;
        onShipperRowsChange(rows);
        onLogisticsRowsChange([]);
        onMatchingUpdate?.([...new Set(rows.flatMap((row) => row.countries))]);
      } else {
        const { data } = await axios.get<Lscore1Dto[]>('/api/lscore', { params: { memberId }, signal });
        const rows = await Promise.all(data.filter((dto) => dto.memberId === memberId).map(async (dto): Promise<LogisticsCondition> => {
          const [second, third] = await Promise.all([
            axios.get<Lscore2Dto | null>(`/api/lscore/${dto.lscore1Id}/lscore2`, { signal }),
            axios.get<CargoDto | null>(`/api/lscore/${dto.lscore1Id}/lscore3`, { signal }),
          ]);
          if (!second.data || !third.data) throw new Error(`조건 ${dto.lscore1Id}의 상세 데이터가 없습니다.`);
          return { ...readBaseRow(dto, countries, routes), id: dto.lscore1Id,
            regularRoute: dto.regularRoute, directRoute: dto.directRoute, experience: String(dto.experienceCount),
            leadTime: String(second.data.averageTransitDays), availableCapacity: String(second.data.availableCapacity),
            availableDate: second.data.availableDate, general: third.data.generalContainer,
            refrigeration: third.data.refrigerated, hazmat: third.data.dangerous,
            heavy: third.data.heavyCargo, special: third.data.specialCargo };
        }));
        if (!mounted.current || signal?.aborted) return;
        onLogisticsRowsChange(rows);
        onShipperRowsChange([]);
        onMatchingUpdate?.([...new Set(rows.flatMap((row) => row.countries))]);
      }
    } catch (error) {
      if (mounted.current && !signal?.aborted) setLoadError(errorMessage(error));
      throw error;
    } finally {
      if (mounted.current && !signal?.aborted) setLoading(false);
    }
  }, [memberId, companyType, countries, routes, onShipperRowsChange, onLogisticsRowsChange, onMatchingUpdate]);

  // 컴포넌트 생명주기 확인
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 1. 백엔드에 있는 country.csv / route.csv를 한 번 불러옵니다.
  useEffect(() => {
    const controller = new AbortController();

    const loadReferenceData = async () => {
      setReferenceLoading(true);
      setReferenceError('');

      try {
        const [countryResponse, routeResponse] = await Promise.all([
          axios.get<string>('/country/country.csv', {
            responseType: 'text',
            signal: controller.signal,
          }),
          axios.get<string>('/route/route.csv', {
            responseType: 'text',
            signal: controller.signal,
          }),
        ]);

        if (controller.signal.aborted) return;

        const countryRows = parseCountryCsv(countryResponse.data);
        const routeRows = parseRouteCsv(routeResponse.data);

        if (countryRows.length === 0 || routeRows.length === 0) {
          throw new Error('국가 또는 경로 CSV 데이터가 비어 있습니다.');
        }

        setCountries(countryRows);
        setRoutes(routeRows);
      } catch (error) {
        if (!controller.signal.aborted) {
          setReferenceError(
            axios.isAxiosError(error)
              ? '국가/경로 데이터를 불러오지 못했습니다. Spring 서버와 Vite proxy 설정을 확인해 주세요.'
              : error instanceof Error
                ? error.message
                : '국가/경로 데이터를 불러오지 못했습니다.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setReferenceLoading(false);
      }
    };

    void loadReferenceData();

    return () => controller.abort();
  }, []);

  // 2. 기준 데이터가 준비되면 로그인 회원의 DB 조건을 조회합니다.
  useEffect(() => {
    const controller = new AbortController();

    onShipperRowsChange([]);
    onLogisticsRowsChange([]);
    onMatchingUpdate?.([]);

    if (!memberId) {
      setLoadError('DB 회원 ID가 없습니다. 실제 회원으로 로그인해 주세요.');
      return () => controller.abort();
    }

    if (referenceLoading || referenceError || countries.length === 0 || routes.length === 0) {
      return () => controller.abort();
    }

    void loadRows(controller.signal).catch(() => {});

    return () => controller.abort();
  }, [
    memberId,
    referenceLoading,
    referenceError,
    countries,
    routes,
    loadRows,
    onShipperRowsChange,
    onLogisticsRowsChange,
    onMatchingUpdate,
  ]);


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
  const setSF = (key: string, val: any) => setShipperForm((p) => {
    // 국가·수출입 변경 시 이전 경로 선택을 지웁니다.
    if (key === 'countries') return { ...p, countries: val, departure: '', destination: '' };
    if (key === 'tradeType') return { ...p, tradeType: val, departure: '', destination: '',
      departurePortType: `${val === '수출' ? '한국' : '해외'} ${p.transport}` as PortType,
      destinationPortType: `${val === '수출' ? '해외' : '한국'} ${p.transport}` as PortType };
    return { ...p, [key]: val };
  });
  const setLF = (key: string, val: any) => setLogisticsForm((p) => {
    // 국가·수출입 변경 시 이전 경로 선택을 지웁니다.
    if (key === 'countries') return { ...p, countries: val, departure: '', destination: '' };
    if (key === 'tradeType') return { ...p, tradeType: val, departure: '', destination: '',
      departurePortType: `${val === '수출' ? '한국' : '해외'} ${p.transport}` as PortType,
      destinationPortType: `${val === '수출' ? '해외' : '한국'} ${p.transport}` as PortType };
    return { ...p, [key]: val };
  });

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

  const addShipperRow = async () => {
    if (saving.current) return;
    let saved = false;
    try {
      const cscore1Dto = makeBaseDto(shipperForm, user.memberId ?? '', consented, countries, routes);
      const cscore2Dto = { requestWeight: readNumber(shipperForm.volume, '물량'), desiredDate: checkDate(shipperForm.schedule) };
      const cscore3Dto: CargoDto = { generalContainer: shipperForm.cargoType === '일반',
        refrigerated: shipperForm.refrigeration, dangerous: shipperForm.hazmat,
        heavyCargo: shipperForm.heavy, specialCargo: shipperForm.special };
      saving.current = true;
      setBusy(true);
      // 5. 서버에 저장
      const { data } = await axios.post<boolean>('/api/cscore', { cscore1Dto, cscore2Dto, cscore3Dto });
      if (data !== true) throw new Error('저장에 실패했습니다. DB에 회원 ID가 존재하는지 확인해 주세요.');
      saved = true;
      if (!mounted.current) return;
      setShipperForm(emptyShipper());
      // 6. DB 목록 다시 조회
      await loadRows();
    } catch (error) {
      if (mounted.current) alert(saved ? '저장은 완료됐지만 목록 조회에 실패했습니다. 다시 조회 버튼을 눌러 주세요.' : errorMessage(error));
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const addLogisticsRow = async () => {
    if (saving.current) return;
    let saved = false;
    try {
      const lscore1Dto = { ...makeBaseDto(logisticsForm, user.memberId ?? '', consented, countries, routes),
        experienceCount: readNumber(logisticsForm.experience, '취급 경험', true, true),
        regularRoute: logisticsForm.regularRoute, directRoute: logisticsForm.directRoute };
      const lscore2Dto = { availableCapacity: readNumber(logisticsForm.availableCapacity, '가용 물량'),
        availableDate: checkDate(logisticsForm.availableDate), averageTransitDays: readNumber(logisticsForm.leadTime, '리드타임', true) };
      const lscore3Dto: CargoDto = { generalContainer: logisticsForm.general,
        refrigerated: logisticsForm.refrigeration, dangerous: logisticsForm.hazmat,
        heavyCargo: logisticsForm.heavy, specialCargo: logisticsForm.special };
      saving.current = true;
      setBusy(true);
      // 5. 서버에 저장
      const { data } = await axios.post<boolean>('/api/lscore', { lscore1Dto, lscore2Dto, lscore3Dto });
      if (data !== true) throw new Error('저장에 실패했습니다. DB에 회원 ID가 존재하는지 확인해 주세요.');
      saved = true;
      if (!mounted.current) return;
      setLogisticsForm(emptyLogistics());
      // 6. DB 목록 다시 조회
      await loadRows();
    } catch (error) {
      if (mounted.current) alert(saved ? '저장은 완료됐지만 목록 조회에 실패했습니다. 다시 조회 버튼을 눌러 주세요.' : errorMessage(error));
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const deleteRow = async (id: number) => {
    if (saving.current || !user.memberId) return;
    saving.current = true;
    setBusy(true);
    let deleted = false;
    try {
      const { data } = await axios.delete<boolean>(`/api/${isShipper ? 'cscore' : 'lscore'}/${id}`);
      if (data !== true) {
        if (mounted.current) alert('매칭 결과에 사용 중인 조건은 삭제할 수 없습니다.');
        return;
      }
      deleted = true;
      if (mounted.current) await loadRows();
    } catch (error) {
      if (mounted.current) alert(deleted ? '삭제는 완료됐지만 목록 조회에 실패했습니다. 다시 조회 버튼을 눌러 주세요.' : errorMessage(error));
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const bool = (v: boolean) => v ? <span style={{ color: '#1a9e5c', fontWeight: 700 }}>O</span> : <span style={{ color: '#d93025' }}>X</span>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>Matching</p>
        <h1 className="text-[28px] font-bold tracking-tight" style={{ color: '#1a1a2e' }}>매칭 조건 설정</h1>
        <p className="text-sm mt-1.5" style={{ color: '#9090a8' }}>{user.companyName} · {user.companyType}</p>
      </div>

      {referenceLoading && <p className="text-sm mb-4" role="status">국가/경로 데이터를 불러오는 중입니다...</p>}
      {referenceError && <div className="text-sm mb-4" role="alert" style={{ color: '#d93025' }}>{referenceError}</div>}
      {loading && <p className="text-sm mb-4" role="status">DB 목록을 불러오는 중입니다...</p>}
      {loadError && <div className="text-sm mb-4" role="alert" style={{ color: '#d93025' }}>
        {loadError} <button disabled={loading || busy || referenceLoading || !memberId || !!referenceError} onClick={() => void loadRows().catch(() => {})} className="underline ml-2">다시 조회</button>
      </div>}
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

      {(consented || shipperRows.length > 0 || logisticsRows.length > 0) && (
        <>
          {/* ─── Shipper form ─── */}
          {isShipper && (
            <div>
              <div className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>수출입기업 매칭 조건</p>
                <div className="w-10 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #9333ea, #06b6d4)' }} />
              </div>
              <fieldset disabled={!consented || busy || referenceLoading || !!referenceError} className="rounded-2xl p-6 mb-6 min-w-0 disabled:pointer-events-none" style={{ background: '#fff', border: '1px solid #eaeaf2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
                  <FormField label="타겟 국가">
                    <CountrySelect countries={countries} value={shipperForm.countries} onChange={(v) => setSF('countries', v)} />
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
                  <FormField label="희망 일정">
                    <input type="date" value={shipperForm.schedule} onChange={(e) => setSF('schedule', e.target.value)} style={inputCls} />
                  </FormField>
                </div>

                {/* Port pair */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <PortPairSelector routes={routes} countryId={getCountryId(countries, shipperForm.countries[0])}
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
                  <button disabled={busy || loading || referenceLoading || !consented || !user.memberId || !!loadError || !!referenceError} onClick={addShipperRow} className="px-6 py-2 rounded-full text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>+ 조건 추가</button>
                </div>
              </fieldset>

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
                            <td className="px-3 py-2.5"><button disabled={busy || loading} onClick={() => deleteRow(row.id)} className="text-xs px-2 py-0.5 rounded hover:opacity-70" style={{ color: '#d93025' }}>삭제</button></td>
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
              <fieldset disabled={!consented || busy || referenceLoading || !!referenceError} className="rounded-2xl p-6 mb-6 min-w-0 disabled:pointer-events-none" style={{ background: '#fff', border: '1px solid #eaeaf2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
                  <FormField label="타겟 국가">
                    <CountrySelect countries={countries} value={logisticsForm.countries} onChange={(v) => setLF('countries', v)} />
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
                  <FormField label="가용 물량 (톤)">
                    <input type="number" value={logisticsForm.availableCapacity} onChange={(e) => setLF('availableCapacity', e.target.value)} placeholder="예: 50" style={inputCls} />
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
                  <PortPairSelector routes={routes} countryId={getCountryId(countries, logisticsForm.countries[0])}
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
                  <button disabled={busy || loading || referenceLoading || !consented || !user.memberId || !!loadError || !!referenceError} onClick={addLogisticsRow} className="px-6 py-2 rounded-full text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>+ 조건 추가</button>
                </div>
              </fieldset>

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
                            <td className="px-3 py-2.5 font-mono">{row.availableCapacity}</td>
                            <td className="px-3 py-2.5">{bool(row.regularRoute)}</td>
                            <td className="px-3 py-2.5">{bool(row.directRoute)}</td>
                            <td className="px-3 py-2.5">{bool(row.general)}</td>
                            <td className="px-3 py-2.5">{bool(row.refrigeration)}</td>
                            <td className="px-3 py-2.5">{bool(row.hazmat)}</td>
                            <td className="px-3 py-2.5">{bool(row.heavy)}</td>
                            <td className="px-3 py-2.5">{bool(row.special)}</td>
                            <td className="px-3 py-2.5 font-mono" style={{ color: '#9090a8' }}>{row.hsCode}</td>
                            <td className="px-3 py-2.5">{row.experience}회</td>
                            <td className="px-3 py-2.5"><button disabled={busy || loading} onClick={() => deleteRow(row.id)} className="text-xs px-2 py-0.5 rounded hover:opacity-70" style={{ color: '#d93025' }}>삭제</button></td>
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
