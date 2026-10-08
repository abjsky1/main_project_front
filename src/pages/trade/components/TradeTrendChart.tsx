import { useEffect, useState } from 'react';
import axios from 'axios';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { axisTick } from '../../../styles/chartTheme';

// 월별 수출입 · 무역수지 그래프 (Spring /api/cumulative/monthly)
// 무역 데이터 분석 > 환율 동향 탭의 왼쪽 반 (예전에는 첫 화면 아래에 있었음)
interface TradeTrendChartProps {
  year: number;
}

// Spring MonthlyTradeDto 응답 구조
interface MonthlyTradeResponse {
  year: number;
  month: number;
  expDlr: number;
  impDlr: number;
  balPayments: number;
}

// 차트에서 사용할 데이터 구조
interface MonthlyChartData {
  month: string;
  export: number | null;
  import: number | null;
  balance: number | null;
}

// 그래프에 마우스를 올렸을 때 표시하는 말풍선
// Recharts 가 이 컴포넌트를 직접 불러서 props 를 넣어 줌
//   active  : 마우스가 그래프 위에 있는지
//   payload : 그 위치의 값들 배열 (수출, 수입, 무역수지 — 각각 name, value, color 를 가짐)
//   label   : 그 위치의 x축 글자 (예: '3월')
// [TS] any : 라이브러리가 넣어 주는 값이라 타입 검사를 생략 (가이드 2-8)
const TrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__title">{label}</p>

      {payload.map((entry: any) => (
        <p
          key={entry.dataKey}
          className="chart-tooltip__row"
          style={{ color: entry.color }}
        >
          {entry.name}:{' '}
          {typeof entry.value === 'number'
            ? entry.value.toLocaleString('ko-KR', {
                maximumFractionDigits: 1,
              })
            : '—'}
          억 달러
        </p>
      ))}
    </div>
  );
};

export default function TradeTrendChart({
  year,
}: TradeTrendChartProps) {
  const [chartData, setChartData] =
    useState<MonthlyChartData[]>([]);

  // 화면에서 다른 연도의 이전 데이터가 표시되는 것을 방지
  const [loadedYear, setLoadedYear] =
    useState<number | null>(null);

  // year 가 바뀔 때마다 월별 데이터 다시 조회
  useEffect(() => {
    // ignore : 화면을 떠났거나 year 가 바뀌어서 "이 응답은 이제 필요 없다"는 표시 (가이드 3-4)
    let ignore = false;

    async function fetchMonthlyTrade() {
      setChartData([]);
      setLoadedYear(null);

      try {
        // { data } : 응답 객체에서 data 칸만 꺼내기 (구조분해 — response.data 와 같음)
        const { data } =
          await axios.get<MonthlyTradeResponse[]>(
            '/api/cumulative/monthly',
            {
              params: { year },
            }
          );

        // 응답에 존재하는 마지막 월까지 차트 구성 (예: 9월까지 있으면 1월 ~ 9월)
        let lastMonth = 0;
        for (const item of data) {
          lastMonth = Math.max(lastMonth, item.month);
        }

        const converted: MonthlyChartData[] = [];
        for (let month = 1; month <= lastMonth; month++) {
          // 이 달의 응답 찾기 (같은 달이 두 번 오면 뒤의 것을 사용, 없으면 undefined)
          let item: MonthlyTradeResponse | undefined;
          for (const d of data) {
            if (d.month === month) item = d;
          }

          // 응답이 없는 달은 null → 그래프에서 빈칸으로 표시
          converted.push({
            month: `${month}월`,
            export: item?.expDlr ?? null,
            import: item?.impDlr ?? null,
            balance: item?.balPayments ?? null,
          });
        }

        if (!ignore) {
          setChartData(converted);
          setLoadedYear(year);
        }
      } catch (error) {
        if (!ignore) {
          console.error('월별 수출입 조회 실패:', error);
        }
      }
    }

    fetchMonthlyTrade();

    // 정리 함수 : 화면을 떠나거나 year 가 바뀌면 이전 응답은 무시
    return () => {
      ignore = true;
    };
  }, [year]);

  // 지금 year 의 데이터일 때만 그래프에 표시
  const visibleData = loadedYear === year ? chartData : [];

  return (
    <div className="trend-section">
      <div className="trend-section__head">
        <div>
          <p className="eyebrow">Trade Trend</p>

          <h2 className="trend-section__title">
            수출입 추이 ({year})
          </h2>

          <p className="trend-section__unit">
            단위: 억 달러
          </p>
        </div>

        <div className="chart-legend">
          <span className="chart-legend__item">
            <span className="legend-box legend-box--export" />
            수출
          </span>

          <span className="chart-legend__item">
            <span className="legend-box legend-box--import" />
            수입
          </span>

          <span className="chart-legend__item">
            <span className="legend-line legend-line--balance" />
            무역수지
          </span>
        </div>
      </div>

      <div className="trend-section__accent" />

      {/* Recharts 그래프
          ResponsiveContainer : 부모 너비에 맞춰 그래프 크기 자동 조절
          ComposedChart       : 막대(Bar) + 선(Line) 을 한 그래프에 같이 그림
          dataKey             : data 배열의 각 객체에서 어떤 칸을 그릴지 (예: 'export' 칸 = 수출)
          yAxisId             : 막대는 왼쪽 축(bar), 무역수지 선은 오른쪽 축(line) 기준 */}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={visibleData}
          margin={{
            top: 5,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(100,50,220,0.07)"
            vertical={false}
          />

          <XAxis
            dataKey="month"
            tick={axisTick(11)}
            axisLine={false}
            tickLine={false}
          />

          {/* 수출입 금액에 맞춰 축 범위 자동 조정 */}
          <YAxis
            yAxisId="bar"
            tick={axisTick(11)}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
          />

          {/* 음수 무역수지도 표시할 수 있도록 자동 조정 */}
          <YAxis
            yAxisId="line"
            orientation="right"
            tick={axisTick(11)}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />

          <Tooltip content={<TrendTooltip />} />

          <Bar
            yAxisId="bar"
            dataKey="export"
            name="수출"
            fill="#9333ea"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            opacity={0.9}
          />

          <Bar
            yAxisId="bar"
            dataKey="import"
            name="수입"
            fill="#d1d5e8"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />

          <Line
            yAxisId="line"
            type="monotone"
            dataKey="balance"
            name="무역수지"
            stroke="#06b6d4"
            strokeWidth={2.5}
            connectNulls={false}
            dot={{ r: 3, fill: '#06b6d4' }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}