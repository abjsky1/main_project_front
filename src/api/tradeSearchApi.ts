import axios from 'axios';

// 백엔드 무역 데이터 조건 검색 API (main_project_back 의 SearchController — 팀원 작업)
// - C:/mpdata/trade_data_연도.csv (실제 무역 통계) 에서 기간 · 국가 · HS 코드가 맞는 줄을 찾아 줌
// - HS 코드는 필수 , 10자리 숫자로 정확히 일치해야 함 (예: 3304991000)
// - 기간이 길수록(연도가 많을수록) CSV 파일을 많이 읽어서 시간이 오래 걸림

// 검색 결과 한 줄 — TradeSearchDto (금액 단위: 달러)
export interface TradeSearchDto {
  hsCode: string;
  itemName: string;       // 품목명 (hscode.csv)
  country: string;        // 국가 이름 (예: 미국)
  exportAmount: number;   // 수출액 ($)
  importAmount: number;   // 수입액 ($)
  tradeBalance: number;   // 무역수지 ($)
  period: string;         // 기간 (예: 2025-03)
}

// 검색 조건 — SearchDto (주소 뒤 ?startdate=...&enddate=... 로 보냄)
// [TS] country?: → 없어도 되는 칸. undefined 면 axios 가 주소에 붙이지 않음 → 서버가 '전체' 로 검색
export interface TradeSearchParams {
  startdate: string;   // 'YYYY-MM'
  enddate: string;     // 'YYYY-MM'
  country?: string;
  hscode: string;
}

// GET /api/condition/search?startdate=2025-01&enddate=2025-12&country=미국&hscode=3304991000
export async function searchTrade(params: TradeSearchParams, signal?: AbortSignal) {
  const response = await axios.get<TradeSearchDto[]>('/api/condition/search', { params, signal });
  return response.data;
}
