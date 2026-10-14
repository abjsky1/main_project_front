import type { KeyboardEvent } from 'react';
import FilterButton from '../../../components/common/FilterButton';
import Pagination from '../../../components/common/Pagination';
import { ACTION_BADGE_CLASS } from '../adminData';
import type { AuditLogState, LogPeriodFilter, LogResultFilter } from '../useAuditLogs';

// 기간 선택칸 — val 이 서버로 가는 period 값 ('all' 은 보내지 않음 = 전체 기간)
const PERIOD_OPTIONS: { val: LogPeriodFilter; label: string }[] = [
  { val: 'all', label: '전체 기간' },
  { val: 'today', label: '오늘' },
  { val: '7days', label: '최근 7일' },
  { val: '30days', label: '최근 30일' },
  { val: '6months', label: '최근 6개월' },
  { val: '1year', label: '최근 1년' },
];

// 회원 유형 선택칸 — val 은 서버로 보내는 이름 (signup 테이블의 signup_type 그대로) , label 은 화면 글자
// ('' 는 보내지 않음 = 전체 , 물류는 DB 이름이 '물류운송업체' 라서 val 과 label 이 다름)
const MEMBER_TYPE_OPTIONS: { val: string; label: string }[] = [
  { val: '', label: '전체' },
  { val: '관리자', label: '관리자' },
  { val: '비회원', label: '비회원' },
  { val: '수출입기업', label: '수출입기업' },
  { val: '물류운송업체', label: '물류업체' },
];

// "감사 로그 (Audit Log)" 탭
// state = useAuditLogs() 가 돌려준 객체 (부모 SystemAdmin 이 보관) → 구조분해로 꺼내 씀
// 한 페이지에 50건씩 , 표 아래 페이지 번호 버튼 (Pagination)
// 필터 : [필터] 버튼을 누르면 표 머리글 바로 아래에 필터 줄 — 각 조건이 해당 컬럼 위에 (매칭 관리와 같은 모양)
export default function AuditLogSection({ state }: { state: AuditLogState }) {
  const {
    logs, totalCount, totalPages, page, pageSize, goToPage, loading, loadError, filterOpen, setFilterOpen,
    filterUser, setFilterUser, filterIp, setFilterIp, search,
    memberTypeFilter, changeMemberTypeFilter, actions, actionFilter, changeActionFilter,
    resultFilter, periodFilter, changeResultFilter, changePeriodFilter, filtersActive, resetFilters,
  } = state;

  // 페이지 번호를 누르면 : 그 페이지로 이동 + 화면 맨 위로 (표 아래에서 눌러도 새 페이지의 첫 줄부터 보이게)
  const changePage = (nextPage: number) => {
    goToPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 표가 비었을 때 안내 문구 : 불러오는 중 → 오류 문구(있으면) → 결과 없음
  const emptyMessage = loading ? '감사 로그를 불러오는 중입니다...' : loadError || '해당 조건의 로그가 없습니다.';

  // 입력칸에서 Enter = [검색]
  // [TS] KeyboardEvent<HTMLInputElement> : input 칸에서 일어난 키보드 이벤트 e
  const searchOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') search();
  };

  // 줄 배경: 실패한 기록은 붉게, 나머지는 한 줄씩 번갈아 회색
  const rowClass = (result: string, index: number) => {
    if (result === '실패') return 'log-row log-row--failed';
    return index % 2 === 0 ? 'log-row' : 'log-row log-row--odd';
  };

  return (
    <div>
      {/* 목록 제목 + 필터 버튼 */}
      <div className="admin-list-bar">
        <div className="admin-list-bar__left">
          <p className="eyebrow">감사 로그</p>
          {/* 이번 페이지 건수가 아니라 조건에 맞는 전체 건수 — toLocaleString( ) : 1352 → '1,352' */}
          <span className="admin-count">총 {totalCount.toLocaleString()}건</span>
          {totalPages > 1 && <span className="admin-page-info">{page} / {totalPages} 페이지</span>}
        </div>
        <div className="admin-list-bar__right">
          {filtersActive && <button onClick={resetFilters} className="filter-reset-btn">필터 초기화</button>}
          <FilterButton active={filterOpen} onClick={() => setFilterOpen(!filterOpen)} />
        </div>
      </div>

      {/* 로그 표 */}
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--logs">
          <thead>
            <tr>
              {['번호', '일시', '회원 유형', '사용자', '작업 유형', '대상', 'IP 주소', '결과'].map((h) => <th key={h}>{h}</th>)}
            </tr>

            {/* 필터 줄 — 각 조건이 바로 위 컬럼에 대한 것 (매칭 관리와 같은 모양)
                사용자 · IP 주소는 [검색] 버튼 / Enter 로 적용 (둘 중 어느 버튼을 눌러도 둘 다 적용) , 선택칸은 고르면 바로 적용
                목록은 항상 최신순 */}
            {filterOpen && (
              <tr className="col-filter-row">
                {/* 번호 : 화면 순서라서 거를 조건이 없음 */}
                <th />
                <th>
                  {/* 일시 : 기간 */}
                  <select
                    value={periodFilter}
                    onChange={(e) => changePeriodFilter(e.target.value as LogPeriodFilter)}
                    className={periodFilter === 'all' ? 'col-filter-select' : 'col-filter-select has-value'}
                  >
                    {PERIOD_OPTIONS.map((p) => <option key={p.val} value={p.val}>{p.label}</option>)}
                  </select>
                </th>
                <th>
                  {/* 회원 유형 : 관리자 / 비회원 / 수출입기업 / 물류업체 */}
                  <select
                    value={memberTypeFilter}
                    onChange={(e) => changeMemberTypeFilter(e.target.value)}
                    className={memberTypeFilter === '' ? 'col-filter-select' : 'col-filter-select has-value'}
                  >
                    {MEMBER_TYPE_OPTIONS.map((m) => <option key={m.val} value={m.val}>{m.label}</option>)}
                  </select>
                </th>
                <th>
                  <div className="col-search">
                    <input value={filterUser} onChange={(e) => setFilterUser(e.target.value)} onKeyDown={searchOnEnter} placeholder="이메일 · 이름" className="col-filter-input" />
                    <button onClick={search} className="col-search__btn">검색</button>
                  </div>
                </th>
                <th>
                  {/* 작업 유형 : 21가지 중에서 고르기 (서버 action 테이블) — 값은 글자라서 Number( ) 로 번호로 , '' 면 전체(null) */}
                  <select
                    value={actionFilter ?? ''}
                    onChange={(e) => changeActionFilter(e.target.value === '' ? null : Number(e.target.value))}
                    className={actionFilter === null ? 'col-filter-select' : 'col-filter-select has-value'}
                  >
                    <option value="">전체</option>
                    {actions.map((a) => <option key={a.actionId} value={a.actionId}>{a.actionType}</option>)}
                  </select>
                </th>
                {/* 대상 : 거를 조건 없음 */}
                <th />
                <th>
                  <div className="col-search">
                    <input value={filterIp} onChange={(e) => setFilterIp(e.target.value)} onKeyDown={searchOnEnter} placeholder="IP" className="col-filter-input" />
                    <button onClick={search} className="col-search__btn">검색</button>
                  </div>
                </th>
                <th>
                  <select
                    value={resultFilter}
                    onChange={(e) => changeResultFilter(e.target.value as LogResultFilter)}
                    className={resultFilter === 'all' ? 'col-filter-select' : 'col-filter-select has-value'}
                  >
                    <option value="all">전체</option>
                    <option value="성공">성공</option>
                    <option value="실패">실패</option>
                  </select>
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log.id} className={rowClass(log.result, i)}>
                {/* 화면에 보이는 순서 번호 (첫 줄 = 1 , 2 페이지 첫 줄 = 51) */}
                <td className="cell-no">{(page - 1) * pageSize + i + 1}</td>
                <td className="cell-mono cell-time">{log.timestamp}</td>
                <td className="cell-type">{log.memberType}</td>
                {/* 비회원은 공통 계정 이메일이라 '-' 로 표시 */}
                <td className="cell-user">{log.memberType === '비회원' ? '-' : log.email}</td>
                <td>
                  {/* 작업 번호에 맞는 배지 색 클래스 (없으면 '' → trim 으로 끝 공백 제거) */}
                  <span className={`action-badge ${ACTION_BADGE_CLASS[log.actionId] ?? ''}`.trim()}>{log.action}</span>
                </td>
                <td className="cell-target">{log.target}</td>
                <td className="cell-mono">{log.ip}</td>
                <td>
                  <span className={log.result === '성공' ? 'result-badge' : 'result-badge is-failed'}>{log.result}</span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={8} className="cell-empty">{emptyMessage}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지 번호 버튼 (페이지가 2개 이상일 때만 보임) */}
      <Pagination page={page} totalPages={totalPages} onChange={changePage} />
    </div>
  );
}
