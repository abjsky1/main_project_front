# MACROSS 프론트 코드 읽기 가이드

> B_react에서 공부한 리액트(JSX) 지식을 기준으로, 이 프로젝트에만 나오는 문법과 패턴을 정리한 문서입니다.
> 코드 주석에 `[TS]`나 `가이드 2-3` 같은 표시가 있으면 이 문서의 해당 번호를 보면 됩니다.

---

## 1. 폴더 구조와 데이터 흐름

```
main.tsx            ← 시작점. <BrowserRouter>로 App을 감쌈 (B_react 의 main.jsx 와 같은 역할)
 └─ App.tsx         ← 로그인 상태(user) 보관 + <Routes> 로 주소별 페이지 연결
     ├─ components/layout/Header.tsx   ← 상단 메뉴 (모든 페이지 공통)
     └─ pages/<페이지>/<Page>.tsx       ← 주소에 맞는 페이지 1개
          ├─ components/*.tsx            ← 페이지를 잘게 나눈 하위 컴포넌트
          ├─ use*.ts                     ← 커스텀 훅 (페이지의 useState 묶음, 가이드 3-1)
          └─ *Api.ts / api/*.ts          ← axios 로 Spring 서버 호출
```

| 주소 | 페이지 파일 | 하는 일 |
|---|---|---|
| `/` | `pages/dashboard/Dashboard.tsx` | 누적 무역 카드, 월별 차트, 맞춤 인사이트 |
| `/trade` | `pages/trade/TradeAnalysis.tsx` | 조건 검색 탭 + 환율 탭 (현재 더미 데이터) |
| `/matching-settings` | `pages/matching-settings/MatchingSettings.tsx` | 회원이 매칭 조건 등록/삭제 |
| `/matching` | `pages/smart-matching/SmartMatching.tsx` | 관리자가 매칭 결과 승인/반려 |
| `/admin` | `pages/admin/SystemAdmin.tsx` | 관리자: 사용자 권한 관리 + 감사 로그 |

**서버 호출 흐름 예시 (매칭 조건 목록):**

```
MatchingSettings.tsx
  → conditionApi.ts 의 loadShipperRows()        (여러 API 결과를 표 한 줄로 합침)
    → api/scoreApi.ts 의 getCscore1List()        (axios.get('/api/cscore'))
      → vite 프록시가 /api 요청을 http://localhost:8080 (Spring) 으로 전달
```

`/api`, `/country`, `/route` 로 시작하는 주소는 vite 프록시가 Spring 으로 넘기기 때문에, 페이지 주소로 쓰면 안 됩니다.

---

## 2. TypeScript 문법 치트시트

TypeScript(TS) = **JavaScript + "이 값은 어떤 모양이다"라는 표시(타입)**.
타입은 화면 결과에 아무 영향이 없고, 빌드할 때 지워집니다. 잘못된 값을 넘기면 **실행 전에** 빨간 줄로 알려주는 용도입니다.
그래서 읽을 때는 **타입 부분을 머릿속에서 지우고 읽으면 B_react 코드와 똑같습니다.**

### 2-1. 변수/매개변수 뒤의 `: 타입`

```ts
// TS
function formatAmount(value: number): string { ... }
// JS 로 보면
function formatAmount(value) { ... }
```

`value: number` = "value 에는 숫자가 들어온다", `): string` = "이 함수는 문자열을 돌려준다".

### 2-2. `interface` / `type` — 객체 모양 설계도

```ts
interface User {
  name: string;          // 꼭 있어야 하는 값
  memberId?: string;     // ? = 없어도 되는 값 (undefined 일 수 있음)
}
```

B_react 의 `currentUser.mname`, `currentUser.role` 처럼 객체에 어떤 칸이 있는지 미리 적어둔 것입니다.
`type` 도 같은 용도이고, 아래처럼 "이 값들 중 하나"를 표현할 때 주로 씁니다.

### 2-3. `|` — "이것 또는 저것"

```ts
type Page = 'dashboard' | 'trade' | 'admin';   // 이 3개 문자열만 허용
const [trade, setTrade] = useState<TradestatusResponse | null>(null);  // 객체 또는 null
```

### 2-4. 컴포넌트 props 타입

```tsx
// TS
interface StatCardProps { label: string; value: string; }
export default function StatCard({ label, value }: StatCardProps) { ... }

// B_react 스타일 JS
export default function StatCard({ label, value }) { ... }
```

### 2-5. `useState<타입>(초기값)` — 꺾쇠 `< >` (제네릭)

```ts
const [users, setUsers] = useState<SystemUser[]>([]);   // "SystemUser 객체 배열을 담는 state"
const response = await axios.get<AuditDto[]>('/api/audit');  // "응답 data 는 AuditDto 배열"
```

`< >` 안의 내용은 "무엇을 담는지" 알려주는 표시일 뿐, 동작은 `useState([])`, `axios.get(url)` 과 같습니다.
`function getX<T>(...)` 처럼 함수에 붙으면 "여러 타입에 재사용 가능한 함수"라는 뜻입니다(`routeUtils.ts`).

### 2-6. `as` / `!` — "내가 보장할게" 표시

```ts
e.target.value as PortType   // "이 문자열은 PortType 중 하나야" (값은 그대로)
key={s.val!}                 // "null 이 아니야" (값은 그대로)
```

### 2-7. `as const` — 배열/객체를 "고정된 값"으로

```ts
const CARGO_SWITCHES = [{ key: 'hazmat', label: '위험물' }] as const;
```

`key` 가 그냥 문자열이 아니라 정확히 `'hazmat'` 이라고 기억시켜서, `form[key]` 처럼 써도 안전하게 만듭니다.

### 2-8. 자주 나오는 도우미 타입

| 문법 | 뜻 | 예시 |
|---|---|---|
| `Record<K, V>` | 키가 K, 값이 V 인 객체 | `Record<string, string>` = `{ '관리자': '관리자', ... }` |
| `Omit<T, 'id'>` | T 에서 id 칸만 뺀 모양 | 입력폼 = 저장된 조건에서 id 를 뺀 것 |
| `Pick<T, 'a' \| 'b'>` | T 에서 a, b 칸만 고른 모양 | |
| `ReturnType<typeof 함수>` | 그 함수가 돌려주는 값의 모양 | `ReturnType<typeof useAuditLogs>` = 훅이 return 하는 객체 모양 |
| `ReactNode` | JSX 로 그릴 수 있는 모든 것 (글자, 태그, `<>...</>`) | PageHeader 의 `title` |
| `React.FormEvent` | form 의 onSubmit 이벤트 `e` | `handleSubmit(e: React.FormEvent)` |
| `CSSProperties` | `style={{ }}` 객체 | |
| `any` | 아무 타입이나 (검사 안 함) | 그래프 라이브러리 콜백 |

### 2-9. `import type`

```ts
import type { User } from '../../types/user';
```

타입만 가져올 때 쓰는 import 입니다. 빌드 결과에서는 사라집니다.

---

## 3. 이 프로젝트의 리액트 패턴

### 3-1. 커스텀 훅 (`useTradeSearch`, `useAuditLogs`, `useUserManagement`)

커스텀 훅 = **useState / useEffect 묶음을 따로 뺀 평범한 함수**. 이름이 `use` 로 시작해야 합니다.

```ts
// useTradeSearch.ts
export default function useTradeSearch() {
  const [country, setCountry] = useState('전체');
  ...
  return { country, setCountry, ... };   // 필요한 값과 함수를 객체로 돌려줌
}

// TradeAnalysis.tsx (부모)
const search = useTradeSearch();          // state 가 부모에 생김
<TradeSearchTab search={search} />        // 자식 탭에 통째로 전달
```

**왜 이렇게 했나:** 탭 컴포넌트는 탭을 바꾸면 화면에서 사라졌다가(언마운트) 다시 생깁니다. state 를 탭 안에 두면 입력한 검색 조건이 초기화되므로, **부모에서 훅을 호출해 state 를 부모에 보관**한 것입니다.
B_react 식으로 쓰면 `useState` 10여 개를 부모에 쓰고 props 로 하나씩 내려주는 것과 같습니다.

### 3-2. `useRef` 의 두 가지 용도

1. **DOM 잡기** (B_react `UseRefExam2` 와 같음): `const ref = useRef<HTMLDivElement>(null); <div ref={ref}>` → 드롭다운 바깥 클릭 감지에 사용
2. **화면을 다시 그리지 않는 값 보관** (B_react `UseRefExam1` 의 refNum): `saving.current = true` → 저장 버튼 중복 클릭 방지, `mounted.current` → 페이지를 떠났는지 확인

### 3-3. `useCallback`

```ts
const load = useCallback(async (filter) => { ... }, []);
```

함수를 매번 새로 만들지 않고 **기억해 두는** 훅입니다(`useMemo` 의 함수 버전).
이 함수를 `useEffect` 의존성 배열에 넣었을 때, 렌더링마다 effect 가 다시 실행되는 것을 막으려고 씁니다.
읽을 때는 `const load = async (filter) => { ... }` 와 같다고 보면 됩니다.

### 3-4. `AbortController` / `ignore` 플래그 — 늦게 도착한 응답 무시

서버 요청 중에 페이지를 떠나거나 조건을 바꾸면, 이전 요청의 응답이 늦게 도착해서 화면을 덮어쓸 수 있습니다. 이를 막는 두 가지 방법이 쓰였습니다.

```ts
// 방법 1: ignore 플래그 (Dashboard, TradeTrendChart)
useEffect(() => {
  let ignore = false;
  async function fetchTrade() {
    const { data } = await axios.get(...);
    if (!ignore) setTrade(data);     // 이미 떠났으면 저장하지 않음
  }
  fetchTrade();
  return () => { ignore = true; };  // 정리 함수: 페이지를 떠날 때 실행 (B_react Lifecycle 의 언마운트)
}, []);

// 방법 2: AbortController (나머지 페이지) — 요청 자체를 취소
useEffect(() => {
  const controller = new AbortController();
  axios.get(url, { signal: controller.signal });   // 이 요청에 취소 버튼을 연결
  return () => controller.abort();                 // 떠날 때 취소 버튼 누름
}, []);
```

개발 모드의 `<React.StrictMode>` 는 버그를 찾으려고 **useEffect 를 일부러 2번 실행**합니다. 위 정리 함수가 있어서 첫 번째 요청은 취소되고 두 번째 결과만 화면에 쓰입니다.

### 3-5. `Promise.all` — 여러 요청을 동시에

```ts
const [countryRows, routeRows] = await Promise.all([fetchCountries(), fetchRoutes()]);
```

`await` 를 두 줄로 쓰면 하나가 끝나야 다음이 시작되지만, `Promise.all` 은 **동시에 보내고 둘 다 끝날 때까지 기다립니다.** 결과는 넣은 순서대로 배열로 받습니다.

### 3-6. 드롭다운 바깥 클릭 감지 (`CountrySelect`, `PortSelect`)

```ts
useEffect(() => {
  const handleOutsideClick = (e) => {
    if (ref.current && !ref.current.contains(e.target)) setOpen(false); // 내 영역 밖을 눌렀으면 닫기
  };
  document.addEventListener('mousedown', handleOutsideClick);           // 화면 전체에 클릭 감시 등록
  return () => document.removeEventListener('mousedown', handleOutsideClick); // 떠날 때 해제
}, []);
```

### 3-7. 상태에 따른 CSS 클래스

```tsx
<button className={active ? 'filter-btn is-active' : 'filter-btn'}>
```

스타일은 모두 `.css` 파일에 있고, JSX 에서는 상태에 따라 `is-active`, `is-selected` 같은 클래스만 붙였다 뗍니다.

---

## 4. 자주 나오는 JavaScript 문법

| 문법 | 뜻 | 예시 |
|---|---|---|
| `arr.filter(x => 조건)` | 조건이 true 인 것만 남긴 새 배열 | `matches.filter((m) => m.finalStatus === 'failed')` |
| `arr.find(x => 조건)` | 조건에 맞는 첫 번째 1개 (없으면 undefined) | `countries.find((c) => c.countryId === id)` |
| `arr.some(x => 조건)` | 하나라도 맞으면 true | |
| `arr.includes(값)` | 값이 들어 있으면 true | |
| `arr.sort((a, b) => ...)` | 정렬 (음수면 a 먼저, 양수면 b 먼저) | `a.localeCompare(b, 'ko')` = 가나다순 |
| `arr.slice(0, 3)` | 앞에서 3개만 잘라낸 새 배열 | |
| `arr.join(', ')` | 배열을 `,` 로 이어 붙인 문자열 | |
| `const { a, b } = obj` | 객체 구조분해 | `const { request, offer } = match` |
| `const [a, b] = arr` | 배열 구조분해 | `useState` 와 같은 문법 |
| `const [a, ...rest] = arr` | 첫 번째는 a, 나머지는 rest 배열로 | CSV 한 줄 나누기 |
| `{ ...obj, key: 값 }` | 객체 복사 + 일부만 변경 | B_react `setForm({ ...form, name })` 과 같음 |
| `{ [key]: 값 }` | 변수 key 의 **값**을 칸 이름으로 사용 | `{ ...form, [key]: val }` |
| `` `${a}님` `` | 템플릿 문자열 | |
| `a ?? b` | a 가 null/undefined 면 b | |
| `a?.b` | a 가 없으면 에러 대신 undefined | |
| `!!값` | 값을 true/false 로 바꿈 (`''`, `0`, `null` → false) | `!!referenceError` |
| `void 함수()` | "결과(Promise)를 기다리지 않는다"는 표시. 동작은 `함수()` 와 같음 | |
| `throw new Error('메시지')` | 오류를 던져서 가장 가까운 `catch` 로 이동 | 입력값 검사 |
| `/^\d{4}$/.test(값)` | 정규식: 값이 패턴에 맞는지 검사 | 날짜 형식 검사 |

---

## 5. 새 페이지 추가하는 법

1. `src/types/user.ts` 의 `Page` 타입에 이름 추가 (예: `| 'notice'`)
2. `src/routes.ts` 의 `PAGE_PATHS` 에 주소 추가 (예: `notice: '/notice'`)
3. `src/pages/notice/Notice.tsx` 와 `Notice.css` 만들기
4. `src/App.tsx` 의 `<Routes>` 안에 `<Route path={PAGE_PATHS.notice} element={<Notice />} />` 추가
5. 메뉴에 보이게 하려면 `src/components/layout/Header.tsx` 의 `ALL_NAV_ITEMS` 에 추가
