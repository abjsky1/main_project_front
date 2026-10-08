/* =====================================================================
   메인 페이지 = 첫 화면 (주소: / , 메뉴 이름 "내 매칭")
   (코드 안의 이름은 예전 이름 그대로 Dashboard / dashboard 사용)
   - 상단 대표 이미지 → 인사말 → 아래 내용은 로그인 상태에 따라 다름
       비회원      : 로그인 안내
       관리자      : 관리자 계정 안내 (매칭 관리 메뉴로 이동)
       기업 회원   : 내 매칭 (pages/my-matching/components/MatchingBoard)
                     매칭 조건이 없으면 매칭 조건 설정 안내
   - 예전 누적 무역 카드 · 수출입 추이 차트는 무역 데이터 분석 페이지로 옮김
   ===================================================================== */
import { useNavigate } from 'react-router-dom';

import type { User } from '../../types/user';
import { PAGE_PATHS } from '../../routes';

import PageHeader from '../../components/common/PageHeader';
import NoticePanel from '../../components/common/NoticePanel';
import MatchingBoard from '../my-matching/components/MatchingBoard';

import heroImage from '../../assets/macross_wide.png';   // 2560×1020 원본 → 1280×510 으로 표시 (고해상도 화면에서 선명)
import './Dashboard.css';

// [TS] App.tsx 에서 받는 props 의 모양 (가이드 2-4)
interface DashboardProps {
  user: User | null;             // 로그인 안 했으면 null
  onLoginClick: () => void;      // 비회원 안내의 [로그인] 버튼 → 로그인 창 열기
}

export default function Dashboard({ user, onLoginClick }: DashboardProps) {
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  // 제목 인사말 : 로그인했으면 'OOO님, 안녕하세요' , 비회원이면 환영 인사
  const greeting = user ? `${user.name}님, 안녕하세요` : 'MACROSS에 오신 것을 환영합니다';

  // 제목 아래 설명 (로그인 상태 / 회원 유형에 따라)
  let subtitle = '화주와 운송사를 자동으로 연결하는 물류 매칭 플랫폼입니다.';
  if (user && isAdmin) subtitle = '관리자 계정';
  if (user && !isAdmin) {
    subtitle = user.companyType === '수출입기업'
      ? `${user.companyName ?? ''} · 내 화물 조건에 맞는 추천 운송사를 비교하고 매칭을 요청하세요.`
      : `${user.companyName ?? ''} · 화주가 보낸 매칭 요청을 확인하고 수락하거나 거절하세요.`;
  }

  return (
    <>
      {/* 대표 이미지 (화주 ↔ Macross ↔ 운송사) — 화면 가로 전체 배너 */}
      <section className="dashboard-hero">
        <div className="dashboard-hero__stage">
          <img
            src={heroImage}
            alt="Macross — 화주와 운송사를 연결하는 물류 매칭 플랫폼"
            width={1280}
            height={510}
            className="dashboard-hero__img"
          />
        </div>
      </section>

      <div className="page-container dashboard-body">
        <PageHeader
          eyebrow="My Matching"
          title={greeting}
          subtitle={subtitle}
          className="dashboard-header"
        />

        {/* 비회원 : 로그인 안내 */}
        {!user && (
          <NoticePanel
            icon="lock"
            title="로그인하고 내 매칭을 확인하세요"
            description="로그인하면 매칭 조건에 맞는 추천 운송사와 받은 매칭 요청을 이곳에서 볼 수 있어요."
            buttonLabel="로그인"
            onButtonClick={onLoginClick}
          />
        )}

        {/* 관리자 : 관리자 계정 안내 */}
        {user && isAdmin && (
          <NoticePanel
            icon="users"
            title="관리자 계정으로 로그인했습니다"
            description="내 매칭은 기업 회원(수출입기업 · 물류업체) 화면입니다. 전체 매칭 진행 상황은 매칭 관리에서 확인하세요."
            buttonLabel="매칭 관리로 이동"
            onButtonClick={() => navigate(PAGE_PATHS.matching)}
          />
        )}

        {/* 기업 회원 : 내 매칭 (조건이 없으면 MatchingBoard 안에서 조건 설정 안내) */}
        {/* key : 다른 회원으로 바뀌면 새로 그림 */}
        {user && !isAdmin && <MatchingBoard key={user.memberId ?? user.email} user={user} />}
      </div>
    </>
  );
}
