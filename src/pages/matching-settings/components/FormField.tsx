import type { ReactNode } from 'react';

// 라벨 + 입력 요소 묶음
export default function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}
