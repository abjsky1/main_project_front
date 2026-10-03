import { useState } from 'react';
import { TRADE_RESULTS, type SortDir, type SortField } from './tradeData';

// "조건 검색" 탭의 상태와 동작을 모아둔 훅
// (부모 TradeAnalysis에서 호출해서, 탭을 바꿔도 검색 조건/필터가 유지되도록 함)
export default function useTradeSearch() {
  // 검색 조건
  const [country, setCountry] = useState('전체');
  const [startDate, setStartDate] = useState('2025-01');
  const [endDate, setEndDate] = useState('2025-12');
  const [searched, setSearched] = useState(true);
  const [results, setResults] = useState(TRADE_RESULTS);

  // 결과 표 필터 / 정렬
  const [colFilterOpen, setColFilterOpen] = useState(false);
  const [filterHs, setFilterHs] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // TODO: 백엔드 연결 시 서버 검색 API 호출로 교체
  const handleSearch = () => {
    const filtered = TRADE_RESULTS.filter((r) => country === '전체' || r.country === country);
    setResults(filtered);
    setSearched(true);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const colFiltersActive = !!(filterHs || filterProduct || filterCountry || sortField);
  const resetColFilters = () => { setFilterHs(''); setFilterProduct(''); setFilterCountry(''); setSortField(null); };

  const displayedResults = results
    .filter((r) => {
      if (filterHs && !r.hsCode.includes(filterHs)) return false;
      if (filterProduct && !r.product.includes(filterProduct)) return false;
      if (filterCountry && !r.country.includes(filterCountry)) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const diff = a[sortField] - b[sortField];
      return sortDir === 'asc' ? diff : -diff;
    });

  return {
    country, setCountry, startDate, setStartDate, endDate, setEndDate, searched, handleSearch,
    colFilterOpen, setColFilterOpen, filterHs, setFilterHs, filterProduct, setFilterProduct,
    filterCountry, setFilterCountry, sortField, sortDir, toggleSort,
    colFiltersActive, resetColFilters, displayedResults,
  };
}

export type TradeSearchState = ReturnType<typeof useTradeSearch>;
