import axios from 'axios';

// 백엔드 GET /api/matching 응답 (매칭 결과 1건)
// [TS] 'PENDING' | 'APPROVED' | 'REJECTED' → 이 3개 문자열 중 하나만 들어온다는 뜻 (가이드 2-3)
export interface MatchingApiDto {
  matchingId: number;
  cscore1Id: number;
  lscore1Id: number;

  routeScore: number;
  capacityScore: number;
  itemScore: number;
  scheduleScore: number;
  experienceScore: number;
  totalScore: number;

  adminStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  shipperStatus: 'WAITING' | 'ACCEPTED' | 'REJECTED';
  logisticsStatus: 'WAITING' | 'ACCEPTED' | 'REJECTED';
  finalStatus: 'PENDING' | 'COMPLETED' | 'FAILED';

  recommendReason: string;
  warningMessage: string;
  createdAt: string;

  // 추후 MatchingDto에 회원 상세 필드를 추가하면 바로 사용할 수 있도록 optional 처리
  // [TS] ?: → 응답에 없을 수도 있는 칸
  shipperCompanyName?: string;
  shipperContactName?: string;
  shipperBizNumber?: string;
  shipperPhone?: string;
  shipperAddress?: string;

  logisticsCompanyName?: string;
  logisticsContactName?: string;
  logisticsBizNumber?: string;
  logisticsPhone?: string;
  logisticsAddress?: string;
}

// 전체 매칭 결과 목록 (관리자 매칭 관리 화면에서 사용)
export async function getMatchingList(signal?: AbortSignal) {
  const response = await axios.get<MatchingApiDto[]>('/api/matching', { signal });
  return response.data;
}
