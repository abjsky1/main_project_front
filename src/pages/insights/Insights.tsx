/* =====================================================================
   맞춤 인사이트 페이지 (주소: /insights , 기업 회원 전용)
   - 상단 : 관심 국가 설정 (최대 3개 , DB 저장 — 예전 마이페이지에서 옮김)
   - 관심 국가마다 인사이트 세트(InsightSet)를 하나씩 그림
     관심 국가 1개 → 1세트 , 2개 → 2세트 , 3개 → 3세트
   - 관심 국가 목록은 App.tsx 가 보관하고 props 로 내려줌
   ===================================================================== */
import type { User } from '../../types/user';
import type { InterestDto } from '../../api/interestApi';
import PageHeader from '../../components/common/PageHeader';
import AccessGuard from '../../components/common/AccessGuard';
import InterestCountryBar from './components/InterestCountryBar';
import InsightSet from './components/InsightSet';
import './Insights.css';

interface InsightsProps {
  user: User | null;
  interests: InterestDto[];                              // 관심 국가 목록 (App 이 보관)
  onInterestsChange: (interests: InterestDto[]) => void; // 추가·삭제 후 App 에 알림
}

export default function Insights({ user, interests, onInterestsChange }: InsightsProps) {
  // 기업 회원(수출입기업·물류업체)이 아니면 안내 화면 (로그인 안 했거나 관리자인 경우)
  if (!user || user.role === 'admin') {
    return (
      <div className="page-container">
        <PageHeader eyebrow="Personalized Insights" title="맞춤 인사이트" className="page-header--compact" />
        <AccessGuard
          icon="users"
          short
          description="맞춤 인사이트는 기업 회원(수출입기업·물류업체)만 이용할 수 있습니다."
        />
      </div>
    );
  }

  // 국가 이름 목록 (이름이 없으면 '국가 #번호')
  const countries = interests.map((interest) => interest.countryName ?? `국가 #${interest.countryId}`);

  return (
    <div className="page-container">
      <PageHeader eyebrow="Personalized Insights" title="맞춤 인사이트" subtitle="관심 국가별 최근 5년 수출입 흐름과 주요 품목입니다." />

      {/* 관심 국가 설정 */}
      <InterestCountryBar memberId={user.memberId} interests={interests} onInterestsChange={onInterestsChange} />

      {/* 관심 국가가 없으면 설정 안내 (안내 화면 모양은 AccessGuard 와 같은 클래스를 빌려 씀) */}
      {countries.length === 0 && (
        <div className="access-guard notice-panel">
          <div className="access-guard__icon access-guard__icon--gradient">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
            </svg>
          </div>
          <div className="access-guard__text">
            <h2 className="access-guard__title">관심 국가를 설정해 주세요</h2>
            <p className="access-guard__desc">위의 [+ 국가 추가]에서 관심 국가를 최대 3개까지 고르면, 국가마다 수출입 추이를 보여드려요.</p>
          </div>
        </div>
      )}

      {/* 관심 국가 개수만큼 같은 모양의 세트를 반복해서 그림 (값만 국가에 따라 다름) */}
      {countries.map((country, index) => (
        <InsightSet key={country} country={country} order={index + 1} />
      ))}
    </div>
  );
}
