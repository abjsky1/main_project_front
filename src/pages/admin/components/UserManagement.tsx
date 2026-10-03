import FilterButton from '../../../components/common/FilterButton';
import type { UserRoleLabel, UserStatus } from '../adminData';
import type { LoginSort, UserManagementState } from '../useUserManagement';

const SORT_OPTIONS: { val: LoginSort; label: string }[] = [
  { val: 'asc', label: '오름차순 ↑' },
  { val: 'desc', label: '내림차순 ↓' },
];

// "사용자 권한 관리" 탭
export default function UserManagement({ state }: { state: UserManagementState }) {
  const {
    users, filteredUsers, toggleRole, changeStatus,
    filterOpen, setFilterOpen, filterRole, setFilterRole, filterStatus, setFilterStatus,
    loginSort, setLoginSort, filtersActive, resetFilters,
  } = state;

  const activeCount = users.filter((u) => u.status === '활성').length;

  return (
    <div>
      {/* 요약 카드 */}
      <div className="admin-summary">
        <div className="admin-summary__card">
          <p className="admin-summary__value">{users.length}</p>
          <p className="admin-summary__label">전체 사용자</p>
        </div>
        <div className="admin-summary__card">
          <p className="admin-summary__value admin-summary__value--active">{activeCount}</p>
          <p className="admin-summary__label">활성 사용자</p>
        </div>
        <div className="admin-summary__card">
          <p className="admin-summary__value admin-summary__value--inactive">{users.length - activeCount}</p>
          <p className="admin-summary__label">비활성</p>
        </div>
      </div>

      {/* 목록 제목 + 필터 버튼 */}
      <div className="admin-list-bar">
        <div className="admin-list-bar__left">
          <p className="eyebrow">사용자 목록</p>
          <span className="admin-count">{filteredUsers.length}명</span>
        </div>
        <div className="admin-list-bar__right">
          {filtersActive && <button onClick={resetFilters} className="filter-reset-btn">필터 초기화</button>}
          <FilterButton active={filterOpen} onClick={() => setFilterOpen(!filterOpen)} />
        </div>
      </div>

      {/* 필터 패널 */}
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
            {filteredUsers.map((u) => {
              const isAdmin = u.role === '관리자';
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
                    <select
                      value={u.status}
                      onChange={(e) => changeStatus(u.id, e.target.value as UserStatus)}
                      className={u.status === '활성' ? 'status-select status-select--active' : 'status-select status-select--inactive'}
                    >
                      {(['활성', '비활성'] as UserStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <button onClick={() => toggleRole(u.id)} className={isAdmin ? 'role-toggle-btn is-admin' : 'role-toggle-btn'}>
                      {isAdmin ? '권한 해제' : '관리자 지정'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
