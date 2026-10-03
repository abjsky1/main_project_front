import { useEffect, useRef, useState } from 'react';
import type { RouteData } from '../../../api/referenceData';
import type { PortType } from '../matchingTypes';
import { getPortList } from '../routeUtils';

interface PortSelectProps {
  routes: RouteData[];
  portType: PortType;
  countryId?: number;   // 해외 항구/공항은 이 국가 것만 표시
  value: string;
  onChange: (value: string, portType: PortType) => void;
  placeholder?: string;
}

// 항구/공항 검색 + 선택 드롭다운
export default function PortSelect({ routes, portType, countryId, value, onChange, placeholder }: PortSelectProps) {
  const [search, setSearch] = useState('');
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

  const ports = getPortList(routes, portType, countryId);
  const filtered = ports.filter((p) => p.includes(search));

  return (
    <div ref={ref} className="dropdown">
      <div onClick={() => setOpen(!open)} className="dropdown__trigger">
        <span className={value ? 'dropdown__value has-value' : 'dropdown__value'}>{value || (placeholder ?? '선택')}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={open ? 'dropdown__chevron is-open' : 'dropdown__chevron'}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {open && (
        <div className="dropdown__menu">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="검색..." className="dropdown__search" onClick={(e) => e.stopPropagation()} />
          <div className="dropdown__list">
            {filtered.map((p) => (
              <div
                key={p}
                onClick={() => { onChange(p, portType); setOpen(false); setSearch(''); }}
                className={value === p ? 'dropdown__option dropdown__option--hover is-selected' : 'dropdown__option dropdown__option--hover'}
              >
                {p}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="dropdown__empty">
                {!countryId && portType.startsWith('해외') ? '타겟 국가를 먼저 선택해 주세요.' : '검색 결과 없음'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
