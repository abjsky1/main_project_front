import { useState } from 'react';
import type { User } from '../App';

interface SystemAdminProps {
  user: User | null;
  onLoginClick: () => void;
}

type Section = 'users' | 'logs';
type UserStatus = '활성' | '비활성';
type SortDir = 'asc' | 'desc' | null;

interface SystemUser {
  id: number;
  name: string;
  email: string;
  role: '관리자' | '일반사용자';
  lastLogin: string;
  status: UserStatus;
}

interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  ip: string;
  result: '성공' | '실패';
}

const INITIAL_USERS: SystemUser[] = [
  { id: 1, name: '김관리자', email: 'admin@macross.com', role: '관리자', lastLogin: '2025-12-31 09:14', status: '활성' },
  { id: 2, name: '이사용자', email: 'user@macross.com', role: '일반사용자', lastLogin: '2025-12-31 08:52', status: '활성' },
  { id: 3, name: '박영업', email: 'park.sales@macross.com', role: '일반사용자', lastLogin: '2025-12-30 17:33', status: '활성' },
  { id: 4, name: '최분석', email: 'choi.analyst@macross.com', role: '일반사용자', lastLogin: '2025-12-29 11:22', status: '활성' },
  { id: 5, name: '정물류', email: 'jung.logistics@macross.com', role: '일반사용자', lastLogin: '2025-12-28 15:10', status: '비활성' },
  { id: 6, name: '강테스트', email: 'kang.test@macross.com', role: '일반사용자', lastLogin: '2025-12-01 10:05', status: '비활성' },
];

const AUDIT_LOGS: AuditLog[] = [
  { id: 1, timestamp: '2025-12-31 09:31:45', user: '김관리자', action: '엑셀 다운로드', target: '무역 데이터 (2025-01 ~ 2025-12)', ip: '192.168.1.101', result: '성공' },
  { id: 2, timestamp: '2025-12-31 09:22:10', user: '이사용자', action: '데이터 조회', target: 'HS 코드 3304.99 (미국)', ip: '192.168.1.105', result: '성공' },
  { id: 3, timestamp: '2025-12-31 09:14:03', user: '김관리자', action: '로그인', target: '시스템', ip: '192.168.1.101', result: '성공' },
  { id: 4, timestamp: '2025-12-30 18:05:22', user: '박영업', action: '엑셀 다운로드', target: '무역 데이터 (2025-10 ~ 2025-12)', ip: '192.168.1.110', result: '성공' },
  { id: 5, timestamp: '2025-12-30 17:33:14', user: '박영업', action: '로그인', target: '시스템', ip: '192.168.1.110', result: '성공' },
  { id: 6, timestamp: '2025-12-30 15:50:08', user: '최분석', action: '기업 데이터 삭제', target: 'ID #89 (구 등록업체)', ip: '192.168.1.108', result: '성공' },
  { id: 7, timestamp: '2025-12-30 14:22:31', user: '강테스트', action: '로그인 시도', target: '시스템', ip: '203.0.113.45', result: '실패' },
  { id: 8, timestamp: '2025-12-30 14:20:15', user: '강테스트', action: '로그인 시도', target: '시스템', ip: '203.0.113.45', result: '실패' },
  { id: 9, timestamp: '2025-12-30 14:18:02', user: '강테스트', action: '로그인 시도', target: '시스템', ip: '203.0.113.45', result: '실패' },
  { id: 10, timestamp: '2025-12-29 16:10:44', user: '이사용자', action: '엑셀 다운로드', target: '환율 데이터 (USD 2025)', ip: '192.168.1.105', result: '성공' },
  { id: 11, timestamp: '2025-12-29 11:45:19', user: '최분석', action: '데이터 조회', target: 'HS 코드 8517.12 (중국)', ip: '192.168.1.108', result: '성공' },
  { id: 12, timestamp: '2025-12-28 09:30:00', user: '김관리자', action: '사용자 권한 변경', target: '강테스트 → 비활성화 처리', ip: '192.168.1.101', result: '성공' },
];

const actionColors: Record<string, { bg: string; text: string }> = {
  '로그인': { bg: '#eff6ff', text: '#1e40af' },
  '로그인 시도': { bg: '#fef3c7', text: '#92400e' },
  '엑셀 다운로드': { bg: '#f0fdf4', text: '#166534' },
  '데이터 조회': { bg: '#f5f3ff', text: '#5b21b6' },
  '기업 데이터 삭제': { bg: '#fff1f2', text: '#9f1239' },
  '사용자 권한 변경': { bg: '#ecfdf5', text: '#065f46' },
};

function FilterBtn({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: active ? 'rgba(100,50,220,0.08)' : '#f9f9fc',
        color: active ? '#9333ea' : '#5e5e7a',
        border: active ? '1px solid rgba(100,50,220,0.2)' : '1px solid #eaeaf2',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 4h12M4 8h8M6 12h4"/>
      </svg>
      필터
    </button>
  );
}

function AdminGuard({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.1), rgba(6,182,212,0.1))' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>관리자 전용 메뉴</h2>
        <p className="text-sm mt-1" style={{ color: '#9090a8' }}>이 페이지는 관리자 계정으로만 접근할 수 있습니다.</p>
      </div>
      <button onClick={onLoginClick} className="px-6 py-2.5 rounded-full text-sm font-bold text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>
        관리자로 로그인
      </button>
    </div>
  );
}

export default function SystemAdmin({ user, onLoginClick }: SystemAdminProps) {
  const [section, setSection] = useState<Section>('users');
  const [users, setUsers] = useState<SystemUser[]>(INITIAL_USERS);

  // User table filters
  const [userFilterOpen, setUserFilterOpen] = useState(false);
  const [userFilterRole, setUserFilterRole] = useState<'all' | '관리자' | '일반사용자'>('all');
  const [userFilterStatus, setUserFilterStatus] = useState<'all' | UserStatus>('all');
  const [userLoginSort, setUserLoginSort] = useState<SortDir>(null);

  // Audit log filters
  const [logFilterOpen, setLogFilterOpen] = useState(false);
  const [logFilterUser, setLogFilterUser] = useState('');
  const [logFilterAction, setLogFilterAction] = useState('');
  const [logFilterResult, setLogFilterResult] = useState<'all' | '성공' | '실패'>('all');

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-7">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>Admin</p>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: '#1a1a2e' }}>시스템 관리</h1>
        </div>
        <AdminGuard onLoginClick={onLoginClick} />
      </div>
    );
  }

  const handleRoleToggle = (id: number) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: u.role === '관리자' ? '일반사용자' : '관리자' } : u));
  };

  const handleStatusChange = (id: number, status: UserStatus) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status } : u));
  };

  const statusColors: Record<UserStatus, { bg: string; text: string }> = {
    '활성': { bg: '#dcfce7', text: '#166534' },
    '비활성': { bg: '#fee2e2', text: '#991b1b' }
  };

  // Filter & sort users
  const filteredUsers = users
    .filter((u) => {
      if (userFilterRole !== 'all' && u.role !== userFilterRole) return false;
      if (userFilterStatus !== 'all' && u.status !== userFilterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      if (!userLoginSort) return 0;
      return userLoginSort === 'asc'
        ? a.lastLogin.localeCompare(b.lastLogin)
        : b.lastLogin.localeCompare(a.lastLogin);
    });

  const resetUserFilters = () => {
    setUserFilterRole('all');
    setUserFilterStatus('all');
    setUserLoginSort(null);
  };

  // Filter logs
  const filteredLogs = AUDIT_LOGS.filter((l) => {
    if (logFilterUser && !l.user.includes(logFilterUser)) return false;
    if (logFilterAction && !l.action.includes(logFilterAction)) return false;
    if (logFilterResult !== 'all' && l.result !== logFilterResult) return false;
    return true;
  });

  const resetLogFilters = () => {
    setLogFilterUser('');
    setLogFilterAction('');
    setLogFilterResult('all');
  };

  const userFiltersActive = userFilterRole !== 'all' || userFilterStatus !== 'all' || userLoginSort !== null;
  const logFiltersActive = logFilterUser || logFilterAction || logFilterResult !== 'all';

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>Admin</p>
        <h1 className="text-[28px] font-bold tracking-tight" style={{ color: '#1a1a2e' }}>시스템 관리</h1>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-7 p-1 rounded-xl w-fit" style={{ background: 'rgba(100,50,220,0.06)', border: '1px solid rgba(100,50,220,0.1)' }}>
        {[
          { id: 'users' as Section, label: '사용자 권한 관리' },
          { id: 'logs' as Section, label: '감사 로그 (Audit Log)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              background: section === tab.id ? '#fff' : 'transparent',
              color: section === tab.id ? '#1a1a2e' : '#9090a8',
              boxShadow: section === tab.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users section */}
      {section === 'users' && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: '전체 사용자', value: users.length, color: '#1a1a2e' },
              { label: '활성 사용자', value: users.filter((u) => u.status === '활성').length, color: '#1a9e5c' },
              { label: '비활성', value: users.filter((u) => u.status !== '활성').length, color: '#d93025' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl p-4 text-center" style={{ background: 'rgba(100,50,220,0.035)', border: '1px solid rgba(100,50,220,0.12)' }}>
                <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: '#9090a8' }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Table header with filter btn */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#9090a8' }}>사용자 목록</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(100,50,220,0.08)', color: '#9333ea' }}>{filteredUsers.length}명</span>
            </div>
            <div className="flex items-center gap-2">
              {userFiltersActive && (
                <button onClick={resetUserFilters} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ color: '#d93025', background: 'rgba(217,48,37,0.06)', border: '1px solid rgba(217,48,37,0.15)' }}>
                  필터 초기화
                </button>
              )}
              <FilterBtn active={userFilterOpen} onClick={() => setUserFilterOpen(!userFilterOpen)} />
            </div>
          </div>

          {/* Filter panel */}
          {userFilterOpen && (
            <div className="rounded-xl p-4 mb-4 grid grid-cols-3 gap-4" style={{ background: '#f9f9fc', border: '1px solid #eaeaf2' }}>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>역할</label>
                <select
                  value={userFilterRole}
                  onChange={(e) => setUserFilterRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ border: '1px solid #eaeaf2', background: '#fff', color: '#1a1a2e', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  <option value="all">전체</option>
                  <option value="관리자">관리자</option>
                  <option value="일반사용자">일반사용자</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>상태</label>
                <select
                  value={userFilterStatus}
                  onChange={(e) => setUserFilterStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ border: '1px solid #eaeaf2', background: '#fff', color: '#1a1a2e', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  <option value="all">전체</option>
                  <option value="활성">활성</option>
                  <option value="비활성">비활성</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>최근 로그인 정렬</label>
                <div className="flex gap-2">
                  {[
                    { val: 'asc' as SortDir, label: '오름차순 ↑' },
                    { val: 'desc' as SortDir, label: '내림차순 ↓' },
                  ].map((s) => (
                    <button
                      key={s.val!}
                      onClick={() => setUserLoginSort(userLoginSort === s.val ? null : s.val)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: userLoginSort === s.val ? 'rgba(100,50,220,0.08)' : '#fff',
                        color: userLoginSort === s.val ? '#9333ea' : '#5e5e7a',
                        border: userLoginSort === s.val ? '1px solid rgba(100,50,220,0.2)' : '1px solid #eaeaf2',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Users table */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #eaeaf2' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(100,50,220,0.02)', borderBottom: '1px solid #eaeaf2' }}>
                  {['이름', '이메일', '역할', '최근 로그인', '상태', '권한 관리'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: '#9090a8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const sc = statusColors[u.status];
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f2f2f8' }} className="hover:bg-purple-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">erStatus
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: u.role === '관리자' ? 'linear-gradient(135deg, #9333ea, #06b6d4)' : '#d1d5db' }}>
                            {u.name.charAt(0)}
                          </div>
                          <span className="font-semibold" style={{ color: '#1a1a2e' }}>{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9090a8' }}>{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: u.role === '관리자' ? 'linear-gradient(135deg, rgba(147,51,234,0.1), rgba(6,182,212,0.1))' : '#f3f4f6', color: u.role === '관리자' ? '#9333ea' : '#6b7280' }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9090a8' }}>{u.lastLogin}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.status}
                          onChange={(e) => handleStatusChange(u.id, e.target.value as UserStatus)}
                          className="text-xs font-semibold px-2 py-1 rounded-full cursor-pointer outline-none appearance-none text-center"
                          style={{ background: sc.bg, color: sc.text, border: 'none' }}
                        >
                          {(['활성', '비활성'] as UserStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRoleToggle(u.id)}
                          className="text-xs px-3 py-1 rounded-full transition-all hover:opacity-80 font-semibold"
                          style={{ background: u.role === '관리자' ? '#f3f4f6' : 'linear-gradient(135deg, rgba(147,51,234,0.1), rgba(6,182,212,0.1))', color: u.role === '관리자' ? '#6b7280' : '#9333ea', border: '1px solid #eaeaf2' }}
                        >
                          {u.role === '관리자' ? '권한 해제' : '관리자 지정'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit log section */}
      {section === 'logs' && (
        <div>
          {/* Table header with filter btn */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#9090a8' }}>감사 로그</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(100,50,220,0.08)', color: '#9333ea' }}>{filteredLogs.length}건</span>
            </div>
            <div className="flex items-center gap-2">
              {logFiltersActive && (
                <button onClick={resetLogFilters} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ color: '#d93025', background: 'rgba(217,48,37,0.06)', border: '1px solid rgba(217,48,37,0.15)' }}>
                  필터 초기화
                </button>
              )}
              <FilterBtn active={logFilterOpen} onClick={() => setLogFilterOpen(!logFilterOpen)} />
            </div>
          </div>

          {/* Log filter panel */}
          {logFilterOpen && (
            <div className="rounded-xl p-4 mb-4 grid grid-cols-3 gap-4" style={{ background: '#f9f9fc', border: '1px solid #eaeaf2' }}>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>사용자</label>
                <input
                  value={logFilterUser}
                  onChange={(e) => setLogFilterUser(e.target.value)}
                  placeholder="이름 검색..."
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ border: '1px solid #eaeaf2', background: '#fff', color: '#1a1a2e', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>작업 유형</label>
                <input
                  value={logFilterAction}
                  onChange={(e) => setLogFilterAction(e.target.value)}
                  placeholder="작업명 검색..."
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ border: '1px solid #eaeaf2', background: '#fff', color: '#1a1a2e', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>결과</label>
                <div className="flex gap-2">
                  {[
                    { val: 'all', label: '전체' },
                    { val: '성공', label: '성공' },
                    { val: '실패', label: '실패' },
                  ].map((s) => (
                    <button
                      key={s.val}
                      onClick={() => setLogFilterResult(s.val as any)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: logFilterResult === s.val ? 'rgba(100,50,220,0.08)' : '#fff',
                        color: logFilterResult === s.val ? '#9333ea' : '#5e5e7a',
                        border: logFilterResult === s.val ? '1px solid rgba(100,50,220,0.2)' : '1px solid #eaeaf2',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #eaeaf2' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(100,50,220,0.02)', borderBottom: '1px solid #eaeaf2' }}>
                  {['일시', '사용자', '작업 유형', '대상', 'IP 주소', '결과'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: '#9090a8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, i) => {
                  const ac = actionColors[log.action] || { bg: '#f5f5f7', text: '#6b7280' };
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', background: log.result === '실패' ? 'rgba(220,38,38,0.03)' : i % 2 === 0 ? '#fff' : '#fafafa' }} className="hover:bg-purple-50 transition-colors">
                      <td className="px-4 py-2.5 text-xs font-mono whitespace-nowrap" style={{ color: '#9090a8' }}>{log.timestamp}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#1a1a2e' }}>{log.user}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap" style={{ background: ac.bg, color: ac.text }}>{log.action}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: '#5e5e7a', maxWidth: 200 }}>{log.target}</td>
                      <td className="px-4 py-2.5 text-xs font-mono" style={{ color: '#9090a8' }}>{log.ip}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: log.result === '성공' ? '#dcfce7' : '#fee2e2', color: log.result === '성공' ? '#166534' : '#991b1b' }}>{log.result}</span>
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: '#9090a8' }}>해당 조건의 로그가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
