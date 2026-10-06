import axios from 'axios';

// 백엔드 static 폴더의 country.csv / route.csv 기준 데이터
// (매칭 조건 설정 / 매칭 관리 화면에서 국가 이름, 항구·공항 이름을 찾을 때 사용)

export const KOREA_ID = 1122;  // country.csv 에서 대한민국 countryId

export interface CountryData {
  countryId: number;
  countryCode: string;
  currencyId: number | null;   // [TS] 숫자 또는 null (CSV 칸이 비어 있으면 null)
  countryName: string;
}

export interface RouteData {
  routeId: number;
  countryId: number;
  transportType: number; // CSV: 1=해상, 2=항공
  routeName: string;
}

// CSV 글자 → CountryData 배열
export function parseCountryCsv(csv: string): CountryData[] {
  const rows: CountryData[] = [];
  // trim() : 앞뒤 공백/빈 줄 제거 → split(/\r?\n/) : 줄바꿈마다 자르기 (윈도우 \r\n, 리눅스 \n 둘 다)
  // → slice(1) : 첫 줄(제목 줄) 버리기
  const lines = csv.trim().split(/\r?\n/).slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;   // 빈 줄은 건너뛰기

    // "1122,KR,410,대한민국" 을 쉼표로 잘라서 순서대로 변수에 담기 (배열 구조분해)
    // ...nameParts : 4번째 칸부터 끝까지를 배열로 받음 (이름 안에 쉼표가 있어도 안전하게)
    const [countryId, countryCode, currencyId, ...nameParts] = line.split(',');
    rows.push({
      countryId: Number(countryId),
      countryCode: countryCode.trim(),
      currencyId: currencyId.trim() === '' ? null : Number(currencyId),
      countryName: nameParts.join(',').trim(),   // 잘린 이름 조각을 다시 쉼표로 이어 붙임
    });
  }

  return rows;
}

// CSV 글자 → RouteData 배열 (방식은 parseCountryCsv 와 같음)
export function parseRouteCsv(csv: string): RouteData[] {
  const rows: RouteData[] = [];
  const lines = csv.trim().split(/\r?\n/).slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;

    const [routeId, countryId, transportType, ...nameParts] = line.split(',');
    rows.push({
      routeId: Number(routeId),
      countryId: Number(countryId),
      transportType: Number(transportType),
      routeName: nameParts.join(',').trim(),
    });
  }

  return rows;
}

// GET /country/country.csv → 국가 목록
// [TS] Promise<CountryData[]> → "나중에(await 후) CountryData 배열을 돌려준다"
export async function fetchCountries(signal?: AbortSignal): Promise<CountryData[]> {
  // responseType: 'text' → JSON 이 아니라 글자 그대로 받기
  const response = await axios.get<string>('/country/country.csv', { responseType: 'text', signal });
  return parseCountryCsv(response.data);
}

// GET /route/route.csv → 항구/공항 목록
export async function fetchRoutes(signal?: AbortSignal): Promise<RouteData[]> {
  const response = await axios.get<string>('/route/route.csv', { responseType: 'text', signal });
  return parseRouteCsv(response.data);
}
