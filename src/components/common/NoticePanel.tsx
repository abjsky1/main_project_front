// 안내 상자 (아이콘 + 제목 + 설명 + 버튼 1개) — 메인 페이지의 "로그인 해 주세요" , "매칭 조건을 설정해 주세요" 등
// 모양은 AccessGuard 와 같은 클래스를 쓰고 , 높이만 낮게 (.notice-panel)
interface NoticePanelProps {
  icon: 'lock' | 'users' | 'route';
  title: string;
  description: string;
  buttonLabel?: string;        // 없으면 버튼을 그리지 않음
  onButtonClick?: () => void;
}

export default function NoticePanel({ icon, title, description, buttonLabel, onButtonClick }: NoticePanelProps) {
  return (
    <div className="access-guard notice-panel">
      <div className="access-guard__icon access-guard__icon--gradient">
        {icon === 'lock' && (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        )}
        {icon === 'users' && (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
          </svg>
        )}
        {icon === 'route' && (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.5">
            <circle cx="6" cy="19" r="2.5" />
            <circle cx="18" cy="5" r="2.5" />
            <path d="M8.5 19H16a3.5 3.5 0 000-7H8a3.5 3.5 0 010-7h7.5" />
          </svg>
        )}
      </div>
      <div className="access-guard__text">
        <h2 className="access-guard__title">{title}</h2>
        <p className="access-guard__desc">{description}</p>
      </div>
      {buttonLabel && (
        <button onClick={onButtonClick} className="access-guard__button">
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
