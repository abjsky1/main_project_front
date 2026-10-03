import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow: string;       // 제목 위 작은 영문 라벨 (예: 'Admin')
  title: ReactNode;      // 페이지 제목
  subtitle?: ReactNode;  // 제목 아래 설명 (선택)
  className?: string;    // 여백 조정용 추가 클래스 (예: 'page-header--compact')
}

// 모든 페이지 상단의 "라벨 + 제목" 영역
export default function PageHeader({ eyebrow, title, subtitle, className }: PageHeaderProps) {
  return (
    <div className={className ? `page-header ${className}` : 'page-header'}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
  );
}
