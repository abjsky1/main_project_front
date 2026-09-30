import type { User } from '../App';
import {
  ComposedChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DashboardProps {
  user: User | null;
  matchingCountries: string[];
}

const MONTHLY_TRADE = [
  { month: '1월', export: 523, import: 467, balance: 56 },
  { month: '2월', export: 498, import: 445, balance: 53 },
  { month: '3월', export: 556, import: 478, balance: 78 },
  { month: '4월', export: 584, import: 501, balance: 83 },
  { month: '5월', export: 612, import: 534, balance: 78 },
  { month: '6월', export: 598, import: 512, balance: 86 },
  { month: '7월', export: 634, import: 548, balance: 86 },
  { month: '8월', export: 652, import: 567, balance: 85 },
  { month: '9월', export: 619, import: 532, balance: 87 },
  { month: '10월', export: 665, import: 574, balance: 91 },
  { month: '11월', export: 682, import: 598, balance: 84 },
  { month: '12월', export: 712, import: 612, balance: 100 },
];


interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  change: number;
  sublabel: string;
  accent?: string;
}

function StatCard({ label, value, unit, change, sublabel, accent = '#9333ea' }: StatCardProps) {
  const isPositive = change > 0;
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{
        background: 'rgba(100, 50, 220, 0.035)',
        border: '1px solid rgba(100, 50, 220, 0.12)',
      }}
    >
      {/* Subtle accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${accent}, #06b6d4)` }}
      />
      <p
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: '#9090a8' }}
      >
        {label}
      </p>
      <div>
        <p className="text-[28px] font-bold tracking-tight leading-none" style={{ color: '#1a1a2e' }}>
          {value}
          <span className="text-sm font-normal ml-1.5" style={{ color: '#9090a8' }}>{unit}</span>
        </p>
        <p className="text-xs mt-1.5" style={{ color: '#9090a8' }}>{sublabel}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: isPositive ? 'rgba(217,48,37,0.08)' : 'rgba(26,158,92,0.1)',
            color: isPositive ? '#d93025' : '#1a9e5c',
          }}
        >
          {isPositive ? '▲' : '▼'} {Math.abs(change)}%
        </span>
        <span className="text-xs" style={{ color: '#9090a8' }}>전월 대비</span>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-xl px-4 py-3 text-sm"
        style={{
          background: '#fff',
          border: '1px solid #eaeaf2',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}
      >
        <p className="font-semibold mb-2" style={{ color: '#1a1a2e' }}>{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value}억 달러
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const TOP_HS_EXPORT = [
  { code: '8541.10', name: '반도체 다이오드', value: 18942 },
  { code: '8517.12', name: '스마트폰', value: 12458 },
];
const TOP_HS_IMPORT = [
  { code: '2709.00', name: '원유', value: 22341 },
  { code: '8542.31', name: '집적회로(IC)', value: 9871 },
];

function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function yearlyTradeData(countries: string[]) {
  const seed = countries.reduce((a, c) => a + c.split('').reduce((x, y) => x + y.charCodeAt(0), 0), 7);
  const rng = seededRng(seed);
  const base = { exp: 400 + rng() * 600, imp: 300 + rng() * 500 };
  return [2021, 2022, 2023, 2024, 2025].map((year) => {
    const t = (year - 2021) / 4;
    const drift = rng() * 0.12 - 0.04;
    const exp = Math.round(base.exp * (1 + t * 0.3 + drift));
    const imp = Math.round(base.imp * (1 + t * 0.25 + rng() * 0.08));
    return { year: `${year}`, export: exp, import: imp, balance: exp - imp };
  });
}

export default function Dashboard({ user, matchingCountries }: DashboardProps) {
  const greeting = user ? `${user.name}님, ` : '';

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="mb-9">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#9090a8' }}>
          Overview
        </p>
        <h1 className="text-[28px] font-bold tracking-tight leading-tight" style={{ color: '#1a1a2e' }}>
          {greeting}종합 대시보드
        </h1>
      </div>

      {/* 4 KPI stat cards */}
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#9090a8' }}>2025년 누적 무역 현황</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="총 수출액" value="7,535" unit="억 달러" change={4.2} sublabel="2025년 누적" accent="#9333ea" />
        <StatCard label="총 수입액" value="6,568" unit="억 달러" change={3.8} sublabel="2025년 누적" accent="#7c3aed" />
        <StatCard label="무역 수지" value="+967" unit="억 달러" change={8.1} sublabel="수출 – 수입" accent="#06b6d4" />
        <StatCard label="당일 환율" value="1,318" unit="원/USD" change={-0.3} sublabel="2025-12-31 기준" accent="#06b6d4" />
      </div>

      {/* Main trend chart — no heavy box, just heading + chart on white */}
      <div className="mb-10">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>
              Trade Trend
            </p>
            <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>
              수출입 추이 (2025)
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#9090a8' }}>단위: 억 달러</p>
          </div>
          <div className="flex items-center gap-5 text-xs" style={{ color: '#9090a8' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#9333ea' }} />
              수출
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#d1d5e8' }} />
              수입
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 inline-block" style={{ background: '#06b6d4' }} />
              무역수지
            </span>
          </div>
        </div>
        {/* Thin top accent line above chart */}
        <div className="w-12 h-0.5 mb-5 rounded-full" style={{ background: 'linear-gradient(90deg, #9333ea, #06b6d4)' }} />
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={MONTHLY_TRADE} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,50,220,0.07)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9090a8', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="bar" tick={{ fontSize: 11, fill: '#9090a8', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} domain={[0, 800]} />
            <YAxis yAxisId="line" orientation="right" tick={{ fontSize: 11, fill: '#9090a8', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} domain={[0, 150]} />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="bar" dataKey="export" name="수출" fill="#9333ea" radius={[4, 4, 0, 0]} maxBarSize={24} opacity={0.9} />
            <Bar yAxisId="bar" dataKey="import" name="수입" fill="#d1d5e8" radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Line yAxisId="line" type="monotone" dataKey="balance" name="무역수지" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3, fill: '#06b6d4' }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
        {/* Bottom separator */}
        <div className="mt-5 h-px" style={{ background: 'linear-gradient(90deg, rgba(100,50,220,0.15), transparent)' }} />
      </div>

      {/* Personalized Insights — only shown when logged in with matching conditions */}
      {user && matchingCountries.length > 0 && (() => {
        const yearData = yearlyTradeData(matchingCountries);
        const countryLabel = matchingCountries.slice(0, 3).join(', ') + (matchingCountries.length > 3 ? ` 외 ${matchingCountries.length - 3}개국` : '');
        return (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>Personalized Insights</p>
            <p className="text-xs mb-5" style={{ color: '#9090a8' }}>{countryLabel}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left: yearly export/import lines */}
              <div className="rounded-2xl p-5 flex flex-col" style={{ background: 'rgba(100,50,220,0.035)', border: '1px solid rgba(100,50,220,0.12)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#9333ea' }}>수출입 추이</p>
                <h3 className="text-sm font-bold mb-3" style={{ color: '#1a1a2e' }}>최근 5년 수출입액</h3>
                <div className="flex-1 min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,50,220,0.07)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#9090a8', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#9090a8', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #eaeaf2', fontFamily: 'Plus Jakarta Sans' }} formatter={(v: any, n: any) => [`${v?.toLocaleString()}백만$`, n === 'export' ? '수출' : '수입']} />
                      <Line type="monotone" dataKey="export" name="export" stroke="#9333ea" strokeWidth={2} dot={{ r: 3, fill: '#9333ea' }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="import" name="import" stroke="#9090a8" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3, fill: '#9090a8' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: '#9090a8' }}>
                  <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 inline-block rounded-full" style={{ background: '#9333ea' }} />수출</span>
                  <span className="flex items-center gap-1.5"><span className="w-4 h-px inline-block rounded-full" style={{ background: '#9090a8', borderTop: '1px dashed #9090a8' }} />수입</span>
                </div>
              </div>

              {/* Center: yearly trade balance line */}
              <div className="rounded-2xl p-5 flex flex-col" style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#06b6d4' }}>무역수지 추이</p>
                <h3 className="text-sm font-bold mb-3" style={{ color: '#1a1a2e' }}>최근 5년 무역수지</h3>
                <div className="flex-1 min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.1)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#9090a8', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#9090a8', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #eaeaf2', fontFamily: 'Plus Jakarta Sans' }} formatter={(v: any) => [`${v >= 0 ? '+' : ''}${v?.toLocaleString()}백만$`, '무역수지']} />
                      <Line type="monotone" dataKey="balance" name="무역수지" stroke="#06b6d4" strokeWidth={2.5} dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        return <circle key={cx} cx={cx} cy={cy} r={4} fill={payload.balance >= 0 ? '#d93025' : '#1a9e5c'} stroke="none" />;
                      }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[10px]" style={{ color: '#9090a8' }}>
                  <span className="w-4 h-0.5 inline-block rounded-full" style={{ background: '#06b6d4' }} />무역수지 (점: <span style={{ color: '#d93025' }}>▲흑자</span> / <span style={{ color: '#1a9e5c' }}>▼적자</span>)
                </div>
              </div>

              {/* Right: top HS codes — no heading labels */}
              <div className="rounded-2xl p-5 flex flex-col justify-center" style={{ background: '#ffffff', border: '1px solid #eaeaf2' }}>
                <div className="space-y-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#d93025' }}>수출 Top 2</p>
                  {TOP_HS_EXPORT.map((h) => (
                    <div key={h.code} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'rgba(217,48,37,0.04)', border: '1px solid rgba(217,48,37,0.1)' }}>
                      <div>
                        <p className="text-[10px] font-mono" style={{ color: '#9090a8' }}>{h.code}</p>
                        <p className="text-xs font-semibold" style={{ color: '#1a1a2e' }}>{h.name}</p>
                      </div>
                      <p className="text-xs font-bold font-mono" style={{ color: '#d93025' }}>{h.value.toLocaleString()}</p>
                    </div>
                  ))}
                  <p className="text-[10px] font-semibold uppercase tracking-wide mt-3" style={{ color: '#1a9e5c' }}>수입 Top 2</p>
                  {TOP_HS_IMPORT.map((h) => (
                    <div key={h.code} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'rgba(26,158,92,0.04)', border: '1px solid rgba(26,158,92,0.1)' }}>
                      <div>
                        <p className="text-[10px] font-mono" style={{ color: '#9090a8' }}>{h.code}</p>
                        <p className="text-xs font-semibold" style={{ color: '#1a1a2e' }}>{h.name}</p>
                      </div>
                      <p className="text-xs font-bold font-mono" style={{ color: '#1a9e5c' }}>{h.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
