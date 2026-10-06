// 매칭 조건 설정 화면에서 쓰는 타입과 빈 입력폼
// [TS] type / interface 는 "값의 모양" 설명서일 뿐, 화면 동작에는 영향이 없습니다 (가이드 2-2, 2-3)

export type PortType = '한국 항공' | '한국 해상' | '해외 항공' | '해외 해상';
export type TradeType = '수출' | '수입';
export type TransportType = '해상' | '항공';

// 수출입기업(화주) 매칭 조건 1건
export interface ShipperCondition {
  id: number;
  countries: string[];
  hsCode: string;
  tradeType: TradeType;
  transport: TransportType;
  departure: string;
  departurePortType: PortType;
  destination: string;
  destinationPortType: PortType;
  volume: string;
  schedule: string;
  cargoType: '일반' | '특수';
  refrigeration: boolean;
  hazmat: boolean;
  heavy: boolean;
  special: boolean;
}

// 물류업체 매칭 조건 1건
export interface LogisticsCondition {
  id: number;
  countries: string[];
  tradeType: TradeType;
  transport: TransportType;
  departure: string;
  departurePortType: PortType;
  destination: string;
  destinationPortType: PortType;
  regularRoute: boolean;
  directRoute: boolean;
  leadTime: string;
  availableDate: string;
  availableCapacity: string;
  general: boolean;
  refrigeration: boolean;
  hazmat: boolean;
  heavy: boolean;
  special: boolean;
  hsCode: string;
  experience: string;
}

// 입력폼 (id는 DB 저장 후에 생기므로 제외)
// [TS] Omit<A, 'id'> = A 에서 id 칸만 뺀 모양 (가이드 2-8)
export type ShipperForm = Omit<ShipperCondition, 'id'>;
export type LogisticsForm = Omit<LogisticsCondition, 'id'>;

// 두 폼이 공통으로 가진 경로 관련 필드
// [TS] Pick<A, 'x' | 'y'> = A 에서 x, y 칸만 골라낸 모양 → routeUtils 의 함수들이 두 폼에 공통으로 사용
export type RouteForm = Pick<ShipperForm,
  'countries' | 'tradeType' | 'transport' | 'departure' | 'departurePortType' | 'destination' | 'destinationPortType'>;

// 빈 입력폼을 새로 만들어 주는 함수 (처음 화면, 저장 후 폼 비울 때 사용)
// () => ({ ... }) : 객체를 바로 돌려주는 화살표 함수 (중괄호를 소괄호로 감싸야 객체로 인식)
export const emptyShipper = (): ShipperForm => ({
  countries: [], hsCode: '', tradeType: '수출', transport: '해상',
  departure: '', departurePortType: '한국 해상', destination: '', destinationPortType: '해외 해상',
  volume: '', schedule: '', cargoType: '일반',
  refrigeration: false, hazmat: false, heavy: false, special: false,
});

export const emptyLogistics = (): LogisticsForm => ({
  countries: [], tradeType: '수출', transport: '해상',
  departure: '', departurePortType: '한국 해상', destination: '', destinationPortType: '해외 해상',
  regularRoute: false, directRoute: false, leadTime: '', availableDate: '',
  availableCapacity: '', general: true, refrigeration: false, hazmat: false, heavy: false, special: false,
  hsCode: '', experience: '',
});
