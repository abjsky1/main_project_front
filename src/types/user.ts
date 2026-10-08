// 여러 파일이 같이 쓰는 타입 모음
// [TS] type / interface 는 값의 "모양" 설명서 — 화면 동작에는 영향 없음 (가이드 2-2, 2-3)

// 화면(페이지) 이름 — Header 메뉴와 App의 페이지 전환에 사용
// [TS] 'a' | 'b' : 이 글자들 중 하나만 들어갈 수 있음
// (dashboard = 화면 이름 "무역 현황". 코드 안의 이름은 그대로 dashboard 사용)
export type Page = 'dashboard' | 'trade' | 'insights' | 'matching-settings' | 'my-matching' | 'matching' | 'admin' | 'mypage';

export type UserRole = 'admin' | 'user';
export type CompanyType = '수출입기업' | '물류업체';

// 로그인한 회원 정보 (백엔드 로그인 응답을 App.tsx에서 이 형태로 변환)
// [TS] 칸 이름 뒤의 ? : 없어도 되는 칸 (예: 관리자는 companyType 이 없음)
export interface User {
  memberId?: string;
  name: string;
  email: string;
  role: UserRole;
  companyType?: CompanyType;
  companyName?: string;
  businessNumber?: string;
  phone?: string;
  address?: string;
}
