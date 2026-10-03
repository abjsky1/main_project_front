import axios from 'axios';

/* =====================================================================
   매칭 조건 API (Spring /api/cscore, /api/lscore)
   - cscore: 수출입기업(화주) 조건   - lscore: 물류업체 조건
   - 1번 = 기본 조건, 2번 = 물량/일정, 3번 = 화물 특성
   ===================================================================== */

// Spring DTO 필드 타입
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

// memberId 를 주면 해당 회원 조건만, 안 주면 전체
export const getCscore1List = (memberId?: string, signal?: AbortSignal) =>
  axios.get<Cscore1Dto[]>('/api/cscore', { params: memberId ? { memberId } : undefined, signal }).then((res) => res.data);

export const getCscore2 = (cscore1Id: number, signal?: AbortSignal) =>
  axios.get<Cscore2Dto | null>(`/api/cscore/${cscore1Id}/cscore2`, { signal }).then((res) => res.data);

export const getCscore3 = (cscore1Id: number, signal?: AbortSignal) =>
  axios.get<CargoDto | null>(`/api/cscore/${cscore1Id}/cscore3`, { signal }).then((res) => res.data);

export const createCscore = (body: { cscore1Dto: Score1Dto; cscore2Dto: Cscore2Dto; cscore3Dto: CargoDto }) =>
  axios.post<boolean>('/api/cscore', body).then((res) => res.data);

export const deleteCscore = (cscore1Id: number) =>
  axios.delete<boolean>(`/api/cscore/${cscore1Id}`).then((res) => res.data);

/* ---------- 물류업체 (lscore) ---------- */

export const getLscore1List = (memberId?: string, signal?: AbortSignal) =>
  axios.get<Lscore1Dto[]>('/api/lscore', { params: memberId ? { memberId } : undefined, signal }).then((res) => res.data);

export const getLscore2 = (lscore1Id: number, signal?: AbortSignal) =>
  axios.get<Lscore2Dto | null>(`/api/lscore/${lscore1Id}/lscore2`, { signal }).then((res) => res.data);

export const getLscore3 = (lscore1Id: number, signal?: AbortSignal) =>
  axios.get<CargoDto | null>(`/api/lscore/${lscore1Id}/lscore3`, { signal }).then((res) => res.data);

export const createLscore = (body: { lscore1Dto: Omit<Lscore1Dto, 'lscore1Id'>; lscore2Dto: Lscore2Dto; lscore3Dto: CargoDto }) =>
  axios.post<boolean>('/api/lscore', body).then((res) => res.data);

export const deleteLscore = (lscore1Id: number) =>
  axios.delete<boolean>(`/api/lscore/${lscore1Id}`).then((res) => res.data);
