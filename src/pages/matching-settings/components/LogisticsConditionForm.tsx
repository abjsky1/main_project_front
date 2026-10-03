import type { CountryData, RouteData } from '../../../api/referenceData';
import type { LogisticsForm, PortType } from '../matchingTypes';
import { getCountryId } from '../routeUtils';
import CountrySelect from './CountrySelect';
import FormField from './FormField';
import PortPairSelector from './PortPairSelector';
import ToggleSwitch from './ToggleSwitch';

const CARGO_SWITCHES = [
  { key: 'general', label: '일반화물 취급' },
  { key: 'refrigeration', label: '냉장/냉동 취급' },
  { key: 'hazmat', label: '위험물 취급' },
  { key: 'heavy', label: '중량물 취급' },
  { key: 'special', label: '특수화물 취급' },
] as const;

interface LogisticsConditionFormProps {
  form: LogisticsForm;
  countries: CountryData[];
  routes: RouteData[];
  disabled: boolean;      // 폼 전체 비활성화 (동의 전, 저장 중 등)
  addDisabled: boolean;   // "+ 조건 추가" 버튼 비활성화
  onFieldChange: (key: string, value: any) => void;
  onDepartureChange: (value: string, portType: PortType) => void;
  onDestinationChange: (value: string, portType: PortType) => void;
  onAdd: () => void;
}

// 물류업체 매칭 조건 입력폼
export default function LogisticsConditionForm({
  form, countries, routes, disabled, addDisabled, onFieldChange, onDepartureChange, onDestinationChange, onAdd,
}: LogisticsConditionFormProps) {
  return (
    <fieldset disabled={disabled} className="ms-form">
      <div className="ms-form-grid">
        <FormField label="타겟 국가">
          <CountrySelect countries={countries} value={form.countries} onChange={(v) => onFieldChange('countries', v)} />
        </FormField>
        <FormField label="수출/수입 구분">
          <select value={form.tradeType} onChange={(e) => onFieldChange('tradeType', e.target.value)} className="ms-input">
            <option>수출</option><option>수입</option>
          </select>
        </FormField>
        <FormField label="운송 방식">
          <div className="ms-transport">{form.transport} (출발/도착지 선택에 따라 자동 결정)</div>
        </FormField>
        <FormField label="평균 리드타임 (일)">
          <input type="number" value={form.leadTime} onChange={(e) => onFieldChange('leadTime', e.target.value)} placeholder="예: 14" className="ms-input" />
        </FormField>
        <FormField label="운송 가능일">
          <input type="date" value={form.availableDate} onChange={(e) => onFieldChange('availableDate', e.target.value)} className="ms-input" />
        </FormField>
        <FormField label="가용 물량 (톤)">
          <input type="number" value={form.availableCapacity} onChange={(e) => onFieldChange('availableCapacity', e.target.value)} placeholder="예: 50" className="ms-input" />
        </FormField>
        <FormField label="타겟 HS코드">
          <input value={form.hsCode} onChange={(e) => onFieldChange('hsCode', e.target.value)} placeholder="예: 3304.99" className="ms-input" />
        </FormField>
        <FormField label="HS코드 취급 경험 (회)">
          <input type="number" value={form.experience} onChange={(e) => onFieldChange('experience', e.target.value)} placeholder="예: 24" className="ms-input" />
        </FormField>
      </div>

      {/* 출발지 / 도착지 */}
      <div className="ms-port-row">
        <PortPairSelector
          routes={routes}
          countryId={getCountryId(countries, form.countries[0])}
          departurePortType={form.departurePortType}
          departure={form.departure}
          destinationPortType={form.destinationPortType}
          destination={form.destination}
          onDepartureChange={onDepartureChange}
          onDestinationChange={onDestinationChange}
        />
      </div>

      {/* 노선 스위치 + 화물 취급 스위치 (5칸 그리드에 맞춰 정렬) */}
      <div className="ms-switches">
        {/* 1줄: 정기노선(1칸), 직항(2칸) — 직항이 아래 냉장/냉동과 세로 정렬 */}
        <div className="ms-switch-grid ms-switch-grid--gap-sm">
          <FormField label="정기노선 여부">
            <ToggleSwitch value={form.regularRoute} onChange={(v) => onFieldChange('regularRoute', v)} />
          </FormField>
          <FormField label="직항 여부">
            <ToggleSwitch value={form.directRoute} onChange={(v) => onFieldChange('directRoute', v)} />
          </FormField>
        </div>
        {/* 2줄: 일반, 냉동, 위험, 중량, 특수 */}
        <div className="ms-switch-grid ms-switch-grid--gap-md">
          {CARGO_SWITCHES.map(({ key, label }) => (
            <FormField key={key} label={label}>
              <ToggleSwitch value={form[key]} onChange={(v) => onFieldChange(key, v)} />
            </FormField>
          ))}
        </div>
      </div>

      <div className="ms-form-actions">
        <button disabled={addDisabled} onClick={onAdd} className="ms-add-btn">+ 조건 추가</button>
      </div>
    </fieldset>
  );
}
