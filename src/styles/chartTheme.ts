// Recharts(그래프)는 CSS 클래스가 아니라 props로 색/글꼴을 받기 때문에
// 그래프에서 반복해서 쓰는 스타일 값을 여기에 모아둠

export const CHART_FONT = 'Plus Jakarta Sans';

// 축 눈금 글자 스타일 (fontSize만 다르게 쓰는 경우가 많아서 함수로 제공)
// (fontSize = 11, ...) : 값을 안 넘기면 기본값 11 사용 → axisTick() 또는 axisTick(10) 처럼 호출
// => ({ ... }) : 객체를 바로 돌려주는 화살표 함수
export const axisTick = (fontSize = 11, fontFamily = CHART_FONT) => ({
  fontSize,
  fill: '#9090a8',
  fontFamily,
});

// 마우스를 올렸을 때 뜨는 기본 툴팁 박스 스타일
export const tooltipBoxStyle = (fontSize = 11, borderRadius = 10, fontFamily = CHART_FONT) => ({
  fontSize,
  borderRadius,
  border: '1px solid #eaeaf2',
  fontFamily,
});
