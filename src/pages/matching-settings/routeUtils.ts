import { KOREA_ID, type CountryData, type RouteData } from '../../api/referenceData';
import type { PortType, RouteForm, TransportType } from './matchingTypes';

/* ---------- 국가 / 경로 찾기 ---------- */

export function getCountryId(countries: CountryData[], countryName: string): number | undefined {
  return countries.find((country) => country.countryName === countryName)?.countryId;
}

export function getCountryName(countries: CountryData[], countryId: number): string {
  return countries.find((country) => country.countryId === countryId)?.countryName ?? '';
}

export function getRouteById(routes: RouteData[], routeId: number): RouteData | undefined {
  return routes.find((route) => route.routeId === routeId);
}

export function getRouteByName(routes: RouteData[], routeName: string, countryId: number, transportType: number): RouteData | undefined {
  return routes.find(
    (route) => route.routeName === routeName && route.countryId === countryId && route.transportType === transportType,
  );
}

export function getRouteName(routes: RouteData[], routeId: number): string {
  return getRouteById(routes, routeId)?.routeName ?? '';
}

/* ---------- 항구/공항 종류 (한국 항공, 해외 해상 ...) ---------- */

export function getPortType(route: RouteData): PortType {
  const location = route.countryId === KOREA_ID ? '한국' : '해외';
  const transport = route.transportType === 1 ? '해상' : '항공';
  return `${location} ${transport}` as PortType;
}

// 선택한 종류(+국가)에 해당하는 항구/공항 이름 목록
export function getPortList(routes: RouteData[], portType: PortType, countryId?: number): string[] {
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

// 출발지 종류에 맞는 도착지 종류 (한국 항공 ↔ 해외 항공, 한국 해상 ↔ 해외 해상)
export function getCompatible(pt: PortType): PortType[] {
  if (pt === '한국 항공') return ['해외 항공'];
  if (pt === '한국 해상') return ['해외 해상'];
  if (pt === '해외 항공') return ['한국 항공'];
  return ['한국 해상'];
}

export function portTypeToTransport(pt: PortType): TransportType {
  return pt.includes('항공') ? '항공' : '해상';
}

/* ---------- 입력폼 값 바꾸기 (수출입기업/물류업체 폼 공통) ---------- */

// 일반 필드 변경. 국가·수출입 변경 시 이전 경로 선택을 지웁니다.
export function changeFormField<T extends RouteForm>(form: T, key: string, val: any): T {
  if (key === 'countries') return { ...form, countries: val, departure: '', destination: '' };
  if (key === 'tradeType') {
    return {
      ...form, tradeType: val, departure: '', destination: '',
      departurePortType: `${val === '수출' ? '한국' : '해외'} ${form.transport}` as PortType,
      destinationPortType: `${val === '수출' ? '해외' : '한국'} ${form.transport}` as PortType,
    };
  }
  return { ...form, [key]: val };
}

// 출발지 선택 → 운송 방식과 도착지 종류를 맞춰서 변경
export function changeDeparture<T extends RouteForm>(form: T, val: string, pt: PortType): T {
  const compatiblePt = getCompatible(pt)[0];
  const destCompatible = getCompatible(pt).includes(form.destinationPortType);
  return {
    ...form, departure: val, departurePortType: pt, transport: portTypeToTransport(pt),
    destinationPortType: compatiblePt, destination: destCompatible ? form.destination : '',
  };
}

// 도착지 선택 → 운송 방식과 출발지 종류를 맞춰서 변경
export function changeDestination<T extends RouteForm>(form: T, val: string, pt: PortType): T {
  const compatiblePt = getCompatible(pt)[0];
  const depCompatible = getCompatible(pt).includes(form.departurePortType);
  return {
    ...form, destination: val, destinationPortType: pt, transport: portTypeToTransport(pt),
    departurePortType: compatiblePt, departure: depCompatible ? form.departure : '',
  };
}
