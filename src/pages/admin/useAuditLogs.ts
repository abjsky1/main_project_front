import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuditLogs, type AuditDto, type AuditSearchParams } from '../../api/auditApi';
import { MEMBER_TYPE_LABEL, type AuditLog } from './adminData';

export type LogResultFilter = 'all' | '성공' | '실패';

// 필터 조건 (사용자 / 작업 유형 / 결과)
interface LogFilter {
  user: string;
  action: string;
  result: LogResultFilter;
}

const NO_FILTER: LogFilter = { user: '', action: '', result: 'all' };

// 화면 필터 → API 조건 (비어 있으면 보내지 않음)
// 값이 undefined 인 조건은 axios 가 주소에 붙이지 않으므로 "조건 없음" 이 됨
function toParams(f: LogFilter): AuditSearchParams {
  // 앞뒤 공백을 지운 검색어 , 빈 글자('')면 || 오른쪽의 undefined 사용
  const user = f.user.trim() || undefined;
  const action = f.action.trim() || undefined;

  let result: boolean | undefined;   // 처음엔 undefined (= 전체)
  if (f.result === '성공') result = true;
  if (f.result === '실패') result = false;

  return { user, action, result };
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

// "감사 로그" 탭의 목록 + 필터 상태
// - 필터는 [검색] 버튼 / Enter 때만 적용해서 DB 에서 다시 조회
// 커스텀 훅 = useState 묶음 함수 (가이드 3-1). 부모 SystemAdmin 에서 호출 → 탭을 바꿔도 값 유지
export default function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // 필터 패널에서 입력/선택 중인 값
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterResult, setFilterResult] = useState<LogResultFilter>('all');
  // 마지막으로 [검색]해서 적용된 값
  const [applied, setApplied] = useState<LogFilter>(NO_FILTER);
  // 가장 최근 요청의 취소 도구를 기억 (useRef = 화면을 다시 그리지 않는 변수 — 가이드 3-2)
  // [TS] useRef<AbortController | null>(null) : AbortController 또는 null 을 담는 ref
  const lastRequest = useRef<AbortController | null>(null);

  // DB 에서 조회 (GET /api/audit) — 이전 요청이 아직 진행 중이면 취소하고 마지막 요청 결과만 사용
  // (검색을 빠르게 여러 번 누르면 늦게 도착한 이전 결과가 화면을 덮어쓰는 것을 막음 — 가이드 3-4)
  const load = useCallback(async (filter: LogFilter) => {
    lastRequest.current?.abort();               // 1. 진행 중인 이전 요청 취소
    const controller = new AbortController();   // 2. 이번 요청용 취소 도구를 새로 만들어 기억
    lastRequest.current = controller;
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAuditLogs(toParams(filter), controller.signal);
      setLogs(data.map(toAuditLog));
    } catch (error) {
      if (controller.signal.aborted) return;   // 취소된 요청이면 무시
      console.log('감사 로그 조회 실패 : ', error);
      setLogs([]);
      setLoadError('감사 로그를 불러오지 못했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // 화면에 처음 들어올 때 전체 조회 , 화면을 떠나면 진행 중인 요청 취소
  useEffect(() => {
    load(NO_FILTER);
    return () => lastRequest.current?.abort();
  }, [load]);

  // 감사 로그 탭을 다시 열 때 : 지금 적용된 조건으로 다시 조회 (방금 한 활동이 바로 보이게)
  const reload = () => { load(applied); };

  // [검색] / Enter : 입력한 조건을 적용해서 DB 에서 다시 조회
  const search = () => {
    const filter: LogFilter = { user: filterUser, action: filterAction, result: filterResult };
    setApplied(filter);
    load(filter);
  };

  // [필터 초기화] : 조건 비우고 전체 다시 조회
  const resetFilters = () => {
    setFilterUser('');
    setFilterAction('');
    setFilterResult('all');
    setApplied(NO_FILTER);
    load(NO_FILTER);
  };

  // 적용된 조건이 하나라도 있으면 true → [필터 초기화] 버튼 보이기
  const filtersActive = !!(applied.user.trim() || applied.action.trim() || applied.result !== 'all');

  return {
    logs, loading, loadError, reload, filterOpen, setFilterOpen, filterUser, setFilterUser,
    filterAction, setFilterAction, filterResult, setFilterResult, filtersActive, search, resetFilters,
  };
}

// [TS] ReturnType<typeof useAuditLogs> = 위 return 객체의 모양 → AuditLogSection 탭의 props 타입 (가이드 2-8)
export type AuditLogState = ReturnType<typeof useAuditLogs>;
