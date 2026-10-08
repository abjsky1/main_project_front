/* =====================================================================
   맞춤 인사이트 페이지 (주소: /insights , 기업 회원 전용)
   - 마이페이지에서 고른 관심 국가(최대 3개)마다 인사이트 세트(InsightSet)를 하나씩 그림
     관심 국가 1개 → 1세트 , 2개 → 2세트 , 3개 → 3세트
   - 관심 국가 목록은 App.tsx 가 보관하고 props 로 내려줌
   ===================================================================== */
import { useNavigate } from 'react-router-dom';
import type { User } from '../../types/user';
import { PAGE_PATHS } from '../../routes';
import PageHeader from '../../components/common/PageHeader';
import AccessGuard from '../../components/common/AccessGuard';
import InsightSet from './components/InsightSet';
import './Insights.css';

interface InsightsProps {
  user: User | null;
  countries: string[];   // 관심 국가 목록 (마이페이지에서 설정)
}

export default function Insights({ user, countries }: InsightsProps) {
  const navigate = useNavigate();

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

  return (
    <div className="page-container">
      <div className="insights-head">
        <PageHeader eyebrow="Personalized Insights" title="맞춤 인사이트" subtitle="관심 국가별 최근 5년 수출입 흐름과 주요 품목입니다." />
        {/* 관심 국가가 있을 때만 [관심 국가 변경] 버튼 표시 */}
        {countries.length > 0 && (
          <button onClick={() => navigate(PAGE_PATHS.mypage)} className="insights-edit-btn">
            관심 국가 변경
          </button>
        )}
      </div>

      {/* 관심 국가가 없으면 설정 안내 (안내 화면 모양은 AccessGuard 와 같은 클래스를 빌려 씀) */}
      {countries.length === 0 && (
        <div className="access-guard access-guard--short">
          <div className="access-guard__icon access-guard__icon--gradient">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
            </svg>
          </div>
          <div className="access-guard__text">
            <h2 className="access-guard__title">관심 국가를 설정해 주세요</h2>
            <p className="access-guard__desc">마이페이지에서 관심 국가를 최대 3개까지 고르면, 국가마다 수출입 추이를 보여드려요.</p>
          </div>
          <button onClick={() => navigate(PAGE_PATHS.mypage)} className="access-guard__button">
            관심 국가 설정하기
          </button>
        </div>
      )}

      {/* 관심 국가 개수만큼 같은 모양의 세트를 반복해서 그림 (값만 국가에 따라 다름) */}
      {countries.map((country, index) => (
        <InsightSet key={country} country={country} order={index + 1} />
      ))}
    </div>
  );
}
