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

// 백엔드 GET /api/audit 응답 — 감사 로그 한 페이지 (main_project_back 의 AuditPageDto)
// 로그 전체가 아니라 "이번 페이지 50건" + 페이지 버튼을 그리는 데 필요한 숫자들
export interface AuditPageDto {
  logs: AuditDto[];      // 이번 페이지의 로그 (최신순 , 최대 50건)
  page: number;          // 지금 페이지 번호 — 0 부터 (0 = 1페이지) → 화면에 보여 줄 때 +1
  size: number;          // 한 페이지 건수 (50)
  totalPages: number;    // 전체 페이지 수 (로그가 없으면 0)
  totalCount: number;    // 조건에 맞는 전체 로그 수 (화면의 "총 1,352건")
}

// 필터 조건 + 페이지 (값이 없으면 조건 없이 전체)
// [TS] user?: string → 없어도 되는 칸. 값이 undefined 인 칸은 axios 가 주소에 붙이지 않음
export interface AuditSearchParams {
  user?: string;        // 이메일 또는 이름에 포함된 글자
  memberType?: string;  // 회원 유형 : 관리자 / 수출입기업 / 물류운송업체 / 비회원 (signup 테이블의 이름 그대로)
  actionId?: number;    // 작업 유형 번호 (선택칸에서 고른 값 — 목록은 getAuditActions)
  ip?: string;          // IP 주소에 포함된 글자
  result?: boolean;     // true = 성공 , false = 실패
  period?: string;      // 기간 : today / 7days / 30days / 6months / 1year (안 보내면 전체 기간)
  page?: number;        // 몇 번째 페이지 — 서버 기준 0 부터 (0 = 1페이지)
}

// 감사 로그 조회 (필터 조건으로 DB 에서 조회 , 최신순 , 한 페이지씩)
// 예) params = { user: 'kim', period: '7days', page: 2 }  →  GET /api/audit?user=kim&period=7days&page=2
// - 관리자만 사용 가능 : 서버가 로그인 쿠키(AccessToken)로 확인 → withCredentials: true 로 쿠키를 같이 보냄
// [TS] AuditPageDto | null : 관리자가 아니면 서버가 null 을 돌려줌 (빈 응답 → axios 는 '' 로 줌 → || null 로 null 로 바꿈)
export async function getAuditLogs(params: AuditSearchParams, signal?: AbortSignal) {
  const response = await axios.get<AuditPageDto | null>('/api/audit', { params, signal, withCredentials: true });
  return response.data || null;
}

// 작업 유형 1개 — ActionDto (감사 로그 필터 줄의 "작업 유형" 선택칸 목록)
export interface ActionDto {
  actionId: number;     // 1 , 2 , 3 ...
  actionType: string;   // 엑셀 다운로드 , 로그인 , 로그인 실패 ...
}

// GET /api/audit/actions : 작업 유형 21가지 (action 테이블 , 번호순) — 관리자가 아니면 null
// (DB 에 작업 유형이 늘어나면 선택칸에도 자동으로 나오게 , 화면에 목록을 직접 적어 두지 않고 서버에서 받음)
export async function getAuditActions() {
  const response = await axios.get<ActionDto[] | null>('/api/audit/actions', { withCredentials: true });
  return response.data || null;
}
