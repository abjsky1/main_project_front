import { useCallback, useEffect, useState } from 'react';
import {
  searchUsers, toggleMemberRole, toggleMemberStatus,
  type AuthorizationDto, type UserSearchParams,
} from '../../api/authorizationApi';
import type { SystemUser, UserRoleLabel, UserStatus } from './adminData';

export type LoginSort = 'asc' | 'desc' | null;

// 필터 조건 (역할 / 상태)
// [TS] 'all' | UserRoleLabel → '전체' 또는 '관리자' / '일반사용자'
interface UserFilter {
  role: 'all' | UserRoleLabel;
  status: 'all' | UserStatus;
}

const NO_FILTER: UserFilter = { role: 'all', status: 'all' };

// 화면 필터 → API 조건 (전체면 보내지 않음)
// 값이 undefined 인 조건은 axios 가 주소에 붙이지 않으므로 "조건 없음" 이 됨
function toParams(f: UserFilter): UserSearchParams {
  let roleName: string | undefined;            // 처음엔 undefined (= 전체)
  if (f.role === '관리자') roleName = 'ROLE_ADMIN';
  if (f.role === '일반사용자') roleName = 'ROLE_USER';

  let status: boolean | undefined;
  if (f.status === '활성') status = true;
  if (f.status === '비활성') status = false;

  return { roleName, status };
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
// - 필터(역할/상태)는 [검색] 버튼을 눌렀을 때 DB 에서 다시 조회
// - 최근 로그인 정렬은 받아온 목록을 화면에서만 정렬 (DB 재조회 X)
// (부모 SystemAdmin 에서 호출해서, 탭을 바꿔도 값이 유지되도록 함)
// 커스텀 훅 = useState 묶음 함수 (가이드 3-1). 맨 아래 return 객체를 UserManagement 탭이 받아서 씀
export default function useUserManagement() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [summary, setSummary] = useState({ all: 0, active: 0, inactive: 0 });   // 요약 카드 (전체 기준)
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);                    // 변경 요청 중인 회원 (중복 클릭 방지)

  // 필터 패널에서 고르는 중인 값
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<'all' | UserRoleLabel>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | UserStatus>('all');
  // 마지막으로 [검색]해서 적용된 값
  const [applied, setApplied] = useState<UserFilter>(NO_FILTER);
  const [loginSort, setLoginSort] = useState<LoginSort>(null);

  // DB 에서 목록 조회 (GET /api/authorization)
  // useCallback : 함수를 기억해 두는 훅 — 아래 useEffect 의존성 배열에 넣기 위해 사용 (가이드 3-3)
  const load = useCallback(async (filter: UserFilter, signal?: AbortSignal) => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await searchUsers(toParams(filter), signal);
      setUsers(data.members.map(toSystemUser));   // 응답 목록을 표 한 줄 모양으로 변환
      setSummary({ all: data.allUser, active: data.activate, inactive: data.deactivate });
    } catch (error) {
      if (signal?.aborted) return;   // 페이지를 떠나서 취소된 요청이면 무시
      console.log('사용자 목록 조회 실패 : ', error);
      setUsers([]);
      setLoadError('사용자 목록을 불러오지 못했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  // 화면에 처음 들어올 때 전체 조회 (페이지를 떠나면 진행 중인 요청 취소 — 가이드 3-4)
  useEffect(() => {
    const controller = new AbortController();
    load(NO_FILTER, controller.signal);
    return () => controller.abort();
  }, [load]);

  // [검색] : 고른 필터를 적용해서 DB 에서 다시 조회
  const search = () => {
    const filter: UserFilter = { role: filterRole, status: filterStatus };
    setApplied(filter);
    load(filter);
  };

  // [필터 초기화] : 조건 비우고 전체 다시 조회
  const resetFilters = () => {
    setFilterRole('all');
    setFilterStatus('all');
    setLoginSort(null);
    setApplied(NO_FILTER);
    load(NO_FILTER);
  };

  // 권한 스위치 (관리자 ↔ 일반사용자) — 성공하면 화면 값만 바꿈 (다시 조회 X)
  const toggleRole = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const ok = await toggleMemberRole(id);
      if (!ok) { alert('권한을 변경하지 못했습니다.'); return; }
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
      if (!ok) { alert('상태를 변경하지 못했습니다.'); return; }
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

  // 최근 로그인 정렬 (화면에서만)
  // [...users] 로 복사본을 만들어 정렬 (sort 는 원본 배열을 바꾸기 때문에 state 원본은 그대로 둠)
  // localeCompare : 글자 비교 ('2025-12-01' 형식이라 글자 순서 = 날짜 순서)
  let sortedUsers = users;
  if (loginSort === 'asc') sortedUsers = [...users].sort((a, b) => a.lastLogin.localeCompare(b.lastLogin));
  if (loginSort === 'desc') sortedUsers = [...users].sort((a, b) => b.lastLogin.localeCompare(a.lastLogin));

  // 적용된 필터/정렬이 있으면 true → [필터 초기화] 버튼 보이기
  const filtersActive = applied.role !== 'all' || applied.status !== 'all' || loginSort !== null;

  return {
    users: sortedUsers, summary, loading, loadError, busyId, toggleRole, changeStatus,
    filterOpen, setFilterOpen, filterRole, setFilterRole, filterStatus, setFilterStatus,
    loginSort, setLoginSort, filtersActive, search, resetFilters,
  };
}

// [TS] ReturnType<typeof useUserManagement> = 위 return 객체의 모양 → UserManagement 탭의 props 타입 (가이드 2-8)
export type UserManagementState = ReturnType<typeof useUserManagement>;
