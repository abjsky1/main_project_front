import { useState } from 'react';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import Dashboard from './pages/Dashboard';
import TradeAnalysis from './pages/TradeAnalysis';
import MatchingSettings, { type ShipperCondition, type LogisticsCondition } from './pages/MatchingSettings';
import SmartMatching from './pages/SmartMatching';
import SystemAdmin from './pages/SystemAdmin';
import axios from 'axios';

export type Page = 'dashboard' | 'trade' | 'matching-settings' | 'matching' | 'admin';
export type UserRole = 'admin' | 'user';
export type CompanyType = '수출입기업' | '물류업체';

export interface User {
  memberId?: string;   // 추가

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

  {
    name: '김관리자',
    email: 'admin@macross.com',
    role: 'admin',
    companyName: 'MACROSS Corp.'
  },

  {
    memberId: 'dcdc8696-243a-43d1-ad68-138b293638f0',
    name: '이사용자',
    email: 'user@macross.com',
    role: 'user',
    companyType: '수출입기업',
    companyName: '(주)코리아무역',
    businessNumber: '123-45-67890',
    phone: '010-1234-5678',
    address: '서울시 강남구 테헤란로 123'
  },

  {
    memberId: '1d9301d7-a88b-4b60-8ffb-805291ede52b',
    name: '정물류',
    email: 'logistics@macross.com',
    role: 'user',
    companyType: '물류업체',
    companyName: 'FastFreight Korea',
    businessNumber: '987-65-43210',
    phone: '010-9876-5432',
    address: '인천시 중구 항동7가 화물터미널 101호'
  }

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

  const handleLogin =
  async (
    email: string,
    password: string
  ): Promise<string | null> => {

    try {

      // 1. Spring 로그인 API 호출
      const response =
        await axios.post(
          '/api/login',
          {
            userEmail: email,
            userPassword: password
          }
        );
      // 2. 로그인 실패
      if (!response.data) {
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
      }
      // 3. 로그인 성공 회원
      const member =
        response.data;
      // 4. 회원 유형 확인
      let companyType: CompanyType | undefined;

      // 백엔드 응답 구조 확인
      console.log('로그인 회원 정보 : ', member);

      // signupId 또는 signupType 둘 다 대응
      const signupId =
        member.signupId ??
        member.signupEntity?.signupId;

      const signupType =
        member.signupType ??
        member.signupEntity?.signupType;

      // 수출입기업
      if (
        signupId === 201 ||
        signupType === '수출입기업'
      ) {
        companyType = '수출입기업';
      }

      // 물류업체
      if (
        signupId === 301 ||
        signupType === '물류운송업체' ||
        signupType === '물류업체'
      ) {
        companyType = '물류업체';
      }
      // 5. React User 저장
      setUser({
        memberId: member.memberId,

        name: member.managerName,

        email: member.userEmail,

        role:
          member.roleEntity?.roleId === 2
            ? 'admin'
            : 'user',

        companyType: companyType,

        companyName: member.companyName,

        businessNumber: member.businessRegNo,

        phone: member.userPhone,

        address: member.companyAddress
      });
      // 6. 로그인 창 닫기
      setShowLogin(false);
      return null;
    } catch (error) {
      console.log(error);
      return '로그인 중 오류가 발생했습니다.';
    }
  };

  const handleSignup = (newUser: User, password: string) => {
    setRegisteredUsers((prev) => [...prev, newUser]);
    setRegisteredPasswords((prev) => ({ ...prev, [newUser.email]: password }));
  };

  const handleLogout = () => {
    setShipperRows([]);
    setLogisticsRows([]);
    setMatchingCountries([]);
    setUser(null);
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard user={user} matchingCountries={matchingCountries} />;
      case 'trade': return <TradeAnalysis />;
      case 'matching-settings': return <MatchingSettings key={user?.memberId ?? user?.email ?? 'guest'} user={user} onLoginClick={() => setShowLogin(true)} onMatchingUpdate={setMatchingCountries} shipperRows={shipperRows} logisticsRows={logisticsRows} onShipperRowsChange={setShipperRows} onLogisticsRowsChange={setLogisticsRows} />;
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
