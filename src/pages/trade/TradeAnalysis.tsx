/* =====================================================================
   무역 데이터 분석 페이지 (주소: /trade , 누구나 볼 수 있음)
   - 탭 2개 : [조건 검색 & 조회] TradeSearchTab , [환율 동향 & 실거래가] ExchangeRateTab
   - 조건 검색 탭일 때 탭 바로 아래에 누적 무역 현황 요약 띠 (TradeKpi — 예전 첫 화면 카드를 한 줄로)
   - 환율은 백엔드 /api/exchange/month (실제 환율 CSV) , 조건 검색은 /api/condition/search
   ===================================================================== */
import { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import TradeSearchTab from './components/TradeSearchTab';
import ExchangeRateTab from './components/ExchangeRateTab';
import TradeKpi from './components/TradeKpi';
import useTradeSearch from './useTradeSearch';
import useExchangeRates from './useExchangeRates';
import { END_YEAR } from './tradeData';
import './TradeAnalysis.css';

type TabType = 'search' | 'exchange';

// 탭 버튼 목록 — map 으로 버튼을 그림
// [TS] { id: TabType; label: string }[] : { id, label } 객체들의 배열
const TABS: { id: TabType; label: string }[] = [
  { id: 'search', label: '조건 검색 & 조회' },
  { id: 'exchange', label: '환율 동향 & 실거래가' },
];

export default function TradeAnalysis() {
  const [activeTab, setActiveTab] = useState<TabType>('search');

  // 탭을 바꿔도 값이 유지되도록 상태는 여기(부모)에서 보관
  // (탭 컴포넌트는 탭을 바꾸면 사라졌다가 다시 생기므로, 그 안에 state 를 두면 초기화됨 — 가이드 3-1)
  const search = useTradeSearch();
  const exchange = useExchangeRates();
  const [kpiYear, setKpiYear] = useState(END_YEAR);              // 누적 무역 현황 연도
  const [activeCurrency, setActiveCurrency] = useState<string>('USD');
  const [selectedYear, setSelectedYear] = useState(END_YEAR);    // 환율 · 수출입 추이 연도

  return (
    <div className="page-container">
      <PageHeader eyebrow="Analysis" title="무역 데이터 분석" />

      {/* 탭 (두 탭 모두 같은 위치) */}
      <div className="trade-top">
        <div className="tab-group trade-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'tab-btn is-active' : 'tab-btn'}
            >
              {tab.label}
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
