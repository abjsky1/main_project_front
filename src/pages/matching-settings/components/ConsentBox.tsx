interface ConsentBoxProps {
  checked: boolean;
  onToggle: () => void;
}

// 매칭 서비스 참여 동의 체크 박스
// 체크 상태(checked)는 부모(MatchingSettings)가 보관하고 (브라우저에도 저장) , 누르면 onToggle 로 알림
export default function ConsentBox({ checked, onToggle }: ConsentBoxProps) {
  return (
    <div className={checked ? 'consent-box is-checked' : 'consent-box'}>
      <button onClick={onToggle} className="consent-box__check">
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="white"><path d="M1 4l3 3 5-6" strokeWidth="2" stroke="white" fill="none" /></svg>}
      </button>
      <div>
        <p className="consent-box__title">매칭 서비스 참여 동의</p>
        <p className="consent-box__desc">MACROSS AI 매칭 서비스에 참여하여 적합한 파트너를 추천받는 데 동의합니다. 등록한 매칭 조건은 자동 매칭에 사용되고 , 매칭된 상대 기업에게 공개됩니다.</p>
      </div>
      {checked && <span className="consent-box__badge">동의됨</span>}
    </div>
  );
}
