import type { ReactNode } from 'react';

// [TS] ReactNode : 글자뿐 아니라 <>...</> 같은 JSX 도 넣을 수 있는 타입 (가이드 2-8)
//      예) title={<>{greeting}종합 대시보드</>}
interface PageHeaderProps {
  eyebrow: string;       // 제목 위 작은 영문 라벨 (예: 'Admin')
  title: ReactNode;      // 페이지 제목
  subtitle?: ReactNode;  // 제목 아래 설명 (선택)
  className?: string;    // 여백 조정용 추가 클래스 (예: 'page-header--compact')
}

// 모든 페이지 상단의 "라벨 + 제목" 영역
export default function PageHeader({ eyebrow, title, subtitle, className }: PageHeaderProps) {
  return (
    // className 을 넘기면 기본 클래스 뒤에 붙임 (예: 'page-header page-header--compact')
    <div className={className ? `page-header ${className}` : 'page-header'}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
  );
}
