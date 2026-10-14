import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  searchUsers, toggleMemberRole, toggleMemberStatus,
  type AuthorizationDto, type UserSearchParams,
} from '../../api/authorizationApi';
import { ADMIN_REQUIRED_MESSAGE, type SystemUser, type UserRoleLabel, type UserStatus } from './adminData';

// 정렬 기준 : join = 가입순 , login = 최근 로그인 / 방향 : asc = 오름차순 , desc = 내림차순
export type UserSortField = 'join' | 'login';
export type SortDirection = 'asc' | 'desc';

// 적용된 필터 조건 (이름 · 이메일 검색어 / 역할 / 상태) — 표의 각 컬럼 위 필터 줄의 값
// [TS] 'all' | UserRoleLabel → '전체' 또는 '관리자' / '일반사용자'
interface UserFilter {
  name: string;
  email: string;
  role: 'all' | UserRoleLabel;
  status: 'all' | UserStatus;
}

const NO_FILTER: UserFilter = { name: '', email: '', role: 'all', status: 'all' };

// 화면 필터 + 정렬 + 페이지 → API 조건 (전체면 보내지 않음)
// 값이 undefined 인 조건은 axios 가 주소에 붙이지 않으므로 "조건 없음" 이 됨
// page : 화면은 1 부터 , 서버는 0 부터 세서 1 을 뺌 (화면 3페이지 → 서버 page=2)
function toParams(f: UserFilter, sort: UserSortField, dir: SortDirection, page: number): UserSearchParams {
  let roleName: string | undefined;            // 처음엔 undefined (= 전체)
  if (f.role === '관리자') roleName = 'ROLE_ADMIN';
  if (f.role === '일반사용자') roleName = 'ROLE_USER';

  let status: boolean | undefined;
  if (f.status === '활성') status = true;
  if (f.status === '비활성') status = false;

  // 검색어가 빈 글자('')면 || 오른쪽의 undefined (= 조건 없음)
  return { name: f.name || undefined, email: f.email || undefined, roleName, status, sort, dir, page: page - 1 };
}

// 백엔드 응답(AuthorizationDto) → 표 한 줄(SystemUser)
// (dto) => ({ ... }) : 객체를 바로 돌려주는 화살표 함수 (중괄호를 소괄호로 감싸야 객체로 인식)
const toSystemUser = (dto: AuthorizationDto): SystemUser => ({
  id: dto.memberId,
  name: dto.managerName,
  email: dto.userEmail,
  role: dto.roleName === 'ROLE_ADMIN' ? '관리자' : '일반사용자',
  lastLogin: dto.lastLoginAt ?? '-',
  status: dto.status ? '활성' : '비활성',
});

// "사용자 권한 관리" 탭의 상태와 동작
// - 필터는 표 머리글 아래 필터 줄에 각 컬럼마다 (매칭 관리와 같은 모양)
//     이름 · 이메일 검색칸 : 작은 [검색] 버튼 / Enter 로 적용 , 역할 · 상태 선택칸 · 정렬 버튼 : 고르면 바로 적용
// - 한 번에 50명씩 (페이징 — 감사 로그와 같은 방식) , 지금 페이지 번호는 주소에 저장 : /admin/users?page=3
// - 최근 로그인 정렬도 DB 에서 정렬해서 받아옴 (누르면 바로 1 페이지부터 다시 조회)
//     → 화면에서 정렬하면 "이번 페이지 50명 안에서만" 정렬되어 전체 순서가 틀려서
//     기본은 가입순 내림차순 (= 최근 가입한 회원부터)
// - 표 맨 왼쪽 번호는 화면에 보이는 순서 (정렬 · 필터가 바뀌어도 첫 줄은 항상 1 , 2 페이지는 51 부터)
// (부모 SystemAdmin 에서 호출해서, 탭을 바꿔도 값이 유지되도록 함)
// active : 지금 이 탭이 열려 있는지 — 감사 로그 탭도 같은 ?page= 를 쓰기 때문에 , 열려 있을 때만 주소의 페이지를 따름
//          (감사 로그 탭에서 ?page=12 를 보는 중이면 사용자 목록은 1 페이지로 둠)
// 커스텀 훅 = useState 묶음 함수 (가이드 3-1). 맨 아래 return 객체를 UserManagement 탭이 받아서 씀
export default function useUserManagement(active: boolean) {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [summary, setSummary] = useState({ all: 0, active: 0, inactive: 0 });   // 요약 카드 (전체 기준)
  const [totalCount, setTotalCount] = useState(0);                              // 필터에 맞는 전체 인원 ("N명")
  const [totalPages, setTotalPages] = useState(0);                              // 전체 페이지 수 (페이지 버튼 개수)
  const [pageSize, setPageSize] = useState(50);                                 // 한 페이지 인원 (서버가 알려 준 값 — 줄 번호 계산용)
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);                    // 변경 요청 중인 회원 (중복 클릭 방지)

  // 지금 페이지 = 주소의 ?page= 값 (1 부터 , 없거나 이상한 값이면 1) — 이 탭이 열려 있을 때만 (위 active 설명)
  // 예) /admin/users?page=3 → searchParams.get('page') = '3' (글자) → Number 로 숫자 3 , Number('abc') = NaN → || 1
  const [searchParams, setSearchParams] = useSearchParams();
  const page = active ? Math.max(1, Number(searchParams.get('page')) || 1) : 1;

  // 필터 줄 : 열림 여부 , 검색칸에 입력 중인 글자 , 적용된 조건(서버에 보내는 값)
  const [filterOpen, setFilterOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [applied, setApplied] = useState<UserFilter>(NO_FILTER);
  // 정렬 (누르면 바로 적용) — 기본 : 가입순 내림차순
  const [sortField, setSortField] = useState<UserSortField>('join');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  // 가장 최근 요청의 취소 도구를 기억 (useRef = 화면을 다시 그리지 않는 변수 — 가이드 3-2)
  const lastRequest = useRef<AbortController | null>(null);

  // DB 에서 그 페이지만 조회 (GET /api/authorization) — 이전 요청이 아직 진행 중이면 취소하고 마지막 요청 결과만 사용
  // (페이지 번호 · 정렬을 빠르게 여러 번 누르면 늦게 도착한 이전 결과가 화면을 덮어쓰는 것을 막음 — 감사 로그와 같음)
  // useCallback : 함수를 기억해 두는 훅 — 아래 useEffect 의존성 배열에 넣기 위해 사용 (가이드 3-3)
  const load = useCallback(async (filter: UserFilter, field: UserSortField, dir: SortDirection, pageToLoad: number) => {
    lastRequest.current?.abort();               // 1. 진행 중인 이전 요청 취소
    const controller = new AbortController();   // 2. 이번 요청용 취소 도구를 새로 만들어 기억
    lastRequest.current = controller;
    setLoading(true);
    setLoadError('');
    try {
      const data = await searchUsers(toParams(filter, field, dir, pageToLoad), controller.signal);
      // 관리자가 아니면 서버가 null 을 돌려줌 → 응답이 비어 있음 (axios 는 빈 응답을 '' 로 줌 → !data 로 확인)
      if (!data) {
        setUsers([]);
        setTotalCount(0);
        setTotalPages(0);
        setLoadError(ADMIN_REQUIRED_MESSAGE);
        return;
      }
      // 3. 이번 페이지 목록(표 한 줄 모양으로 변환) + 요약 카드 + 페이지 숫자 저장
      setUsers(data.members.map(toSystemUser));
      setSummary({ all: data.allUser, active: data.activate, inactive: data.deactivate });
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
      setPageSize(data.size);
    } catch (error) {
      if (controller.signal.aborted) return;   // 취소된 요청이면 무시
      console.log('사용자 목록 조회 실패 : ', error);
      setUsers([]);
      setTotalCount(0);
      setTotalPages(0);
      setLoadError('사용자 목록을 불러오지 못했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // 적용된 필터 · 정렬 · 페이지가 바뀔 때마다 그 페이지를 다시 조회 (화면에 처음 들어올 때도 실행)
  // 화면을 떠나거나 다음 조회가 시작되면 진행 중인 요청 취소 (가이드 3-4)
  useEffect(() => {
    load(applied, sortField, sortDir, page);
    return () => lastRequest.current?.abort();
  }, [load, applied, sortField, sortDir, page]);

  // 페이지 이동 = 주소의 ?page= 만 바꿈 → page 가 바뀌어서 위 useEffect 가 그 페이지를 조회 (감사 로그와 같음)
  // 1 페이지는 ?page=1 을 붙이지 않고 깔끔하게 /admin/users 로 , replace : true 면 뒤로 가기 기록에 남기지 않음
  const goToPage = useCallback((nextPage: number, replace = false) => {
    if (nextPage === page) return;   // 이미 그 페이지면 주소를 바꾸지 않음
    setSearchParams(nextPage <= 1 ? {} : { page: String(nextPage) }, { replace });
  }, [page, setSearchParams]);

  // 마지막 페이지보다 큰 번호면 마지막 페이지로 (예: ?page=99 를 직접 입력 , 필터 때문에 페이지 수가 줄어듦)
  // 이 탭이 열려 있을 때만 (닫혀 있을 때 주소를 바꾸면 감사 로그 탭의 페이지가 바뀌어 버림)
  useEffect(() => {
    if (active && totalPages > 0 && page > totalPages) goToPage(totalPages, true);
  }, [active, page, totalPages, goToPage]);

  // [검색] 버튼 / Enter : 이름 · 이메일 검색칸에 입력한 글자를 한꺼번에 적용 + 1 페이지로
  // { ...applied , name , email } : 지금 조건(역할 · 상태)은 그대로 두고 검색어만 바꾼 새 객체 → 위 useEffect 가 다시 조회
  const search = () => {
    setApplied({ ...applied, name: nameInput.trim(), email: emailInput.trim() });
    goToPage(1);
  };

  // 역할 · 상태 선택칸 : 고르면 바로 적용 + 1 페이지로
  const changeRoleFilter = (role: 'all' | UserRoleLabel) => {
    setApplied({ ...applied, role });
    goToPage(1);
  };

  const changeStatusFilter = (status: 'all' | UserStatus) => {
    setApplied({ ...applied, status });
    goToPage(1);
  };

  // [필터 초기화] : 조건 · 검색칸 비우고 기본 정렬(가입순 내림차순)로 1 페이지 전체 다시 조회
  const resetFilters = () => {
    setNameInput('');
    setEmailInput('');
    setSortField('join');
    setSortDir('desc');
    setApplied({ ...NO_FILTER });   // { ...NO_FILTER } : 복사본(새 객체) → 같은 조건이어도 useEffect 가 다시 조회
    goToPage(1);
  };

  // 최근 로그인 정렬 버튼 : 누를 때마다 정렬 안 함(기본 = 최근 가입순) → 최신순 ↓ → 오래된순 ↑ → 다시 정렬 안 함
  // 정렬이 바뀌면 위 useEffect 가 DB 에서 다시 조회 , 1 페이지부터
  // (가입순 정렬 버튼은 화면에서 뺐고 , 서버에서는 기본 순서로만 씀)
  const toggleLoginSort = () => {
    if (sortField !== 'login') {
      setSortField('login');
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortDir('asc');
    } else {
      setSortField('join');
      setSortDir('desc');
    }
    goToPage(1);
  };

  // 권한 스위치 (관리자 ↔ 일반사용자) — 성공하면 화면 값만 바꿈 (다시 조회 X)
  const toggleRole = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const ok = await toggleMemberRole(id);
      // 실패 이유 : 내 계정을 바꾸려 했거나 , 쿠키가 만료되어 관리자 확인이 안 된 경우 (\n = 알림창 줄바꿈)
      if (!ok) { alert('권한을 변경하지 못했습니다.\n(내 계정의 권한은 바꿀 수 없습니다. 로그인한 지 오래되었다면 다시 로그인해 주세요.)'); return; }
      // 목록을 새로 만들면서 해당 회원(id 가 같은 줄)의 역할만 반대로 바꿈
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: u.role === '관리자' ? '일반사용자' : '관리자' } : u)));
    } catch (error) {
      console.log('권한 변경 실패 : ', error);
      alert('권한 변경 요청에 실패했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
    } finally {
      setBusyId(null);
    }
  };

  // 상태 스위치 (활성 ↔ 비활성) — 성공하면 화면 값과 요약 카드 숫자만 바꿈
  const changeStatus = async (id: string, status: UserStatus) => {
    const current = users.find((u) => u.id === id);
    if (busyId || !current || current.status === status) return;   // 요청 중이거나 같은 값이면 무시
    setBusyId(id);
    try {
      const ok = await toggleMemberStatus(id);
      if (!ok) { alert('상태를 변경하지 못했습니다.\n(내 계정의 상태는 바꿀 수 없습니다. 로그인한 지 오래되었다면 다시 로그인해 주세요.)'); return; }
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
      // 요약 카드 숫자 : 활성으로 바꿨으면 활성 +1 / 비활성 -1 , 반대면 반대로
      setSummary((s) => (status === '활성'
        ? { ...s, active: s.active + 1, inactive: s.inactive - 1 }
        : { ...s, active: s.active - 1, inactive: s.inactive + 1 }));
    } catch (error) {
      console.log('상태 변경 실패 : ', error);
      alert('상태 변경 요청에 실패했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
    } finally {
      setBusyId(null);
    }
  };

  // 적용된 필터가 있거나 정렬이 기본(가입순 내림차순)과 다르면 true → [필터 초기화] 버튼 보이기
  const filtersActive = applied.name !== '' || applied.email !== '' || applied.role !== 'all' || applied.status !== 'all'
    || sortField !== 'join' || sortDir !== 'desc';

  return {
    users, summary, totalCount, totalPages, page, pageSize, goToPage, loading, loadError, busyId, toggleRole, changeStatus,
    filterOpen, setFilterOpen, nameInput, setNameInput, emailInput, setEmailInput, search,
    roleFilter: applied.role, statusFilter: applied.status, changeRoleFilter, changeStatusFilter,
    sortField, sortDir, toggleLoginSort, filtersActive, resetFilters,
  };
}

// [TS] ReturnType<typeof useUserManagement> = 위 return 객체의 모양 → UserManagement 탭의 props 타입 (가이드 2-8)
export type UserManagementState = ReturnType<typeof useUserManagement>;
