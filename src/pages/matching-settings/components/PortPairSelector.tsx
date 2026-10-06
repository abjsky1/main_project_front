import type { RouteData } from '../../../api/referenceData';
import type { PortType } from '../matchingTypes';
import { getCompatible } from '../routeUtils';
import FormField from './FormField';
import PortSelect from './PortSelect';

const PORT_TYPE_OPTIONS: PortType[] = ['한국 항공', '한국 해상', '해외 항공', '해외 해상'];

interface PortPairSelectorProps {
  routes: RouteData[];
  countryId?: number;
  departurePortType: PortType;
  departure: string;
  destinationPortType: PortType;
  destination: string;
  onDepartureChange: (value: string, portType: PortType) => void;
  onDestinationChange: (value: string, portType: PortType) => void;
}

// 출발지 / 도착지 (종류 선택 + 항구/공항 선택) 한 줄
export default function PortPairSelector({
  routes, departurePortType, departure, destinationPortType, destination, countryId,
  onDepartureChange, onDestinationChange,
}: PortPairSelectorProps) {
  return (
    <div className="port-pair">
      <FormField label={`출발지 (${departurePortType})`}>
        <div className="port-pair__stack">
          {/* 출발지 종류를 바꾸면: 출발지 선택을 비우고, 도착지 종류도 짝에 맞게 바꿈 (한국 해상 → 해외 해상) */}
          <select
            value={departurePortType}
            onChange={(e) => {
              const pt = e.target.value as PortType;   // [TS] as : 고른 값은 PortType 중 하나라는 표시
              onDepartureChange('', pt);
              onDestinationChange('', getCompatible(pt)[0]);
            }}
            className="ms-input"
          >
            {PORT_TYPE_OPTIONS.map((pt) => <option key={pt}>{pt}</option>)}
          </select>
          <PortSelect routes={routes} countryId={countryId} portType={departurePortType} value={departure} onChange={onDepartureChange} placeholder="출발지 선택" />
        </div>
      </FormField>

      <FormField label={`도착지 (${destinationPortType})`}>
        <div className="port-pair__stack">
          <select
            value={destinationPortType}
            onChange={(e) => {
              const pt = e.target.value as PortType;
              onDestinationChange('', pt);
              onDepartureChange('', getCompatible(pt)[0]);
            }}
            className="ms-input"
          >
            {/* 도착지 종류는 출발지와 짝이 맞는 것만 보여줌 */}
            {getCompatible(departurePortType).map((pt) => <option key={pt}>{pt}</option>)}
          </select>
          <PortSelect routes={routes} countryId={countryId} portType={destinationPortType} value={destination} onChange={onDestinationChange} placeholder="도착지 선택" />
        </div>
      </FormField>
    </div>
  );
}
