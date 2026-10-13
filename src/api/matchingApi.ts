
import axios from 'axios';

/* =========================================================
   매칭 API (Spring Boot /api/matching)

   1. 관리자 전체 매칭 조회
   2. 회원별 내 매칭 조회
   3. 화주 매칭 요청 / 거절
   4. 물류기업 매칭 수락 / 거절

   - HTTP 통신은 axios 사용
   - 성공 또는 실패 결과는 response.data로 반환
   ========================================================= */


// [1] 백엔드 MatchingDto의 데이터 형식
export interface MatchingApiDto {

  // 매칭 번호
  matchingId: number;

  // 화주 매칭 조건 번호
  cscore1Id: number;

  // 물류기업 매칭 조건 번호
  lscore1Id: number;


  // 매칭 점수
  routeScore: number;
  capacityScore: number;
  itemScore: number;
  scheduleScore: number;
  experienceScore: number;
  totalScore: number;


  // 매칭 상태
  adminStatus: 'PENDING' | 'APPROVED' | 'REJECTED';

  shipperStatus: 'WAITING' | 'ACCEPTED' | 'REJECTED';

  logisticsStatus: 'WAITING' | 'ACCEPTED' | 'REJECTED';

  finalStatus: 'PENDING' | 'COMPLETED' | 'FAILED';


  // 추천 이유 및 경고 메시지
  recommendReason: string;
  warningMessage: string;

  // 매칭 생성일
  createdAt: string;


  // 화주 기업 정보
  shipperCompanyName?: string;
  shipperContactName?: string;
  shipperBizNumber?: string;
  shipperPhone?: string;
  shipperAddress?: string;


  // 물류기업 정보
  logisticsCompanyName?: string;
  logisticsContactName?: string;
  logisticsBizNumber?: string;
  logisticsPhone?: string;
  logisticsAddress?: string;


  // [추가] 운송 서비스 정보

  // 운송 방식 : true = 해상, false = 항공
  logisticsTransportType?: boolean | null;

  // 정기노선 여부
  logisticsRegularRoute?: boolean | null;

  // 직항 여부
  logisticsDirectRoute?: boolean | null;

  // HS코드 취급 경험(회)
  logisticsExperienceCount?: number | null;

  // 평균 운송 기간(일)
  logisticsAverageTransitDays?: number | null;

}


// [2] 전체 매칭 결과 조회 (관리자)
// GET /api/matching
export async function getMatchingList(signal?: AbortSignal) {

  const response = await axios.get<MatchingApiDto[]>(
    '/api/matching',
    {
      signal,
      withCredentials: true
    }
  );

  return response.data;

}


// [2-1] 관리자 매칭 관리 화면 — 상태별 건수 5개 + 고른 상태의 매칭 한 페이지(50건)를 한 번에
// GET /api/matching/admin?status=completed&page=0

// 상태 필터 (화면 위쪽 카드 5칸) — 글자 그대로 서버의 status 로 보냄
//   all 전체 · linked 자동 매칭 연결 · requested 물류 수락 대기 · completed 매칭 성사 · failed 매칭 실패
export type MatchingStatusFilter = 'all' | 'linked' | 'requested' | 'completed' | 'failed';

// 백엔드 MatchingPageDto (숫자 5개 + 목록 한 페이지 + 페이지 숫자)
export interface MatchingPageDto {
  allCount: number;          // 전체 매칭 수
  linkedCount: number;       // 자동 매칭 연결
  requestedCount: number;    // 물류 수락 대기
  completedCount: number;    // 매칭 성사
  failedCount: number;       // 매칭 실패
  matchings: MatchingApiDto[];   // 고른 상태의 이번 페이지 (최신순 , 최대 50건)
  page: number;              // 지금 페이지 — 0 부터 (화면에 보여 줄 때 +1)
  size: number;              // 한 페이지 건수 (50)
  totalPages: number;        // 고른 상태의 전체 페이지 수
  totalCount: number;        // 고른 상태의 전체 매칭 수
}

// status : 화면의 상태 필터 , page : 서버 기준 0 부터
// - 관리자만 사용 가능 : 서버가 로그인 쿠키(AccessToken)로 확인 → withCredentials: true 로 쿠키를 같이 보냄
// [TS] MatchingPageDto | null : 관리자가 아니면 서버가 null(빈 응답 → axios 는 '')을 돌려줌 → || null 로 null 로 바꿈
export async function getAdminMatchings(status: MatchingStatusFilter, page: number, signal?: AbortSignal) {
  const response = await axios.get<MatchingPageDto | null>('/api/matching/admin', {
    params: { status, page },
    signal,
    withCredentials: true,
  });
  return response.data || null;
}


// [3] 로그인 회원의 매칭 결과 조회
// GET /api/matching/member/{memberId}
export async function getMemberMatchingList(
  memberId: string,
  signal?: AbortSignal
) {

  const response = await axios.get<MatchingApiDto[]>(
    `/api/matching/member/${memberId}`,
    {
      signal,
      withCredentials: true
    }
  );

  return response.data;

}


// [4] 화주 매칭 요청
// POST /api/matching/shipper/accept/{matchingId}
export async function acceptShipperMatching(
  matchingId: number,
  memberId: string
) {

  const response = await axios.post<boolean>(
    `/api/matching/shipper/accept/${matchingId}`,
    null,
    {
      params: { memberId },
      withCredentials: true
    }
  );

  return response.data;

}


// [5] 화주 매칭 거절
// POST /api/matching/shipper/reject/{matchingId}
export async function rejectShipperMatching(
  matchingId: number,
  memberId: string
) {

  const response = await axios.post<boolean>(
    `/api/matching/shipper/reject/${matchingId}`,
    null,
    {
      params: { memberId },
      withCredentials: true
    }
  );

  return response.data;

}


// [6] 물류기업 매칭 수락
// POST /api/matching/logistics/accept/{matchingId}
export async function acceptLogisticsMatching(
  matchingId: number,
  memberId: string
) {

  const response = await axios.post<boolean>(
    `/api/matching/logistics/accept/${matchingId}`,
    null,
    {
      params: { memberId },
      withCredentials: true
    }
  );

  return response.data;

}


// [7] 물류기업 매칭 거절
// POST /api/matching/logistics/reject/{matchingId}
export async function rejectLogisticsMatching(
  matchingId: number,
  memberId: string
) {

  const response = await axios.post<boolean>(
    `/api/matching/logistics/reject/${matchingId}`,
    null,
    {
      params: { memberId },
      withCredentials: true
    }
  );

  return response.data;

}
