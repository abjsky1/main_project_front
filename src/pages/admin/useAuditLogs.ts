import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAuditActions, getAuditLogs, type ActionDto, type AuditDto, type AuditSearchParams } from '../../api/auditApi';
import { ADMIN_REQUIRED_MESSAGE, MEMBER_TYPE_LABEL, type AuditLog } from './adminData';

export type LogResultFilter = 'all' | '성공' | '실패';

// 기간 필터 — 'all' 은 서버에 보내지 않음 (= 전체 기간) , 나머지는 글자 그대로 서버의 period 로 보냄
export type LogPeriodFilter = 'all' | 'today' | '7days' | '30days' | '6months' | '1year';

// 필터 조건 (사용자 / 회원 유형 / 작업 유형 / IP 주소 / 결과 / 기간)
// memberType : 회원 유형 이름 ('' = 전체) , actionId : 고른 작업 유형 번호 (null = 전체)
interface LogFilter {
  user: string;
  memberType: string;
  actionId: number | null;
  ip: string;
  result: LogResultFilter;
  period: LogPeriodFilter;
}

const NO_FILTER: LogFilter = { user: '', memberType: '', actionId: null, ip: '', result: 'all', period: 'all' };

// 화면 필터 + 페이지 → API 조건 (비어 있으면 보내지 않음)
// 값이 undefined 인 조건은 axios 가 주소에 붙이지 않으므로 "조건 없음" 이 됨
// page : 화면은 1 부터 , 서버는 0 부터 세서 1 을 뺌 (화면 3페이지 → 서버 page=2)
function toParams(f: LogFilter, page: number): AuditSearchParams {
  // 앞뒤 공백을 지운 검색어 , 빈 글자('')면 || 오른쪽의 undefined 사용
  const user = f.user.trim() || undefined;
  const ip = f.ip.trim() || undefined;
  const memberType = f.memberType || undefined;
  // 작업 유형 : 전체(null)면 undefined (?? : 왼쪽이 null 이면 오른쪽 값)
  const actionId = f.actionId ?? undefined;

  let result: boolean | undefined;   // 처음엔 undefined (= 전체)
  if (f.result === '성공') result = true;
  if (f.result === '실패') result = false;

  const period = f.period === 'all' ? undefined : f.period;

  return { user, memberType, actionId, ip, result, period, page: page - 1 };
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
// - 필터는 표 머리글 아래 필터 줄에 각 컬럼마다 (매칭 관리와 같은 모양)
//     사용자 · IP 주소 검색칸 : 작은 [검색] 버튼 / Enter 로 적용 , 기간 · 회원 유형 · 작업 유형 · 결과 선택칸 : 고르면 바로 적용
//     정렬은 항상 최신순 (오래된순 정렬은 쓰지 않아서 뺌)
// - 한 번에 50건씩 (페이징) — 지금 페이지 번호는 주소에 저장 : /admin/audit-logs?page=3
//     → 새로고침하거나 주소를 공유해도 같은 페이지 , 뒤로 가기를 누르면 이전 페이지
// 커스텀 훅 = useState 묶음 함수 (가이드 3-1). 부모 SystemAdmin 에서 호출 → 탭을 바꿔도 값 유지
// active : 지금 이 탭이 열려 있는지 — 사용자 권한 관리 탭도 같은 ?page= 를 쓰기 때문에 , 열려 있을 때만 주소의 페이지를 따름
export default function useAuditLogs(active: boolean) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);   // 조건에 맞는 전체 로그 수 ("총 1,352건")
  const [totalPages, setTotalPages] = useState(0);   // 전체 페이지 수 (페이지 버튼 개수)
  const [pageSize, setPageSize] = useState(50);      // 한 페이지 건수 (서버가 알려 준 값 — 줄 번호 계산용)
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // 지금 페이지 = 주소의 ?page= 값 (1 부터 , 없거나 이상한 값이면 1)
  // useSearchParams : 주소의 물음표(?) 뒤 값을 읽고 바꾸는 훅 (탭 주소의 useParams 와 비슷한 역할)
  //   예) /admin/audit-logs?page=3 → searchParams.get('page') = '3' (글자) → Number 로 숫자 3
  //   Number('abc') 는 NaN(숫자 아님) → || 1 로 1 페이지
  //   이 탭이 닫혀 있으면 1 (사용자 목록 탭의 ?page=3 을 감사 로그 페이지로 착각하지 않게)
  const [searchParams, setSearchParams] = useSearchParams();
  const page = active ? Math.max(1, Number(searchParams.get('page')) || 1) : 1;

  // 필터 줄 : 열림 여부 , 검색칸에 입력 중인 글자 , 적용된 조건(서버에 보내는 값)
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterUser, setFilterUser] = useState('');
  const [filterIp, setFilterIp] = useState('');
  // 작업 유형 선택칸 목록 (서버의 action 테이블 21가지 — 처음 한 번만 받아 옴)
  const [actions, setActions] = useState<ActionDto[]>([]);
  const [applied, setApplied] = useState<LogFilter>(NO_FILTER);
  // 가장 최근 요청의 취소 도구를 기억 (useRef = 화면을 다시 그리지 않는 변수 — 가이드 3-2)
  // [TS] useRef<AbortController | null>(null) : AbortController 또는 null 을 담는 ref
  const lastRequest = useRef<AbortController | null>(null);

  // 작업 유형 목록은 처음 한 번만 받아 옴 (바뀌지 않는 목록이라 조회할 때마다 다시 받지 않음)
  // 실패하거나 관리자가 아니면 빈 목록 → 선택칸에는 "전체" 만 보임
  useEffect(() => {
    let ignore = false;   // 응답 전에 화면을 떠나면 true → 늦게 온 응답 무시 (가이드 3-4)
    getAuditActions()
      .then((data) => { if (!ignore) setActions(data ?? []); })
      .catch((error) => console.log('작업 유형 목록 조회 실패 : ', error));
    return () => { ignore = true; };
  }, []);

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
      setPageSize(data.size);
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

  // 적용된 필터 · 페이지가 바뀔 때마다 그 페이지를 다시 조회 (화면에 처음 들어올 때도 실행)
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
  // 이 탭이 열려 있을 때만 (닫혀 있을 때 주소를 바꾸면 사용자 목록 탭의 페이지가 바뀌어 버림)
  useEffect(() => {
    if (active && totalPages > 0 && page > totalPages) goToPage(totalPages, true);
  }, [active, page, totalPages, goToPage]);

  // 감사 로그 탭을 다시 열 때 : 지금 조건 · 지금 페이지로 다시 조회 (방금 한 활동이 바로 보이게)
  const reload = () => { load(applied, page); };


  // [검색] 버튼 / Enter : 사용자 · IP 주소 검색칸에 입력한 글자를 한꺼번에 적용 + 1 페이지로
  // { ...applied , user , ip } : 지금 조건(선택칸들)은 그대로 두고 검색어만 바꾼 새 객체 → 위 useEffect 가 다시 조회
  const search = () => {
    setApplied({ ...applied, user: filterUser, ip: filterIp });
    goToPage(1);
  };

  // 회원 유형 선택칸 : 고르면 바로 적용 + 1 페이지로 ('' = 전체)
  const changeMemberTypeFilter = (memberType: string) => {
    setApplied({ ...applied, memberType });
    goToPage(1);
  };

  // 작업 유형 선택칸 : 고르면 바로 적용 + 1 페이지로 (null = 전체)
  const changeActionFilter = (actionId: number | null) => {
    setApplied({ ...applied, actionId });
    goToPage(1);
  };

  // 결과 · 기간 선택칸 : 고르면 바로 적용 + 1 페이지로
  const changeResultFilter = (result: LogResultFilter) => {
    setApplied({ ...applied, result });
    goToPage(1);
  };

  const changePeriodFilter = (period: LogPeriodFilter) => {
    setApplied({ ...applied, period });
    goToPage(1);
  };

  // [필터 초기화] : 조건 · 검색칸 비우고 1 페이지 전체 다시 조회
  const resetFilters = () => {
    setFilterUser('');
    setFilterIp('');
    setApplied({ ...NO_FILTER });   // { ...NO_FILTER } : 복사본(새 객체) → 같은 조건이어도 useEffect 가 다시 조회
    goToPage(1);
  };

  // 적용된 조건이 하나라도 있으면 true → [필터 초기화] 버튼 보이기
  const filtersActive = !!(applied.user.trim() || applied.memberType || applied.actionId !== null || applied.ip.trim()
    || applied.result !== 'all' || applied.period !== 'all');

  return {
    logs, totalCount, totalPages, page, pageSize, goToPage, loading, loadError, reload,
    filterOpen, setFilterOpen, filterUser, setFilterUser, filterIp, setFilterIp, search,
    memberTypeFilter: applied.memberType, changeMemberTypeFilter,
    actions, actionFilter: applied.actionId, changeActionFilter,
    resultFilter: applied.result, periodFilter: applied.period, changeResultFilter, changePeriodFilter,
    filtersActive, resetFilters,
  };
}

// [TS] ReturnType<typeof useAuditLogs> = 위 return 객체의 모양 → AuditLogSection 탭의 props 타입 (가이드 2-8)
export type AuditLogState = ReturnType<typeof useAuditLogs>;
