import axios from 'axios';

// 백엔드 관심 국가 API (main_project_back 의 InterestController)
// - 회원 1명당 최대 3개 , 3개가 찬 상태에서 추가하면 서버가 가장 먼저 등록한 국가를 빼고 추가 (밀어내기)
// - 추가 / 삭제는 로그인 쿠키(AccessToken)로 본인인지 확인 → withCredentials: true 로 쿠키를 같이 보냄
//   (B_react 공부 파일 Login.jsx 의 "쿠키/세션 사용시 { withCredentials : true } 필수" 와 같은 설정)

export const MAX_INTEREST_COUNTRIES = 3;   // 관심 국가 최대 개수 (InterestService 의 MAX_INTEREST 와 같은 값)

// 관심 국가 1개 — InterestDto
export interface InterestDto {
  interestId: number;          // 관심 국가 번호 (삭제할 때 사용)
  memberId: string;
  countryId: number;           // country.csv 의 국가 번호
  countryName: string | null;  // 서버가 country.csv 를 보고 채워 줌 (없는 번호면 null)
}

// GET /api/interest?memberId=... : 관심 국가 목록 (먼저 등록한 것부터)
export async function getInterests(memberId: string, signal?: AbortSignal) {
  const response = await axios.get<InterestDto[]>('/api/interest', { params: { memberId }, signal });
  return response.data;
}

// POST /api/interest : 관심 국가 추가 , 성공하면 true
export async function addInterest(memberId: string, countryId: number) {
  const response = await axios.post<boolean>('/api/interest', { memberId, countryId }, { withCredentials: true });
  return response.data;
}

// DELETE /api/interest/{interestId} : 관심 국가 삭제 , 성공하면 true
export async function deleteInterest(interestId: number) {
  const response = await axios.delete<boolean>(`/api/interest/${interestId}`, { withCredentials: true });
  return response.data;
}
