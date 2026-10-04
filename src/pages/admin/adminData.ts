// ⚠️ INITIAL_USERS 는 더미 데이터 — 백엔드 API 연결 시 서버 응답으로 교체하세요. (감사 로그는 GET /api/audit 연결 완료)

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

export const INITIAL_USERS: SystemUser[] = [
  { id: 1, name: '김관리자', email: 'admin@macross.com', role: '관리자', lastLogin: '2025-12-31 09:14', status: '활성' },
  { id: 2, name: '이사용자', email: 'user@macross.com', role: '일반사용자', lastLogin: '2025-12-31 08:52', status: '활성' },
  { id: 3, name: '박영업', email: 'park.sales@macross.com', role: '일반사용자', lastLogin: '2025-12-30 17:33', status: '활성' },
  { id: 4, name: '최분석', email: 'choi.analyst@macross.com', role: '일반사용자', lastLogin: '2025-12-29 11:22', status: '활성' },
  { id: 5, name: '정물류', email: 'jung.logistics@macross.com', role: '일반사용자', lastLogin: '2025-12-28 15:10', status: '비활성' },
  { id: 6, name: '강테스트', email: 'kang.test@macross.com', role: '일반사용자', lastLogin: '2025-12-01 10:05', status: '비활성' },
];

// 감사 로그 표의 한 줄 (백엔드 GET /api/audit 응답을 useAuditLogs 에서 이 모양으로 변환)
export interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  actionId: number;
  action: string;
  target: string;
  ip: string;
  result: '성공' | '실패';
}

// 작업 유형별 배지 색 → SystemAdmin.css 의 .action-badge--xxx 클래스
// key 는 DB action 테이블의 action_id (이름은 바뀔 수 있어서 번호로 구분). 없는 번호는 회색 기본 배지
export const ACTION_BADGE_CLASS: Record<number, string> = {
  1: 'action-badge--download',     // 엑셀 다운로드
  2: 'action-badge--login',        // 로그인
  3: 'action-badge--login-try',    // 로그인 실패
  4: 'action-badge--permission',   // 매칭 승인 (알림 발송)
  5: 'action-badge--delete',       // 매칭 반려
  6: 'action-badge--permission',   // 사용자 권한 변경
  7: 'action-badge--view',         // 기업 정보 수정
  8: 'action-badge--view',         // 기업 등록
  9: 'action-badge--view',         // 데이터 조회
  10: 'action-badge--login',       // 회원 가입
  11: 'action-badge--delete',      // 회원 탈퇴
  12: 'action-badge--permission',  // 매칭 수락
  13: 'action-badge--download',    // 매칭 성공
  14: 'action-badge--delete',      // 매칭 거절
  15: 'action-badge--view',        // 매칭 조건 등록
  16: 'action-badge--delete',      // 매칭 조건 삭제
  17: 'action-badge--view',        // 매칭 실행
};
