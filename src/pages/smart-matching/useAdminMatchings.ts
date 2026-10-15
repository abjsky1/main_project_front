import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAdminMatchings, type MatchingApiDto, type MatchingStatusFilter } from '../../api/matchingApi';

// 관리자 매칭 관리 화면(SmartMatching)의 데이터 훅
// - GET /api/admin/matchings 한 번으로 "상태별 건수 5개 + 고른 상태의 매칭 50건" 을 받음
// - 고른 상태와 페이지는 주소에 저장 : /matching?status=completed&page=2
//     → 새로고침하거나 주소를 공유해도 같은 화면 , 뒤로 가기를 누르면 이전 상태 · 이전 페이지
//     (감사 로그의 useAuditLogs 와 같은 방식 — 주소가 원본 , 화면은 주소를 따라감)
// - 표의 각 컬럼 위 필터 (머리글 아래 필터 줄)
//     업체 이름 · 추천 이유 검색칸 : 작은 [검색] 버튼을 누르거나 Enter 를 쳐야 적용 (글자를 칠 때마다 서버에 묻지 않음)
//     제공 조건 선택칸(해상/항공 · 정기 O/X · 직항 O/X) · 정렬 버튼 : 고르면 바로 적용
//     → 감사 로그 필터처럼 주소에 넣지 않고 화면 상태로만 보관 , 조건이 바뀌면 1 페이지부터

// 정렬 기준 : id = 매칭 ID(만들어진 순서) , score = 매칭 점수 / 방향 : asc = 오름차순 , desc = 내림차순
export type MatchingSortField = 'id' | 'score';
export type SortDirection = 'asc' | 'desc';

// 제공 조건 선택칸 3개의 값 (all = 전체)
// [TS] 'all' | 'sea' | 'air' : 이 글자들 중 하나만 들어갈 수 있는 타입 (가이드 2-5)
export interface RouteOptions {
  transport: 'all' | 'sea' | 'air';   // 운송 방식 : 해상 / 항공
  regular: 'all' | 'O' | 'X';         // 정기 노선
  direct: 'all' | 'O' | 'X';          // 직항
}

const ALL_ROUTES: RouteOptions = { transport: 'all', regular: 'all', direct: 'all' };

// 주소에 들어올 수 있는 상태 값 (그 밖의 값이면 전체)
const STATUS_VALUES: MatchingStatusFilter[] = ['all', 'linked', 'requested', 'completed', 'failed'];

// 카드 5칸의 숫자
export type MatchingCounts = Record<MatchingStatusFilter, number>;

const NO_COUNTS: MatchingCounts = { all: 0, linked: 0, requested: 0, completed: 0, failed: 0 };

export default function useAdminMatchings() {
  const [matchings, setMatchings] = useState<MatchingApiDto[]>([]);   // 이번 페이지 매칭 (최대 50건)
  const [counts, setCounts] = useState<MatchingCounts>(NO_COUNTS);    // 카드 숫자 5개
  const [totalCount, setTotalCount] = useState(0);                   // 고른 상태의 전체 건수
  const [totalPages, setTotalPages] = useState(0);                   // 고른 상태의 전체 페이지 수
  const [pageSize, setPageSize] = useState(50);                      // 한 페이지 건수 (서버가 알려 준 값 — 줄 번호 계산용)
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // 1. 주소에서 지금 상태와 페이지 읽기
  //    useSearchParams : 주소의 물음표(?) 뒤 값을 읽고 바꾸는 훅
  //    [TS] as MatchingStatusFilter : 아래 includes 로 확인한 값만 쓰므로 "상태 글자" 라고 알려 줌 (가이드 2-6)
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status') ?? 'all';
  const status: MatchingStatusFilter = STATUS_VALUES.includes(statusParam as MatchingStatusFilter)
    ? (statusParam as MatchingStatusFilter)
    : 'all';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);   // 1 부터 (없거나 이상한 값이면 1)

  // 필터 줄 : 열림 여부 , 검색칸 2개(입력 중인 글자 / 적용된 글자) , 제공 조건 3개 , 정렬
  const [filterOpen, setFilterOpen] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');   // 화주사 → 운송사 칸 검색 (입력 중)
  const [keyword, setKeyword] = useState('');             //                         (적용됨)
  const [reasonInput, setReasonInput] = useState('');     // 추천 이유 · 주의 사항 칸 검색 (입력 중)
  const [reason, setReason] = useState('');               //                               (적용됨)
  const [routes, setRoutes] = useState<RouteOptions>(ALL_ROUTES);
  const [sortField, setSortField] = useState<MatchingSortField>('id');   // 기본 : 매칭 ID 내림차순 = 최신순
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // 가장 최근 요청의 취소 도구 (빠르게 여러 번 누르면 이전 요청을 취소 — useAuditLogs 와 같음)
  const lastRequest = useRef<AbortController | null>(null);

  // 2. 서버에서 조회 (화면은 1 부터 , 서버는 0 부터 → page - 1)
  //    값이 undefined 인 조건은 axios 가 주소에 붙이지 않음 (= 그 조건으로 거르지 않음)
  //    - 검색어가 빈 글자('')면 || 오른쪽의 undefined
  //    - 제공 조건 : 'all' 이면 undefined , 아니면 true / false (해상 = true , O = true)
  const load = useCallback(async (
    statusToLoad: MatchingStatusFilter, pageToLoad: number, keywordToLoad: string, reasonToLoad: string,
    routesToLoad: RouteOptions, field: MatchingSortField, dir: SortDirection,
  ) => {
    lastRequest.current?.abort();
    const controller = new AbortController();
    lastRequest.current = controller;
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAdminMatchings({
        status: statusToLoad,
        keyword: keywordToLoad || undefined,
        reason: reasonToLoad || undefined,
        transportType: routesToLoad.transport === 'all' ? undefined : routesToLoad.transport === 'sea',
        regularRoute: routesToLoad.regular === 'all' ? undefined : routesToLoad.regular === 'O',
        directRoute: routesToLoad.direct === 'all' ? undefined : routesToLoad.direct === 'O',
        sort: field,
        dir,
        page: pageToLoad - 1,
      }, controller.signal);
      if (!data) {
        setMatchings([]);
        setCounts(NO_COUNTS);
        setTotalCount(0);
        setTotalPages(0);
        setLoadError('관리자만 볼 수 있습니다. 관리자 계정으로 다시 로그인해 주세요.');
        return;
      }
      setMatchings(data.matchings);
      setCounts({
        all: data.allCount,
        linked: data.linkedCount,
        requested: data.requestedCount,
        completed: data.completedCount,
        failed: data.failedCount,
      });
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
      setPageSize(data.size);
    } catch (error) {
      if (controller.signal.aborted) return;   // 취소된 요청이면 무시
      console.log('매칭 관리 목록 조회 실패 : ', error);
      setMatchings([]);
      setLoadError('매칭 목록을 불러오지 못했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // 3. 상태 · 페이지(= 주소)나 필터 · 정렬이 바뀔 때마다 다시 조회 (처음 들어올 때도 실행)
  useEffect(() => {
    load(status, page, keyword, reason, routes, sortField, sortDir);
    return () => lastRequest.current?.abort();
  }, [load, status, page, keyword, reason, routes, sortField, sortDir]);

  // 4. 주소 바꾸기 : 상태 카드를 누르면 그 상태의 1 페이지로 , 페이지 번호를 누르면 같은 상태의 그 페이지로
  //    전체 · 1 페이지는 주소에 붙이지 않음 (/matching 그대로)
  //    replace : true 면 뒤로 가기 기록에 남기지 않음 (주소를 바로잡을 때만)
  const changeAddress = useCallback((nextStatus: MatchingStatusFilter, nextPage: number, replace = false) => {
    const params: Record<string, string> = {};
    if (nextStatus !== 'all') params.status = nextStatus;
    if (nextPage > 1) params.page = String(nextPage);
    setSearchParams(params, { replace });
  }, [setSearchParams]);

  const changeStatus = (nextStatus: MatchingStatusFilter) => {
    if (nextStatus === status && page === 1) return;   // 이미 그 상태의 1 페이지면 그대로
    changeAddress(nextStatus, 1);
  };

  const goToPage = (nextPage: number) => {
    if (nextPage === page) return;
    changeAddress(status, nextPage);
  };

  // 5. 마지막 페이지보다 큰 번호면 마지막 페이지로 (예: ?page=99 를 직접 입력)
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) changeAddress(status, totalPages, true);
  }, [status, page, totalPages, changeAddress]);

  // 6. 필터 동작 — 조건이 바뀌면 같은 상태의 1 페이지로 (2 페이지를 보던 중이어도 새 결과는 처음부터)
  //    이미 1 페이지면 주소를 바꾸지 않음 (같은 주소가 뒤로 가기 기록에 또 쌓이지 않게)
  const goToFirstPage = () => {
    if (page !== 1) changeAddress(status, 1);
  };

  //    [검색] 버튼 / Enter : 검색칸 2개(업체 이름 · 추천 이유)에 입력한 글자를 한꺼번에 적용 (앞뒤 공백 제거)
  //    → 적용된 글자가 바뀌면 위 3번 useEffect 가 서버에 다시 조회 (같은 글자로 다시 눌러도 결과는 같아서 조회하지 않음)
  const search = () => {
    setKeyword(keywordInput.trim());
    setReason(reasonInput.trim());
    goToFirstPage();
  };

  //    제공 조건 선택칸 : 고르면 바로 적용
  //    { ...routes, [name]: value } : 지금 값을 복사하고 고른 칸(name)만 새 값으로 바꾼 새 객체
  //    [TS] K extends keyof RouteOptions : name 은 'transport' / 'regular' / 'direct' 중 하나 , value 는 그 칸에 맞는 값
  const changeRoute = <K extends keyof RouteOptions>(name: K, value: RouteOptions[K]) => {
    setRoutes({ ...routes, [name]: value });
    goToFirstPage();
  };

  //    정렬 버튼 : 지금 정렬 중인 기준을 다시 누르면 방향만 뒤집고 (↓ ↔ ↑) , 다른 기준을 누르면 그 기준의 내림차순부터
  //    (무역 데이터 조건 검색의 금액 정렬 버튼과 같은 방식)
  const changeSort = (field: MatchingSortField) => {
    if (field === sortField) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    goToFirstPage();
  };

  //    [필터 초기화] : 검색어 · 제공 조건 비우고 기본 정렬(매칭 ID 내림차순)로
  const resetFilters = () => {
    setKeywordInput('');
    setKeyword('');
    setReasonInput('');
    setReason('');
    setRoutes(ALL_ROUTES);
    setSortField('id');
    setSortDir('desc');
    goToFirstPage();
  };

  //    기본값과 다른 조건이 하나라도 있으면 true → [필터 초기화] 버튼 보이기
  const filtersActive = keyword !== '' || reason !== '' || routes.transport !== 'all' || routes.regular !== 'all'
    || routes.direct !== 'all' || sortField !== 'id' || sortDir !== 'desc';

  return {
    matchings, counts, status, page, pageSize, totalCount, totalPages, loading, loadError, changeStatus, goToPage,
    filterOpen, setFilterOpen, keywordInput, setKeywordInput, reasonInput, setReasonInput, search, routes, changeRoute,
    sortField, sortDir, changeSort, resetFilters, filtersActive,
  };
}
