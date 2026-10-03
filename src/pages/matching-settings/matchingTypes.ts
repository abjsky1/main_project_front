// 매칭 조건 설정 화면에서 쓰는 타입과 빈 입력폼

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
export type ShipperForm = Omit<ShipperCondition, 'id'>;
export type LogisticsForm = Omit<LogisticsCondition, 'id'>;

// 두 폼이 공통으로 가진 경로 관련 필드
export type RouteForm = Pick<ShipperForm,
  'countries' | 'tradeType' | 'transport' | 'departure' | 'departurePortType' | 'destination' | 'destinationPortType'>;

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
