import { useEffect, useState } from 'react';
import axios from 'axios';

import type { User } from '../../types/user';
import type { KpiStat } from './dashboardData';

import PageHeader from '../../components/common/PageHeader';
import StatCard from './components/StatCard';
import TradeTrendChart from './components/TradeTrendChart';
import PersonalInsights from './components/PersonalInsights';

import heroImage from '../../assets/macross_wide.png';   // 2560×1020 원본 → 1280×510 으로 표시 (고해상도 화면에서 선명)
import './Dashboard.css';

interface DashboardProps {
  user: User | null;
  matchingCountries: string[];
}

// Spring TradestatusDto 응답 구조
interface TradestatusResponse {
  year: number;
  throughMonth: number;

  expDlr: number;
  impDlr: number;
  balPayments: number;

  expDlrRate: number | null;
  impDlrRate: number | null;
  balPaymentsRate: number | null;
}

// 조회할 연도
const TRADE_YEAR = 2026;

// 임시 환율 카드 — 실제 API 연결 전까지 표시
const EXCHANGE_CARD: KpiStat = {
  label: '당일 환율',
  value: '1,318',
  unit: '원/USD',
  change: -0.3,
  changeLabel: '예시 데이터',
  accent: '#06b6d4',
};

// Spring Service에서 이미 억 달러로 변환해서 반환
const AMOUNT_UNIT = '억 달러';

function formatAmount(value: number): string {
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: 1,
  });
}

export default function Dashboard({
  user,
  matchingCountries,
}: DashboardProps) {
  const greeting = user ? `${user.name}님, ` : '';

  const [trade, setTrade] = useState<TradestatusResponse | null>(null);

  useEffect(() => {
  let ignore = false;

  async function fetchTrade() {
    try {
      const { data } =
        await axios.get<TradestatusResponse>(
          '/api/cumulative/trade',
          {
            params: {
              year: TRADE_YEAR,
            },
          }
        );

      if (!ignore) {
        setTrade(data);
      }
    } catch (error) {
      if (!ignore) {
        console.error('누적 무역 조회 실패:', error);
      }
    }
  }

  fetchTrade();

    return () => {
      ignore = true;
    };
  }, []);

  // 응답을 받기 전에도 카드가 표시되도록 구성
  const cards: KpiStat[] = [
    {
      label: '총 수출액',
      value: trade
        ? formatAmount(trade.expDlr)
        : '—',
      unit: AMOUNT_UNIT,
      change: trade?.expDlrRate ?? null,
      changeLabel: '전년 대비',
      accent: '#9333ea',
    },
    {
      label: '총 수입액',
      value: trade
        ? formatAmount(trade.impDlr)
        : '—',
      unit: AMOUNT_UNIT,
      change: trade?.impDlrRate ?? null,
      changeLabel: '전년 대비',
      accent: '#7c3aed',
    },
    {
      label: '무역 수지',
      value: trade
        ? (trade.balPayments > 0 ? '+' : '') +
          formatAmount(trade.balPayments)
        : '—',
      unit: AMOUNT_UNIT,
      change: trade?.balPaymentsRate ?? null,
      changeLabel: '전년 대비',
      accent: '#06b6d4',
    },
  ];

  return (
    <>
      {/* 대표 이미지 (화주 ↔ Macross ↔ 운송사) — 화면 가로 전체 배너 */}
      <section className="dashboard-hero">
        <div className="dashboard-hero__stage">
          <img
            src={heroImage}
            alt="Macross — 화주와 운송사를 연결하는 물류 매칭 플랫폼"
            width={1280}
            height={510}
            className="dashboard-hero__img"
          />
        </div>
      </section>

      <div className="page-container dashboard-body">
        <PageHeader
          eyebrow="Overview"
          title={<>{greeting}종합 대시보드</>}
          className="dashboard-header"
        />

        <p className="eyebrow dashboard-kpi-title">
          {TRADE_YEAR}년 누적 무역 현황
        </p>
      
        {/* 로딩 여부와 관계없이 카드 4개 표시 */}
        <div className="dashboard-kpi-grid">
          {cards.map((card) => (
            <StatCard
              key={card.label}
              {...card}
            />
          ))}

          <StatCard {...EXCHANGE_CARD} />
        </div>

        {/* 월별 수출입 및 무역수지 차트 */}
        <TradeTrendChart year={TRADE_YEAR} />

        {/* 기존 맞춤 인사이트 유지 — 더미 데이터 사용 */}
        {user && matchingCountries.length > 0 && (
          <PersonalInsights
            countries={matchingCountries}
          />
        )}
      </div>
    </>
  );
}