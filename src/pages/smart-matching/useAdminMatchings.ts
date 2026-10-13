import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAdminMatchings, type MatchingApiDto, type MatchingStatusFilter } from '../../api/matchingApi';

// 관리자 매칭 관리 화면(SmartMatching)의 데이터 훅
// - GET /api/matching/admin 한 번으로 "상태별 건수 5개 + 고른 상태의 매칭 50건" 을 받음
// - 고른 상태와 페이지는 주소에 저장 : /matching?status=completed&page=2
//     → 새로고침하거나 주소를 공유해도 같은 화면 , 뒤로 가기를 누르면 이전 상태 · 이전 페이지
//     (감사 로그의 useAuditLogs 와 같은 방식 — 주소가 원본 , 화면은 주소를 따라감)

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

  // 가장 최근 요청의 취소 도구 (빠르게 여러 번 누르면 이전 요청을 취소 — useAuditLogs 와 같음)
  const lastRequest = useRef<AbortController | null>(null);

  // 2. 서버에서 조회 (화면은 1 부터 , 서버는 0 부터 → page - 1)
  const load = useCallback(async (statusToLoad: MatchingStatusFilter, pageToLoad: number) => {
    lastRequest.current?.abort();
    const controller = new AbortController();
    lastRequest.current = controller;
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAdminMatchings(statusToLoad, pageToLoad - 1, controller.signal);
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
    } catch (error) {
      if (controller.signal.aborted) return;   // 취소된 요청이면 무시
      console.log('매칭 관리 목록 조회 실패 : ', error);
      setMatchings([]);
      setLoadError('매칭 목록을 불러오지 못했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // 3. 상태나 페이지(= 주소)가 바뀔 때마다 다시 조회 (처음 들어올 때도 실행)
  useEffect(() => {
    load(status, page);
    return () => lastRequest.current?.abort();
  }, [load, status, page]);

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

  return { matchings, counts, status, page, totalCount, totalPages, loading, loadError, changeStatus, goToPage };
}
