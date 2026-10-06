interface ToggleSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  labelOn?: string;   // 켜짐 쪽 글자 (오른쪽)
  labelOff?: string;  // 꺼짐 쪽 글자 (왼쪽)
}

// "X ( ●) O" 모양의 On/Off 스위치
// labelOn = 'O' : props 를 안 넘기면 기본값 'O' 사용 (구조분해 기본값)
// 누르면 onChange(!value) → 현재 값의 반대(true ↔ false)를 부모에게 알림
export default function ToggleSwitch({ value, onChange, labelOn = 'O', labelOff = 'X' }: ToggleSwitchProps) {
  return (
    <div className="toggle">
      <span className={value ? 'toggle__label' : 'toggle__label is-current'}>{labelOff}</span>
      <button onClick={() => onChange(!value)} className={value ? 'toggle__track is-on' : 'toggle__track'}>
        <span className="toggle__knob" />
      </button>
      <span className={value ? 'toggle__label is-on' : 'toggle__label'}>{labelOn}</span>
    </div>
  );
}
