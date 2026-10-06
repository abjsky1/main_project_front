import type { ReactNode } from 'react';

// 라벨 + 입력 요소 묶음
// children : <FormField> 태그 사이에 넣은 입력칸 (예: <FormField label="물량"><input /></FormField>)
// [TS] ReactNode : 화면에 그릴 수 있는 모든 것 (가이드 2-8)
export default function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}
