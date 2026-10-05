// 시스템 관리 화면에서 쓰는 타입 / 표시용 매핑
// (데이터는 백엔드에서 조회 : 사용자 목록 GET /api/authorization , 감사 로그 GET /api/audit)

export type UserStatus = '활성' | '비활성';
export type UserRoleLabel = '관리자' | '일반사용자';

// 사용자 권한 관리 표의 한 줄 (AuthorizationDto 를 useUserManagement 에서 이 모양으로 변환)
export interface SystemUser {
  id: string;          // memberId (UUID)
  name: string;
  email: string;
  role: UserRoleLabel;
  lastLogin: string;   // 로그인 기록이 없으면 '-'
  status: UserStatus;
}

// 감사 로그 표의 한 줄 (AuditDto 를 useAuditLogs 에서 이 모양으로 변환)
export interface AuditLog {
  id: number;
  timestamp: string;
  user: string;          // 이름 (비회원은 '비회원')
  email: string;
  memberType: string;    // 관리자 / 수출입기업 / 물류업체 / 비회원
  actionId: number;
  action: string;
  target: string;
  ip: string;
  result: '성공' | '실패';
}

// signup 테이블 유형 이름 → 화면 표시 이름
export const MEMBER_TYPE_LABEL: Record<string, string> = {
  '관리자': '관리자',
  '수출입기업': '수출입기업',
  '물류운송업체': '물류업체',
  '비회원': '비회원',
};

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
  18: 'action-badge--permission',  // 사용자 상태 변경
};
