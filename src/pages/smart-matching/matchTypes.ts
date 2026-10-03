// 매칭 관리 화면에서 쓰는 타입

export type AdminStatus = 'pending' | 'approved' | 'rejected';
export type PartyResponse = 'waiting' | 'accepted' | 'rejected';
export type FinalStatus = 'pending' | 'completed' | 'failed';
export type PartyKey = 'shipper' | 'logistics';
export type StatusFilter = 'all' | AdminStatus | 'completed' | 'failed';

// 매칭 당사자 (화주사 / 물류업체)
export interface Party {
  companyName: string;
  contactName: string;
  bizNumber: string;
  phone: string;
  address: string;
  response: PartyResponse;
  rejectReason?: string;
}

// 화주 요청 조건
export interface MatchRequest {
  country: string; hsCode: string; tradeType: '수출' | '수입'; transport: '해상' | '항공';
  departure: string; destination: string; volume: number; schedule: string;
  cargoType: '일반' | '특수'; refrigeration: boolean; hazmat: boolean; heavy: boolean; special: boolean;
}

// 물류업체 제공 조건
export interface LogisticsOffer {
  country: string; transport: 'SEA' | 'AIR'; departure: string; destination: string;
  regularRoute: boolean; directRoute: boolean; leadTime: number; availableDate: string;
  availableCapacity: number; general: boolean; refrigeration: boolean; hazmat: boolean; heavy: boolean; special: boolean;
  hsCode: string; experience: number;
}

// 매칭 카드 1개에 필요한 모든 정보
export interface MatchItem {
  id: number;
  createdAt: string;

  routeScore: number;
  capacityScore: number;
  itemScore: number;
  scheduleScore: number;
  experienceScore: number;
  totalScore: number;

  matchFactors: string[];

  adminStatus: AdminStatus;
  adminRejectReason?: string;
  finalStatus: FinalStatus;

  shipper: Party;
  logistics: Party;
  request: MatchRequest;
  offer: LogisticsOffer;
}

export const REJECT_REASONS = ['일정 불일치', '물량 초과', '노선 변경 불가', '단가 협의 실패', '서비스 조건 불일치', '기타 사유'];
