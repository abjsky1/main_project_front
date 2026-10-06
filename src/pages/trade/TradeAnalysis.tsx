/* =====================================================================
   무역 데이터 분석 페이지 (주소: /trade , 누구나 볼 수 있음)
   - 탭 2개 : [조건 검색 & 조회] TradeSearchTab , [환율 동향 & 실거래가] ExchangeRateTab
   - 현재는 tradeData.ts 의 더미 데이터를 사용
   ===================================================================== */
import { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import TradeSearchTab from './components/TradeSearchTab';
import ExchangeRateTab from './components/ExchangeRateTab';
import useTradeSearch from './useTradeSearch';
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
  const [activeCurrency, setActiveCurrency] = useState<string>('USD');
  const [selectedYear, setSelectedYear] = useState(2026);

  return (
    <div className="page-container">
      <PageHeader eyebrow="Analysis" title="무역 데이터 분석" />

      {/* 탭 */}
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

      {activeTab === 'search' && <TradeSearchTab search={search} />}

      {activeTab === 'exchange' && (
        <ExchangeRateTab
          activeCurrency={activeCurrency}
          onCurrencyChange={setActiveCurrency}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      )}
    </div>
  );
}
