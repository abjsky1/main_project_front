import { useEffect, useRef, useState } from 'react';
import { KOREA_ID, type CountryData } from '../../../api/referenceData';

interface CountrySelectProps {
  value: string[];                 // 선택된 국가 (최대 1개)
  onChange: (value: string[]) => void;
  countries: CountryData[];
}

// 타겟 국가 선택 드롭다운 (한 개만 선택, 대한민국 제외)
export default function CountrySelect({ value, onChange, countries }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 바깥을 클릭하면 닫기
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const sorted = countries
    .filter((country) => country.countryId !== KOREA_ID)
    .map((country) => country.countryName)
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const toggle = (country: string) => {
    onChange(value.includes(country) ? [] : [country]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="dropdown">
      <div onClick={() => setOpen(!open)} className="dropdown__trigger">
        <span className={value.length ? 'dropdown__value has-value' : 'dropdown__value'}>
          {value.length === 0 ? '국가 선택 (1개)' : value[0]}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={open ? 'dropdown__chevron is-open' : 'dropdown__chevron'}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {open && (
        <div className="dropdown__menu dropdown__menu--scroll">
          {sorted.map((country) => {
            const selected = value.includes(country);
            return (
              <div
                key={country}
                onClick={() => toggle(country)}
                className={selected ? 'dropdown__option dropdown__option--check is-selected' : 'dropdown__option dropdown__option--check'}
              >
                <div className="dropdown__checkbox">
                  {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="white"><path d="M1 4l3 3 5-6" /></svg>}
                </div>
                {country}
              </div>
            );
          })}
        </div>
      )}

      {value.length > 0 && (
        <div className="dropdown__chips">
          <span className="dropdown__chip">
            {value[0]}<button onClick={() => toggle(value[0])}>×</button>
          </span>
        </div>
      )}
    </div>
  );
}
