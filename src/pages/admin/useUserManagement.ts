import { useState } from 'react';
import { INITIAL_USERS, type SystemUser, type UserRoleLabel, type UserStatus } from './adminData';

export type LoginSort = 'asc' | 'desc' | null;

// "사용자 권한 관리" 탭의 상태와 동작
// (부모 SystemAdmin에서 호출해서, 탭을 바꿔도 값이 유지되도록 함)
export default function useUserManagement() {
  // TODO: 백엔드 연결 시 회원 목록 조회 API 결과로 교체
  const [users, setUsers] = useState<SystemUser[]>(INITIAL_USERS);

  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<'all' | UserRoleLabel>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | UserStatus>('all');
  const [loginSort, setLoginSort] = useState<LoginSort>(null);

  const toggleRole = (id: number) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: u.role === '관리자' ? '일반사용자' : '관리자' } : u)));
  };

  const changeStatus = (id: number, status: UserStatus) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
  };

  const filteredUsers = users
    .filter((u) => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (filterStatus !== 'all' && u.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      if (!loginSort) return 0;
      return loginSort === 'asc' ? a.lastLogin.localeCompare(b.lastLogin) : b.lastLogin.localeCompare(a.lastLogin);
    });

  const filtersActive = filterRole !== 'all' || filterStatus !== 'all' || loginSort !== null;
  const resetFilters = () => {
    setFilterRole('all');
    setFilterStatus('all');
    setLoginSort(null);
  };

  return {
    users, filteredUsers, toggleRole, changeStatus,
    filterOpen, setFilterOpen, filterRole, setFilterRole, filterStatus, setFilterStatus,
    loginSort, setLoginSort, filtersActive, resetFilters,
  };
}

export type UserManagementState = ReturnType<typeof useUserManagement>;
