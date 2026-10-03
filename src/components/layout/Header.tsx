import type { Page, User } from '../../types/user';
import macrossLogo from '../../assets/main-reference.png';
import './Header.css';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

interface NavItem {
  id: Page;
  label: string;
  adminOnly?: boolean;     // 관리자만 보이는 메뉴
  authRequired?: boolean;  // 로그인해야 보이는 메뉴
  userOnly?: boolean;      // 일반 회원만 보이는 메뉴
}

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

  const roleLabel = isAdmin ? 'ADMIN' : user?.companyType === '물류업체' ? 'LOGISTICS' : 'USER';

  return (
    <header className="site-header">
      <div className="site-header__inner">
        {/* 로고 */}
        <div className="site-header__logo" onClick={() => onNavigate('dashboard')}>
          <img src={macrossLogo} alt="MACROSS" />
          <span className="site-header__logo-text">MACROSS</span>
        </div>

        {/* 가운데 메뉴 */}
        <nav className="site-nav">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={currentPage === item.id ? 'site-nav__item is-active' : 'site-nav__item'}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* 오른쪽: 로그인 / 사용자 정보 */}
        <div className="site-header__auth">
          {user ? (
            <div className="user-box">
              <div className="user-box__profile">
                <div className="user-box__avatar">{user.name.charAt(0)}</div>
                <div className="user-box__info">
                  <span className="user-box__name">{user.name}</span>
                  <span className={isAdmin ? 'user-box__role is-admin' : 'user-box__role'}>{roleLabel}</span>
                </div>
              </div>
              <button onClick={onLogout} className="logout-btn">
                로그아웃
              </button>
            </div>
          ) : (
            <button onClick={onLoginClick} className="login-btn">
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
