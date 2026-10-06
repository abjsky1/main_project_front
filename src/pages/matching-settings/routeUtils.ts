import { KOREA_ID, type CountryData, type RouteData } from '../../api/referenceData';
import type { PortType, RouteForm, TransportType } from './matchingTypes';

/* =====================================================================
   국가 / 항구·공항(route) 관련 도우미 함수 모음
   - CSV 데이터에서 이름 ↔ id 찾기
   - 출발지·도착지 종류(한국 해상, 해외 항공 ...) 맞추기
   - 입력폼 값 바꾸기 (수출입기업 / 물류업체 폼 공통)
   ===================================================================== */

/* ---------- 국가 / 경로 찾기 ---------- */
// find : 조건에 맞는 첫 번째 1개를 찾음 (없으면 undefined — 가이드 4)
// ?.   : 찾은 게 없으면(undefined) 에러 대신 undefined
// ??   : 왼쪽이 없으면 오른쪽 값('') 사용

// 국가 이름 → 국가 id
// [TS] number | undefined : 숫자 또는 (못 찾으면) undefined
export function getCountryId(countries: CountryData[], countryName: string): number | undefined {
  return countries.find((country) => country.countryName === countryName)?.countryId;
}

// 국가 id → 국가 이름 (못 찾으면 '')
export function getCountryName(countries: CountryData[], countryId: number): string {
  return countries.find((country) => country.countryId === countryId)?.countryName ?? '';
}

// 경로 id → 경로 정보
export function getRouteById(routes: RouteData[], routeId: number): RouteData | undefined {
  return routes.find((route) => route.routeId === routeId);
}

// 경로 이름 + 국가 + 운송방식(1=해상, 2=항공) 이 모두 같은 경로 찾기
export function getRouteByName(routes: RouteData[], routeName: string, countryId: number, transportType: number): RouteData | undefined {
  return routes.find(
    (route) => route.routeName === routeName && route.countryId === countryId && route.transportType === transportType,
  );
}

// 경로 id → 경로 이름 (못 찾으면 '')
export function getRouteName(routes: RouteData[], routeId: number): string {
  return getRouteById(routes, routeId)?.routeName ?? '';
}

/* ---------- 항구/공항 종류 (한국 항공, 해외 해상 ...) ---------- */

// 경로 1개 → '한국 해상' 같은 종류 글자
export function getPortType(route: RouteData): PortType {
  const location = route.countryId === KOREA_ID ? '한국' : '해외';
  const transport = route.transportType === 1 ? '해상' : '항공';
  return `${location} ${transport}` as PortType;
}

// 선택한 종류(+국가)에 해당하는 항구/공항 이름 목록
// [TS] countryId?: number → 안 넘겨도 되는 매개변수 (해외 종류일 때만 사용)
export function getPortList(routes: RouteData[], portType: PortType, countryId?: number): string[] {
  const result: string[] = [];

  for (const route of routes) {
    if (getPortType(route) !== portType) continue;   // continue : 이번 것은 건너뛰고 다음 반복으로

    // 프로젝트 범위: 한국 항공은 인천공항만 사용
    if (portType === '한국 항공' && route.routeName !== '인천공항') continue;

    // 해외 종류는 선택한 타겟 국가의 항구/공항만
    if (portType.startsWith('해외')) {
      if (countryId === undefined || route.countryId !== countryId) continue;
    }

    // 같은 이름이 이미 들어 있으면 건너뛰기 (중복 제거)
    if (result.includes(route.routeName)) continue;

    result.push(route.routeName);
  }

  // 가나다 순 정렬 (localeCompare + 'ko' = 한국어 사전 순서)
  return result.sort((a, b) => a.localeCompare(b, 'ko'));
}

// 출발지 종류에 맞는 도착지 종류 (한국 항공 ↔ 해외 항공, 한국 해상 ↔ 해외 해상)
// 배열로 돌려주는 이유: 화면의 도착지 종류 <select> 에 그대로 option 으로 그리기 위해
export function getCompatible(pt: PortType): PortType[] {
  if (pt === '한국 항공') return ['해외 항공'];
  if (pt === '한국 해상') return ['해외 해상'];
  if (pt === '해외 항공') return ['한국 항공'];
  return ['한국 해상'];
}

// '한국 항공' → '항공' , '해외 해상' → '해상'
export function portTypeToTransport(pt: PortType): TransportType {
  return pt.includes('항공') ? '항공' : '해상';
}

/* ---------- 입력폼 값 바꾸기 (수출입기업/물류업체 폼 공통) ----------
   - 바뀌기 전 폼(form)을 받아서, 일부 칸만 바꾼 "새 폼 객체"를 돌려줍니다.
     (B_react 의 setForm({ ...form, name: 값 }) 과 같은 방식)
   - [TS] <T extends RouteForm> : "T 는 RouteForm 칸(국가/출발지/도착지...)을 가진 어떤 폼이든 된다"
     → 수출입기업 폼을 넣으면 수출입기업 폼이, 물류업체 폼을 넣으면 물류업체 폼이 그대로 돌아옴 (가이드 2-5)
   --------------------------------------------------------------------- */

// 일반 필드 변경. 국가·수출입 변경 시 이전 경로 선택을 지웁니다.
// [TS] val: any → 칸마다 값 종류(글자/배열/true·false)가 달라서 아무 타입이나 받음
export function changeFormField<T extends RouteForm>(form: T, key: string, val: any): T {
  // 국가가 바뀌면 출발지/도착지 선택을 비움 (다른 나라 항구가 남아 있지 않게)
  if (key === 'countries') return { ...form, countries: val, departure: '', destination: '' };
  // 수출/수입이 바뀌면 출발·도착 종류를 뒤집고 선택을 비움 (수출 = 한국 → 해외 , 수입 = 해외 → 한국)
  if (key === 'tradeType') {
    return {
      ...form, tradeType: val, departure: '', destination: '',
      departurePortType: `${val === '수출' ? '한국' : '해외'} ${form.transport}` as PortType,
      destinationPortType: `${val === '수출' ? '해외' : '한국'} ${form.transport}` as PortType,
    };
  }
  // 그 밖의 칸 : [key] 는 변수 key 에 들어 있는 글자를 칸 이름으로 사용 (예: key 가 'hsCode' 면 hsCode 칸)
  return { ...form, [key]: val };
}

// 출발지 선택 → 운송 방식과 도착지 종류를 맞춰서 변경
// 예) 출발지로 '한국 항공' 공항을 고르면 → 운송 '항공', 도착지 종류 '해외 항공' 으로 자동 변경
export function changeDeparture<T extends RouteForm>(form: T, val: string, pt: PortType): T {
  const compatiblePt = getCompatible(pt)[0];
  const destCompatible = getCompatible(pt).includes(form.destinationPortType);   // 기존 도착지가 새 종류와 맞는지
  return {
    ...form, departure: val, departurePortType: pt, transport: portTypeToTransport(pt),
    destinationPortType: compatiblePt, destination: destCompatible ? form.destination : '',   // 안 맞으면 도착지 비움
  };
}

// 도착지 선택 → 운송 방식과 출발지 종류를 맞춰서 변경 (changeDeparture 의 반대 방향)
export function changeDestination<T extends RouteForm>(form: T, val: string, pt: PortType): T {
  const compatiblePt = getCompatible(pt)[0];
  const depCompatible = getCompatible(pt).includes(form.departurePortType);
  return {
    ...form, destination: val, destinationPortType: pt, transport: portTypeToTransport(pt),
    departurePortType: compatiblePt, departure: depCompatible ? form.departure : '',
  };
}
