
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
