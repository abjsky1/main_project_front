import axios from 'axios';

// 백엔드 static 폴더의 country.csv / route.csv 기준 데이터

export const KOREA_ID = 1122;  // country.csv 에서 대한민국 countryId

export interface CountryData {
  countryId: number;
  countryCode: string;
  currencyId: number | null;
  countryName: string;
}

export interface RouteData {
  routeId: number;
  countryId: number;
  transportType: number; // CSV: 1=해상, 2=항공
  routeName: string;
}

export function parseCountryCsv(csv: string): CountryData[] {
  const rows: CountryData[] = [];
  const lines = csv.trim().split(/\r?\n/).slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;

    const [countryId, countryCode, currencyId, ...nameParts] = line.split(',');
    rows.push({
      countryId: Number(countryId),
      countryCode: countryCode.trim(),
      currencyId: currencyId.trim() === '' ? null : Number(currencyId),
      countryName: nameParts.join(',').trim(),
    });
  }

  return rows;
}

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
export async function fetchCountries(signal?: AbortSignal): Promise<CountryData[]> {
  const { data } = await axios.get<string>('/country/country.csv', { responseType: 'text', signal });
  return parseCountryCsv(data);
}

// GET /route/route.csv → 항구/공항 목록
export async function fetchRoutes(signal?: AbortSignal): Promise<RouteData[]> {
  const { data } = await axios.get<string>('/route/route.csv', { responseType: 'text', signal });
  return parseRouteCsv(data);
}
