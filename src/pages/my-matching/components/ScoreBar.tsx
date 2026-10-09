import type { CSSProperties } from 'react';

interface ScoreBarProps {
  score: number;
  max?: number;      // 만점 (안 넘기면 100)
  label?: string;    // 막대 앞의 항목 이름 (예: '노선')
}

// 점수 막대 (점수 / 만점)
// 막대 길이(%)는 CSS 변수 --fill 로 넘김 (style 로 값을 넘기고 , 그리는 건 CSS 가 함)
// [TS] as CSSProperties : '--fill' 같은 CSS 변수 이름도 style 에 넣을 수 있게 해 주는 표시
export default function ScoreBar({ score, max = 100, label }: ScoreBarProps) {
  const percent = Math.round((score / max) * 100);

  return (
    <div className="mm-score">
      {label && <span className="mm-score__label">{label}</span>}
      <span className="mm-score__track">
        <span className="mm-score__fill" style={{ '--fill': `${percent}%` } as CSSProperties} />
      </span>
      <span className="mm-score__value">
        {score}<small>/{max}</small>
      </span>
    </div>
  );
}
