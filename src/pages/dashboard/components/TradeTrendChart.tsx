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

  useEffect(() => {
    let ignore = false;

    async function fetchMonthlyTrade() {
      setChartData([]);
      setLoadedYear(null);

      try {
        const { data } =
          await axios.get<MonthlyTradeResponse[]>(
            '/api/cumulative/monthly',
            {
              params: { year },
            }
          );

        // 응답을 월 번호로 찾을 수 있게 변환
        const monthlyMap = new Map(
          data.map((item) => [item.month, item])
        );

        // 응답에 존재하는 마지막 월까지 차트 구성
        const lastMonth = data.reduce(
          (max, item) => Math.max(max, item.month),
          0
        );

        const converted: MonthlyChartData[] =
          Array.from({ length: lastMonth }, (_, index) => {
            const month = index + 1;
            const item = monthlyMap.get(month);

            return {
              month: `${month}월`,
              export: item?.expDlr ?? null,
              import: item?.impDlr ?? null,
              balance: item?.balPayments ?? null,
            };
          });

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

    return () => {
      ignore = true;
    };
  }, [year]);

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

      <div className="trend-section__separator" />
    </div>
  );
}