import type { CountryData, RouteData } from '../../../api/referenceData';
import type { PortType, ShipperForm } from '../matchingTypes';
import { getCountryId } from '../routeUtils';
import CountrySelect from './CountrySelect';
import FormField from './FormField';
import PortPairSelector from './PortPairSelector';
import ToggleSwitch from './ToggleSwitch';

// 화물 특성 스위치 4개 — 같은 모양이라 배열로 만들어 map 으로 그림
// key 는 입력폼(ShipperForm)의 칸 이름
// [TS] as const : key 를 정확한 글자('refrigeration' ...)로 기억시켜서 아래 form[key] 를 안전하게 씀 (가이드 2-7)
const CARGO_SWITCHES = [
  { key: 'refrigeration', label: '냉장/냉동 여부' },
  { key: 'hazmat', label: '위험물 여부' },
  { key: 'heavy', label: '중량물 여부' },
  { key: 'special', label: '특수화물 여부' },
] as const;

// 입력폼 값(form)과 바뀐 값을 알리는 함수들은 부모(MatchingSettings)가 내려줌
interface ShipperConditionFormProps {
  form: ShipperForm;
  countries: CountryData[];
  routes: RouteData[];
  disabled: boolean;      // 폼 전체 비활성화 (동의 전, 저장 중 등)
  addDisabled: boolean;   // "+ 조건 추가" 버튼 비활성화
  onFieldChange: (key: string, value: any) => void;   // (칸 이름, 새 값) → 부모가 폼 값을 바꿈
  onDepartureChange: (value: string, portType: PortType) => void;
  onDestinationChange: (value: string, portType: PortType) => void;
  onAdd: () => void;
}

// 수출입기업(화주) 매칭 조건 입력폼
export default function ShipperConditionForm({
  form, countries, routes, disabled, addDisabled, onFieldChange, onDepartureChange, onDestinationChange, onAdd,
}: ShipperConditionFormProps) {
  // [추가] 오늘 날짜 구하기 (한국 시간 등 브라우저 현지 날짜 기준)
  const today = new Date();

  const minDate =
    `${today.getFullYear()}-` +
    `${String(today.getMonth() + 1).padStart(2, '0')}-` +
    `${String(today.getDate()).padStart(2, '0')}`;
  return (
    // <fieldset disabled> : 안에 있는 입력칸/버튼을 한 번에 모두 비활성화하는 HTML 태그
    <fieldset disabled={disabled} className="ms-form">
      <div className="ms-form-grid">
        <FormField label="타겟 국가">
          <CountrySelect countries={countries} value={form.countries} onChange={(v) => onFieldChange('countries', v)} />
        </FormField>
        <FormField label="타겟 HS코드">
          <input value={form.hsCode} onChange={(e) => onFieldChange('hsCode', e.target.value)} placeholder="예: 3304991000" className="ms-input" />
        </FormField>
        <FormField label="수출/수입 구분">
          <select value={form.tradeType} onChange={(e) => onFieldChange('tradeType', e.target.value)} className="ms-input">
            <option>수출</option><option>수입</option>
          </select>
        </FormField>
        <FormField label="운송 방식">
          <div className="ms-transport">{form.transport} (출발/도착지 선택에 따라 자동 결정)</div>
        </FormField>
        <FormField label="물량 (톤)">
          <input type="number" value={form.volume} onChange={(e) => onFieldChange('volume', e.target.value)} placeholder="예: 12.5" className="ms-input" />
        </FormField>
        <FormField label="희망 일정">
          <input type="date" min={minDate} value={form.schedule} onChange={(e) => onFieldChange('schedule', e.target.value)} className="ms-input" />
        </FormField>
      </div>

      {/* 출발지 / 도착지 */}
      <div className="ms-port-row">
        <PortPairSelector
          routes={routes}
          // 선택한 타겟 국가(첫 번째)의 id → 해외 항구 목록을 그 나라 것만 보여주기 위해
          countryId={getCountryId(countries, form.countries[0])}
          departurePortType={form.departurePortType}
          departure={form.departure}
          destinationPortType={form.destinationPortType}
          destination={form.destination}
          onDepartureChange={onDepartureChange}
          onDestinationChange={onDestinationChange}
        />
      </div>

      {/* 화물 유형 + 화물 특성 스위치 (한 줄) */}
      <div className="ms-switches ms-switches--spaced">
        <div className="ms-switch-grid">
          {/* 화물 유형은 true/false 가 아니라 '일반'/'특수' 글자로 저장 → 스위치 켜짐 = '특수' */}
          <FormField label="화물 유형">
            <ToggleSwitch
              value={form.cargoType === '특수'}
              onChange={(v) => onFieldChange('cargoType', v ? '특수' : '일반')}
              labelOff="일반"
              labelOn="특수"
            />
          </FormField>
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
