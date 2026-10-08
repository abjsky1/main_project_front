import FilterButton from '../../../components/common/FilterButton';
import { SEARCH_COUNTRIES, type SortField } from '../tradeData';
import type { TradeSearchState } from '../useTradeSearch';
import HsCodeSelect from './HsCodeSelect';

// 정렬 가능한 금액 열 (표 머리글과 필터 패널의 정렬 버튼 둘 다 이 배열로 그림)
// 금액 단위는 달러($) — 팀원 검색 API 가 무역 통계 CSV 의 금액을 그대로 돌려줌
const SORT_COLUMNS: { field: SortField; label: string; header: string }[] = [
  { field: 'exportAmt', label: '수출액', header: '수출액 ($)' },
  { field: 'importAmt', label: '수입액', header: '수입액 ($)' },
  { field: 'balance', label: '무역수지', header: '무역수지 ($)' },
];

interface TradeSearchTabProps {
  search: TradeSearchState;  // useTradeSearch() 결과 (부모가 보관)
}

// "조건 검색 & 조회" 탭
export default function TradeSearchTab({ search }: TradeSearchTabProps) {
  // 객체 구조분해 : search.country, search.setCountry ... 를 짧은 이름으로 꺼내 쓰기
  const {
    country, setCountry, startDate, setStartDate, endDate, setEndDate, hsCode, setHsCode,
    hsCodes, hsCodeError, searched, loading, searchError, handleSearch,
    colFilterOpen, setColFilterOpen, filterCountry, setFilterCountry, sortField, sortDir, toggleSort,
    colFiltersActive, resetColFilters, displayedResults,
  } = search;

  // 정렬 화살표 : 지금 정렬 중인 열이면 방향(↑ 오름 / ↓ 내림), 아니면 ↕
  const sortArrow = (field: SortField) => (sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕');

  return (
    <div>
      {/* 검색 조건 */}
      <div className="trade-search-card">
        <p className="eyebrow trade-section-label">검색 조건</p>
        {/* 국가 - HS 코드 - 시작 기간 - 종료 기간 한 줄 (좁은 화면에서는 국가 · HS 코드가 한 줄씩 , 기간 2개는 나란히) */}
        <div className="trade-search-grid">
          <div className="trade-search-grid__country">
            <label className="trade-field-label">국가</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="trade-input">
              <option>전체</option>
              {SEARCH_COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {/* HS 코드 : 코드 또는 품목명으로 찾아서 고르기 (추천 목록이 보이도록 가장 넓은 칸) */}
          <div className="trade-search-grid__hs">
            <label className="trade-field-label">HS 코드 (필수)</label>
            <HsCodeSelect value={hsCode} onChange={setHsCode} hsCodes={hsCodes} />
            {hsCodeError && <p className="trade-search-message is-error">{hsCodeError}</p>}
          </div>
          <div>
            <label className="trade-field-label">시작 기간</label>
            <input type="month" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="trade-input" />
          </div>
          <div>
            <label className="trade-field-label">종료 기간</label>
            <input type="month" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="trade-input" />
          </div>
        </div>
        <div className="trade-search-actions">
          {/* 검색 중에는 버튼을 잠가서 같은 검색이 두 번 나가지 않게 함 */}
          <button onClick={handleSearch} disabled={loading} className="trade-search-btn">
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>
        {searchError && <p className="trade-search-message is-error">{searchError}</p>}
      </div>

      {/* 아직 검색 전 : 사용 방법 안내 */}
      {!searched && (
        <div className="trade-search-guide">
          <p>HS 코드를 고르고 <strong>[검색]</strong>을 누르면 기간 · 국가별 실제 무역 통계를 보여드려요.</p>
          <p className="trade-search-guide__sub">기간이 길수록(연도가 많을수록) 검색 시간이 길어져요.</p>
        </div>
      )}

      {searched && (
        <div>
          {/* 결과 상단 바 */}
          <div className="result-bar">
            <div className="result-bar__left">
              <p className="eyebrow trade-section-label">검색 결과</p>
              <span className="result-count">{displayedResults.length}건</span>
            </div>
            <div className="result-bar__right">
              {colFiltersActive && (
                <button onClick={resetColFilters} className="filter-reset-btn">필터 초기화</button>
              )}
              <FilterButton active={colFilterOpen} onClick={() => setColFilterOpen(!colFilterOpen)} />
              <button onClick={() => alert('엑셀 파일 다운로드가 시작됩니다. (데모)')} className="excel-btn">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12L3 7h3V2h4v5h3L8 12z" /><path d="M2 14h12v1H2z" /></svg>
                엑셀 다운로드
              </button>
            </div>
          </div>

          {/* 필터 패널 — 검색 결과는 모두 같은 HS 코드라서 국가 필터와 금액 정렬만 둠 (한 줄) */}
          {colFilterOpen && (
            <div className="filter-panel trade-filter-panel">
              <div>
                <label className="form-label">국가</label>
                <select
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className={filterCountry ? 'filter-input trade-filter-country has-value' : 'filter-input trade-filter-country'}
                >
                  <option value="">전체 국가</option>
                  {SEARCH_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">금액 정렬</label>
                <div className="trade-sort-options">
                  {/* [TS] s.field! : "field 는 null 이 아니야" 라는 표시 (key 에는 null 을 쓸 수 없어서 — 가이드 2-6) */}
                  {SORT_COLUMNS.map((s) => (
                    <button key={s.field!} onClick={() => toggleSort(s.field)} className={sortField === s.field ? 'option-btn is-active' : 'option-btn'}>
                      {s.label} {sortArrow(s.field)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 결과 표 */}
          <div className="trade-table-divider" />
          <div className="trade-table-wrap">
            <table className="trade-table">
              <thead>
                <tr>
                  {['HS 코드', '품목명', '국가'].map((h) => <th key={h}>{h}</th>)}
                  {/* ({ header, field }) : 배열의 객체에서 header, field 를 바로 꺼내 받기 (매개변수 구조분해) */}
                  {SORT_COLUMNS.map(({ header, field }) => (
                    <th key={header} onClick={() => toggleSort(field)} className={sortField === field ? 'is-sortable is-sorted' : 'is-sortable'}>
                      {header} <span className="sort-arrow">{sortArrow(field)}</span>
                    </th>
                  ))}
                  <th className="is-wrap">기간</th>
                </tr>
              </thead>
              <tbody>
                {!loading && displayedResults.map((row) => (
                  <tr key={row.id}>
                    <td className="cell-code">{row.hsCode}</td>
                    <td className="cell-product">{row.product}</td>
                    <td className="cell-country">{row.country}</td>
                    <td className="cell-amount">{row.exportAmt.toLocaleString()}</td>
                    <td className="cell-amount">{row.importAmt.toLocaleString()}</td>
                    {/* 무역수지 : 0 이상(흑자)이면 앞에 + 를 붙이고 색을 다르게 */}
                    <td className={row.balance >= 0 ? 'cell-balance is-surplus' : 'cell-balance'}>
                      {row.balance >= 0 ? '+' : ''}{row.balance.toLocaleString()}
                    </td>
                    <td className="cell-code">{row.period}</td>
                  </tr>
                ))}
                {(loading || displayedResults.length === 0) && (
                  <tr>
                    <td colSpan={7} className="cell-empty">
                      {loading ? '검색 중입니다... (무역 통계 파일을 읽는 중)' : '검색 결과가 없습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
