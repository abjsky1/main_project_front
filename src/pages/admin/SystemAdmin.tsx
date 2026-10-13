/* =====================================================================
   시스템 관리 페이지 (주소: /admin , 관리자 전용)
   - 탭 2개 : [사용자 권한 관리] UserManagement , [감사 로그] AuditLogSection
     → 지금 탭은 주소로 정함 : /admin/users , /admin/audit-logs (/admin 만 있으면 첫 탭)
       새로고침해도 같은 탭이 열림 (App.tsx 의 /admin/:tab? — 무역 데이터 분석과 같은 방식)
   - 각 탭의 상태와 서버 호출은 커스텀 훅(useUserManagement, useAuditLogs)에 모여 있음
   ===================================================================== */
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { User } from '../../types/user';
import { PAGE_PATHS } from '../../routes';
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

// 탭 목록 (id 가 주소 끝에 붙음 : /admin/users , /admin/audit-logs)
type Section = 'users' | 'audit-logs';

const TABS: { id: Section; label: string }[] = [
  { id: 'users', label: '사용자 권한 관리' },
  { id: 'audit-logs', label: '감사 로그 (Audit Log)' },
];

export default function SystemAdmin({ user }: SystemAdminProps) {
  // 지금 탭 = 주소의 :tab 자리 (예: /admin/audit-logs → 'audit-logs' , /admin → undefined)
  const { tab } = useParams();
  const navigate = useNavigate();
  const section: Section = TABS.find((t) => t.id === tab)?.id ?? 'users';   // 없으면 첫 탭

  // 탭을 바꿔도 값이 유지되도록 상태는 여기(부모)에서 보관 (가이드 3-1)
  // userState / logState 에는 각 훅이 return 한 값과 함수들이 들어 있음 → 탭에 통째로 전달
  const userState = useUserManagement();
  const logState = useAuditLogs();

  // 탭 열기 — 그 탭 주소로 이동 (뒤로 가기를 누르면 이전 탭으로)
  // 감사 로그 탭은 누를 때마다 다시 조회 (방금 한 활동이 바로 보이게)
  const openTab = (id: Section) => {
    if (id !== section) navigate(`${PAGE_PATHS.admin}/${id}`);
    if (id === 'audit-logs') logState.reload();
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

  // 모르는 탭 주소(예: /admin/abc)면 /admin 으로 바꿈 (replace : 뒤로 가기 기록에 남기지 않음)
  if (tab !== undefined && !TABS.some((t) => t.id === tab)) {
    return <Navigate to={PAGE_PATHS.admin} replace />;
  }

  return (
    <div className="page-container">
      <PageHeader eyebrow="Admin" title="시스템 관리" className="page-header--compact" />

      {/* 탭 */}
      <div className="tab-group admin-tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => openTab(item.id)}
            className={section === item.id ? 'tab-btn is-active' : 'tab-btn'}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === 'users' && <UserManagement state={userState} currentMemberId={user.memberId} />}
      {section === 'audit-logs' && <AuditLogSection state={logState} />}
    </div>
  );
}
