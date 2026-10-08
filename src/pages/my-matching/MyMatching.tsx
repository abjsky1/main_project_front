/* =====================================================================
   내 매칭 (주소: /my-matching , 기업 회원 전용) — 교수님 피드백의 새 매칭 흐름 예시 화면
   - 화주(수출입기업) : 자동 매칭으로 추천된 운송사 목록 → 상세보기에서 매칭 요청 / 거절
   - 운송사(물류업체) : 화주가 보낸 매칭 요청 목록 → 상세보기에서 수락 / 거절
   - 둘 다 수락하면 관리자 최종 확인으로 넘어감 (관리자 화면 연결은 백엔드 구현 후)
   ⚠️ 지금은 더미 데이터(myMatchingData.ts)로 동작하는 회의용 예시
   ===================================================================== */
import { useNavigate } from 'react-router-dom';
import type { User } from '../../types/user';
import { PAGE_PATHS } from '../../routes';
import PageHeader from '../../components/common/PageHeader';
import AccessGuard from '../../components/common/AccessGuard';
import { getStage } from './myMatchingData';
import useMyMatchingDemo from './useMyMatchingDemo';
import FlowGuide from './components/FlowGuide';
import ShipperMatchList from './components/ShipperMatchList';
import LogisticsRequestList from './components/LogisticsRequestList';
import './MyMatching.css';

export default function MyMatching({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const { matches, resetDemo } = useMyMatchingDemo();

  // 기업 회원(수출입기업·물류업체)이 아니면 안내 화면 (로그인 안 했거나 관리자인 경우)
  if (!user || user.role === 'admin') {
    return (
      <div className="page-container">
        <PageHeader eyebrow="My Matching" title="내 매칭" className="page-header--compact" />
        <AccessGuard icon="users" short description="내 매칭은 기업 회원(수출입기업·물류업체)만 이용할 수 있습니다." />
      </div>
    );
  }

  const isShipper = user.companyType === '수출입기업';

  // 내 것만 고르기
  // - 화주   : 내 화물 조건의 추천 운송사 전체
  // - 운송사 : 나에게 온 것 중 화주가 실제로 요청을 보낸 것만 (추천만 된 단계는 운송사에게 안 보임)
  const myMatches = isShipper
    ? matches.filter((m) => m.shipperMemberId === user.memberId)
    : matches.filter((m) => m.logisticsMemberId === user.memberId && getStage(m) !== 'recommended' && getStage(m) !== 'shipperRejected');

  // 상세 페이지로 이동 (주소 예: /my-matching/1001 — 상세 페이지가 useParams 로 번호를 꺼냄)
  const openDetail = (matchId: number) => navigate(`${PAGE_PATHS['my-matching']}/${matchId}`);

  // [데모 초기화] : 시연 전에 처음 상태로 되돌리기
  const handleReset = () => {
    if (window.confirm('데모 데이터를 처음 상태로 되돌릴까요? (요청 · 수락 · 거절한 내용이 모두 초기화됩니다)')) resetDemo();
  };

  return (
    <div className="page-container">
      <div className="mm-head">
        <PageHeader
          eyebrow="My Matching"
          title="내 매칭"
          subtitle={isShipper
            ? '자동 매칭으로 찾은 운송사를 비교하고, 마음에 드는 곳에 매칭을 요청하세요.'
            : '화주가 보낸 매칭 요청을 확인하고 수락하거나 거절하세요.'}
        />
        <button onClick={handleReset} className="mm-reset-btn">데모 초기화</button>
      </div>

      {/* 새 매칭 흐름 안내 (내가 하는 단계 강조) */}
      <FlowGuide viewer={isShipper ? 'shipper' : 'logistics'} />

      <p className="mm-demo-note">
        회의용 예시 화면입니다. 더미 데이터로 동작하고, 관리자 최종 확인 화면 연결은 백엔드 구현 후에 진행합니다.
      </p>

      {/* 내 매칭이 없을 때 : 데모 계정 안내 */}
      {myMatches.length === 0 && (
        <div className="mm-empty">
          <p>{isShipper ? '아직 매칭 결과가 없습니다.' : '아직 받은 매칭 요청이 없습니다.'}</p>
          <p className="mm-empty__sub">
            예시 데이터는 {isShipper ? 'ybtex@test.com ((주)영보월드와이드)' : 'hmm@logis.com (에이치엠엠(주))'} 계정에 준비되어 있어요.
          </p>
        </div>
      )}

      {myMatches.length > 0 && (isShipper
        ? <ShipperMatchList matches={myMatches} onDetail={openDetail} />
        : <LogisticsRequestList matches={myMatches} onDetail={openDetail} />)}
    </div>
  );
}
