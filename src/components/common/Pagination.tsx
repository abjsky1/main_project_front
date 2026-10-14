// 페이지 번호 버튼 (공통) — ‹ 이전  1 2 3 … 10  다음 ›
// - 여러 목록에서 같이 씀 : 감사 로그 , 사용자 권한 관리 , 매칭 관리 , 무역 데이터 조건 검색 결과
// - page 는 사람이 보는 번호(1 부터) — 서버의 0 부터 번호로 바꾸는 일은 부르는 쪽(useAuditLogs 등)이 함
// - 번호는 10개씩 묶어서 보여 줌 (1~10 , 11~20 ...) — 게시판에서 흔한 방식
//     예) 13페이지를 보는 중이면 11 12 [13] 14 ... 20 이 보임
// 스타일은 styles/common.css 의 .pagination

const GROUP_SIZE = 10;   // 한 번에 보여 줄 번호 개수

interface PaginationProps {
  page: number;                        // 지금 페이지 (1 부터)
  totalPages: number;                  // 전체 페이지 수
  onChange: (page: number) => void;    // 번호 · 이전 · 다음을 누르면 그 페이지 번호(1 부터)로 호출
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  // 페이지가 1개 이하면 버튼이 필요 없음
  if (totalPages <= 1) return null;

  // 1. 이번 묶음의 첫 번호와 끝 번호
  //    Math.floor : 소수점 아래 버림 — 13페이지 → (13 - 1) / 10 = 1.2 → 1 → 1 * 10 + 1 = 11
  const start = Math.floor((page - 1) / GROUP_SIZE) * GROUP_SIZE + 1;
  //    끝 번호 : 시작 + 9 , 단 전체 페이지 수를 넘지 않게 (마지막 묶음은 짧을 수 있음 — 예: 21 22 23)
  const end = Math.min(start + GROUP_SIZE - 1, totalPages);

  // 2. start ~ end 번호 목록 만들기  예) [11, 12, ..., 20]
  const numbers: number[] = [];
  for (let n = start; n <= end; n++) numbers.push(n);

  return (
    <nav className="pagination" aria-label="페이지 이동">
      {/* 첫 페이지면 이전 버튼 잠금 */}
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="pagination__arrow">‹ 이전</button>

      {numbers.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={n === page ? 'pagination__num is-active' : 'pagination__num'}
          aria-current={n === page ? 'page' : undefined}   // 화면 읽기 프로그램에 "지금 페이지" 라고 알려 줌
        >
          {n}
        </button>
      ))}

      {/* 마지막 페이지면 다음 버튼 잠금 */}
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} className="pagination__arrow">다음 ›</button>
    </nav>
  );
}
