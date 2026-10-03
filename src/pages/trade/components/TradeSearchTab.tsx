import FilterButton from '../../../components/common/FilterButton';
import { SEARCH_COUNTRIES, type SortField } from '../tradeData';
import type { TradeSearchState } from '../useTradeSearch';

// 정렬 가능한 금액 열
const SORT_COLUMNS: { field: SortField; label: string; header: string }[] = [
  { field: 'exportAmt', label: '수출액', header: '수출액 (백만$)' },
  { field: 'importAmt', label: '수입액', header: '수입액 (백만$)' },
  { field: 'balance', label: '무역수지', header: '무역수지' },
];

interface TradeSearchTabProps {
  search: TradeSearchState;  // useTradeSearch() 결과 (부모가 보관)
}

// "조건 검색 & 조회" 탭
export default function TradeSearchTab({ search }: TradeSearchTabProps) {
  const {
    country, setCountry, startDate, setStartDate, endDate, setEndDate, searched, handleSearch,
    colFilterOpen, setColFilterOpen, filterHs, setFilterHs, filterProduct, setFilterProduct,
    filterCountry, setFilterCountry, sortField, sortDir, toggleSort,
    colFiltersActive, resetColFilters, displayedResults,
  } = search;

  const sortArrow = (field: SortField) => (sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕');

  return (
    <div>
      {/* 검색 조건 */}
      <div className="trade-search-card">
        <p className="eyebrow trade-section-label">검색 조건</p>
        <div className="trade-search-grid">
          <div>
            <label className="trade-field-label">시작 기간</label>
            <input type="month" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="trade-input" />
          </div>
          <div>
            <label className="trade-field-label">종료 기간</label>
            <input type="month" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="trade-input" />
          </div>
          <div className="trade-search-grid__wide">
            <label className="trade-field-label">국가</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="trade-input">
              <option>전체</option>
              {SEARCH_COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="trade-search-actions">
          <button onClick={handleSearch} className="trade-search-btn">검색</button>
        </div>
      </div>

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

          {/* 필터 패널 */}
          {colFilterOpen && (
            <div className="filter-panel trade-filter-panel">
              <div>
                <label className="form-label">HS 코드</label>
                <input value={filterHs} onChange={(e) => setFilterHs(e.target.value)} placeholder="예: 3304" className="filter-input" />
              </div>
              <div>
                <label className="form-label">품목명</label>
                <input value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} placeholder="예: 반도체" className="filter-input" />
              </div>
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
              <div className="trade-filter-panel__full">
                <label className="form-label trade-sort-label">금액 정렬</label>
                <div className="trade-sort-options">
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
                  {SORT_COLUMNS.map(({ header, field }) => (
                    <th key={header} onClick={() => toggleSort(field)} className={sortField === field ? 'is-sortable is-sorted' : 'is-sortable'}>
                      {header} <span className="sort-arrow">{sortArrow(field)}</span>
                    </th>
                  ))}
                  <th className="is-wrap">기간</th>
                </tr>
              </thead>
              <tbody>
                {displayedResults.map((row) => (
                  <tr key={row.id}>
                    <td className="cell-code">{row.hsCode}</td>
                    <td className="cell-product">{row.product}</td>
                    <td className="cell-country">{row.country}</td>
                    <td className="cell-amount">{row.exportAmt.toLocaleString()}</td>
                    <td className="cell-amount">{row.importAmt.toLocaleString()}</td>
                    <td className={row.balance >= 0 ? 'cell-balance is-surplus' : 'cell-balance'}>
                      {row.balance >= 0 ? '+' : ''}{row.balance.toLocaleString()}
                    </td>
                    <td className="cell-code">{row.period}</td>
                  </tr>
                ))}
                {displayedResults.length === 0 && (
                  <tr><td colSpan={7} className="cell-empty">검색 결과가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
