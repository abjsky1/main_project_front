/* =====================================================================
   App : 모든 페이지의 부모 컴포넌트
   - 로그인한 회원 정보(user)를 보관하고, 로그인/회원가입 모달을 띄움
   - <Routes> 로 주소에 맞는 페이지를 보여줌 (주소 목록은 routes.ts)
   - 여러 페이지가 같이 쓰는 값(매칭 조건 목록 등)도 여기서 보관해서 props 로 내려줌
   ===================================================================== */
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { CompanyType, User } from './types/user';
import { PAGE_PATHS, pathToPage } from './routes';
import Header from './components/layout/Header';
import LoginModal from './components/auth/LoginModal';
import SignupModal from './components/auth/SignupModal';
import Dashboard from './pages/dashboard/Dashboard';
import TradeAnalysis from './pages/trade/TradeAnalysis';
import MatchingSettings from './pages/matching-settings/MatchingSettings';
import type { ShipperCondition, LogisticsCondition } from './pages/matching-settings/matchingTypes';
import SmartMatching from './pages/smart-matching/SmartMatching';
import SystemAdmin from './pages/admin/SystemAdmin';
import Insights from './pages/insights/Insights';
import MyPage from './pages/mypage/MyPage';
import MyMatchingDetail from './pages/my-matching/MyMatchingDetail';
import { getInterests, type InterestDto } from './api/interestApi';

// 다른 파일에서 '../App' 으로 타입을 가져오던 코드와의 호환용
export type { Page, UserRole, CompanyType, User } from './types/user';

// 예전 화면 테스트용 회원 목록 (실제 로그인은 Spring /api/login 사용)
// 지금은 회원가입 모달의 "이미 등록된 이메일" 검사에만 쓰임
// [TS] User[] : User 모양 객체들의 배열 (User 는 types/user.ts 에 정의)
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

// 예전 테스트용 비밀번호 (이메일 → 비밀번호). 현재 로그인에는 쓰이지 않음
// [TS] Record<string, string> : 키도 글자, 값도 글자인 객체 (가이드 2-8)
const DEMO_PASSWORDS: Record<string, string> = {
  'admin@macross.com': 'admin123',
  'user@macross.com': 'user123',
  'logistics@macross.com': 'logistics123',
};

// 백엔드 로그인 응답 (POST /api/login , GET /api/login/me 가 돌려주는 MemberDto — 비밀번호는 없음)
interface LoginMember {
  memberId: string;
  userEmail: string;
  companyName: string;
  managerName: string;
  businessRegNo: string;
  userPhone: string;
  companyAddress: string;
  status: boolean;
  signupEntity?: { signupId: string; signupType: string };   // 101 관리자 / 201 수출입기업 / 301 물류운송업체
  roleEntity?: { roleId: number; roleName: string };         // 1 일반 사용자 / 2 관리자
}

// 백엔드 회원 정보(LoginMember) → 화면에서 쓰는 User 모양으로 바꾸기 (로그인 , 새로고침 복구 둘 다 사용)
function toUser(member: LoginMember): User {
  const signupType = member.signupEntity?.signupType;

  // 회원 유형 (관리자는 companyType 없음)
  let companyType: CompanyType | undefined;
  if (signupType === '수출입기업') companyType = '수출입기업';
  if (signupType === '물류운송업체' || signupType === '물류업체') companyType = '물류업체';

  return {
    memberId: member.memberId,
    name: member.managerName,
    email: member.userEmail,
    role: member.roleEntity?.roleId === 2 ? 'admin' : 'user',
    companyType,
    companyName: member.companyName,
    businessNumber: member.businessRegNo,
    phone: member.userPhone,
    address: member.companyAddress,
  };
}

export default function App() {
  // 현재 페이지는 주소(path)에서 결정 → 새로고침해도 같은 화면 유지
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = pathToPage(location.pathname);
  // [TS] useState<User | null>(null) : User 객체 또는 null 을 담는 state (처음엔 null = 비로그인)
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);     // 로그인 모달 열림 여부
  const [showSignup, setShowSignup] = useState(false);   // 회원가입 모달 열림 여부
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(DEMO_USERS);
  const [registeredPasswords, setRegisteredPasswords] = useState<Record<string, string>>(DEMO_PASSWORDS);
  // 내 매칭 조건 목록 (MatchingSettings 화면의 표)
  const [shipperRows, setShipperRows] = useState<ShipperCondition[]>([]);
  const [logisticsRows, setLogisticsRows] = useState<LogisticsCondition[]>([]);

  // 관심 국가 (맞춤 인사이트 위쪽에서 설정 → 아래에 국가별로 표시)
  // 로그인한 회원이 바뀔 때 불러오려고 부모인 App 이 보관 , 실제 저장은 DB (GET /api/interest)
  const [interests, setInterests] = useState<InterestDto[]>([]);
  const memberId = user?.memberId;

  // 처음 열 때(새로고침 포함) 로그인 상태 복구
  // 브라우저에 AccessToken 쿠키가 남아 있으면 GET /api/login/me 가 회원 정보를 돌려줌 (없거나 만료면 빈 응답)
  useEffect(() => {
    let ignore = false;

    async function restoreLogin() {
      try {
        const response = await axios.get<LoginMember>('/api/login/me', { withCredentials: true });
        if (!ignore && response.data) setUser(toUser(response.data));
      } catch (error) {
        console.log('로그인 상태 복구 실패 : ', error);
      }
    }

    restoreLogin();

    return () => {
      ignore = true;
    };
  }, []);

  // 로그인한 회원이 바뀌면(로그인 / 로그아웃) 그 회원의 관심 국가를 DB 에서 불러옴
  useEffect(() => {
    if (!memberId) {
      setInterests([]);
      return;
    }

    let ignore = false;   // 응답 전에 회원이 바뀌면 true → 늦게 온 응답 무시 (가이드 3-4)

    async function fetchInterests(id: string) {
      try {
        const data = await getInterests(id);
        if (!ignore) setInterests(data);
      } catch (error) {
        console.log('관심 국가 조회 실패 : ', error);
        if (!ignore) setInterests([]);
      }
    }

    fetchInterests(memberId);

    return () => {
      ignore = true;
    };
  }, [memberId]);

  // 로그인 (LoginModal 에서 호출)
  // 돌려주는 값 : 실패하면 오류 문구(글자), 성공하면 null → LoginModal 이 오류 문구를 화면에 표시
  // [TS] Promise<string | null> : async 함수가 나중에 돌려줄 값이 "글자 또는 null" 이라는 표시
  const handleLogin =
  async (
    email: string,
    password: string
  ): Promise<string | null> => {

    try {

      // 1. Spring 로그인 API 호출 (성공하면 쿠키 2개 + 회원 정보 , 실패하면 빈 응답)
      // [TS] axios.post<LoginMember> : 응답(response.data)이 LoginMember 모양이라는 표시
          const response = await axios.post<LoginMember>('/api/login',{userEmail: email,userPassword: password},
            {withCredentials: true}); // 프론트와 백엔드가 HTTP 요청을 주고받을 때 쿠키를 함께 보내고 받을 수 있게 하는 설정
      // 2. 로그인 실패
      if (!response.data) {
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
      }
      // 3. React User 저장 (백엔드 필드 이름 → 화면에서 쓰는 User 모양으로 바꿔 담기)
      setUser(toUser(response.data));
      // 4. 로그인 창 닫기
      setShowLogin(false);
      return null;
    } catch (error) {
      console.log(error);
      return '로그인 중 오류가 발생했습니다.';
    }
  };

  // 회원가입 (SignupModal 에서 호출) — 현재는 화면 안의 목록에만 추가 (서버 저장 X)
  // (prev) => [...prev, newUser] : 이전 목록을 복사하고 끝에 새 회원 추가
  const handleSignup = (newUser: User, password: string) => {
    setRegisteredUsers((prev) => [...prev, newUser]);
    setRegisteredPasswords((prev) => ({ ...prev, [newUser.email]: password }));
  };

  // 프론트 로그인 상태 비우기 → 첫 화면(/)으로 이동 (로그아웃 · 회원 탈퇴가 같이 사용)
  const clearLoginState = () => {
    setShipperRows([]);
    setLogisticsRows([]);
    setUser(null);
    navigate(PAGE_PATHS.dashboard);
  };

  // 로그아웃 : 서버에 로그아웃 요청(쿠키 · 레디스 토큰 삭제) → 프론트 로그인 상태 비우기
  const handleLogout = async () => {
  try {

    // 1. Spring 로그아웃 API 호출
    await axios.post(
      '/api/login/logout',
      {},
      {
        withCredentials: true
      }
    );

    // 2. 프론트 로그인 상태 초기화 + 첫 화면으로 이동
    clearLoginState();

  } catch (error) {
    console.log('로그아웃 오류 : ', error);
  }
};

  return (
    <div className="app-root">
      {/* 상단 메뉴 : 메뉴를 누르면 onNavigate(페이지 이름) → 그 페이지 주소로 이동 */}
      <Header
        currentPage={currentPage}
        onNavigate={(page) => navigate(PAGE_PATHS[page])}
        user={user}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
      />
      {/* 주소별 페이지 (B_react 의 <Routes><Route path element /></Routes> 와 같은 방식) */}
      {/* MatchingSettings 의 key : 로그인한 회원이 바뀌면 key 가 바뀌어서 페이지를 새로 만듦 (이전 회원 입력값 초기화) */}
      <main className="app-main">
        <Routes>
          {/* 첫 화면 = 내 매칭 + 매칭 상세 (/1001 처럼 숫자 주소 — :matchId 자리의 번호를 상세 페이지가 useParams 로 꺼냄) */}
          <Route path={PAGE_PATHS.dashboard} element={<Dashboard user={user} onLoginClick={() => setShowLogin(true)} />} />
          <Route path="/:matchId" element={<MyMatchingDetail user={user} />} />
          <Route path={PAGE_PATHS.trade} element={<TradeAnalysis />} />
          <Route path={PAGE_PATHS.insights} element={<Insights user={user} interests={interests} onInterestsChange={setInterests} />} />
          <Route path={PAGE_PATHS['matching-settings']} element={<MatchingSettings key={user?.memberId ?? user?.email ?? 'guest'} user={user} shipperRows={shipperRows} logisticsRows={logisticsRows} onShipperRowsChange={setShipperRows} onLogisticsRowsChange={setLogisticsRows} />} />
          <Route path={PAGE_PATHS.matching} element={<SmartMatching user={user} />} />
          <Route path={PAGE_PATHS.admin} element={<SystemAdmin user={user} />} />
          <Route path={PAGE_PATHS.mypage} element={<MyPage user={user} onUserChange={setUser} onWithdrawn={clearLoginState} />} />
          {/* 없는 주소는 대시보드로 */}
          <Route path="*" element={<Navigate to={PAGE_PATHS.dashboard} replace />} />
        </Routes>
      </main>

      {/* 로그인 / 회원가입 모달 (showLogin, showSignup 이 true 일 때만 표시) */}
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
          // 회원 목록에서 이메일만 뽑은 배열 (중복 가입 검사용)
          existingEmails={registeredUsers.map((u) => u.email)}
        />
      )}
    </div>
  );
}
