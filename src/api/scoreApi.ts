import axios from 'axios';

/* =====================================================================
   매칭 조건 API (Spring /api/cscore, /api/lscore)
   - cscore: 수출입기업(화주) 조건   - lscore: 물류업체 조건
   - 1번 = 기본 조건, 2번 = 물량/일정, 3번 = 화물 특성
   - 모든 함수는 axios 로 요청한 뒤 응답의 data 만 돌려줍니다. (B_react 의 response.data 와 같음)
   - signal : 요청 취소용 (페이지를 떠나면 진행 중인 요청을 취소할 때 사용 — 가이드 3-4)
   ===================================================================== */

// Spring DTO 필드 타입
// [TS] interface = 객체 모양 설계도 (가이드 2-2). Spring DTO 클래스의 필드 이름과 똑같이 맞춰 둠
export interface Score1Dto {
  memberId: string;
  countryId: number;
  hsCode: string;
  tradeType: boolean;      // true = 수출
  transportType: boolean;  // true = 해상
  departure: number;       // routeId
  arrival: number;         // routeId
  matchingAgree: boolean;
}

// [TS] extends = Score1Dto 의 칸을 모두 물려받고, 아래 칸을 더한 모양
export interface Cscore1Dto extends Score1Dto {
  cscore1Id: number;
}

export interface Lscore1Dto extends Score1Dto {
  lscore1Id: number;
  experienceCount: number;
  regularRoute: boolean;
  directRoute: boolean;
}

export interface Cscore2Dto {
  requestWeight: number;
  desiredDate: string;
}

export interface Lscore2Dto {
  availableCapacity: number;
  availableDate: string;
  averageTransitDays: number;
}

export interface CargoDto {
  generalContainer: boolean;
  refrigerated: boolean;
  dangerous: boolean;
  heavyCargo: boolean;
  specialCargo: boolean;
}

/* ---------- 수출입기업 (cscore) ---------- */

// GET /api/cscore?memberId=...  : memberId 를 주면 해당 회원 조건만, 안 주면 전체
// [TS] memberId?: string → ? 는 "안 넘겨도 되는 매개변수"
// [TS] axios.get<Cscore1Dto[]> → "응답 data 는 Cscore1Dto 배열" 이라는 표시 (가이드 2-5)
export async function getCscore1List(memberId?: string, signal?: AbortSignal) {
  // params 는 주소 뒤의 ?memberId=... 부분. { memberId } 는 { memberId: memberId } 를 줄여 쓴 것
  const response = await axios.get<Cscore1Dto[]>('/api/cscore', { params: memberId ? { memberId } : undefined, signal });
  return response.data;
}

// GET /api/cscore/{id}/cscore2 : 물량/일정 (없으면 null)
export async function getCscore2(cscore1Id: number, signal?: AbortSignal) {
  const response = await axios.get<Cscore2Dto | null>(`/api/cscore/${cscore1Id}/cscore2`, { signal });
  return response.data;
}

// GET /api/cscore/{id}/cscore3 : 화물 특성 (없으면 null)
export async function getCscore3(cscore1Id: number, signal?: AbortSignal) {
  const response = await axios.get<CargoDto | null>(`/api/cscore/${cscore1Id}/cscore3`, { signal });
  return response.data;
}

// POST /api/cscore : 1·2·3번 조건을 한 번에 저장 (성공하면 true)
export async function createCscore(body: { cscore1Dto: Score1Dto; cscore2Dto: Cscore2Dto; cscore3Dto: CargoDto }) {
  const response = await axios.post<boolean>('/api/cscore', body);
  return response.data;
}

// DELETE /api/cscore/{id} : 조건 삭제 (매칭 결과에 쓰인 조건이면 false)
export async function deleteCscore(cscore1Id: number) {
  const response = await axios.delete<boolean>(`/api/cscore/${cscore1Id}`);
  return response.data;
}

/* ---------- 물류업체 (lscore) ---------- */

export async function getLscore1List(memberId?: string, signal?: AbortSignal) {
  const response = await axios.get<Lscore1Dto[]>('/api/lscore', { params: memberId ? { memberId } : undefined, signal });
  return response.data;
}

export async function getLscore2(lscore1Id: number, signal?: AbortSignal) {
  const response = await axios.get<Lscore2Dto | null>(`/api/lscore/${lscore1Id}/lscore2`, { signal });
  return response.data;
}

export async function getLscore3(lscore1Id: number, signal?: AbortSignal) {
  const response = await axios.get<CargoDto | null>(`/api/lscore/${lscore1Id}/lscore3`, { signal });
  return response.data;
}

// [TS] Omit<Lscore1Dto, 'lscore1Id'> = Lscore1Dto 에서 lscore1Id 칸만 뺀 모양 (id 는 DB 가 만들어 주므로)
export async function createLscore(body: { lscore1Dto: Omit<Lscore1Dto, 'lscore1Id'>; lscore2Dto: Lscore2Dto; lscore3Dto: CargoDto }) {
  const response = await axios.post<boolean>('/api/lscore', body);
  return response.data;
}

export async function deleteLscore(lscore1Id: number) {
  const response = await axios.delete<boolean>(`/api/lscore/${lscore1Id}`);
  return response.data;
}
