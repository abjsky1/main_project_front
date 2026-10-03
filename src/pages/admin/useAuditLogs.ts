import { useState } from 'react';
import { AUDIT_LOGS } from './adminData';

export type LogResultFilter = 'all' | '성공' | '실패';

// "감사 로그" 탭의 필터 상태
export default function useAuditLogs() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterResult, setFilterResult] = useState<LogResultFilter>('all');

  // TODO: 백엔드 연결 시 감사 로그 조회 API 결과로 교체
  const filteredLogs = AUDIT_LOGS.filter((l) => {
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
    filteredLogs, filterOpen, setFilterOpen, filterUser, setFilterUser,
    filterAction, setFilterAction, filterResult, setFilterResult, filtersActive, resetFilters,
  };
}

export type AuditLogState = ReturnType<typeof useAuditLogs>;
