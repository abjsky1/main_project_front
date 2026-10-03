interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
}

// 표 위의 "필터" 토글 버튼
export default function FilterButton({ active, onClick }: FilterButtonProps) {
  return (
    <button onClick={onClick} className={active ? 'filter-btn is-active' : 'filter-btn'}>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 4h12M4 8h8M6 12h4" />
      </svg>
      필터
    </button>
  );
}
