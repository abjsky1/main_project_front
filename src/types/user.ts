// 화면(페이지) 이름 — Header 메뉴와 App의 페이지 전환에 사용
export type Page = 'dashboard' | 'trade' | 'matching-settings' | 'matching' | 'admin';

export type UserRole = 'admin' | 'user';
export type CompanyType = '수출입기업' | '물류업체';

// 로그인한 회원 정보 (백엔드 로그인 응답을 App.tsx에서 이 형태로 변환)
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
