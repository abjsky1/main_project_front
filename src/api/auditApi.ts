import axios from 'axios';

// 백엔드 GET /api/audit 응답 (감사 로그 1건) — main_project_back 의 AuditDto
export interface AuditDto {
  auditId: number;
  createdAt: string;      // "2025-12-31 09:31:45"
  managerName: string;    // 비회원이면 '비회원'
  actionId: number;
  actionType: string;     // 로그인, 데이터 조회 ...
  actionDetail: string;   // 화면의 "대상"
  fipAddress: string;
  actionResult: boolean;
}

// 감사 로그 전체 (최신순)
export const getAuditLogs = (signal?: AbortSignal) =>
  axios.get<AuditDto[]>('/api/audit', { signal }).then((res) => res.data);
