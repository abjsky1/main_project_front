export type MemberType = 'SHIPPER' | 'LOGISTICS';
export type Direction = 'EXPORT' | 'IMPORT';

export interface Country {
  id: number;
  code: string;
  name: string;
}

export interface Item {
  code: string;
  name: string;
}

export interface Condition {
  id: number;
  countryId: number;
  hsCode: string | null;
  direction: Direction | null;
  label: string;
  details: Record<string, string | number | boolean>;
}

export interface Filters {
  countryIds: number[];
  hsCode: string;
  direction: Direction;
  start: string;
  end: string;
  objective: string;
  conditionId: number | null;
}

export interface Options {
  memberType: MemberType;
  conditions: Condition[];
  countries: Country[];
  objectives: string[];
  start: string;
  end: string;
  minMonth: string;
  maxMonth: string;
}

export interface Point {
  period: string;
  exportAmount: number | null;
  importAmount: number | null;
  balance: number | null;
}

export interface Series {
  country: string;
  points: Point[];
  observedMonths: number;
  expectedMonths: number;
}

export interface Metric {
  id: string;
  country: string;
  name: string;
  value: number | null;
  unit: string;
  period: string;
  source: string;
  completeness: 'complete' | 'partial' | 'unavailable';
}

export interface Trend {
  id: string;
  country: string;
  title: string;
  period: string;
  source: string;
  metricIds: string[];
  description: string;
}

export interface Analysis {
  id: string;
  title: string;
  finding: string;
  interpretationType: 'observation' | 'hypothesis';
  whyItMattersToYou: string;
  metricIds: string[];
  conditionIds: string[];
}

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  reasonForYou: string;
  evidenceIds: string[];
  conditionIds: string[];
  checksBeforeAction: string[];
}

export interface Narrative {
  status: 'ok' | 'partial' | 'insufficient_data';
  personalAnalysis: Analysis[];
  recommendations: Recommendation[];

  relatedTrends: {
    trendId: string;
    relevanceToYou: string;
    implication: string;
    caveat: string;
  }[];

  finalSummary: {
    currentSituation: string;
    meaningForYou: string;
    nextActionIds: string[];
    caution: string;
  };

  limitations: string[];
}

export interface InsightResult {
  memberType: MemberType;
  filters: Filters;
  itemName: string;
  generatedAt: string;
  aiStatus: 'ready' | 'unavailable' | 'not_requested';
  series: Series[];
  metrics: Metric[];
  trends: Trend[];
  narrative: Narrative;
  limitations: string[];
}

export interface Generation {
  historyId: number | null;
  saved: boolean;
  saveMessage: string;
  result: InsightResult;
}

export interface ConditionSnapshot {
  memberType: MemberType;
  filters: Filters;
  businessConditions: Condition[];
}

export interface HistoryItem {
  id: number;
  createdAt: string;
  status: string;
  itemName: string;
  hsCode: string;
  direction: Direction;
  start: string;
  end: string;
}

export interface HistoryPage {
  items: HistoryItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface HistoryDetail {
  id: number;
  createdAt: string;
  status: string;
  condition: ConditionSnapshot;
  result: InsightResult;
  metadata: Record<string, unknown>;
}

export const objectiveLabels: Record<string, string> = {
  MARKET_OPPORTUNITY: '시장 기회 탐색',
  MARKET_RISK: '거래 시장 위험 점검',
  TRANSPORT_CHECK: '운송 조건 점검',
  SALES_MARKET: '영업 대상 시장 검토',
  ROUTE_FIT: '취급 품목·노선 적합성 검토',
  OPERATIONS_CHECK: '운영 조건 점검',
};

export const historyStatusLabels: Record<string, string> = {
  COMPLETE: '분석 완료',
  STATISTICS_ONLY: '통계만 생성',
  NO_DATA: '자료 부족',
};

export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
  });
}

export function formatNumber(
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(value)) {
    return '자료 부족';
  }

  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 1,
  }).format(value);
}