import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { axisTick, tooltipBoxStyle } from '../../../styles/chartTheme';
import { topHsData, yearlyTradeData, type TopHsItem } from '../insightsData';

interface InsightSetProps {
  country: string;   // 관심 국가 이름
  order: number;     // 몇 번째 관심 국가인지 (1, 2, 3)
}

// 수출/수입 상위 HS 코드 한 줄
function HsRankItem({ item, kind }: { item: TopHsItem; kind: 'export' | 'import' }) {
  return (
    <div className={`hs-rank__item hs-rank__item--${kind}`}>
      <div>
        <p className="hs-rank__code">{item.code}</p>
        <p className="hs-rank__name">{item.name}</p>
      </div>
      <p className="hs-rank__value">{item.value.toLocaleString()}</p>
    </div>
  );
}

// 관심 국가 1개에 대한 인사이트 세트 (수출입 추이 / 무역수지 추이 / 수출·수입 Top 2)
// Insights.tsx 가 관심 국가 개수만큼 이 컴포넌트를 반복해서 그림 → 모양은 같고 값만 국가에 따라 바뀜
export default function InsightSet({ country, order }: InsightSetProps) {
  // 이 국가의 더미 데이터 (같은 국가면 항상 같은 값 — insightsData.ts)
  const yearData = yearlyTradeData([country]);
  const { exportTop, importTop } = topHsData(country);

  return (
    <section className="insight-set">
      <p className="eyebrow insights__title">관심 국가 {order}</p>
      <h2 className="insight-set__country">{country}</h2>

      <div className="insights__grid">
        {/* 왼쪽: 최근 5년 수출입액 */}
        <div className="insight-card insight-card--purple">
          <p className="insight-card__label">수출입 추이</p>
          <h3 className="insight-card__title">최근 5년 수출입액</h3>
          <div className="insight-card__chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,50,220,0.07)" vertical={false} />
                <XAxis dataKey="year" tick={axisTick(10)} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick(9)} axisLine={false} tickLine={false} />
                {/* formatter : 말풍선 글자 바꾸기. (값, 이름) 을 받아서 [보여줄 값, 보여줄 이름] 배열을 돌려줌 */}
                <Tooltip contentStyle={tooltipBoxStyle()} formatter={(v: any, n: any) => [`${v?.toLocaleString()}백만$`, n === 'export' ? '수출' : '수입']} />
                <Line type="monotone" dataKey="export" name="export" stroke="#9333ea" strokeWidth={2} dot={{ r: 3, fill: '#9333ea' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="import" name="import" stroke="#9090a8" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3, fill: '#9090a8' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="insight-card__legend">
            <span className="chart-legend__item"><span className="legend-line legend-line--export" />수출</span>
            <span className="chart-legend__item"><span className="legend-line legend-line--dashed" />수입</span>
          </div>
        </div>

        {/* 가운데: 최근 5년 무역수지 */}
        <div className="insight-card insight-card--cyan">
          <p className="insight-card__label">무역수지 추이</p>
          <h3 className="insight-card__title">최근 5년 무역수지</h3>
          <div className="insight-card__chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.1)" vertical={false} />
                <XAxis dataKey="year" tick={axisTick(10)} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick(9)} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipBoxStyle()} formatter={(v: any) => [`${v >= 0 ? '+' : ''}${v?.toLocaleString()}백만$`, '무역수지']} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="무역수지"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  // dot : 점을 직접 그리는 함수. Recharts 가 점마다 위치(cx, cy)와 그 해의 데이터(payload)를 넣어 줌
                  //       흑자(0 이상)면 빨간 점, 적자면 초록 점
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    return <circle key={cx} cx={cx} cy={cy} r={4} fill={payload.balance >= 0 ? '#d93025' : '#1a9e5c'} stroke="none" />;
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="insight-card__legend insight-card__legend--tight">
            <span className="legend-line legend-line--balance" />무역수지 (점: <span className="legend-surplus">▲흑자</span> / <span className="legend-deficit">▼적자</span>)
          </div>
        </div>

        {/* 오른쪽: 수출/수입 Top 2 HS 코드 */}
        <div className="insight-card insight-card--white">
          <div className="hs-rank">
            <p className="hs-rank__label hs-rank__label--export">수출 Top 2</p>
            {exportTop.map((h) => <HsRankItem key={h.code} item={h} kind="export" />)}
            <p className="hs-rank__label hs-rank__label--import">수입 Top 2</p>
            {importTop.map((h) => <HsRankItem key={h.code} item={h} kind="import" />)}
          </div>
        </div>
      </div>
    </section>
  );
}
