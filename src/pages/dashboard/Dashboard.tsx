import type { User } from '../../types/user';
import PageHeader from '../../components/common/PageHeader';
import StatCard from './components/StatCard';
import TradeTrendChart from './components/TradeTrendChart';
import PersonalInsights from './components/PersonalInsights';
import { KPI_STATS } from './dashboardData';
import './Dashboard.css';

interface DashboardProps {
  user: User | null;
  matchingCountries: string[];
}

export default function Dashboard({ user, matchingCountries }: DashboardProps) {
  const greeting = user ? `${user.name}님, ` : '';

  return (
    <div className="page-container">
      <PageHeader eyebrow="Overview" title={<>{greeting}종합 대시보드</>} className="dashboard-header" />

      {/* KPI 카드 4개 */}
      <p className="eyebrow dashboard-kpi-title">2026년 누적 무역 현황</p>
      <div className="dashboard-kpi-grid">
        {KPI_STATS.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      {/* 월별 수출입 추이 차트 */}
      <TradeTrendChart />

      {/* 맞춤 인사이트 — 로그인 + 매칭 조건 국가가 있을 때만 */}
      {user && matchingCountries.length > 0 && <PersonalInsights countries={matchingCountries} />}
    </div>
  );
}
