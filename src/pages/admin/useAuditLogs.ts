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
const toParams = (f: LogFilter): AuditSearchParams => ({
  user: f.user.trim() || undefined,
  action: f.action.trim() || undefined,
  result: f.result === 'all' ? undefined : f.result === '성공',
});

// 백엔드 응답(AuditDto) → 표 한 줄(AuditLog)
const toAuditLog = (dto: AuditDto): AuditLog => ({
  id: dto.auditId,
  timestamp: dto.createdAt,
  user: dto.managerName,
  email: dto.userEmail,
  memberType: MEMBER_TYPE_LABEL[dto.signupType] ?? dto.signupType,
  actionId: dto.actionId,
  action: dto.actionType,
  target: dto.actionDetail,
  ip: dto.fipAddress,
  result: dto.actionResult ? '성공' : '실패',
});

// "감사 로그" 탭의 목록 + 필터 상태
// - 필터는 [검색] 버튼 / Enter 때만 적용해서 DB 에서 다시 조회
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
  const lastRequest = useRef<AbortController | null>(null);

  // DB 에서 조회 (GET /api/audit) — 이전 요청이 아직 진행 중이면 취소하고 마지막 요청 결과만 사용
  const load = useCallback(async (filter: LogFilter) => {
    lastRequest.current?.abort();
    const controller = new AbortController();
    lastRequest.current = controller;
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAuditLogs(toParams(filter), controller.signal);
      setLogs(data.map(toAuditLog));
    } catch (error) {
      if (controller.signal.aborted) return;
      console.log('감사 로그 조회 실패 : ', error);
      setLogs([]);
      setLoadError('감사 로그를 불러오지 못했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // 화면에 처음 들어올 때 전체 조회 , 화면을 떠나면 진행 중인 요청 취소
  useEffect(() => {
    void load(NO_FILTER);
    return () => lastRequest.current?.abort();
  }, [load]);

  // 감사 로그 탭을 다시 열 때 : 지금 적용된 조건으로 다시 조회 (방금 한 활동이 바로 보이게)
  const reload = () => { void load(applied); };

  // [검색] / Enter : 입력한 조건을 적용해서 DB 에서 다시 조회
  const search = () => {
    const filter: LogFilter = { user: filterUser, action: filterAction, result: filterResult };
    setApplied(filter);
    void load(filter);
  };

  // [필터 초기화] : 조건 비우고 전체 다시 조회
  const resetFilters = () => {
    setFilterUser('');
    setFilterAction('');
    setFilterResult('all');
    setApplied(NO_FILTER);
    void load(NO_FILTER);
  };

  const filtersActive = !!(applied.user.trim() || applied.action.trim() || applied.result !== 'all');

  return {
    logs, loading, loadError, reload, filterOpen, setFilterOpen, filterUser, setFilterUser,
    filterAction, setFilterAction, filterResult, setFilterResult, filtersActive, search, resetFilters,
  };
}

export type AuditLogState = ReturnType<typeof useAuditLogs>;
