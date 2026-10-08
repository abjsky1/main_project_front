import axios from 'axios';

// 백엔드 GET /api/exchange/month : 통화별 월 평균 환율 (ExchangeController)
// 환율 CSV(2000~2026) 전체를 읽어서 "연월 · 통화" 마다 매매기준율(deal_bas_r) 평균을 돌려줌
// 예) { searchdate: '2026-01', cur_unit: 'USD', deal_bas_r: 1452.37 }
//     cur_unit 은 CSV 의 통화 코드 그대로 (JPY 는 'JPY(100)' = 100엔 기준 , IDR 은 서버가 1루피아 기준으로 바꿔 줌)
export interface ExchangeMonthDto {
  searchdate: string;   // 'YYYY-MM'
  cur_unit: string;
  deal_bas_r: number;
}

// 한 번 받은 응답을 기억해 두기 (전체 CSV 를 읽는 요청이라 탭을 바꿀 때마다 다시 부르지 않도록)
let cached: Promise<ExchangeMonthDto[]> | null = null;

export function getMonthlyExchangeRates(): Promise<ExchangeMonthDto[]> {
  if (!cached) {
    cached = axios.get<ExchangeMonthDto[]>('/api/exchange/month')
      .then((response) => response.data)
      .catch((error) => {
        cached = null;   // 실패하면 기억을 지워서 다음에 다시 요청할 수 있게
        throw error;
      });
  }
  return cached;
}
