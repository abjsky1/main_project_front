import axios from 'axios';

// 백엔드 MatchingAiDto 응답 (Talend에서 확인한 필드 기준)
export interface MatchingAiReason {
  calculation?: string;
  reason?: string;
  evidenceIds?: string[];
}

export interface MatchingAiDto {
  evaluationStatus: string;
  routeScore: number | null;
  capacityScore: number | null;
  itemScore: number | null;
  scheduleScore: number | null;
  experienceScore: number | null;
  totalScore: number | null;
  recommendReason?: string | null;
  warningMessage?: string | null;
  scoreReasons?: {
    route?: MatchingAiReason;
    capacity?: MatchingAiReason;
    item?: MatchingAiReason;
    schedule?: MatchingAiReason;
    experience?: MatchingAiReason;
  } | null;
  missingFields?: string[] | null;
}

// 목록에서 평가한 결과를 상세보기에서도 재호출 없이 사용 (현재 브라우저 탭의 메모리에만 보관)
// 다른 회원의 평가 결과와 섞이지 않도록 회원 번호 + 매칭 번호로 구분한다.
const resultCache = new Map<string, MatchingAiDto>();
const requesting = new Map<string, Promise<MatchingAiDto>>();
const cacheKey = (memberId: string, matchingId: number) => `${memberId}:${matchingId}`;

export function getCachedMatchingAi(memberId: string, matchingId: number) {
  return resultCache.get(cacheKey(memberId, matchingId)) ?? null;
}

// 버튼을 클릭할 때에만 호출한다. 기존 Java 점수/DB는 변경하지 않는다.
export async function evaluateMatchingAi(memberId: string, matchingId: number): Promise<MatchingAiDto> {
  const key = cacheKey(memberId, matchingId);
  const cached = resultCache.get(key);
  if (cached) return cached;

  const existingRequest = requesting.get(key);
  if (existingRequest) return existingRequest;

  const request = axios.post<MatchingAiDto | null>(
    `/api/matching/ai/compare/${matchingId}`,
    null,
    { withCredentials: true }
  ).then((response) => {
    const result = response.data;
    if (!result || typeof result !== 'object' || !result.evaluationStatus) {
      throw new Error('평가 결과가 없습니다. 로그인 상태와 본인 매칭 여부를 확인해 주세요.');
    }
    // 응답이 유효하면 캐시한다. 실패 응답/통신 오류는 다시 시도할 수 있다.
    if (result.evaluationStatus === 'SCORED' && typeof result.totalScore === 'number') {
      resultCache.set(key, result);
    }
    return result;
  }).finally(() => {
    requesting.delete(key);
  });

  requesting.set(key, request);
  return request;
}
