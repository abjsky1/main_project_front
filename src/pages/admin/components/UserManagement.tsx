import FilterButton from '../../../components/common/FilterButton';
import type { UserRoleLabel, UserStatus } from '../adminData';
import type { LoginSort, UserManagementState } from '../useUserManagement';

const SORT_OPTIONS: { val: LoginSort; label: string }[] = [
  { val: 'asc', label: '오름차순 ↑' },
  { val: 'desc', label: '내림차순 ↓' },
];

interface UserManagementProps {
  state: UserManagementState;
  currentMemberId?: string;   // 로그인한 관리자 본인 (본인 권한/상태는 바꿀 수 없게)
}

// "사용자 권한 관리" 탭
export default function UserManagement({ state, currentMemberId }: UserManagementProps) {
  const {
    users, summary, loading, loadError, busyId, toggleRole, changeStatus,
    filterOpen, setFilterOpen, filterRole, setFilterRole, filterStatus, setFilterStatus,
    loginSort, setLoginSort, filtersActive, search, resetFilters,
  } = state;

  // 표가 비었을 때 안내 문구
  const emptyMessage = loading ? '사용자 목록을 불러오는 중입니다...' : loadError || '해당 조건의 사용자가 없습니다.';

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
          <span className="admin-count">{users.length}명</span>
        </div>
        <div className="admin-list-bar__right">
          {filtersActive && <button onClick={resetFilters} className="filter-reset-btn">필터 초기화</button>}
          <FilterButton active={filterOpen} onClick={() => setFilterOpen(!filterOpen)} />
        </div>
      </div>

      {/* 필터 패널 — 역할/상태는 [검색]을 눌러야 DB 에서 조회 , 정렬은 바로 화면에서만 */}
      {filterOpen && (
        <div className="filter-panel admin-filter-panel">
          <div>
            <label className="form-label">역할</label>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as 'all' | UserRoleLabel)} className="filter-input">
              <option value="all">전체</option>
              <option value="관리자">관리자</option>
              <option value="일반사용자">일반사용자</option>
            </select>
          </div>
          <div>
            <label className="form-label">상태</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | UserStatus)} className="filter-input">
              <option value="all">전체</option>
              <option value="활성">활성</option>
              <option value="비활성">비활성</option>
            </select>
          </div>
          <div>
            <label className="form-label">최근 로그인 정렬</label>
            <div className="admin-filter-options">
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.val!}
                  onClick={() => setLoginSort(loginSort === s.val ? null : s.val)}
                  className={loginSort === s.val ? 'option-btn is-active' : 'option-btn'}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-filter-actions">
            <button onClick={search} className="admin-search-btn">검색</button>
          </div>
        </div>
      )}

      {/* 사용자 표 */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {['이름', '이메일', '역할', '최근 로그인', '상태', '권한 관리'].map((h) => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isAdmin = u.role === '관리자';
              const locked = u.id === currentMemberId || busyId !== null;   // 본인 행 , 다른 변경 요청 중
              return (
                <tr key={u.id} className="user-row">
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
                      {(['활성', '비활성'] as UserStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
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
              <tr><td colSpan={6} className="cell-empty">{emptyMessage}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
