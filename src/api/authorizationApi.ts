import axios from 'axios';

// 백엔드 사용자 권한 관리 API (main_project_back 의 AuthorizationController)
// - 관리자만 사용 가능 : 서버가 로그인 쿠키(AccessToken)로 관리자인지 확인
//   → withCredentials: true 로 쿠키를 같이 보냄 (B_react day056 App.jsx 의 "쿠키/세션 사용시 { withCredentials : true } 필수")
// - 관리자가 아니면 : 목록 조회는 빈 응답(null) , 변경은 false

// 회원 1명 — AuthorizationDto
export interface AuthorizationDto {
  memberId: string;
  managerName: string;
  userEmail: string;
  roleName: string;            // ROLE_ADMIN / ROLE_USER
  status: boolean;             // true = 활성
  lastLoginAt: string | null;  // "2025-12-31 09:14" , 로그인 기록이 없으면 null
}

// 사용자 수 + 목록 — AuthorizationCountDto
export interface AuthorizationCountDto {
  allUser: number;      // 요약 카드 숫자는 필터와 상관없이 전체 기준
  activate: number;
  deactivate: number;
  members: AuthorizationDto[];
}

// 필터 조건 (값이 없으면 조건 없이 전체)
export interface UserSearchParams {
  roleName?: string;
  status?: boolean;
}

// GET /api/authorization?roleName=&status=  (필터 조건으로 DB 에서 조회)
// [TS] AuthorizationCountDto | null : 관리자가 아니면 서버가 null 을 돌려줌 (빈 응답)
export async function searchUsers(params: UserSearchParams, signal?: AbortSignal) {
  const response = await axios.get<AuthorizationCountDto | null>('/api/authorization', { params, signal, withCredentials: true });
  return response.data;
}

// PUT 권한 스위치 (관리자 ↔ 일반 사용자) , 성공하면 true
// (관리자가 아니거나 , 내 계정의 권한을 바꾸려고 하면 false)
// encodeURIComponent : memberId 에 특수문자가 있어도 주소가 깨지지 않게 변환
// axios.put( 주소 , body , 설정 ) : 보낼 body 가 없어서 {} (B_react 의 axios.post( url , {} , { withCredentials : true }) 와 같은 모양)
export async function toggleMemberRole(memberId: string) {
  const response = await axios.put<boolean>(`/api/authorization/${encodeURIComponent(memberId)}/role`, {}, { withCredentials: true });
  return response.data;
}

// PUT 상태 스위치 (활성 ↔ 비활성) , 성공하면 true
// (관리자가 아니거나 , 내 계정을 비활성으로 바꾸려고 하면 false)
export async function toggleMemberStatus(memberId: string) {
  const response = await axios.put<boolean>(`/api/authorization/${encodeURIComponent(memberId)}/status`, {}, { withCredentials: true });
  return response.data;
}
