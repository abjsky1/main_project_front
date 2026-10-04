import { useEffect, useState } from 'react';
import { getAuditLogs, type AuditDto } from '../../api/auditApi';
import type { AuditLog } from './adminData';

export type LogResultFilter = 'all' | '성공' | '실패';

// 백엔드 응답(AuditDto) → 표 한 줄(AuditLog)
const toAuditLog = (dto: AuditDto): AuditLog => ({
  id: dto.auditId,
  timestamp: dto.createdAt,
  user: dto.managerName,
  actionId: dto.actionId,
  action: dto.actionType,
  target: dto.actionDetail,
  ip: dto.fipAddress,
  result: dto.actionResult ? '성공' : '실패',
});

// "감사 로그" 탭의 목록 + 필터 상태
export default function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [filterOpen, setFilterOpen] = useState(false);
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterResult, setFilterResult] = useState<LogResultFilter>('all');

  // 시스템 관리 화면에 들어올 때 감사 로그 조회 (GET /api/audit)
  useEffect(() => {
    const controller = new AbortController();
    getAuditLogs(controller.signal)
      .then((data) => setLogs(data.map(toAuditLog)))
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.log('감사 로그 조회 실패 : ', error);
        setLoadError('감사 로그를 불러오지 못했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (filterUser && !l.user.includes(filterUser)) return false;
    if (filterAction && !l.action.includes(filterAction)) return false;
    if (filterResult !== 'all' && l.result !== filterResult) return false;
    return true;
  });

  const filtersActive = !!(filterUser || filterAction || filterResult !== 'all');
  const resetFilters = () => {
    setFilterUser('');
    setFilterAction('');
    setFilterResult('all');
  };

  return {
    filteredLogs, loading, loadError, filterOpen, setFilterOpen, filterUser, setFilterUser,
    filterAction, setFilterAction, filterResult, setFilterResult, filtersActive, resetFilters,
  };
}

export type AuditLogState = ReturnType<typeof useAuditLogs>;
