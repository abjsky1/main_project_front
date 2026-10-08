import { useEffect, useRef, useState } from 'react';
import type { HsCodeData } from '../../../api/referenceData';

interface HsCodeSelectProps {
  value: string;                      // 지금 고른 HS 코드 (10자리 , 없으면 '')
  onChange: (hsCode: string) => void; // 고른(또는 직접 입력한) 코드를 부모에게 알림
  hsCodes: HsCodeData[];              // hscode.csv 의 10자리 코드 목록
}

const MAX_SUGGESTIONS = 30;   // 목록에 한 번에 보여줄 최대 개수

// HS 코드 찾기 : 코드 앞자리나 품목명으로 검색 → 목록에서 골라 10자리 코드 입력
// (직접 10자리 숫자를 입력해도 됨)
export default function HsCodeSelect({ value, onChange, hsCodes }: HsCodeSelectProps) {
  const [query, setQuery] = useState(value);   // 입력칸에 쓴 글자
  const [open, setOpen] = useState(false);     // 추천 목록이 열려 있는지
  const ref = useRef<HTMLDivElement>(null);    // 바깥 클릭 판단용 (CountrySelect 와 같은 방식 — 가이드 3-6)

  // 바깥을 클릭하면 목록 닫기
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 추천 목록 만들기
  // - 숫자로만 입력했으면 : 코드가 그 숫자로 시작하는 것
  // - 글자로 입력했으면   : 품목명이나 4자리(호) 이름에 그 글자가 들어 있는 것
  const keyword = query.trim();
  const isNumber = /^\d+$/.test(keyword);
  const suggestions: HsCodeData[] = [];
  if (keyword) {
    for (const item of hsCodes) {
      const matched = isNumber
        ? item.hsCode.startsWith(keyword)
        : item.hsName.includes(keyword) || item.groupName.includes(keyword);
      if (matched) suggestions.push(item);
      if (suggestions.length >= MAX_SUGGESTIONS) break;   // 30개가 차면 그만 찾기
    }
  }

  // 지금 고른 코드의 정보 (입력칸 아래에 품목명 표시)
  const selected = hsCodes.find((item) => item.hsCode === value);

  // 입력칸에 글자를 쓸 때 : 10자리 숫자면 그대로 코드로 사용 , 아니면 아직 고르지 않은 상태('')
  const handleInput = (text: string) => {
    setQuery(text);
    setOpen(true);
    onChange(/^\d{10}$/.test(text.trim()) ? text.trim() : '');
  };

  // 목록에서 하나 고르기
  const pick = (item: HsCodeData) => {
    setQuery(item.hsCode);
    onChange(item.hsCode);
    setOpen(false);
  };

  return (
    <div ref={ref} className="trade-hs">
      <input
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="HS 코드 10자리 또는 품목명 (예: 3304991000 , 화장)"
        className="trade-input"
      />

      {/* 추천 목록 */}
      {open && keyword && (
        <div className="trade-hs__menu">
          {suggestions.map((item) => (
            <button key={item.hsCode} type="button" onClick={() => pick(item)} className="trade-hs__option">
              <span className="trade-hs__code">{item.hsCode}</span>
              <span className="trade-hs__name">{item.hsName}</span>
              <span className="trade-hs__group">{item.groupName}</span>
            </button>
          ))}
          {suggestions.length === 0 && (
            <p className="trade-hs__empty">
              {hsCodes.length === 0 ? 'HS 코드 목록을 불러오는 중입니다...' : '맞는 HS 코드가 없습니다.'}
            </p>
          )}
        </div>
      )}

      {/* 고른 코드의 품목명 */}
      {selected && (
        <p className="trade-hs__selected">
          선택한 품목 : <strong>{selected.hsName}</strong> · {selected.groupName}
        </p>
      )}
    </div>
  );
}
