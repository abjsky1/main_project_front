import { useState } from 'react';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import Dashboard from './pages/Dashboard';
import TradeAnalysis from './pages/TradeAnalysis';
import MatchingSettings, { type ShipperCondition, type LogisticsCondition } from './pages/MatchingSettings';
import SmartMatching from './pages/SmartMatching';
import SystemAdmin from './pages/SystemAdmin';

export type Page = 'dashboard' | 'trade' | 'matching-settings' | 'matching' | 'admin';
export type UserRole = 'admin' | 'user';
export type CompanyType = '수출입기업' | '물류업체';

export interface User {
  name: string;
  email: string;
  role: UserRole;
  companyType?: CompanyType;
  companyName?: string;
  businessNumber?: string;
  phone?: string;
  address?: string;
}

const DEMO_USERS: User[] = [
  { name: '김관리자', email: 'admin@macross.com', role: 'admin', companyName: 'MACROSS Corp.' },
  { name: '이사용자', email: 'user@macross.com', role: 'user', companyType: '수출입기업', companyName: '(주)코리아무역', businessNumber: '123-45-67890', phone: '010-1234-5678', address: '서울시 강남구 테헤란로 123' },
  { name: '정물류', email: 'logistics@macross.com', role: 'user', companyType: '물류업체', companyName: 'FastFreight Korea', businessNumber: '987-65-43210', phone: '010-9876-5432', address: '인천시 중구 항동7가 화물터미널 101호' },
];

const DEMO_PASSWORDS: Record<string, string> = {
  'admin@macross.com': 'admin123',
  'user@macross.com': 'user123',
  'logistics@macross.com': 'logistics123',
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(DEMO_USERS);
  const [registeredPasswords, setRegisteredPasswords] = useState<Record<string, string>>(DEMO_PASSWORDS);
  const [matchingCountries, setMatchingCountries] = useState<string[]>([]);
  const [shipperRows, setShipperRows] = useState<ShipperCondition[]>([]);
  const [logisticsRows, setLogisticsRows] = useState<LogisticsCondition[]>([]);

  const handleLogin = (email: string, password: string): string | null => {
    const u = registeredUsers.find((u) => u.email === email);
    if (!u || registeredPasswords[email] !== password) return '이메일 또는 비밀번호가 올바르지 않습니다.';
    setUser(u);
    setShowLogin(false);
    return null;
  };

  const handleSignup = (newUser: User, password: string) => {
    setRegisteredUsers((prev) => [...prev, newUser]);
    setRegisteredPasswords((prev) => ({ ...prev, [newUser.email]: password }));
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard user={user} matchingCountries={matchingCountries} />;
      case 'trade': return <TradeAnalysis />;
      case 'matching-settings': return <MatchingSettings user={user} onLoginClick={() => setShowLogin(true)} onMatchingUpdate={setMatchingCountries} shipperRows={shipperRows} logisticsRows={logisticsRows} onShipperRowsChange={setShipperRows} onLogisticsRowsChange={setLogisticsRows} />;
      case 'matching': return <SmartMatching user={user} onLoginClick={() => setShowLogin(true)} />;
      case 'admin': return <SystemAdmin user={user} onLoginClick={() => setShowLogin(true)} />;
      default: return <Dashboard user={user} matchingCountries={matchingCountries} />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        user={user}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
      />
      <main className="pt-14 min-h-screen">{renderPage()}</main>

      {showLogin && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => setShowLogin(false)}
          onSignupClick={() => { setShowLogin(false); setShowSignup(true); }}
        />
      )}
      {showSignup && (
        <SignupModal
          onSignup={handleSignup}
          onClose={() => setShowSignup(false)}
          onLoginClick={() => { setShowSignup(false); setShowLogin(true); }}
          existingEmails={registeredUsers.map((u) => u.email)}
        />
      )}
    </div>
  );
}
