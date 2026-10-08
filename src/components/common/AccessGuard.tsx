import { useNavigate } from 'react-router-dom';
import { PAGE_PATHS } from '../../routes';

// [TS] short?: boolean → 없어도 되는 props. JSX 에서 <AccessGuard short /> 처럼 값 없이 쓰면 true
interface AccessGuardProps {
  icon: 'lock' | 'users';
  description: string;      // 어떤 권한이 필요한지 안내 문구
  short?: boolean;          // true면 높이를 조금 낮게 (50vh)
  gradientIcon?: boolean;   // true면 아이콘 배경을 그라데이션으로
}

// 접근 권한이 없을 때 페이지 대신 보여주는 안내 화면
// (메뉴에 안 보이는 페이지도 주소창에 직접 치면 들어올 수 있어서, 각 페이지 안에서 한 번 더 막음)
// 로그인은 오른쪽 위 헤더 버튼으로 하면 되므로, 여기서는 홈(대시보드)으로 돌아가는 버튼만 제공
export default function AccessGuard({ icon, description, short, gradientIcon }: AccessGuardProps) {
  const navigate = useNavigate();

  return (
    <div className={short ? 'access-guard access-guard--short' : 'access-guard'}>
      <div className={gradientIcon ? 'access-guard__icon access-guard__icon--gradient' : 'access-guard__icon'}>
        {icon === 'lock' ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
          </svg>
        )}
      </div>
      <div className="access-guard__text">
        <h2 className="access-guard__title">접근 권한이 없습니다</h2>
        <p className="access-guard__desc">{description}</p>
      </div>
      <button onClick={() => navigate(PAGE_PATHS.dashboard)} className="access-guard__button">
        홈으로 돌아가기
      </button>
    </div>
  );
}
