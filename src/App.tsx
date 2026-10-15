/* =====================================================================
   App : 모든 페이지의 부모 컴포넌트
   - 로그인 회원 정보 관리
   - 로그인·회원가입 모달 관리
   - 주소별 페이지 연결
   - 공통 매칭 조건 관리
   ===================================================================== */

import { useCallback, useEffect, useState } from 'react';

import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import axios from 'axios';

import type { CompanyType, User } from './types/user';
import { PAGE_PATHS, pathToPage } from './routes';

import Header from './components/layout/Header';
import LoginModal from './components/auth/LoginModal';
import SignupModal from './components/auth/SignupModal';

import Dashboard from './pages/dashboard/Dashboard';
import TradeAnalysis from './pages/trade/TradeAnalysis';
import MatchingSettings from './pages/matching-settings/MatchingSettings';
import SmartMatching from './pages/smart-matching/SmartMatching';
import SystemAdmin from './pages/admin/SystemAdmin';
import Insights from './pages/insights/Insights';
import MyPage from './pages/mypage/MyPage';
import MyMatchingDetail from './pages/my-matching/MyMatchingDetail';

import type {
  ShipperCondition,
  LogisticsCondition,
} from './pages/matching-settings/matchingTypes';

// 기존에 App에서 타입을 가져오던 코드와의 호환
export type {
  Page,
  UserRole,
  CompanyType,
  User,
} from './types/user';

// 기존 회원가입 모달에서 사용하는 이메일 확인 목록
// 실제 로그인은 서버 API를 사용한다.
const DEMO_USERS: User[] = [
  {
    name: '김관리자',
    email: 'admin@macross.com',
    role: 'admin',
    companyName: 'MACROSS Corp.',
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
    address: '서울시 강남구 테헤란로 123',
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
    address: '인천시 중구 항동7가 화물터미널 101호',
  },
];

// 백엔드 회원 정보 응답
interface LoginMember {
  memberId: string;
  userEmail: string;
  companyName: string;
  managerName: string;
  businessRegNo: string;
  userPhone: string;
  companyAddress: string;
  status: boolean;

  signupEntity?: {
    signupId: string;
    signupType: string;
  };

  roleEntity?: {
    roleId: number;
    roleName: string;
  };
}

const ADMIN_ROLE_ID = 2;

// 백엔드 회원 정보 → 화면에서 사용하는 User
function toUser(member: LoginMember): User {
  const signupType = member.signupEntity?.signupType;

  let companyType: CompanyType | undefined;

  if (signupType === '수출입기업') {
    companyType = '수출입기업';
  }

  if (
    signupType === '물류운송업체'
    || signupType === '물류업체'
  ) {
    companyType = '물류업체';
  }

  return {
    memberId: member.memberId,
    name: member.managerName,
    email: member.userEmail,
    role:
      member.roleEntity?.roleId === ADMIN_ROLE_ID
        ? 'admin'
        : 'user',
    companyType,
    companyName: member.companyName,
    businessNumber: member.businessRegNo,
    phone: member.userPhone,
    address: member.companyAddress,
  };
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage = pathToPage(location.pathname);

  // 로그인 상태
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 로그인·회원가입 모달
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // 기존 회원가입 모달의 이메일 확인 목록
  const [registeredUsers, setRegisteredUsers] =
    useState<User[]>(DEMO_USERS);

  // 매칭 조건
  const [shipperRows, setShipperRows] =
    useState<ShipperCondition[]>([]);

  const [logisticsRows, setLogisticsRows] =
    useState<LogisticsCondition[]>([]);

  // 토큰 재발급에서 사용
  const memberId = user?.memberId;

  // [1] 새로고침 시 로그인 상태 복구
  useEffect(() => {
    let ignore = false;

    async function restoreLogin() {
      try {
        let response = await axios.get<LoginMember>(
          '/api/auth/me',
          { withCredentials: true },
        );

        if (ignore) return;

        // 기존 API 동작: 빈 응답이면 RefreshToken으로 재발급
        if (!response.data) {
          response = await axios.post<LoginMember>(
            '/api/auth/reissue',
            {},
            { withCredentials: true },
          );
        }

        if (ignore) return;

        if (response.data) {
          setUser(toUser(response.data));
        } else {
          setUser(null);
        }
      } catch (error) {
        if (!ignore) {
          console.log('로그인 상태 복구 실패 : ', error);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void restoreLogin();

    return () => {
      ignore = true;
    };
  }, []);

  // [2] 로그인
  const handleLogin = async (
    email: string,
    password: string,
  ): Promise<string | null> => {
    try {
      const loginResponse = await axios.post<boolean>(
        '/api/auth/login',
        {
          userEmail: email,
          userPassword: password,
        },
        { withCredentials: true },
      );

      if (loginResponse.data !== true) {
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
      }

      const memberResponse = await axios.get<LoginMember>(
        '/api/auth/me',
        { withCredentials: true },
      );

      if (!memberResponse.data) {
        return '로그인 후 회원 정보를 확인하지 못했습니다.';
      }

      setUser(toUser(memberResponse.data));
      setShowLogin(false);

      return null;
    } catch (error) {
      console.log('로그인 오류 : ', error);

      return '로그인 중 오류가 발생했습니다.';
    }
  };

  // [3] 회원가입: 서버 저장 후 화면의 이메일 목록 갱신
  const handleSignup = async (
    newUser: User,
    password: string,
  ): Promise<string | null> => {
    try {
      const signupId =
        newUser.companyType === '수출입기업'
          ? '201'
          : '301';

      const response = await axios.post<boolean>(
        '/api/auth/signup',
        {
          userEmail: newUser.email.trim(),
          userPassword: password,
          companyName: newUser.companyName,
          managerName: newUser.name,
          businessRegNo: newUser.businessNumber,
          userPhone: newUser.phone,
          companyAddress: newUser.address,
          signupEntity: { signupId },
        },
        { withCredentials: true },
      );

      if (response.data !== true) {
        return '회원가입에 실패했습니다.';
      }

      setRegisteredUsers(previous => [
        ...previous,
        newUser,
      ]);

      return null;
    } catch (error) {
      console.log('회원가입 요청 실패 : ', error);

      return '회원가입 중 오류가 발생했습니다. 입력 정보와 서버 상태를 확인해 주세요.';
    }
  };

  // [4] 로그인 상태 초기화
  // 로그아웃과 회원 탈퇴에서 공통 사용
  const clearLoginState = useCallback(() => {
    setShipperRows([]);
    setLogisticsRows([]);
    setUser(null);

    navigate(PAGE_PATHS.dashboard);
  }, [navigate]);

  // [5] 로그인 중 15분마다 토큰 재발급
  useEffect(() => {
    if (!memberId) return;

    let ignore = false;
    let running = false;

    const timer = window.setInterval(async () => {
      if (running) return;

      running = true;

      try {
        const response = await axios.post<LoginMember>(
          '/api/auth/reissue',
          {},
          { withCredentials: true },
        );

        if (ignore) return;

        if (!response.data) {
          window.clearInterval(timer);

          window.alert(
            '로그인이 만료되었습니다. 다시 로그인해 주세요.',
          );

          clearLoginState();
        }
      } catch (error) {
        if (!ignore) {
          // 네트워크 오류만으로 로그아웃하지 않는다.
          console.log('토큰 재발급 실패 : ', error);
        }
      } finally {
        running = false;
      }
    }, 15 * 60 * 1000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [memberId, clearLoginState]);

  // [6] 로그아웃
  const handleLogout = async () => {
    try {
      await axios.post(
        '/api/auth/logout',
        {},
        { withCredentials: true },
      );

      clearLoginState();
    } catch (error) {
      console.log('로그아웃 오류 : ', error);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
        }}
      >
        로그인 상태 확인 중...
      </div>
    );
  }

  return (
    <div className="app-root">
      <Header
        currentPage={currentPage}
        onNavigate={page => navigate(PAGE_PATHS[page])}
        user={user}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
      />

      <main className="app-main">
        <Routes>
          <Route
            path={PAGE_PATHS.dashboard}
            element={
              <Dashboard
                user={user}
                onLoginClick={() => setShowLogin(true)}
              />
            }
          />

          <Route
            path="/:matchId"
            element={
              <MyMatchingDetail user={user} />
            }
          />

          <Route
            path={`${PAGE_PATHS.trade}/:tab?`}
            element={<TradeAnalysis />}
          />

          {/* 인사이트에는 회원 정보만 전달 */}
          <Route
            path={PAGE_PATHS.insights}
            element={<Insights user={user} />}
          />

          <Route
            path={PAGE_PATHS['matching-settings']}
            element={
              <MatchingSettings
                key={
                  user?.memberId
                  ?? user?.email
                  ?? 'guest'
                }
                user={user}
                shipperRows={shipperRows}
                logisticsRows={logisticsRows}
                onShipperRowsChange={setShipperRows}
                onLogisticsRowsChange={setLogisticsRows}
              />
            }
          />

          <Route
            path={PAGE_PATHS.matching}
            element={
              <SmartMatching user={user} />
            }
          />

          <Route
            path={`${PAGE_PATHS.admin}/:tab?`}
            element={
              <SystemAdmin user={user} />
            }
          />

          <Route
            path={PAGE_PATHS.mypage}
            element={
              <MyPage
                user={user}
                onUserChange={setUser}
                onWithdrawn={clearLoginState}
              />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to={PAGE_PATHS.dashboard}
                replace
              />
            }
          />
        </Routes>
      </main>

      {showLogin && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => setShowLogin(false)}
          onSignupClick={() => {
            setShowLogin(false);
            setShowSignup(true);
          }}
        />
      )}

      {showSignup && (
        <SignupModal
          onSignup={handleSignup}
          onClose={() => setShowSignup(false)}
          onLoginClick={() => {
            setShowSignup(false);
            setShowLogin(true);
          }}
          existingEmails={
            registeredUsers.map(item => item.email)
          }
        />
      )}
    </div>
  );
}