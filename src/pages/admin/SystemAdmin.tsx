/* =====================================================================
   시스템 관리 페이지 (주소: /admin , 관리자 전용)
   - 탭 2개 : [사용자 권한 관리] UserManagement , [감사 로그] AuditLogSection
   - 각 탭의 상태와 서버 호출은 커스텀 훅(useUserManagement, useAuditLogs)에 모여 있음
   ===================================================================== */
import { useState } from 'react';
import type { User } from '../../types/user';
import PageHeader from '../../components/common/PageHeader';
import AccessGuard from '../../components/common/AccessGuard';
import UserManagement from './components/UserManagement';
import AuditLogSection from './components/AuditLogSection';
import useUserManagement from './useUserManagement';
import useAuditLogs from './useAuditLogs';
import './SystemAdmin.css';

interface SystemAdminProps {
  user: User | null;
}

type Section = 'users' | 'logs';

const TABS: { id: Section; label: string }[] = [
  { id: 'users', label: '사용자 권한 관리' },
  { id: 'logs', label: '감사 로그 (Audit Log)' },
];

export default function SystemAdmin({ user }: SystemAdminProps) {
  const [section, setSection] = useState<Section>('users');

  // 탭을 바꿔도 값이 유지되도록 상태는 여기(부모)에서 보관 (가이드 3-1)
  // userState / logState 에는 각 훅이 return 한 값과 함수들이 들어 있음 → 탭에 통째로 전달
  const userState = useUserManagement();
  const logState = useAuditLogs();

  // 탭 열기 — 감사 로그 탭은 열 때마다 다시 조회 (방금 한 활동이 바로 보이게)
  const openTab = (id: Section) => {
    setSection(id);
    if (id === 'logs') logState.reload();
  };

  // 관리자만 접근 가능
  if (!user || user.role !== 'admin') {
    return (
      <div className="page-container">
        <PageHeader eyebrow="Admin" title="시스템 관리" className="page-header--compact" />
        <AccessGuard
          icon="lock"
          gradientIcon
          description="시스템 관리는 관리자 계정으로만 이용할 수 있습니다."
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader eyebrow="Admin" title="시스템 관리" className="page-header--compact" />

      {/* 탭 */}
      <div className="tab-group admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => openTab(tab.id)}
            className={section === tab.id ? 'tab-btn is-active' : 'tab-btn'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === 'users' && <UserManagement state={userState} currentMemberId={user.memberId} />}
      {section === 'logs' && <AuditLogSection state={logState} />}
    </div>
  );
}
