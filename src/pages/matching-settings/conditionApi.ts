import axios from 'axios';
import { KOREA_ID, type CountryData, type RouteData } from '../../api/referenceData';
import {
  getCscore1List, getCscore2, getCscore3, getLscore1List, getLscore2, getLscore3,
  type CargoDto, type Score1Dto,
} from '../../api/scoreApi';
import type { LogisticsCondition, LogisticsForm, PortType, ShipperCondition, ShipperForm } from './matchingTypes';
import { getCountryId, getCountryName, getPortType, getRouteById, getRouteByName, getRouteName } from './routeUtils';

/* =====================================================================
   화면 입력값 ⇄ 백엔드 DTO 변환 + 목록 조회
   ===================================================================== */

/* ---------- 입력값 검사 ---------- */

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

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) return `서버 요청에 실패했습니다${error.response ? ` (HTTP ${error.response.status})` : ''}. Spring 서버(8080) 실행 상태를 확인해 주세요.`;
  return error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.';
}

/* ---------- 화면 입력값 → DTO ---------- */

function makeBaseDto(
  form: ShipperForm | LogisticsForm,
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
  const departure = getRouteByName(routes, form.departure, exporting ? KOREA_ID : countryId, routeTransportType);
  const arrival = getRouteByName(routes, form.destination, exporting ? countryId : KOREA_ID, routeTransportType);

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

// 수출입기업 조건 저장 요청 body (POST /api/cscore)
export function buildShipperRequest(form: ShipperForm, memberId: string, consented: boolean, countries: CountryData[], routes: RouteData[]) {
  const cscore1Dto = makeBaseDto(form, memberId, consented, countries, routes);
  const cscore2Dto = { requestWeight: readNumber(form.volume, '물량'), desiredDate: checkDate(form.schedule) };
  const cscore3Dto: CargoDto = {
    generalContainer: form.cargoType === '일반',
    refrigerated: form.refrigeration, dangerous: form.hazmat,
    heavyCargo: form.heavy, specialCargo: form.special,
  };
  return { cscore1Dto, cscore2Dto, cscore3Dto };
}

// 물류업체 조건 저장 요청 body (POST /api/lscore)
export function buildLogisticsRequest(form: LogisticsForm, memberId: string, consented: boolean, countries: CountryData[], routes: RouteData[]) {
  const lscore1Dto = {
    ...makeBaseDto(form, memberId, consented, countries, routes),
    experienceCount: readNumber(form.experience, '취급 경험', true, true),
    regularRoute: form.regularRoute, directRoute: form.directRoute,
  };
  const lscore2Dto = {
    availableCapacity: readNumber(form.availableCapacity, '가용 물량'),
    availableDate: checkDate(form.availableDate),
    averageTransitDays: readNumber(form.leadTime, '리드타임', true),
  };
  const lscore3Dto: CargoDto = {
    generalContainer: form.general,
    refrigerated: form.refrigeration, dangerous: form.hazmat,
    heavyCargo: form.heavy, specialCargo: form.special,
  };
  return { lscore1Dto, lscore2Dto, lscore3Dto };
}

/* ---------- DTO → 화면 표시값 ---------- */

function readBaseRow(dto: Score1Dto, countries: CountryData[], routes: RouteData[]) {
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

// 로그인 회원의 수출입기업 조건 목록 (1·2·3번 DTO를 합쳐서 표 한 줄로)
export async function loadShipperRows(memberId: string, countries: CountryData[], routes: RouteData[], signal?: AbortSignal): Promise<ShipperCondition[]> {
  const list = await getCscore1List(memberId, signal);
  return Promise.all(list.filter((dto) => dto.memberId === memberId).map(async (dto): Promise<ShipperCondition> => {
    const [second, third] = await Promise.all([getCscore2(dto.cscore1Id, signal), getCscore3(dto.cscore1Id, signal)]);
    if (!second || !third) throw new Error(`조건 ${dto.cscore1Id}의 상세 데이터가 없습니다.`);
    return {
      ...readBaseRow(dto, countries, routes), id: dto.cscore1Id,
      volume: String(second.requestWeight), schedule: second.desiredDate,
      cargoType: third.generalContainer ? '일반' : '특수',
      refrigeration: third.refrigerated, hazmat: third.dangerous,
      heavy: third.heavyCargo, special: third.specialCargo,
    };
  }));
}

// 로그인 회원의 물류업체 조건 목록
export async function loadLogisticsRows(memberId: string, countries: CountryData[], routes: RouteData[], signal?: AbortSignal): Promise<LogisticsCondition[]> {
  const list = await getLscore1List(memberId, signal);
  return Promise.all(list.filter((dto) => dto.memberId === memberId).map(async (dto): Promise<LogisticsCondition> => {
    const [second, third] = await Promise.all([getLscore2(dto.lscore1Id, signal), getLscore3(dto.lscore1Id, signal)]);
    if (!second || !third) throw new Error(`조건 ${dto.lscore1Id}의 상세 데이터가 없습니다.`);
    return {
      ...readBaseRow(dto, countries, routes), id: dto.lscore1Id,
      regularRoute: dto.regularRoute, directRoute: dto.directRoute, experience: String(dto.experienceCount),
      leadTime: String(second.averageTransitDays), availableCapacity: String(second.availableCapacity),
      availableDate: second.availableDate, general: third.generalContainer,
      refrigeration: third.refrigerated, hazmat: third.dangerous,
      heavy: third.heavyCargo, special: third.specialCargo,
    };
  }));
}
