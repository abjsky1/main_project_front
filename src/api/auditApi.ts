import axios from 'axios';

// 백엔드 GET /api/audit 응답 (감사 로그 1건) — main_project_back 의 AuditDto
export interface AuditDto {
  auditId: number;
  createdAt: string;      // "2025-12-31 09:31:45"
  managerName: string;    // 비회원이면 '비회원'
  userEmail: string;      // 비회원이면 guest@macross.local
  signupType: string;     // 관리자 / 수출입기업 / 물류운송업체 / 비회원
  actionId: number;
  actionType: string;     // 로그인, 데이터 조회 ...
  actionDetail: string;   // 화면의 "대상"
  fipAddress: string;
  actionResult: boolean;
}

// 필터 조건 (값이 없으면 조건 없이 전체)
// [TS] user?: string → 없어도 되는 칸. 값이 undefined 인 칸은 axios 가 주소에 붙이지 않음
export interface AuditSearchParams {
  user?: string;      // 이메일 또는 이름에 포함된 글자
  action?: string;    // 작업 유형에 포함된 글자
  result?: boolean;   // true = 성공 , false = 실패
}

// 감사 로그 조회 (필터 조건으로 DB 에서 조회 , 최신순)
// 예) params = { user: 'kim', result: true }  →  GET /api/audit?user=kim&result=true
// - 관리자만 사용 가능 : 서버가 로그인 쿠키(AccessToken)로 확인 → withCredentials: true 로 쿠키를 같이 보냄
// [TS] AuditDto[] | null : 관리자가 아니면 서버가 null 을 돌려줌 (빈 응답)
export async function getAuditLogs(params: AuditSearchParams, signal?: AbortSignal) {
  const response = await axios.get<AuditDto[] | null>('/api/audit', { params, signal, withCredentials: true });
  return response.data;
}
