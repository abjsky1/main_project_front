# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

### Source layout (`src/`)

```
src/
├── App.tsx                 # 로그인 상태 + 라우트(<Routes>) 정의
├── routes.ts               # 페이지 ↔ URL 매핑 (PAGE_PATHS) — /api, /country, /route, /hscode 로 시작하는 주소 금지(프록시)
│                           # (코드 읽는 법·TS 문법 설명: docs/CODE_GUIDE.md)
├── index.css               # 전역: Tailwind 초기화, 폰트, 색상/글자크기 변수(:root)
├── styles/
│   ├── common.css          # 여러 페이지 공통 클래스 (page-container, eyebrow, filter-btn ...)
│   └── chartTheme.ts       # Recharts 그래프 공통 스타일 값
├── types/user.ts           # User, Page, CompanyType
├── api/                    # 백엔드 호출 (axios) — referenceData, scoreApi, matchingApi, interestApi, mypageApi, tradeSearchApi ...
├── components/
│   ├── common/             # PageHeader, AccessGuard, FilterButton
│   ├── layout/             # Header (+ Header.css)
│   └── auth/               # LoginModal, SignupModal (+ AuthModal.css)
└── pages/
    └── <page>/             # dashboard(=첫 화면 "내 매칭"), trade, insights(맞춤 인사이트 + 관심 국가 설정), matching-settings, my-matching(첫 화면 매칭 보드 · 상세 /:matchId , 더미), smart-matching(관리자 매칭 관리), admin, mypage(내 정보 + 고객센터 채팅 데모)
        ├── <Page>.tsx      # 페이지 본체 (상태 + 조립)
        ├── <Page>.css      # 이 페이지 전용 스타일
        ├── components/     # 페이지를 나눈 하위 컴포넌트
        └── *Data.ts        # ⚠️ 더미 데이터 — 백엔드 연결 시 교체할 곳
```

Styling rule: JSX에는 `className`만 쓰고, 스타일은 해당 폴더의 `.css` 파일에 작성합니다. 상태에 따른 스타일은 `is-active`, `is-selected` 같은 modifier 클래스로 처리합니다.

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.
