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
   - 저장할 때 : 입력폼 값(글자) 검사 → Spring 이 원하는 DTO 모양(숫자/true·false/id)으로 변환
   - 조회할 때 : Spring DTO → 화면 표에 보여줄 글자로 변환
   - 잘못된 값이면 throw new Error('안내 문구') 로 오류를 던지고,
     MatchingSettings.tsx 의 catch 에서 alert 로 그 문구를 보여줍니다.
   ===================================================================== */

/* ---------- 입력값 검사 ---------- */

// 숫자 입력칸 검사 → 통과하면 숫자로 바꿔서 돌려줌
// label     : 오류 문구에 쓸 항목 이름 (예: '물량')
// integer   : true 면 정수만 허용 (기본값 false)
// allowZero : true 면 0 도 허용 (기본값 false)
function readNumber(value: string, label: string, integer = false, allowZero = false): number {
  const number = Number(value);   // '12.5' → 12.5 , 'abc' → NaN

  const isEmpty = !value.trim();                                  // 빈칸 또는 공백만 입력
  const isNotNumber = !Number.isFinite(number);                   // 'abc'(NaN), 'Infinity' 처럼 정상 숫자가 아님
  const isTooSmall = allowZero ? number < 0 : number <= 0;        // 0 허용이면 음수만, 아니면 0 이하를 막음
  const isBadInteger = integer && (!Number.isInteger(number) || number > 2147483647);   // 정수 칸: 소수 / Java int 최대값 초과

  if (isEmpty || isNotNumber || isTooSmall || isBadInteger) {
    throw new Error(`${label}: ${allowZero ? '0 이상' : '0 초과'}의 ${integer ? '정수' : '숫자'}를 입력해 주세요.`);
  }
  return number;
}

// 날짜 입력칸 검사 ('2025-12-31' 형식이고 실제로 있는 날짜인지)
function checkDate(value: string): string {
  const message = '올바른 운송 날짜를 입력해 주세요.';
  const date = new Date(`${value}T00:00:00Z`);

  // 1) 정규식 : 숫자4-숫자2-숫자2 모양인지 (^ = 시작, \d{4} = 숫자 4개, $ = 끝)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(message);
  // 2) 날짜로 바꿀 수 없는 값인지
  if (Number.isNaN(date.getTime())) throw new Error(message);
  // 3) 없는 날짜인지 (예: 2025-02-30 은 자바스크립트가 3월 2일로 바꿔 버리므로, 다시 글자로 바꿔서 비교)
  if (date.toISOString().slice(0, 10) !== value) throw new Error(message);

  return value;
}

// 오류 객체 → 화면에 보여줄 안내 문구
// [TS] error: unknown → catch 로 받은 오류는 어떤 값인지 모르므로 unknown(알 수 없음) 타입
export function errorMessage(error: unknown): string {
  // 서버 통신 오류 (axios) : 응답이 있으면 HTTP 상태 번호도 같이 표시
  if (axios.isAxiosError(error)) return `서버 요청에 실패했습니다${error.response ? ` (HTTP ${error.response.status})` : ''}. Spring 서버(8080) 실행 상태를 확인해 주세요.`;
  // throw new Error('...') 로 직접 만든 오류면 그 문구 그대로
  return error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.';
}

/* ---------- 화면 입력값 → DTO ---------- */

// 수출입기업 / 물류업체가 공통으로 가진 1번 조건(국가, HS코드, 수출입, 운송, 출발/도착) 만들기
// [TS] form: ShipperForm | LogisticsForm → 두 입력폼 중 어느 것이 와도 됨
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
// 1번(기본) + 2번(물량/일정) + 3번(화물 특성) DTO 를 한 객체로 묶어서 돌려줌
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
    // ...makeBaseDto(...) : 공통 1번 조건의 칸들을 모두 펼쳐 넣고, 물류업체 전용 칸을 더함
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

// 1번 조건 DTO → 표 한 줄의 공통 칸 (id 숫자를 이름 글자로, true/false 를 '수출'/'해상' 같은 글자로)
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
    // CSV 에서 경로를 찾으면 그 경로의 종류, 못 찾으면 수출/수입 방향으로 추측 (예: 수출 출발지 = '한국 해상')
    // [TS] as PortType : "이 글자는 PortType 중 하나야" 라고 알려주는 표시 (값은 그대로 — 가이드 2-6)
    departurePortType: departure
      ? getPortType(departure)
      : `${dto.tradeType ? '한국' : '해외'} ${transport}` as PortType,
    destinationPortType: arrival
      ? getPortType(arrival)
      : `${dto.tradeType ? '해외' : '한국'} ${transport}` as PortType,
  };
}

// 로그인 회원의 수출입기업 조건 목록 (1·2·3번 DTO를 합쳐서 표 한 줄로)
// 1) 1번 조건 목록 조회 → 2) 내 것만 filter → 3) 조건마다 2·3번을 동시에 조회해서 합침
//    list.map(async ...) 로 만든 여러 요청을 Promise.all 로 한꺼번에 기다림 (가이드 3-5)
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
