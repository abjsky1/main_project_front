import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAuditLogs, type AuditDto, type AuditSearchParams } from '../../api/auditApi';
import { ADMIN_REQUIRED_MESSAGE, MEMBER_TYPE_LABEL, type AuditLog } from './adminData';

export type LogResultFilter = 'all' | '성공' | '실패';

// 기간 필터 — 'all' 은 서버에 보내지 않음 (= 전체 기간) , 나머지는 글자 그대로 서버의 period 로 보냄
export type LogPeriodFilter = 'all' | 'today' | '7days' | '30days' | '6months' | '1year';

// 필터 조건 (사용자 / 작업 유형 / 결과 / 기간)
interface LogFilter {
  user: string;
  action: string;
  result: LogResultFilter;
  period: LogPeriodFilter;
}

const NO_FILTER: LogFilter = { user: '', action: '', result: 'all', period: 'all' };

// 화면 필터 + 페이지 → API 조건 (비어 있으면 보내지 않음)
// 값이 undefined 인 조건은 axios 가 주소에 붙이지 않으므로 "조건 없음" 이 됨
// page : 화면은 1 부터 , 서버는 0 부터 세서 1 을 뺌 (화면 3페이지 → 서버 page=2)
function toParams(f: LogFilter, page: number): AuditSearchParams {
  // 앞뒤 공백을 지운 검색어 , 빈 글자('')면 || 오른쪽의 undefined 사용
  const user = f.user.trim() || undefined;
  const action = f.action.trim() || undefined;

  let result: boolean | undefined;   // 처음엔 undefined (= 전체)
  if (f.result === '성공') result = true;
  if (f.result === '실패') result = false;

  const period = f.period === 'all' ? undefined : f.period;

  return { user, action, result, period, page: page - 1 };
}

// 백엔드 응답(AuditDto) → 표 한 줄(AuditLog)
const toAuditLog = (dto: AuditDto): AuditLog => ({
  id: dto.auditId,
  timestamp: dto.createdAt,
  user: dto.managerName,
  email: dto.userEmail,
  memberType: MEMBER_TYPE_LABEL[dto.signupType] ?? dto.signupType,   // 표에 없는 유형이면 원래 글자 그대로
  actionId: dto.actionId,
  action: dto.actionType,
  target: dto.actionDetail,
  ip: dto.fipAddress,
  result: dto.actionResult ? '성공' : '실패',
});

// "감사 로그" 탭의 목록 + 필터 + 페이지 상태
// - 필터는 [검색] 버튼 / Enter 때만 적용해서 DB 에서 다시 조회
// - 한 번에 50건씩 (페이징) — 지금 페이지 번호는 주소에 저장 : /admin/audit-logs?page=3
//     → 새로고침하거나 주소를 공유해도 같은 페이지 , 뒤로 가기를 누르면 이전 페이지
// 커스텀 훅 = useState 묶음 함수 (가이드 3-1). 부모 SystemAdmin 에서 호출 → 탭을 바꿔도 값 유지
export default function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);   // 조건에 맞는 전체 로그 수 ("총 1,352건")
  const [totalPages, setTotalPages] = useState(0);   // 전체 페이지 수 (페이지 버튼 개수)
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // 지금 페이지 = 주소의 ?page= 값 (1 부터 , 없거나 이상한 값이면 1)
  // useSearchParams : 주소의 물음표(?) 뒤 값을 읽고 바꾸는 훅 (탭 주소의 useParams 와 비슷한 역할)
  //   예) /admin/audit-logs?page=3 → searchParams.get('page') = '3' (글자) → Number 로 숫자 3
  //   Number('abc') 는 NaN(숫자 아님) → || 1 로 1 페이지
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  // 필터 패널에서 입력/선택 중인 값
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterResult, setFilterResult] = useState<LogResultFilter>('all');
  const [filterPeriod, setFilterPeriod] = useState<LogPeriodFilter>('all');
  // 마지막으로 [검색]해서 적용된 값
  const [applied, setApplied] = useState<LogFilter>(NO_FILTER);
  // 가장 최근 요청의 취소 도구를 기억 (useRef = 화면을 다시 그리지 않는 변수 — 가이드 3-2)
  // [TS] useRef<AbortController | null>(null) : AbortController 또는 null 을 담는 ref
  const lastRequest = useRef<AbortController | null>(null);

  // DB 에서 그 페이지만 조회 (GET /api/audit) — 이전 요청이 아직 진행 중이면 취소하고 마지막 요청 결과만 사용
  // (검색 · 페이지 번호를 빠르게 여러 번 누르면 늦게 도착한 이전 결과가 화면을 덮어쓰는 것을 막음 — 가이드 3-4)
  const load = useCallback(async (filter: LogFilter, pageToLoad: number) => {
    lastRequest.current?.abort();               // 1. 진행 중인 이전 요청 취소
    const controller = new AbortController();   // 2. 이번 요청용 취소 도구를 새로 만들어 기억
    lastRequest.current = controller;
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAuditLogs(toParams(filter, pageToLoad), controller.signal);
      // 관리자가 아니면 서버가 null 을 돌려줌
      if (!data) {
        setLogs([]);
        setTotalCount(0);
        setTotalPages(0);
        setLoadError(ADMIN_REQUIRED_MESSAGE);
        return;
      }
      // 3. 이번 페이지 목록 + 페이지 숫자 저장
      setLogs(data.logs.map(toAuditLog));
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
    } catch (error) {
      if (controller.signal.aborted) return;   // 취소된 요청이면 무시
      console.log('감사 로그 조회 실패 : ', error);
      setLogs([]);
      setTotalCount(0);
      setTotalPages(0);
      setLoadError('감사 로그를 불러오지 못했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // 적용된 필터나 페이지가 바뀔 때마다 그 페이지를 다시 조회 (화면에 처음 들어올 때도 실행)
  // 화면을 떠나거나 다음 조회가 시작되면 진행 중인 요청 취소
  useEffect(() => {
    load(applied, page);
    return () => lastRequest.current?.abort();
  }, [load, applied, page]);

  // 페이지 이동 = 주소의 ?page= 만 바꿈 → page 가 바뀌어서 위 useEffect 가 그 페이지를 조회
  // 1 페이지는 ?page=1 을 붙이지 않고 깔끔하게 /admin/audit-logs 로
  // replace : true 면 뒤로 가기 기록에 남기지 않음 (주소를 바로잡을 때만 사용)
  const goToPage = useCallback((nextPage: number, replace = false) => {
    if (nextPage === page) return;   // 이미 그 페이지면 주소를 바꾸지 않음 (뒤로 가기 기록이 쌓이지 않게)
    setSearchParams(nextPage <= 1 ? {} : { page: String(nextPage) }, { replace });
  }, [page, setSearchParams]);

  // 마지막 페이지보다 큰 번호면 마지막 페이지로 (예: ?page=99 를 직접 입력 , 필터 때문에 페이지 수가 줄어듦)
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) goToPage(totalPages, true);
  }, [page, totalPages, goToPage]);

  // 감사 로그 탭을 다시 열 때 : 지금 조건 · 지금 페이지로 다시 조회 (방금 한 활동이 바로 보이게)
  const reload = () => { load(applied, page); };

  // [검색] / Enter : 입력한 조건을 적용 + 1 페이지로
  // (setApplied 로 새 조건 객체를 넣으면 위 useEffect 가 다시 조회 — 같은 조건으로 다시 눌러도 새 객체라 다시 조회됨)
  const search = () => {
    setApplied({ user: filterUser, action: filterAction, result: filterResult, period: filterPeriod });
    goToPage(1);
  };

  // [필터 초기화] : 조건 비우고 1 페이지 전체 다시 조회
  const resetFilters = () => {
    setFilterUser('');
    setFilterAction('');
    setFilterResult('all');
    setFilterPeriod('all');
    setApplied({ ...NO_FILTER });   // { ...NO_FILTER } : 복사본(새 객체) → 같은 조건이어도 useEffect 가 다시 조회
    goToPage(1);
  };

  // 적용된 조건이 하나라도 있으면 true → [필터 초기화] 버튼 보이기
  const filtersActive = !!(applied.user.trim() || applied.action.trim() || applied.result !== 'all' || applied.period !== 'all');

  return {
    logs, totalCount, totalPages, page, goToPage, loading, loadError, reload,
    filterOpen, setFilterOpen, filterUser, setFilterUser, filterAction, setFilterAction,
    filterResult, setFilterResult, filterPeriod, setFilterPeriod, filtersActive, search, resetFilters,
  };
}

// [TS] ReturnType<typeof useAuditLogs> = 위 return 객체의 모양 → AuditLogSection 탭의 props 타입 (가이드 2-8)
export type AuditLogState = ReturnType<typeof useAuditLogs>;
