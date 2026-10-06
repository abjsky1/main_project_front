import { useState } from 'react';
import { TRADE_RESULTS, type SortDir, type SortField } from './tradeData';

// "조건 검색" 탭의 상태와 동작을 모아둔 훅
// (부모 TradeAnalysis에서 호출해서, 탭을 바꿔도 검색 조건/필터가 유지되도록 함)
//
// 커스텀 훅 = useState 들을 묶어 둔 평범한 함수 (이름이 use 로 시작 — 가이드 3-1)
//   TradeAnalysis.tsx 에서  const search = useTradeSearch();  로 호출하면
//   맨 아래 return 의 값/함수들을 search.country, search.handleSearch ... 처럼 쓸 수 있음
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
  const [sortField, setSortField] = useState<SortField>(null);   // [TS] <SortField> : 정렬 기준 열 이름 또는 null
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // TODO: 백엔드 연결 시 서버 검색 API 호출로 교체
  // [검색] 버튼 : 고른 국가의 결과만 남기기 ('전체'면 모두)
  const handleSearch = () => {
    const filtered = TRADE_RESULTS.filter((r) => country === '전체' || r.country === country);
    setResults(filtered);
    setSearched(true);
  };

  // 정렬 버튼 : 같은 열을 다시 누르면 방향만 뒤집고, 다른 열을 누르면 그 열로 바꾸고 내림차순부터
  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // 필터/정렬이 하나라도 걸려 있으면 true → [필터 초기화] 버튼 보이기
  // !!( ... ) : 값을 true / false 로 바꿈 ('' → false, '3304' → true)
  const colFiltersActive = !!(filterHs || filterProduct || filterCountry || sortField);
  const resetColFilters = () => { setFilterHs(''); setFilterProduct(''); setFilterCountry(''); setSortField(null); };

  // 화면에 보여줄 결과 = 검색 결과 → 필터 → 정렬
  const displayedResults = results
    // 1) 필터 : 입력한 글자가 들어 있는 줄만 남기기 (입력칸이 비어 있으면 그 조건은 통과)
    .filter((r) => {
      if (filterHs && !r.hsCode.includes(filterHs)) return false;
      if (filterProduct && !r.product.includes(filterProduct)) return false;
      if (filterCountry && !r.country.includes(filterCountry)) return false;
      return true;
    })
    // 2) 정렬 : 두 줄의 금액 차이로 순서 결정 (음수면 a 가 앞, 양수면 b 가 앞)
    //    a[sortField] : sortField 에 들어 있는 칸 이름으로 값 꺼내기 (예: a['exportAmt'] = a.exportAmt)
    .sort((a, b) => {
      if (!sortField) return 0;   // 정렬 안 함 → 순서 그대로
      const diff = a[sortField] - b[sortField];
      return sortDir === 'asc' ? diff : -diff;
    });

  // 탭 화면(TradeSearchTab)에서 쓸 값과 함수들을 객체로 돌려줌
  return {
    country, setCountry, startDate, setStartDate, endDate, setEndDate, searched, handleSearch,
    colFilterOpen, setColFilterOpen, filterHs, setFilterHs, filterProduct, setFilterProduct,
    filterCountry, setFilterCountry, sortField, sortDir, toggleSort,
    colFiltersActive, resetColFilters, displayedResults,
  };
}

// [TS] ReturnType<typeof useTradeSearch> = 위 return 객체의 모양
//      TradeSearchTab 의 props 타입으로 사용 (가이드 2-8)
export type TradeSearchState = ReturnType<typeof useTradeSearch>;
