// ⚠️ 더미 데이터 — 백엔드 API 연결 시 이 파일의 값들을 서버 응답으로 교체하세요.

export type UserStatus = '활성' | '비활성';
export type UserRoleLabel = '관리자' | '일반사용자';

export interface SystemUser {
  id: number;
  name: string;
  email: string;
  role: UserRoleLabel;
  lastLogin: string;
  status: UserStatus;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  ip: string;
  result: '성공' | '실패';
}

export const INITIAL_USERS: SystemUser[] = [
  { id: 1, name: '김관리자', email: 'admin@macross.com', role: '관리자', lastLogin: '2025-12-31 09:14', status: '활성' },
  { id: 2, name: '이사용자', email: 'user@macross.com', role: '일반사용자', lastLogin: '2025-12-31 08:52', status: '활성' },
  { id: 3, name: '박영업', email: 'park.sales@macross.com', role: '일반사용자', lastLogin: '2025-12-30 17:33', status: '활성' },
  { id: 4, name: '최분석', email: 'choi.analyst@macross.com', role: '일반사용자', lastLogin: '2025-12-29 11:22', status: '활성' },
  { id: 5, name: '정물류', email: 'jung.logistics@macross.com', role: '일반사용자', lastLogin: '2025-12-28 15:10', status: '비활성' },
  { id: 6, name: '강테스트', email: 'kang.test@macross.com', role: '일반사용자', lastLogin: '2025-12-01 10:05', status: '비활성' },
];

export const AUDIT_LOGS: AuditLog[] = [
  { id: 1, timestamp: '2025-12-31 09:31:45', user: '김관리자', action: '엑셀 다운로드', target: '무역 데이터 (2025-01 ~ 2025-12)', ip: '192.168.1.101', result: '성공' },
  { id: 2, timestamp: '2025-12-31 09:22:10', user: '이사용자', action: '데이터 조회', target: 'HS 코드 3304.99 (미국)', ip: '192.168.1.105', result: '성공' },
  { id: 3, timestamp: '2025-12-31 09:14:03', user: '김관리자', action: '로그인', target: '시스템', ip: '192.168.1.101', result: '성공' },
  { id: 4, timestamp: '2025-12-30 18:05:22', user: '박영업', action: '엑셀 다운로드', target: '무역 데이터 (2025-10 ~ 2025-12)', ip: '192.168.1.110', result: '성공' },
  { id: 5, timestamp: '2025-12-30 17:33:14', user: '박영업', action: '로그인', target: '시스템', ip: '192.168.1.110', result: '성공' },
  { id: 6, timestamp: '2025-12-30 15:50:08', user: '최분석', action: '기업 데이터 삭제', target: 'ID #89 (구 등록업체)', ip: '192.168.1.108', result: '성공' },
  { id: 7, timestamp: '2025-12-30 14:22:31', user: '강테스트', action: '로그인 시도', target: '시스템', ip: '203.0.113.45', result: '실패' },
  { id: 8, timestamp: '2025-12-30 14:20:15', user: '강테스트', action: '로그인 시도', target: '시스템', ip: '203.0.113.45', result: '실패' },
  { id: 9, timestamp: '2025-12-30 14:18:02', user: '강테스트', action: '로그인 시도', target: '시스템', ip: '203.0.113.45', result: '실패' },
  { id: 10, timestamp: '2025-12-29 16:10:44', user: '이사용자', action: '엑셀 다운로드', target: '환율 데이터 (USD 2025)', ip: '192.168.1.105', result: '성공' },
  { id: 11, timestamp: '2025-12-29 11:45:19', user: '최분석', action: '데이터 조회', target: 'HS 코드 8517.12 (중국)', ip: '192.168.1.108', result: '성공' },
  { id: 12, timestamp: '2025-12-28 09:30:00', user: '김관리자', action: '사용자 권한 변경', target: '강테스트 → 비활성화 처리', ip: '192.168.1.101', result: '성공' },
];

// 작업 유형별 배지 색 → SystemAdmin.css 의 .action-badge--xxx 클래스
export const ACTION_BADGE_CLASS: Record<string, string> = {
  '로그인': 'action-badge--login',
  '로그인 시도': 'action-badge--login-try',
  '엑셀 다운로드': 'action-badge--download',
  '데이터 조회': 'action-badge--view',
  '기업 데이터 삭제': 'action-badge--delete',
  '사용자 권한 변경': 'action-badge--permission',
};
