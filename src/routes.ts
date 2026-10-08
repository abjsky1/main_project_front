import type { Page } from './types/user';

// 페이지 ↔ URL 주소 매핑 — 새 페이지를 추가하면 여기와 types/user.ts 의 Page 타입만 수정
// ⚠️ /api, /country, /route, /hscode 로 시작하는 주소는 vite 프록시가 백엔드로 넘기므로 사용 금지
// [TS] Record<Page, string> : 키는 Page 이름들, 값은 주소 글자인 객체 → 하나라도 빠뜨리면 빨간 줄 (가이드 2-8)
export const PAGE_PATHS: Record<Page, string> = {
  dashboard: '/',                          // 무역 현황 (첫 화면)
  trade: '/trade',                         // 무역 데이터 분석
  insights: '/insights',                   // 맞춤 인사이트 (기업 회원)
  'matching-settings': '/matching-settings',
  'my-matching': '/my-matching',           // 내 매칭 (기업 회원 , 상세는 /my-matching/매칭번호)
  matching: '/matching',
  admin: '/admin',
  mypage: '/mypage',                       // 마이페이지 (헤더 오른쪽 동그라미 버튼으로 이동)
};

// 현재 주소 → Page (Header 메뉴 활성 표시용). 매칭되는 주소가 없으면 대시보드
// Object.entries(객체) : { a: 1, b: 2 } → [['a', 1], ['b', 2]] 처럼 [키, 값] 배열로 바꿈
// 상세 주소(/my-matching/1001)도 그 메뉴로 보이도록 "주소/" 로 시작하는 경우도 같은 페이지로 봄
export function pathToPage(pathname: string): Page {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname; // '/trade/' → '/trade'
  const entry = Object.entries(PAGE_PATHS).find(
    ([, path]) => path === normalized || (path !== '/' && normalized.startsWith(path + '/')),
  );
  return (entry?.[0] as Page | undefined) ?? 'dashboard';
}
