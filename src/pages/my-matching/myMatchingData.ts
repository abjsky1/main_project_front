// ⚠️ 더미 데이터 — 교수님 피드백의 "새 매칭 흐름"을 팀 회의에서 보여주기 위한 예시 (프론트만)
//    회의에서 흐름이 확정되면 백엔드(매칭 API)를 만들고, 이 파일 대신 서버 응답을 사용하세요.
//
//  새 매칭 흐름
//   ① 화주가 매칭 서비스 이용 동의 → 자동 매칭 (Cscore ↔ Lscore 필수조건 비교 + 점수 계산)
//   ② 화주에게 필수조건을 통과한 운송사 목록 제공 → 화주가 골라서 매칭 요청 (또는 거절)
//   ③ 운송사가 요청을 수락 / 거절
//   ④ 둘 다 수락한 건만 관리자에게 최종 확인 요청 → 승인 = 매칭 완료(COMPLETED) , 반려 = 매칭 실패(FAILED)
//   (부동산으로 비유하면 : 운송사 = 매물을 올린 집주인 , 화주 = 집을 구하는 사람 , 관리자 = 중개사)
//
//  회사 정보는 백엔드 샘플 데이터(MainDBSampleData.sql)의 실제 회원 정보를 사용
//  - 화주 데모 계정 : ybtex@test.com  → (주)영보월드와이드
//  - 운송사 데모 계정 : hmm@logis.com → 에이치엠엠(주)

import type { AdminStatus, FinalStatus, LogisticsOffer, MatchItem, MatchRequest, Party, PartyResponse } from '../smart-matching/matchTypes';

/* ---------- 타입 ---------- */

// 사업자 확인 정보 (국세청 사업자등록 상태조회 API 결과 모양 — 지금은 예시 값)
export interface BizCheck {
  status: '계속사업자' | '휴업자' | '폐업자';   // 사업자 상태
  taxType: string;                              // 과세 유형
  checkedAt: string;                            // 확인한 날짜
}

// 내 매칭 1건 = 관리자 "매칭 관리" 의 MatchItem 모양 + 새 흐름에 필요한 칸
// (상태 칸 4개 shipper.response / logistics.response / adminStatus / finalStatus 는 DB matching 테이블과 같은 뜻)
// [TS] extends MatchItem : MatchItem 의 칸을 모두 물려받고 아래 칸을 더함
export interface MyMatchItem extends MatchItem {
  conditionId: number;        // 화주 매칭 조건 번호 (cscore1Id) — 조건 1개에 추천 운송사가 여러 곳
  shipperMemberId: string;    // 화주 회원 번호
  logisticsMemberId: string;  // 운송사 회원 번호
  shipperBiz: BizCheck;
  logisticsBiz: BizCheck;
}

// 진행 단계 (상태 칸 4개를 보고 계산 — getStage)
export type Stage =
  | 'recommended'        // 자동 매칭 추천 (화주 검토 전)
  | 'shipperRejected'    // 화주가 거절
  | 'requested'          // 화주가 요청 → 운송사 응답 대기
  | 'logisticsRejected'  // 운송사가 거절
  | 'adminReview'        // 둘 다 수락 → 관리자 최종 확인 대기
  | 'completed'          // 관리자 승인 → 매칭 완료
  | 'adminRejected';     // 관리자 반려 → 매칭 실패

/* ---------- 진행 단계 ↔ 상태 칸 4개 (새 흐름의 규칙표 — 백엔드 만들 때 그대로 참고) ---------- */

// [TS] Record<Stage, {...}> : 단계 이름마다 상태 칸 4개의 값을 적어 둔 객체 (가이드 2-8)
export const STAGE_STATUS: Record<Stage, { shipper: PartyResponse; logistics: PartyResponse; admin: AdminStatus; final: FinalStatus }> = {
  recommended:       { shipper: 'waiting',  logistics: 'waiting',  admin: 'pending',  final: 'pending' },
  shipperRejected:   { shipper: 'rejected', logistics: 'waiting',  admin: 'pending',  final: 'failed' },
  requested:         { shipper: 'accepted', logistics: 'waiting',  admin: 'pending',  final: 'pending' },
  logisticsRejected: { shipper: 'accepted', logistics: 'rejected', admin: 'pending',  final: 'failed' },
  adminReview:       { shipper: 'accepted', logistics: 'accepted', admin: 'pending',  final: 'pending' },
  completed:         { shipper: 'accepted', logistics: 'accepted', admin: 'approved', final: 'completed' },
  adminRejected:     { shipper: 'accepted', logistics: 'accepted', admin: 'rejected', final: 'failed' },
};

// 상태 칸 4개 → 진행 단계 (위에서부터 차례로 확인)
export function getStage(m: MatchItem): Stage {
  if (m.finalStatus === 'completed') return 'completed';
  if (m.adminStatus === 'rejected') return 'adminRejected';
  if (m.shipper.response === 'rejected') return 'shipperRejected';
  if (m.logistics.response === 'rejected') return 'logisticsRejected';
  if (m.shipper.response === 'waiting') return 'recommended';
  if (m.logistics.response === 'waiting') return 'requested';
  return 'adminReview';
}

/* ---------- 버튼을 눌렀을 때 상태 바꾸기 (기존 값을 복사하고 일부 칸만 바꾼 새 객체를 돌려줌) ---------- */

// 화주 : 매칭 요청 보내기
export function shipperAccept(m: MyMatchItem): MyMatchItem {
  return { ...m, shipper: { ...m.shipper, response: 'accepted' } };
}

// 화주 : 이 운송사 거절
export function shipperReject(m: MyMatchItem): MyMatchItem {
  return { ...m, shipper: { ...m.shipper, response: 'rejected' }, finalStatus: 'failed' };
}

// 운송사 : 요청 수락 → 관리자 최종 확인으로 넘어감
export function logisticsAccept(m: MyMatchItem): MyMatchItem {
  return { ...m, logistics: { ...m.logistics, response: 'accepted' } };
}

// 운송사 : 요청 거절
export function logisticsReject(m: MyMatchItem): MyMatchItem {
  return { ...m, logistics: { ...m.logistics, response: 'rejected' }, finalStatus: 'failed' };
}

// 화주가 이 운송사에 매칭을 요청할 수 없는 이유 (요청할 수 있으면 null)
// 규칙(회의 때 확정 필요) : 화물 조건 1개에는 한 번에 운송사 1곳에만 요청 — 진행 중이거나 완료된 건이 있으면 잠금
export function requestLockReason(m: MyMatchItem, all: MyMatchItem[]): string | null {
  if (getStage(m) !== 'recommended') return null;

  for (const other of all) {
    if (other.id === m.id || other.conditionId !== m.conditionId) continue;   // 같은 화물 조건의 다른 운송사만 확인
    const stage = getStage(other);
    if (stage === 'completed') return '이 화물 조건은 다른 운송사와 매칭이 완료됐어요.';
    if (stage === 'requested' || stage === 'adminReview') return '진행 중인 요청이 끝나면 다른 운송사에 요청할 수 있어요.';
  }
  return null;
}

/* ---------- 예시 회사 (MainDBSampleData.sql 의 실제 회원 정보) ---------- */

interface DemoCompany {
  memberId: string;
  companyName: string;
  contactName: string;
  bizNumber: string;
  phone: string;
  address: string;
}

const YEONGBO: DemoCompany = { memberId: 'dcdc8696-243a-43d1-ad68-138b293638f0', companyName: '(주)영보월드와이드', contactName: '김승영', bizNumber: '120-81-10001', phone: '070-8671-2793', address: '서울특별시 광진구 자양동' };
const BANDO: DemoCompany = { memberId: '67e5da21-5ed6-4ab4-8a94-9f26ea3ed8f8', companyName: '(주)반도글로벌', contactName: '이진희', bizNumber: '120-81-10002', phone: '02-2047-0311', address: '서울특별시 송파구 문정동' };
const DADA: DemoCompany = { memberId: '17faed2a-e91d-4cc0-9a70-546bb34b5679', companyName: '(주)다다씨앤씨', contactName: '최민석', bizNumber: '120-81-10003', phone: '070-5147-7028', address: '서울특별시 강남구 역삼동' };

const HMM: DemoCompany = { memberId: '1d9301d7-a88b-4b60-8ffb-805291ede52b', companyName: '에이치엠엠(주)', contactName: '김경배', bizNumber: '130-81-30001', phone: '02-3706-5114', address: '서울특별시 영등포구 여의대로' };
const LX: DemoCompany = { memberId: '9d72bcab-0058-498f-ae73-344dd91e9833', companyName: '(주)엘엑스판토스', contactName: '최원혁', bizNumber: '130-81-30002', phone: '02-3771-2114', address: '서울특별시 종로구 새문안로' };
const GLOVIS: DemoCompany = { memberId: 'e7fc56ff-f2ac-4302-a629-31f46d1e56ae', companyName: '현대글로비스(주)', contactName: '이규복', bizNumber: '130-81-30003', phone: '02-6191-9114', address: '서울특별시 성동구 왕십리로' };
const CJ: DemoCompany = { memberId: '02e5627c-b2ac-49d4-b5a7-fa998f3617bd', companyName: 'CJ대한통운(주)', contactName: '강신호', bizNumber: '130-81-30004', phone: '02-700-1114', address: '서울특별시 중구 세종대로' };
const HANJIN: DemoCompany = { memberId: '7ebad2a7-7475-4332-9621-8f1fc8327e6e', companyName: '(주)한진', contactName: '노삼석', bizNumber: '130-81-30005', phone: '02-728-5114', address: '서울특별시 중구 남대문로' };
const LOTTE: DemoCompany = { memberId: '5dd6fb4a-c1c9-4586-8fc5-2d841c2d9af8', companyName: '롯데글로벌로지스(주)', contactName: '박찬복', bizNumber: '130-81-30006', phone: '02-2170-3355', address: '서울특별시 중구 통일로' };
const KCTC: DemoCompany = { memberId: '4793971d-f602-4e50-a251-919d6477fa6e', companyName: '(주)케이씨티씨', contactName: '이윤수', bizNumber: '130-81-30007', phone: '02-311-9114', address: '서울특별시 중구 소월로' };
const DONGBANG: DemoCompany = { memberId: 'acd3e3ff-cf71-43e8-bcec-953dd6757b13', companyName: '(주)동방', contactName: '박창기', bizNumber: '130-81-30008', phone: '02-311-0114', address: '서울특별시 중구 남대문로' };

/* ---------- 예시 화물 조건 (화주가 매칭 조건 설정에서 등록한 조건이라고 가정) ---------- */

interface DemoCondition {
  conditionId: number;
  shipper: DemoCompany;
  request: MatchRequest;
}

const C101: DemoCondition = {
  conditionId: 101, shipper: YEONGBO,
  request: { country: '미국', hsCode: '3304991000', tradeType: '수출', transport: '해상', departure: '부산항', destination: '롱비치항', volume: 12.5, schedule: '2026-11-20', cargoType: '일반', refrigeration: false, hazmat: false, heavy: false, special: false },
};
const C102: DemoCondition = {
  conditionId: 102, shipper: YEONGBO,
  request: { country: '일본', hsCode: '8542311000', tradeType: '수출', transport: '항공', departure: '인천공항', destination: '나리타공항', volume: 1.2, schedule: '2026-10-28', cargoType: '특수', refrigeration: false, hazmat: false, heavy: false, special: true },
};
const C103: DemoCondition = {
  conditionId: 103, shipper: YEONGBO,
  request: { country: '베트남', hsCode: '7306402000', tradeType: '수입', transport: '해상', departure: '호치민항', destination: '인천항', volume: 30, schedule: '2026-10-15', cargoType: '일반', refrigeration: false, hazmat: false, heavy: true, special: false },
};
const C201: DemoCondition = {
  conditionId: 201, shipper: BANDO,
  request: { country: '중국', hsCode: '3901101000', tradeType: '수출', transport: '해상', departure: '인천항', destination: '상하이항', volume: 20, schedule: '2026-11-05', cargoType: '일반', refrigeration: false, hazmat: false, heavy: false, special: false },
};
const C202: DemoCondition = {
  conditionId: 202, shipper: DADA,
  request: { country: '미국', hsCode: '8708290000', tradeType: '수출', transport: '해상', departure: '부산항', destination: '롱비치항', volume: 15, schedule: '2026-10-20', cargoType: '일반', refrigeration: false, hazmat: false, heavy: false, special: false },
};

/* ---------- 매칭 1건 만들기 ---------- */

interface CandidateInput {
  id: number;
  condition: DemoCondition;
  logistics: DemoCompany;
  scores: { route: number; capacity: number; item: number; schedule: number; experience: number };   // 30 / 25 / 20 / 15 / 10 점 만점
  offer: { hsCode: string; regularRoute: boolean; directRoute: boolean; leadTime: number; availableDate: string; availableCapacity: number; experience: number; refrigeration: boolean; hazmat: boolean; heavy: boolean; special: boolean };
  stage: Stage;
  createdAt: string;
  logisticsRejectReason?: string;   // 운송사가 거절한 사유
  adminRejectReason?: string;       // 관리자가 반려한 사유
}

// 모든 회사의 사업자 확인 결과 (예시) — 실제로는 국세청 API 로 사업자등록번호를 조회해서 채움
const BIZ_OK: BizCheck = { status: '계속사업자', taxType: '부가가치세 일반과세자', checkedAt: '2026-10-08' };

// 회사 정보 + 응답 상태 → Party (MatchItem 의 shipper / logistics 칸)
function toParty(company: DemoCompany, response: PartyResponse, rejectReason?: string): Party {
  return {
    companyName: company.companyName,
    contactName: company.contactName,
    bizNumber: company.bizNumber,
    phone: company.phone,
    address: company.address,
    response,
    rejectReason,
  };
}

function makeMatch(input: CandidateInput): MyMatchItem {
  const { condition, logistics, scores, offer, stage } = input;
  const request = condition.request;
  const status = STAGE_STATUS[stage];   // 진행 단계 → 상태 칸 4개

  // 관리자 매칭 관리 카드와 같은 "매칭 분석 요소" 문구
  const matchFactors = [
    request.hsCode === offer.hsCode ? `HS코드 일치 (${request.hsCode})` : `HS코드 적합도 반영 (${request.hsCode} ↔ ${offer.hsCode})`,
    `서비스 국가 일치 (${request.country})`,
    `운송방식 일치 (${request.transport})`,
    `물량 가용 (${request.volume}t / ${offer.availableCapacity}t)`,
    `일정 비교 (${request.schedule} ↔ ${offer.availableDate})`,
  ];
  if (request.heavy) matchFactors.push('중량물 취급 가능');
  if (request.special) matchFactors.push('특수화물 취급 가능');

  const logisticsOffer: LogisticsOffer = {
    country: request.country,
    transport: request.transport === '해상' ? 'SEA' : 'AIR',
    departure: request.departure,       // 필수조건 : 출발지 · 도착지가 같은 운송사만 추천됨
    destination: request.destination,
    regularRoute: offer.regularRoute,
    directRoute: offer.directRoute,
    leadTime: offer.leadTime,
    availableDate: offer.availableDate,
    availableCapacity: offer.availableCapacity,
    general: true,
    refrigeration: offer.refrigeration,
    hazmat: offer.hazmat,
    heavy: offer.heavy,
    special: offer.special,
    hsCode: offer.hsCode,
    experience: offer.experience,
  };

  return {
    id: input.id,
    createdAt: input.createdAt,
    routeScore: scores.route,
    capacityScore: scores.capacity,
    itemScore: scores.item,
    scheduleScore: scores.schedule,
    experienceScore: scores.experience,
    totalScore: scores.route + scores.capacity + scores.item + scores.schedule + scores.experience,
    matchFactors,
    adminStatus: status.admin,
    adminRejectReason: input.adminRejectReason,
    finalStatus: status.final,
    shipper: toParty(condition.shipper, status.shipper),
    logistics: toParty(logistics, status.logistics, input.logisticsRejectReason),
    request,
    offer: logisticsOffer,
    conditionId: condition.conditionId,
    shipperMemberId: condition.shipper.memberId,
    logisticsMemberId: logistics.memberId,
    shipperBiz: BIZ_OK,
    logisticsBiz: BIZ_OK,
  };
}

/* ---------- 처음 데모 데이터 ---------- */

const INITIAL_MATCHES: MyMatchItem[] = [
  // 조건 101 (영보월드와이드 · 부산항 → 롱비치항) : 추천 5곳 , 아직 아무 곳에도 요청 안 함
  makeMatch({ id: 1001, condition: C101, logistics: HMM, stage: 'recommended', createdAt: '2026-10-07 09:12',
    scores: { route: 30, capacity: 25, item: 20, schedule: 12, experience: 8 },
    offer: { hsCode: '3304991000', regularRoute: true, directRoute: true, leadTime: 14, availableDate: '2026-11-18', availableCapacity: 40, experience: 312, refrigeration: false, hazmat: false, heavy: true, special: false } }),
  makeMatch({ id: 1002, condition: C101, logistics: GLOVIS, stage: 'recommended', createdAt: '2026-10-07 09:12',
    scores: { route: 30, capacity: 22, item: 14, schedule: 12, experience: 6 },
    offer: { hsCode: '3304992000', regularRoute: true, directRoute: true, leadTime: 16, availableDate: '2026-11-22', availableCapacity: 18, experience: 205, refrigeration: true, hazmat: false, heavy: true, special: false } }),
  makeMatch({ id: 1003, condition: C101, logistics: LX, stage: 'recommended', createdAt: '2026-10-07 09:12',
    scores: { route: 25, capacity: 25, item: 20, schedule: 9, experience: 7 },
    offer: { hsCode: '3304991000', regularRoute: true, directRoute: false, leadTime: 19, availableDate: '2026-11-25', availableCapacity: 35, experience: 270, refrigeration: false, hazmat: true, heavy: false, special: false } }),
  makeMatch({ id: 1004, condition: C101, logistics: CJ, stage: 'recommended', createdAt: '2026-10-07 09:12',
    scores: { route: 25, capacity: 18, item: 12, schedule: 10, experience: 5 },
    offer: { hsCode: '3304100000', regularRoute: true, directRoute: false, leadTime: 18, availableDate: '2026-11-15', availableCapacity: 14, experience: 120, refrigeration: true, hazmat: true, heavy: false, special: false } }),
  makeMatch({ id: 1005, condition: C101, logistics: HANJIN, stage: 'recommended', createdAt: '2026-10-07 09:12',
    scores: { route: 20, capacity: 20, item: 20, schedule: 7, experience: 4 },
    offer: { hsCode: '3304991000', regularRoute: false, directRoute: true, leadTime: 21, availableDate: '2026-12-01', availableCapacity: 25, experience: 64, refrigeration: false, hazmat: false, heavy: false, special: false } }),

  // 조건 102 (영보월드와이드 · 인천공항 → 나리타공항) : 롯데 거절 → 케이씨티씨 수락 → 관리자 최종 확인 대기
  makeMatch({ id: 1006, condition: C102, logistics: KCTC, stage: 'adminReview', createdAt: '2026-10-03 14:20',
    scores: { route: 30, capacity: 25, item: 20, schedule: 13, experience: 6 },
    offer: { hsCode: '8542311000', regularRoute: true, directRoute: true, leadTime: 2, availableDate: '2026-10-27', availableCapacity: 3.5, experience: 158, refrigeration: false, hazmat: false, heavy: false, special: true } }),
  makeMatch({ id: 1007, condition: C102, logistics: LOTTE, stage: 'logisticsRejected', createdAt: '2026-10-03 14:20', logisticsRejectReason: '일정 불일치',
    scores: { route: 25, capacity: 25, item: 14, schedule: 12, experience: 5 },
    offer: { hsCode: '8542312000', regularRoute: true, directRoute: false, leadTime: 3, availableDate: '2026-10-30', availableCapacity: 5, experience: 96, refrigeration: false, hazmat: false, heavy: false, special: true } }),
  makeMatch({ id: 1008, condition: C102, logistics: DONGBANG, stage: 'recommended', createdAt: '2026-10-03 14:20',
    scores: { route: 20, capacity: 18, item: 12, schedule: 9, experience: 4 },
    offer: { hsCode: '8542390000', regularRoute: false, directRoute: true, leadTime: 4, availableDate: '2026-11-02', availableCapacity: 2, experience: 31, refrigeration: false, hazmat: false, heavy: false, special: true } }),

  // 조건 103 (영보월드와이드 · 호치민항 → 인천항) : 한진 관리자 반려 → 현대글로비스 매칭 완료
  makeMatch({ id: 1009, condition: C103, logistics: GLOVIS, stage: 'completed', createdAt: '2026-09-28 11:05',
    scores: { route: 30, capacity: 25, item: 20, schedule: 15, experience: 9 },
    offer: { hsCode: '7306402000', regularRoute: true, directRoute: true, leadTime: 6, availableDate: '2026-10-15', availableCapacity: 80, experience: 640, refrigeration: true, hazmat: false, heavy: true, special: false } }),
  makeMatch({ id: 1010, condition: C103, logistics: HANJIN, stage: 'adminRejected', createdAt: '2026-09-27 16:40', adminRejectReason: '단가 협의 실패',
    scores: { route: 25, capacity: 22, item: 20, schedule: 12, experience: 7 },
    offer: { hsCode: '7306402000', regularRoute: true, directRoute: false, leadTime: 7, availableDate: '2026-10-17', availableCapacity: 45, experience: 210, refrigeration: false, hazmat: false, heavy: true, special: false } }),
  makeMatch({ id: 1011, condition: C103, logistics: CJ, stage: 'recommended', createdAt: '2026-09-27 16:40',
    scores: { route: 20, capacity: 20, item: 14, schedule: 10, experience: 6 },
    offer: { hsCode: '7306401000', regularRoute: false, directRoute: true, leadTime: 8, availableDate: '2026-10-20', availableCapacity: 35, experience: 150, refrigeration: false, hazmat: true, heavy: true, special: false } }),

  // 다른 화주가 에이치엠엠(주)에 보낸 요청 (운송사 데모 계정 화면에 보임)
  makeMatch({ id: 1012, condition: C201, logistics: HMM, stage: 'requested', createdAt: '2026-10-06 15:30',
    scores: { route: 25, capacity: 25, item: 20, schedule: 12, experience: 8 },
    offer: { hsCode: '3901101000', regularRoute: true, directRoute: false, leadTime: 3, availableDate: '2026-11-04', availableCapacity: 60, experience: 312, refrigeration: false, hazmat: false, heavy: true, special: false } }),
  makeMatch({ id: 1013, condition: C202, logistics: HMM, stage: 'completed', createdAt: '2026-09-25 10:00',
    scores: { route: 30, capacity: 22, item: 20, schedule: 12, experience: 8 },
    offer: { hsCode: '8708290000', regularRoute: true, directRoute: true, leadTime: 14, availableDate: '2026-10-19', availableCapacity: 40, experience: 312, refrigeration: false, hazmat: false, heavy: true, special: false } }),
];

/* ---------- 브라우저 저장 (데모용) ---------- */
// 계정을 바꿔 가며 시연할 수 있도록 바뀐 상태를 localStorage 에 저장 (화주가 요청 → 운송사 계정에서 보임)

const STORAGE_KEY = 'macross:my-matching-demo:v1';

// 처음 데모 데이터의 복사본 (JSON 으로 바꿨다가 되돌리면 완전히 새 객체가 됨)
function initialMatches(): MyMatchItem[] {
  return JSON.parse(JSON.stringify(INITIAL_MATCHES));
}

// 저장된 데모 상태 불러오기 (없거나 읽기 실패하면 처음 데모 데이터)
export function loadDemoMatches(): MyMatchItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const list = JSON.parse(saved);
      if (Array.isArray(list)) return list;
    }
  } catch {
    // localStorage 를 못 쓰는 환경이면 처음 데이터로
  }
  return initialMatches();
}

// 데모 상태 저장
export function saveDemoMatches(list: MyMatchItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 저장에 실패해도 지금 화면은 그대로 동작
  }
}

// [데모 초기화] : 저장된 상태를 지우고 처음 데이터로
export function resetDemoMatches(): MyMatchItem[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
  return initialMatches();
}
