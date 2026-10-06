import axios from 'axios';

// 백엔드 사용자 권한 관리 API (main_project_back 의 AuthorizationController)

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
export async function searchUsers(params: UserSearchParams, signal?: AbortSignal) {
  const response = await axios.get<AuthorizationCountDto>('/api/authorization', { params, signal });
  return response.data;
}

// PUT 권한 스위치 (관리자 ↔ 일반 사용자) , 성공하면 true
// encodeURIComponent : memberId 에 특수문자가 있어도 주소가 깨지지 않게 변환
export async function toggleMemberRole(memberId: string) {
  const response = await axios.put<boolean>(`/api/authorization/${encodeURIComponent(memberId)}/role`);
  return response.data;
}

// PUT 상태 스위치 (활성 ↔ 비활성) , 성공하면 true
export async function toggleMemberStatus(memberId: string) {
  const response = await axios.put<boolean>(`/api/authorization/${encodeURIComponent(memberId)}/status`);
  return response.data;
}
