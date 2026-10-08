import { useEffect, useState } from 'react';
import { getMonthlyExchangeRates, type ExchangeMonthDto } from '../../api/exchangeApi';

// 통화 코드 → { 'YYYY-MM': 월 평균 환율 }
// [TS] Record<string, Record<string, number>> : 객체 안에 객체 (가이드 2-8)
export type RateTable = Record<string, Record<string, number>>;

// CSV 통화 코드 → 화면 통화 코드
// - 'JPY(100)' → 'JPY' (100엔 기준 값 그대로)
// - 예전 연도의 'CNY' 는 'CNH' 칸이 비어 있을 때만 'CNH' 로 사용 (CSV 가 어느 해부터 CNY → CNH 로 바뀜)
function toRateTable(rows: ExchangeMonthDto[]): RateTable {
  const table: RateTable = {};
  const cny: Record<string, number> = {};

  for (const row of rows) {
    const code = row.cur_unit.replace('(100)', '');
    if (code === 'CNY') {
      cny[row.searchdate] = row.deal_bas_r;
      continue;
    }
    if (!table[code]) table[code] = {};
    table[code][row.searchdate] = row.deal_bas_r;
  }

  if (!table.CNH) table.CNH = {};
  for (const month of Object.keys(cny)) {
    if (table.CNH[month] === undefined) table.CNH[month] = cny[month];
  }
  return table;
}

// 특정 통화 · 연도의 12개월 환율 (데이터가 없는 달은 null)
export function getRatesForYear(table: RateTable, currency: string, year: number): (number | null)[] {
  const months = table[currency] ?? {};
  const rates: (number | null)[] = [];
  for (let month = 1; month <= 12; month++) {
    const key = `${year}-${String(month).padStart(2, '0')}`;   // 1 → '2026-01'
    rates.push(months[key] ?? null);
  }
  return rates;
}

// 환율 표를 한 번 불러오는 훅 (무역 데이터 분석 페이지가 사용 — 탭을 바꿔도 다시 부르지 않도록 부모에서 호출)
export default function useExchangeRates() {
  const [table, setTable] = useState<RateTable>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;   // 응답 전에 페이지를 떠나면 true → 늦게 온 응답 무시 (가이드 3-4)

    async function load() {
      try {
        const rows = await getMonthlyExchangeRates();
        if (!ignore) setTable(toRateTable(rows));
      } catch (e) {
        console.error('월별 환율 조회 실패:', e);
        if (!ignore) setError('환율 데이터를 불러오지 못했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, []);

  return { table, loading, error };
}
