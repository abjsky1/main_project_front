import type { Page, User } from '../App';
import macrossLogo from '../assets/main-reference.png';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

interface NavItem { id: Page; label: string; adminOnly?: boolean; authRequired?: boolean; userOnly?: boolean }

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: '대시보드' },
  { id: 'trade', label: '무역 데이터 분석' },
  { id: 'matching-settings', label: '매칭 조건 설정', authRequired: true, userOnly: true },
  { id: 'matching', label: '매칭 관리', adminOnly: true },
  { id: 'admin', label: '시스템 관리', adminOnly: true },
];

export default function Header({ currentPage, onNavigate, user, onLoginClick, onLogout }: HeaderProps) {
  const isAdmin = user?.role === 'admin';

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.userOnly) return !!user && !isAdmin;
    if (item.authRequired) return !!user && !isAdmin;
    return true;
  });

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        borderBottom: '1px solid rgba(100,50,220,0.1)',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-4">
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer shrink-0"
          onClick={() => onNavigate('dashboard')}
        >
          <img src={macrossLogo} alt="MACROSS" className="h-7 w-auto" />
          <span
            className="text-sm font-bold tracking-widest uppercase"
            style={{ color: '#1a1a2e', letterSpacing: '0.18em', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            MACROSS
          </span>
        </div>

        {/* Center nav */}
        <nav className="flex items-center gap-0.5">
          {visibleNavItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex items-center px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150"
                style={{
                  background: isActive ? '#1a1a2e' : 'transparent',
                  color: isActive ? '#ffffff' : '#5e5e7a',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100,50,220,0.06)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: auth */}
        <div className="shrink-0 flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}
                >
                  {user.name.charAt(0)}
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-xs font-semibold" style={{ color: '#1a1a2e' }}>{user.name}</span>
                  <span
                    className="text-[10px] font-bold tracking-wide"
                    style={{ color: isAdmin ? '#9333ea' : '#06b6d4' }}
                  >
                    {isAdmin ? 'ADMIN' : user.companyType === '물류업체' ? 'LOGISTICS' : 'USER'}
                  </span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-xs px-2 py-1 rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1a1a2e')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9090a8')}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="px-4 py-1.5 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: '#1a1a2e', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
