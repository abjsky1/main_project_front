import type { KeyboardEvent } from 'react';
import FilterButton from '../../../components/common/FilterButton';
import Pagination from '../../../components/common/Pagination';
import type { UserRoleLabel, UserStatus } from '../adminData';
import type { UserManagementState } from '../useUserManagement';

interface UserManagementProps {
  state: UserManagementState;
  currentMemberId?: string;   // 로그인한 관리자 본인 (본인 권한/상태는 바꿀 수 없게)
}

// "사용자 권한 관리" 탭
// 한 페이지에 50명씩 , 표 아래 페이지 번호 버튼 (Pagination — 감사 로그와 같은 공통 컴포넌트)
// 필터 : [필터] 버튼을 누르면 표 머리글 바로 아래에 필터 줄 — 각 조건이 해당 컬럼 위에 (매칭 관리와 같은 모양)
export default function UserManagement({ state, currentMemberId }: UserManagementProps) {
  // state = useUserManagement() 가 돌려준 객체 → 필요한 값/함수를 구조분해로 꺼냄
  const {
    users, summary, totalCount, totalPages, page, pageSize, goToPage, loading, loadError, busyId, toggleRole, changeStatus,
    filterOpen, setFilterOpen, nameInput, setNameInput, emailInput, setEmailInput, search,
    roleFilter, statusFilter, changeRoleFilter, changeStatusFilter,
    sortField, sortDir, toggleLoginSort, filtersActive, resetFilters,
  } = state;

  // 검색칸에서 Enter = [검색]
  const searchOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') search();
  };

  // 최근 로그인 정렬 버튼 글자 : 정렬 안 함 → "정렬 ↕" , 최신순 → "최신순 ↓" , 오래된순 → "오래된순 ↑"
  const loginSorted = sortField === 'login';
  let loginSortLabel = '정렬 ↕';
  if (loginSorted) loginSortLabel = sortDir === 'desc' ? '최신순 ↓' : '오래된순 ↑';

  // 표가 비었을 때 안내 문구
  const emptyMessage = loading ? '사용자 목록을 불러오는 중입니다...' : loadError || '해당 조건의 사용자가 없습니다.';

  // 페이지 번호를 누르면 : 그 페이지로 + 화면 맨 위로 (감사 로그와 같음)
  const changePage = (nextPage: number) => {
    goToPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      {/* 요약 카드 (필터와 상관없이 전체 기준) */}
      <div className="admin-summary">
        <div className="admin-summary__card">
          <p className="admin-summary__value">{summary.all}</p>
          <p className="admin-summary__label">전체 사용자</p>
        </div>
        <div className="admin-summary__card">
          <p className="admin-summary__value admin-summary__value--active">{summary.active}</p>
          <p className="admin-summary__label">활성 사용자</p>
        </div>
        <div className="admin-summary__card">
          <p className="admin-summary__value admin-summary__value--inactive">{summary.inactive}</p>
          <p className="admin-summary__label">비활성</p>
        </div>
      </div>

      {/* 목록 제목 + 필터 버튼 */}
      <div className="admin-list-bar">
        <div className="admin-list-bar__left">
          <p className="eyebrow">사용자 목록</p>
          {/* 이번 페이지 인원(최대 50)이 아니라 필터에 맞는 전체 인원 */}
          <span className="admin-count">{totalCount.toLocaleString()}명</span>
          {totalPages > 1 && <span className="admin-page-info">{page} / {totalPages} 페이지</span>}
        </div>
        <div className="admin-list-bar__right">
          {filtersActive && <button onClick={resetFilters} className="filter-reset-btn">필터 초기화</button>}
          <FilterButton active={filterOpen} onClick={() => setFilterOpen(!filterOpen)} />
        </div>
      </div>

      {/* 사용자 표 */}
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--users">
          <thead>
            <tr>
              {['번호', '이름', '이메일', '역할'].map((h) => <th key={h}>{h}</th>)}
              {/* 최근 로그인으로 정렬 중이면 머리글 옆에 방향 표시 */}
              <th>최근 로그인{loginSorted && (sortDir === 'desc' ? ' ↓' : ' ↑')}</th>
              <th>상태</th>
              <th>권한 관리</th>
            </tr>

            {/* 필터 줄 — 각 조건이 바로 위 컬럼에 대한 것
                이름 · 이메일은 [검색] 버튼 / Enter 로 적용 (둘 중 어느 버튼을 눌러도 둘 다 적용) , 선택칸 · 정렬 버튼은 바로 적용 */}
            {filterOpen && (
              <tr className="col-filter-row">
                {/* 번호 : 화면 순서라서 거를 조건이 없음 */}
                <th />
                <th>
                  <div className="col-search">
                    <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={searchOnEnter} placeholder="이름" className="col-filter-input" />
                    <button onClick={search} className="col-search__btn">검색</button>
                  </div>
                </th>
                <th>
                  <div className="col-search">
                    <input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={searchOnEnter} placeholder="이메일" className="col-filter-input" />
                    <button onClick={search} className="col-search__btn">검색</button>
                  </div>
                </th>
                <th>
                  {/* [TS] as 'all' | UserRoleLabel : 고른 값이 이 글자들 중 하나라는 표시 (값은 그대로 — 가이드 2-6) */}
                  <select
                    value={roleFilter}
                    onChange={(e) => changeRoleFilter(e.target.value as 'all' | UserRoleLabel)}
                    className={roleFilter === 'all' ? 'col-filter-select' : 'col-filter-select has-value'}
                  >
                    <option value="all">전체</option>
                    <option value="관리자">관리자</option>
                    <option value="일반사용자">일반사용자</option>
                  </select>
                </th>
                <th>
                  {/* 누를 때마다 정렬 안 함 → 최신순 → 오래된순 → 정렬 안 함 */}
                  <button onClick={toggleLoginSort} className={loginSorted ? 'col-sort-btn is-active' : 'col-sort-btn'}>
                    {loginSortLabel}
                  </button>
                </th>
                <th>
                  <select
                    value={statusFilter}
                    onChange={(e) => changeStatusFilter(e.target.value as 'all' | UserStatus)}
                    className={statusFilter === 'all' ? 'col-filter-select' : 'col-filter-select has-value'}
                  >
                    <option value="all">전체</option>
                    <option value="활성">활성</option>
                    <option value="비활성">비활성</option>
                  </select>
                </th>
                {/* 권한 관리 : 거를 조건 없음 */}
                <th />
              </tr>
            )}
          </thead>
          <tbody>
            {users.map((u, index) => {
              const isAdmin = u.role === '관리자';
              // 스위치 잠금 : 로그인한 관리자 본인의 줄이거나, 다른 회원의 변경 요청이 진행 중일 때
              const locked = u.id === currentMemberId || busyId !== null;   // 본인 행 , 다른 변경 요청 중
              return (
                <tr key={u.id} className="user-row">
                  {/* 화면에 보이는 순서 번호 (첫 줄 = 1 , 2 페이지 첫 줄 = 51) */}
                  <td className="cell-no">{(page - 1) * pageSize + index + 1}</td>
                  <td>
                    <div className="user-name">
                      <div className={isAdmin ? 'user-name__avatar is-admin' : 'user-name__avatar'}>{u.name.charAt(0)}</div>
                      <span className="user-name__text">{u.name}</span>
                    </div>
                  </td>
                  <td className="cell-mono">{u.email}</td>
                  <td>
                    <span className={isAdmin ? 'role-badge is-admin' : 'role-badge'}>{u.role}</span>
                  </td>
                  <td className="cell-mono">{u.lastLogin}</td>
                  <td>
                    {/* 상태 스위치 : 활성 ↔ 비활성 (DB 저장) */}
                    <select
                      value={u.status}
                      disabled={locked}
                      title={u.id === currentMemberId ? '본인 상태는 변경할 수 없습니다' : undefined}
                      onChange={(e) => changeStatus(u.id, e.target.value as UserStatus)}
                      className={u.status === '활성' ? 'status-select status-select--active' : 'status-select status-select--inactive'}
                    >
                      <option value="활성">활성</option>
                      <option value="비활성">비활성</option>
                    </select>
                  </td>
                  <td>
                    {/* 권한 스위치 : 관리자 ↔ 일반사용자 (DB 저장) */}
                    <button
                      onClick={() => toggleRole(u.id)}
                      disabled={locked}
                      title={u.id === currentMemberId ? '본인 권한은 변경할 수 없습니다' : undefined}
                      className={isAdmin ? 'role-toggle-btn is-admin' : 'role-toggle-btn'}
                    >
                      {isAdmin ? '권한 해제' : '관리자 지정'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={7} className="cell-empty">{emptyMessage}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지 번호 (페이지가 2개 이상일 때만 보임) */}
      <Pagination page={page} totalPages={totalPages} onChange={changePage} />
    </div>
  );
}
