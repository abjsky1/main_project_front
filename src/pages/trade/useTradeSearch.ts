import { useEffect, useState } from 'react';
import axios from 'axios';
import { fetchHsCodes, type HsCodeData } from '../../api/referenceData';
import { searchTrade } from '../../api/tradeSearchApi';
import type { SortDir, SortField, TradeResult } from './tradeData';

// 결과 표 한 페이지에 보여 줄 줄 수 (감사 로그 · 사용자 목록 · 매칭 관리와 같은 50)
const PAGE_SIZE = 50;

// "조건 검색" 탭의 상태와 동작을 모아둔 훅
// (부모 TradeAnalysis에서 호출해서, 탭을 바꿔도 검색 조건/결과가 유지되도록 함)
//
// 커스텀 훅 = useState 들을 묶어 둔 평범한 함수 (이름이 use 로 시작 — 가이드 3-1)
//   TradeAnalysis.tsx 에서  const search = useTradeSearch();  로 호출하면
//   맨 아래 return 의 값/함수들을 search.country, search.handleSearch ... 처럼 쓸 수 있음
//
// 검색은 팀원이 만든 백엔드 API (GET /api/condition/search) 로 실제 무역 데이터를 조회
//
// [페이징 — 화면에서 나누기]
// 감사 로그 · 사용자 목록은 DB 에서 50건씩 가져오지만 , 무역 데이터는 DB 가 아니라 CSV 파일(C:/mpdata)에서 찾음
//   → 서버가 어차피 파일을 처음부터 끝까지 읽어야 해서 "50건만 읽기" 가 안 되고 ,
//     페이지를 넘길 때마다 서버에 물으면 같은 파일을 매번 다시 읽음 (느림 + 검색 기록도 페이지마다 저장됨)
//   → 그래서 [검색] 때 결과를 한 번에 받아 두고 , 화면에서 50줄씩 잘라서 보여 줌 (국가 필터 · 금액 정렬도 원래 화면에서 함)
//   페이지 번호는 주소에 저장하지 않음 : 검색 결과 자체가 주소에 없어서 새로고침하면 결과가 사라지기 때문
export default function useTradeSearch() {
  // 검색 조건
  const [country, setCountry] = useState('전체');
  const [startDate, setStartDate] = useState('2025-01');
  const [endDate, setEndDate] = useState('2025-12');
  const [hsCode, setHsCode] = useState('');                  // 고른 HS 코드 (10자리 숫자)

  // 검색 결과
  const [searched, setSearched] = useState(false);           // 한 번이라도 검색했는지 (결과 표 보이기)
  const [loading, setLoading] = useState(false);             // 검색 중
  const [searchError, setSearchError] = useState('');        // 입력 / 서버 오류 안내
  const [results, setResults] = useState<TradeResult[]>([]);

  // HS 코드 찾기 목록 (hscode.csv) — 탭을 바꿔도 다시 받지 않도록 부모 쪽 훅에서 한 번만 불러옴
  const [hsCodes, setHsCodes] = useState<HsCodeData[]>([]);
  const [hsCodeError, setHsCodeError] = useState('');

  // 결과 표 필터 / 정렬
  const [colFilterOpen, setColFilterOpen] = useState(false);
  const [filterCountry, setFilterCountry] = useState('');
  // 금액 정렬 — 기본 : 정렬 안 함(null) = 서버가 돌려준 검색 결과 원래 순서
  const [sortField, setSortField] = useState<SortField>(null);   // [TS] <SortField> : 정렬 기준 열 이름 또는 null
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // 결과 표의 지금 페이지 (1 부터) — 새로 검색하거나 필터 · 정렬을 바꾸면 1 페이지로
  const [page, setPage] = useState(1);

  // 처음 화면에 들어올 때 HS 코드 목록 한 번 불러오기
  useEffect(() => {
    let ignore = false;   // 응답 전에 화면을 떠나면 true → 늦게 온 응답 무시 (가이드 3-4)

    async function loadHsCodes() {
      try {
        const data = await fetchHsCodes();
        if (!ignore) setHsCodes(data);
      } catch (error) {
        console.log('HS 코드 목록 조회 실패 : ', error);
        if (!ignore) setHsCodeError('HS 코드를 불러오지 못했습니다. 10자리 코드를 직접 입력해 주세요.');
      }
    }

    loadHsCodes();
    return () => { ignore = true; };
  }, []);

  // [검색] : 입력값 확인 → 팀원 검색 API 호출 → 표에 보여줄 모양으로 바꿔서 저장
  const handleSearch = async () => {
    // 1. 입력값 확인 (정규식 /^\d{10}$/ : 숫자 10개로만 이루어져 있는지)
    if (!/^\d{10}$/.test(hsCode)) {
      setSearchError('HS 코드 10자리를 입력하거나 목록에서 골라 주세요.');
      return;
    }
    // 'YYYY-MM' 글자는 앞에서부터 비교하면 날짜 순서와 같음
    if (!startDate || !endDate || startDate > endDate) {
      setSearchError('시작 기간과 종료 기간을 확인해 주세요. (시작이 종료보다 늦을 수 없어요)');
      return;
    }

    setLoading(true);
    setSearchError('');
    setSearched(true);
    setPage(1);   // 새 검색 결과는 1 페이지부터
    try {
      // 2. 서버 검색 (국가가 '전체'면 country 를 보내지 않음 → 서버가 전체 국가로 검색)
      const data = await searchTrade({
        startdate: startDate,
        enddate: endDate,
        country: country === '전체' ? undefined : country,
        hscode: hsCode,
      });

      // 3. 백엔드 응답(TradeSearchDto) → 표 한 줄(TradeResult)
      const rows: TradeResult[] = data.map((dto, index) => ({
        id: index + 1,
        hsCode: dto.hsCode,
        product: dto.itemName,
        country: dto.country,
        exportAmt: dto.exportAmount,
        importAmt: dto.importAmount,
        balance: dto.tradeBalance,
        period: dto.period,
      }));
      setResults(rows);
    } catch (error) {
      console.log('무역 데이터 검색 실패 : ', error);
      setResults([]);
      setSearchError(searchErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // 정렬 버튼 : 같은 열을 다시 누르면 방향만 뒤집고, 다른 열을 누르면 그 열로 바꾸고 내림차순부터
  // 순서가 바뀌면 1 페이지부터 (2 페이지를 보던 중이면 "가장 큰 금액" 이 1 페이지에 있어서)
  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  // 국가 필터 : 고르면 결과 줄 수가 바뀌어서 1 페이지부터
  const changeFilterCountry = (value: string) => {
    setFilterCountry(value);
    setPage(1);
  };

  // 필터/정렬이 하나라도 걸려 있으면 true → [필터 초기화] 버튼 보이기
  // !!( ... ) : 값을 true / false 로 바꿈 ('' → false, '미국' → true)
  const colFiltersActive = !!(filterCountry || sortField);
  const resetColFilters = () => { setFilterCountry(''); setSortField(null); setPage(1); };

  // 화면에 보여줄 결과 = 검색 결과 → 필터 → 정렬
  const displayedResults = results
    // 1) 국가 필터 : 고른 국가 이름이 들어 있는 줄만 남기기 (비어 있으면 모두 통과)
    .filter((r) => !filterCountry || r.country.includes(filterCountry))
    // 2) 정렬 : 두 줄의 금액 차이로 순서 결정 (음수면 a 가 앞, 양수면 b 가 앞)
    //    a[sortField] : sortField 에 들어 있는 칸 이름으로 값 꺼내기 (예: a['exportAmt'] = a.exportAmt)
    .sort((a, b) => {
      if (!sortField) return 0;   // 정렬 안 함 → 순서 그대로
      const diff = a[sortField] - b[sortField];
      return sortDir === 'asc' ? diff : -diff;
    });

  // 3) 페이지 나누기 : 필터 · 정렬까지 끝난 결과에서 이번 페이지 50줄만 잘라냄
  //    전체 페이지 수 : 123줄 ÷ 50 = 2.46 → 올림(Math.ceil) 해서 3 페이지 (남은 23줄도 한 페이지가 필요)
  //    slice(시작 , 끝) : 시작 번호부터 끝 번호 "앞" 까지 꺼냄 → 2 페이지면 slice(50, 100) = 51번째 ~ 100번째 줄
  const totalCount = displayedResults.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageResults = displayedResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 탭 화면(TradeSearchTab)에서 쓸 값과 함수들을 객체로 돌려줌
  // 4) 맨 왼쪽 번호 : 화면에 보이는 순서 (필터 · 정렬이 바뀌어도 첫 줄은 항상 1 , 2 페이지 첫 줄은 51)
  const firstNo = (page - 1) * PAGE_SIZE + 1;

  return {
    country, setCountry, startDate, setStartDate, endDate, setEndDate, hsCode, setHsCode,
    hsCodes, hsCodeError, searched, loading, searchError, handleSearch,
    colFilterOpen, setColFilterOpen, filterCountry, changeFilterCountry, sortField, sortDir, toggleSort,
    colFiltersActive, resetColFilters, pageResults, firstNo, totalCount, totalPages, page, goToPage: setPage,
  };
}

// 검색 오류 → 화면 안내 문구
// (서버가 400 = 입력값 문제 , 409 = 품목명이 여러 개인 코드 , 500 = 무역 CSV 파일 문제)
function searchErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response) {
    if (error.response.status === 400) return '기간과 HS 코드를 확인해 주세요.';
    if (error.response.status === 409) return '이 HS 코드는 품목명이 여러 개라 검색할 수 없습니다.';
    return `검색 중 서버 오류가 발생했습니다 (HTTP ${error.response.status}). 그 연도의 무역 데이터 파일(C:/mpdata)이 있는지 확인해 주세요.`;
  }
  return '검색에 실패했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.';
}

// [TS] ReturnType<typeof useTradeSearch> = 위 return 객체의 모양
//      TradeSearchTab 의 props 타입으로 사용 (가이드 2-8)
export type TradeSearchState = ReturnType<typeof useTradeSearch>;
