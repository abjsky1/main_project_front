
/* =====================================================================
   상단 헤더 (모든 페이지 공통)

   - 왼쪽 로고 / 가운데 메뉴 / 오른쪽 로그인 버튼 또는 회원 정보
   - 일반 회원은 매칭 알림 표시
   - 알림에서 수락/거절하지 않고 내 매칭 페이지로 이동
   ===================================================================== */

import type { Page, User } from '../../types/user';
import macrossLogo from '../../assets/main-reference.png';
import './Header.css';

import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';


// App.tsx 에서 받는 props
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
  adminOnly?: boolean;
  authRequired?: boolean;
  userOnly?: boolean;
}


// 백엔드 매칭 알림 조회에 필요한 정보
interface MatchingNotification {
  matchingId: number;
  shipperStatus: string;
  logisticsStatus: string;
  finalStatus: string;
}


// 메뉴 전체 목록
const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: '내 매칭' },
  { id: 'trade', label: '무역 데이터 분석' },
  { id: 'insights', label: '맞춤 인사이트', authRequired: true, userOnly: true },
  { id: 'matching-settings', label: '매칭 조건 설정', authRequired: true, userOnly: true },
  { id: 'matching', label: '매칭 관리', adminOnly: true },
  { id: 'admin', label: '시스템 관리', adminOnly: true },
];


export default function Header({
  currentPage,
  onNavigate,
  user,
  onLoginClick,
  onLogout
}: HeaderProps) {

  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';


  // [1] 확인할 매칭 알림 개수
  const [matchingCount, setMatchingCount] = useState(0);


  // [2] 알림창 열림 여부
  const [notificationOpen, setNotificationOpen] = useState(false);


  // [3] 로그인 회원의 매칭 알림 조회
  const matchingRead = async () => {

    // 로그인하지 않았거나 관리자면 조회하지 않음
    if (!user?.memberId || isAdmin) {

      setMatchingCount(0);

      return;

    }


    try {

      // 로그인 회원의 매칭 결과 조회
      const response = await axios.get<MatchingNotification[]>(
        `/api/matching/member/${user.memberId}`,
        {
          withCredentials: true
        }
      );

      const data = response.data;


      // 화주 회원
      if (user.companyType === '수출입기업') {

        // 아직 요청하지 않은 추천 매칭만 알림 개수에 포함
        const count = data.filter((matching) => {

          return matching.shipperStatus === 'WAITING'
            && matching.finalStatus === 'PENDING';

        }).length;

        setMatchingCount(count);

      }


      // 물류기업 회원
      else if (user.companyType === '물류업체') {

        // 화주가 매칭을 요청했고 물류기업 응답을 기다리는 경우
        const count = data.filter((matching) => {

          return matching.shipperStatus === 'ACCEPTED'
            && matching.logisticsStatus === 'WAITING'
            && matching.finalStatus === 'PENDING';

        }).length;

        setMatchingCount(count);

      } else {

        setMatchingCount(0);

      }

    } catch (error) {

      console.log('매칭 알림 조회 실패 : ', error);

      setMatchingCount(0);

    }

  };


  // [4] 로그인 회원이 변경되면 알림 다시 조회
  useEffect(() => {

    matchingRead();

    setNotificationOpen(false);

  }, [user?.memberId, user?.companyType, isAdmin]);


  // [5] 알림창 열기 / 닫기
  const toggleNotification = () => {

    // 알림창을 열 때 최신 DB 상태 조회
    if (notificationOpen === false) {

      matchingRead();

    }

    setNotificationOpen(!notificationOpen);

  };


  // [6] 메인페이지의 내 매칭 영역으로 이동
  const goToMyMatching = () => {

    // 1. 알림창 닫기
    setNotificationOpen(false);

    // 2. 메인페이지 이동
    // state 값을 MatchingBoard.tsx에서 확인해 자동 스크롤
    navigate('/', {
      state: {
        scrollToMatching: true
      }
    });

  };


  // [7] 로그인 상태에 따라 표시할 메뉴 선택
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {

    if (item.adminOnly) return isAdmin;

    if (item.userOnly) return !!user && !isAdmin;

    if (item.authRequired) return !!user && !isAdmin;

    return true;

  });


  // [8] 로그인 회원 역할 글자
  const roleLabel = isAdmin
    ? 'ADMIN'
    : user?.companyType === '물류업체'
      ? 'LOGISTICS'
      : 'USER';


  // [9] 화면
  return (

    <header className="site-header">

      <div className="site-header__inner">

        {/* 로고 */}
        <div
          className="site-header__logo"
          onClick={() => onNavigate('dashboard')}
        >

          <img src={macrossLogo} alt="MACROSS" />

          <span className="site-header__logo-text">
            MACROSS
          </span>

        </div>


        {/* 가운데 메뉴 */}
        <nav className="site-nav">

          {visibleNavItems.map((item) => (

            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={
                currentPage === item.id
                  ? 'site-nav__item is-active'
                  : 'site-nav__item'
              }
            >

              {item.label}

            </button>

          ))}

        </nav>


        {/* 오른쪽 로그인 / 사용자 정보 */}
        <div className="site-header__auth">

          {user ? (

            <div className="user-box">


              {/* 일반 회원 매칭 알림 */}
              {!isAdmin && (

                <div className="matching-notification">


                  {/* 알림 벨 */}
                  <button
                    type="button"
                    className="matching-bell"
                    onClick={toggleNotification}
                  >

                    🔔

                    {matchingCount > 0 && (

                      <span className="matching-bell__count">

                        {matchingCount}

                      </span>

                    )}

                  </button>


                  {/* 알림창 */}
                  {notificationOpen && (

                    <div className="matching-popup">


                      {/* 알림 제목 */}
                      <div className="matching-popup__header">

                        <strong>매칭 알림</strong>

                        <button
                          type="button"
                          onClick={() => setNotificationOpen(false)}
                        >

                          ✕

                        </button>

                      </div>


                      {/* 확인할 매칭이 없으면 */}
                      {matchingCount === 0 ? (

                        <div className="matching-popup__empty">

                          확인할 매칭 알림이 없습니다.

                        </div>

                      ) : (

                        <div className="matching-popup__item">


                          {/* 화주 알림 */}
                          {user.companyType === '수출입기업' && (

                            <>

                              <strong>

                                확인할 매칭 추천이 있습니다!

                              </strong>

                              <p>

                                등록한 화물 조건에 적합한
                                운송사를 찾았습니다.

                              </p>

                              <p>

                                내 매칭에서 추천 업체와
                                매칭 적합도를 확인해 보세요.

                              </p>

                            </>

                          )}


                          {/* 물류기업 알림 */}
                          {user.companyType === '물류업체' && (

                            <>

                              <strong>

                                확인할 매칭 요청이 있습니다!

                              </strong>

                              <p>

                                화주기업으로부터 매칭 요청이
                                도착했습니다.

                              </p>

                              <p>

                                내 매칭에서 요청 내용을 확인하고
                                수락하거나 거절할 수 있습니다.

                              </p>

                            </>

                          )}


                          {/* 알림 건수 */}
                          <div className="matching-popup__status">

                            확인할 매칭 {matchingCount}건

                          </div>


                          {/* 내 매칭으로 이동 버튼 */}
                          <button
                            type="button"
                            className="matching-popup__go-btn"
                            onClick={goToMyMatching}
                          >

                            내 매칭 확인하기 →

                          </button>

                        </div>

                      )}

                    </div>

                  )}

                </div>

              )}


              {/* 사용자 프로필 */}
              <div className="user-box__profile">

                <button
                  type="button"
                  onClick={() => onNavigate('mypage')}
                  className={
                    currentPage === 'mypage'
                      ? 'user-box__avatar is-active'
                      : 'user-box__avatar'
                  }
                  title="마이페이지"
                  aria-label="마이페이지"
                >

                  {user.name ? user.name.charAt(0) : '?'}

                </button>

                <span className={
                  isAdmin
                    ? 'user-box__role is-admin'
                    : 'user-box__role'
                }>

                  {roleLabel}

                </span>

              </div>


              {/* 로그아웃 */}
              <button
                onClick={onLogout}
                className="logout-btn"
              >

                로그아웃

              </button>

            </div>

          ) : (

            <button
              onClick={onLoginClick}
              className="login-btn"
            >

              로그인

            </button>

          )}

        </div>

      </div>

    </header>

  );

}
