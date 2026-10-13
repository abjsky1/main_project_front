/* =====================================================================
   무역 데이터 분석 페이지 (주소: /trade , 누구나 볼 수 있음)
   - 탭 2개 : [조건 검색 & 조회] TradeSearchTab , [환율 동향 & 실거래가] ExchangeRateTab
     → 지금 탭은 주소로 정함 : /trade/search , /trade/exchange (/trade 만 있으면 첫 탭)
       새로고침하거나 주소를 공유해도 같은 탭이 열림 (App.tsx 의 /trade/:tab?)
   - 조건 검색 탭일 때 탭 바로 아래에 누적 무역 현황 요약 띠 (TradeKpi — 예전 첫 화면 카드를 한 줄로)
   - 환율은 백엔드 /api/exchange/month (실제 환율 CSV) , 조건 검색은 /api/condition/search
   ===================================================================== */
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PAGE_PATHS } from '../../routes';
import PageHeader from '../../components/common/PageHeader';
import TradeSearchTab from './components/TradeSearchTab';
import ExchangeRateTab from './components/ExchangeRateTab';
import TradeKpi from './components/TradeKpi';
import useTradeSearch from './useTradeSearch';
import useExchangeRates from './useExchangeRates';
import { END_YEAR } from './tradeData';
import './TradeAnalysis.css';

type TabType = 'search' | 'exchange';

// 탭 버튼 목록 — map 으로 버튼을 그림 (id 가 주소 끝에 붙음 : /trade/search , /trade/exchange)
// [TS] { id: TabType; label: string }[] : { id, label } 객체들의 배열
const TABS: { id: TabType; label: string }[] = [
  { id: 'search', label: '조건 검색 & 조회' },
  { id: 'exchange', label: '환율 동향 & 실거래가' },
];

export default function TradeAnalysis() {
  // 지금 탭 = 주소의 :tab 자리 (예: /trade/exchange → 'exchange' , /trade → undefined)
  // useParams : 주소에서 :이름 자리 값을 꺼내는 훅 (매칭 상세의 :matchId 와 같은 방식)
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab: TabType = TABS.find((t) => t.id === tab)?.id ?? 'search';   // 없으면 첫 탭

  // 탭을 바꿔도 값이 유지되도록 상태는 여기(부모)에서 보관
  // (탭 컴포넌트는 탭을 바꾸면 사라졌다가 다시 생기므로, 그 안에 state 를 두면 초기화됨 — 가이드 3-1)
  const search = useTradeSearch();
  const exchange = useExchangeRates();
  const [kpiYear, setKpiYear] = useState(END_YEAR);              // 누적 무역 현황 연도
  const [activeCurrency, setActiveCurrency] = useState<string>('USD');
  const [selectedYear, setSelectedYear] = useState(END_YEAR);    // 환율 · 수출입 추이 연도

  // 모르는 탭 주소(예: /trade/abc)면 /trade 로 바꿈 (replace : 뒤로 가기 기록에 남기지 않음)
  // (훅들은 return 보다 위에서 항상 같은 순서로 불러야 해서 , 이 검사는 훅들 아래에 둠)
  if (tab !== undefined && !TABS.some((t) => t.id === tab)) {
    return <Navigate to={PAGE_PATHS.trade} replace />;
  }

  // 탭 버튼 → 그 탭 주소로 이동 (뒤로 가기를 누르면 이전 탭으로)
  const openTab = (id: TabType) => {
    if (id !== activeTab) navigate(`${PAGE_PATHS.trade}/${id}`);
  };

  return (
    <div className="page-container">
      <PageHeader eyebrow="Analysis" title="무역 데이터 분석" />

      {/* 탭 (두 탭 모두 같은 위치) */}
      <div className="trade-top">
        <div className="tab-group trade-tabs">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => openTab(item.id)}
              className={activeTab === item.id ? 'tab-btn is-active' : 'tab-btn'}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 조건 검색 탭 : 탭 아래 누적 무역 현황 요약 띠 */}
      {activeTab === 'search' && <TradeKpi year={kpiYear} onYearChange={setKpiYear} />}

      {activeTab === 'search' && <TradeSearchTab search={search} />}

      {activeTab === 'exchange' && (
        <ExchangeRateTab
          rates={exchange.table}
          ratesLoading={exchange.loading}
          ratesError={exchange.error}
          activeCurrency={activeCurrency}
          onCurrencyChange={setActiveCurrency}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      )}
    </div>
  );
}
