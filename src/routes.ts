import type { Page } from './types/user';

// 페이지 ↔ URL 주소 매핑 — 새 페이지를 추가하면 여기와 types/user.ts 의 Page 타입만 수정
// ⚠️ /api, /country, /route 로 시작하는 주소는 vite 프록시가 백엔드로 넘기므로 사용 금지
// [TS] Record<Page, string> : 키는 Page 이름 5개, 값은 주소 글자인 객체 → 하나라도 빠뜨리면 빨간 줄 (가이드 2-8)
export const PAGE_PATHS: Record<Page, string> = {
  dashboard: '/',
  trade: '/trade',
  'matching-settings': '/matching-settings',
  matching: '/matching',
  admin: '/admin',
};

// 현재 주소 → Page (Header 메뉴 활성 표시용). 매칭되는 주소가 없으면 대시보드
// Object.entries(객체) : { a: 1, b: 2 } → [['a', 1], ['b', 2]] 처럼 [키, 값] 배열로 바꿈
export function pathToPage(pathname: string): Page {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname; // '/trade/' → '/trade'
  const entry = Object.entries(PAGE_PATHS).find(([, path]) => path === normalized);
  return (entry?.[0] as Page | undefined) ?? 'dashboard';
}
