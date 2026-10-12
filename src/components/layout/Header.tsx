
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


  // [1] 확인할 전체 매칭 알림 개수 (알림창 안에서 표시)
  const [matchingCount, setMatchingCount] = useState(0);

  // [2] 아직 읽지 않은 알림 개수 (벨 위 숫자)
  const [unreadCount, setUnreadCount] = useState(0);

  // [3] 알림창 열림 여부
  const [notificationOpen, setNotificationOpen] = useState(false);

  // [4] 로그인 회원별 읽은 알림 ID를 브라우저에 저장
  const readKey = (memberId: string) => `macross:read-matching-notifications:${memberId}`;

  const getReadIds = (memberId: string): number[] => {
    try {
      const saved = localStorage.getItem(readKey(memberId));
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.filter((id): id is number => typeof id === 'number')
        : [];
    } catch {
      return [];
    }
  };

  // [5] 로그인 회원의 매칭 알림 조회
  // markAsRead가 true이면 지금 조회된 알림을 '읽음' 처리
  const matchingRead = async (markAsRead = false) => {

    if (!user?.memberId || isAdmin) {
      setMatchingCount(0);
      setUnreadCount(0);
      return;
    }

    try {
      const response = await axios.get<MatchingNotification[]>(
        `/api/matching/member/${user.memberId}`,
        { withCredentials: true }
      );

      const data = response.data;

      // 현재 로그인한 회원에게 해당하는 미처리 매칭만 알림 대상
      let notifications: MatchingNotification[] = [];

      if (user.companyType === '수출입기업') {
        notifications = data.filter((matching) =>
          matching.shipperStatus === 'WAITING'
          && matching.finalStatus === 'PENDING'
        );
      } else if (user.companyType === '물류업체') {
        notifications = data.filter((matching) =>
          matching.shipperStatus === 'ACCEPTED'
          && matching.logisticsStatus === 'WAITING'
          && matching.finalStatus === 'PENDING'
        );
      }

      // 알림창에는 '확인할 매칭' 전체 건수를 계속 표시
      setMatchingCount(notifications.length);

      const readIds = getReadIds(user.memberId);
      const ids = notifications.map((matching) => matching.matchingId);

      if (markAsRead) {
        // 벨을 열었을 때 현재 알림들을 확인한 것으로 기록
        const updated = Array.from(new Set([...readIds, ...ids]));
        try {
          localStorage.setItem(readKey(user.memberId), JSON.stringify(updated));
        } catch {
          // 저장이 막혀 있더라도 현재 화면의 숫자는 지움
        }
        setUnreadCount(0);
      } else {
        // 과거에 확인한 알림은 빼고 새로운 매칭만 숫자에 표시
        setUnreadCount(ids.filter((id) => !readIds.includes(id)).length);
      }

    } catch (error) {
      console.log('매칭 알림 조회 실패 : ', error);
      setMatchingCount(0);
      setUnreadCount(0);
    }
  };

  // [6] 로그인 회원이 변경되면 알림 다시 조회
  useEffect(() => {
    setMatchingCount(0);
    setUnreadCount(0);
    setNotificationOpen(false);
    matchingRead();
  }, [user?.memberId, user?.companyType, isAdmin]);

  // [7] 알림창 열기 / 닫기
  const toggleNotification = () => {
    if (!notificationOpen) {
      // 클릭 즉시 벨 위 숫자를 없애고, 최신 목록도 읽음 처리
      setUnreadCount(0);
      matchingRead(true);
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

                    {unreadCount > 0 && (

                      <span className="matching-bell__count">

                        {unreadCount}

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
