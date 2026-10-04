import type { Page, User } from '../../types/user';
import macrossLogo from '../../assets/main-reference.png';
import './Header.css';
import axios from 'axios';
import { useEffect, useState } from 'react';

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

interface MatchingNotification {
  matchingId: number;

  shipperCompanyName: string;
  shipperContactName: string;
  shipperBizNumber: string;
  shipperPhone: string;
  shipperAddress: string;

  logisticsCompanyName: string;
  logisticsContactName: string;
  logisticsBizNumber: string;
  logisticsPhone: string;
  logisticsAddress: string;

  totalScore: number;

  adminStatus: string;
  shipperStatus: string;
  logisticsStatus: string;
  finalStatus: string;

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

  // 응답해야 할 매칭 알림 개수
  const [matchingCount, setMatchingCount] = useState(0);

  // 매칭 알림 목록
  const [matchingList, setMatchingList] =
    useState<MatchingNotification[]>([]);

  // 알림창 열림 여부
  const [notificationOpen, setNotificationOpen] =
    useState(false);


  // 로그인 회원의 승인된 매칭 조회
  const matchingRead = async () => {

    // 로그인 안 했거나 관리자면 조회하지 않음
    if (!user?.memberId || isAdmin) {
      setMatchingCount(0);
      setMatchingList([]);
      return;
    }

    try {

      const response = await axios.get(
        `/api/matching/member/${user.memberId}`
      );

      const data: MatchingNotification[] = response.data;

      // 알림 목록 저장
      setMatchingList(data);


      // 수출입기업
      if (user.companyType === '수출입기업') {

        const count = data.filter(
          (matching) =>
            matching.shipperStatus === 'WAITING' &&
            matching.finalStatus === 'PENDING'
        ).length;

        setMatchingCount(count);

      }


      // 물류기업
      if (user.companyType === '물류업체') {

        const count = data.filter(
          (matching) =>
            matching.logisticsStatus === 'WAITING' &&
            matching.finalStatus === 'PENDING'
        ).length;

        setMatchingCount(count);

      }

    } catch (error) {

      console.log('매칭 알림 조회 실패 : ', error);

    }

  };


  // 로그인 회원이 바뀌면 조회
  useEffect(() => {

    matchingRead();

  }, [user?.memberId, user?.companyType, isAdmin]);

  // 매칭 수락
  const matchingAccept = async (matchingId: number) => {

    try {

      let response;

      // 수출입기업
      if (user?.companyType === '수출입기업') {

        response = await axios.post(
          `/api/matching/shipper/accept/${matchingId}`
        );

      }

      // 물류기업
      else if (user?.companyType === '물류업체') {

        response = await axios.post(
          `/api/matching/logistics/accept/${matchingId}`
        );

      } else {

        return;

      }


      if (response.data === true) {

        alert('매칭을 수락했습니다.');

        // 상태 다시 조회
        await matchingRead();

      } else {

        alert('매칭 수락에 실패했습니다.');

      }

    } catch (error) {

      console.log('매칭 수락 실패 : ', error);
      alert('매칭 수락 중 오류가 발생했습니다.');

    }

  };


  // 매칭 거절
  const matchingReject = async (matchingId: number) => {

    const result =
      window.confirm('정말 이 매칭을 거절하시겠습니까?');

    if (!result) {
      return;
    }

    try {

      let response;

      // 수출입기업
      if (user?.companyType === '수출입기업') {

        response = await axios.post(
          `/api/matching/shipper/reject/${matchingId}`
        );

      }

      // 물류기업
      else if (user?.companyType === '물류업체') {

        response = await axios.post(
          `/api/matching/logistics/reject/${matchingId}`
        );

      } else {

        return;

      }


      if (response.data === true) {

        alert('매칭을 거절했습니다.');

        // 상태 다시 조회
        await matchingRead();

      } else {

        alert('매칭 거절에 실패했습니다.');

      }

    } catch (error) {

      console.log('매칭 거절 실패 : ', error);
      alert('매칭 거절 중 오류가 발생했습니다.');

    }

  };

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
              className={currentPage === item.id ? 'site-nav__item is-active' : 'site-nav__item'}>
              {item.label}
            </button>
          ))}
        </nav>

        {/* 오른쪽: 로그인 / 사용자 정보 */}
        <div className="site-header__auth">
          {user ? (
            <div className="user-box">
              {/* 일반회원 매칭 알림 */}
              {!isAdmin && (

                <div className="matching-notification">

                  {/* 알림 벨 */}
                  <button
                    className="matching-bell"
                    onClick={() => setNotificationOpen(!notificationOpen)}>

                    🔔 {matchingCount > 0 && (
                      <span className="matching-bell__count">
                        {matchingCount} </span>)}

                  </button>

                  {/* 알림 팝업 */}
                  {notificationOpen && (

                    <div className="matching-popup">

                      <div className="matching-popup__header">

                        <strong>매칭 알림</strong>

                        <button
                          onClick={() => setNotificationOpen(false)}>

                          ✕

                        </button>

                      </div>

                      {matchingList.length === 0 ? (

                        <div className="matching-popup__empty">
                          도착한 매칭 알림이 없습니다.
                        </div> ) : ( matchingList.map((matching) => {

                          // 수출입기업 여부
                          const isShipper =
                            user.companyType === '수출입기업';

                          // 현재 로그인 회원의 응답 상태
                          const myStatus = isShipper
                            ? matching.shipperStatus
                            : matching.logisticsStatus;
                          return (
                            <div
                              key={matching.matchingId}
                              className="matching-popup__item">
                              <div className="matching-popup__score">
                                매칭 적합도: {matching.totalScore}점
                              </div>
                              {/* 수출입기업은 물류기업 정보를 봄 */}
                              {isShipper ? (
                                <>
                                  <strong>
                                    {matching.logisticsCompanyName}
                                  </strong>

                                  <p>
                                    담당자 : {matching.logisticsContactName}
                                  </p>

                                  <p>
                                    전화번호 : {matching.logisticsPhone}
                                  </p>

                                  <p>
                                    사업자번호 : {matching.logisticsBizNumber}
                                  </p>

                                  <p>
                                    주소 : {matching.logisticsAddress}
                                  </p>
                                </>) : (
                                /* 물류기업은 수출입기업 정보를 봄 */
                                <>
                                  <strong>
                                    {matching.shipperCompanyName}
                                  </strong>
                                  <p>
                                    담당자 : {matching.shipperContactName}
                                  </p>
                                  <p>
                                    전화번호 : {matching.shipperPhone}
                                  </p>
                                  <p>
                                    사업자번호 : {matching.shipperBizNumber}
                                  </p>
                                  <p>
                                    주소 : {matching.shipperAddress}
                                  </p>
                                </>
                              )}
                              {/* 아직 응답 전 */}
                              {myStatus === 'WAITING' &&
                              matching.finalStatus === 'PENDING' ? (

                                <div className="matching-popup__buttons">

                                  <button
                                    className="matching-accept-btn"
                                    onClick={() =>
                                      matchingAccept(matching.matchingId)
                                    }>
                                    수락
                                  </button>

                                  <button className="matching-reject-btn"
                                    onClick={() => matchingReject(matching.matchingId)}>

                                    거절

                                  </button>

                                </div> ) : ( <div className="matching-popup__status">
                                  {matching.finalStatus === 'COMPLETED'
                                    ? '✓ 매칭 성사'
                                    : matching.finalStatus === 'FAILED'
                                    ? '매칭 종료'
                                    : myStatus === 'ACCEPTED'
                                    ? '✓ 수락 완료 · 상대 기업 응답 대기'
                                    : myStatus === 'REJECTED'
                                    ? '거절 완료'
                                    : '응답 대기'}
                                </div>

                              )}

                            </div>

                          );

                        })

                      )}

                    </div>

                  )}

                </div>

              )}
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
