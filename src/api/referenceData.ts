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

/* ---------- HS 코드 (static/hscode/hscode.csv) — 무역 데이터 분석의 HS 코드 찾기 ---------- */

export interface HsCodeData {
  hsCode: string;     // 10자리 HS 코드 (점 없이 숫자만 , 예: '3304991000')
  hsName: string;     // 품목명 (예: '기초화장용 제품류')
  groupName: string;  // 앞 4자리(호) 이름 — 품목명이 '기타' 처럼 짧을 때 무슨 품목인지 알 수 있게 같이 보여줌
}

// CSV 글자 → 검색에 쓸 수 있는 10자리 HS 코드 목록
// - 한 줄 예) 3304991000,기초화장용 제품류
// - 품목명 안에 쉼표가 있으면 "..." 로 감싸져 있어서, 첫 번째 쉼표 앞만 코드로 자르고 나머지는 이름으로 사용
// - 무역 데이터(팀원 검색 API)는 10자리 코드로만 찾을 수 있어서 10자리 코드만 남김
//   ※ 01~09류(육류·수산물 등)는 이 CSV 에 앞자리 0 이 빠진 9자리로 들어 있어서 지금은 목록에서 빠짐
export function parseHsCodeCsv(csv: string): HsCodeData[] {
  // 1. 모든 코드의 이름을 먼저 모아 두기 (코드 → 이름) — 4자리 이름을 찾을 때 사용
  const names: Record<string, string> = {};
  const lines = csv.trim().split(/\r?\n/).slice(1);   // 첫 줄(hscode_id, hscode_name 제목) 버리기

  for (const line of lines) {
    const comma = line.indexOf(',');
    if (comma <= 0) continue;   // 쉼표가 없거나 코드가 비어 있는 줄은 건너뛰기

    const code = line.slice(0, comma).trim();
    let name = line.slice(comma + 1).trim();
    // "..." 로 감싼 이름이면 앞뒤 따옴표를 떼고, 안의 "" 는 " 하나로
    if (name.startsWith('"') && name.endsWith('"')) {
      name = name.slice(1, -1).replace(/""/g, '"');
    }
    names[code] = name;
  }

  // 2. 10자리 코드만 골라서 { 코드, 품목명, 4자리 이름 } 으로 만들기
  const rows: HsCodeData[] = [];
  for (const code of Object.keys(names)) {
    if (code.length !== 10) continue;
    rows.push({ hsCode: code, hsName: names[code], groupName: names[code.slice(0, 4)] ?? '' });
  }

  return rows;
}

// GET /hscode/hscode.csv → HS 코드 목록 (vite 프록시 /hscode 로 Spring static 파일을 받아옴)
export async function fetchHsCodes(signal?: AbortSignal): Promise<HsCodeData[]> {
  const response = await axios.get<string>('/hscode/hscode.csv', { responseType: 'text', signal });
  return parseHsCodeCsv(response.data);
}
