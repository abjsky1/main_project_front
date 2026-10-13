import type { KeyboardEvent } from 'react';
import FilterButton from '../../../components/common/FilterButton';
import Pagination from '../../../components/common/Pagination';
import { ACTION_BADGE_CLASS } from '../adminData';
import type { AuditLogState, LogPeriodFilter, LogResultFilter } from '../useAuditLogs';

const RESULT_OPTIONS: { val: LogResultFilter; label: string }[] = [
  { val: 'all', label: '전체' },
  { val: '성공', label: '성공' },
  { val: '실패', label: '실패' },
];

// 기간 버튼 — val 이 서버로 가는 period 값 ('all' 은 보내지 않음 = 전체 기간)
const PERIOD_OPTIONS: { val: LogPeriodFilter; label: string }[] = [
  { val: 'all', label: '전체' },
  { val: 'today', label: '오늘' },
  { val: '7days', label: '최근 7일' },
  { val: '30days', label: '최근 30일' },
  { val: '6months', label: '최근 6개월' },
  { val: '1year', label: '최근 1년' },
];

// "감사 로그 (Audit Log)" 탭
// state = useAuditLogs() 가 돌려준 객체 (부모 SystemAdmin 이 보관) → 구조분해로 꺼내 씀
// 한 페이지에 50건씩 , 표 아래 페이지 번호 버튼 (Pagination)
export default function AuditLogSection({ state }: { state: AuditLogState }) {
  const {
    logs, totalCount, totalPages, page, goToPage, loading, loadError, filterOpen, setFilterOpen,
    filterUser, setFilterUser, filterAction, setFilterAction, filterResult, setFilterResult,
    filterPeriod, setFilterPeriod, filtersActive, search, resetFilters,
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

      {/* 필터 패널 — [검색] 또는 Enter 를 눌러야 DB 에서 조회 */}
      {filterOpen && (
        <div className="filter-panel admin-filter-panel">
          <div>
            <label className="form-label">사용자</label>
            <input value={filterUser} onChange={(e) => setFilterUser(e.target.value)} onKeyDown={searchOnEnter} placeholder="이메일 · 이름 검색..." className="filter-input" />
          </div>
          <div>
            <label className="form-label">작업 유형</label>
            <input value={filterAction} onChange={(e) => setFilterAction(e.target.value)} onKeyDown={searchOnEnter} placeholder="작업명 검색..." className="filter-input" />
          </div>
          <div>
            <label className="form-label">결과</label>
            <div className="admin-filter-options">
              {RESULT_OPTIONS.map((s) => (
                <button key={s.val} onClick={() => setFilterResult(s.val)} className={filterResult === s.val ? 'option-btn is-active' : 'option-btn'}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {/* 기간 : 버튼이 6개라 한 줄 전체를 씀 */}
          <div className="admin-filter-period">
            <label className="form-label">기간</label>
            <div className="admin-filter-options">
              {PERIOD_OPTIONS.map((p) => (
                <button key={p.val} onClick={() => setFilterPeriod(p.val)} className={filterPeriod === p.val ? 'option-btn is-active' : 'option-btn'}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-filter-actions">
            <button onClick={search} className="admin-search-btn">검색</button>
          </div>
        </div>
      )}

      {/* 로그 표 */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {['일시', '회원 유형', '사용자', '작업 유형', '대상', 'IP 주소', '결과'].map((h) => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log.id} className={rowClass(log.result, i)}>
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
              <tr><td colSpan={7} className="cell-empty">{emptyMessage}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지 번호 버튼 (페이지가 2개 이상일 때만 보임) */}
      <Pagination page={page} totalPages={totalPages} onChange={changePage} />
    </div>
  );
}
