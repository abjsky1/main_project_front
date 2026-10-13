/* =====================================================================
   매칭 관리 페이지 (주소: /matching , 관리자 전용)
   - 새 매칭 흐름(화주 요청 → 운송사 수락 = 매칭 성사)은 관리자 승인 단계가 없어서 , 이 화면은 진행 상황 확인용
   - 위 : 상태별 건수 5칸 (누르면 아래 목록을 그 상태만 보기)
   - 아래 : 매칭 목록 표 50건씩 + 페이지 번호 — 한 줄에 업체 · 추천 이유 · 운송사 제공 조건 · 점수 · 상태 (화면 폭에 고정 , 가로 스크롤 없음)
   - 데이터 : GET /api/matching/admin 한 번으로 "카드 숫자 5개 + 고른 상태의 50건" (useAdminMatchings)
     고른 상태 · 페이지는 주소에 저장 → /matching?status=completed&page=2 (새로고침 · 뒤로 가기 유지)
   ===================================================================== */
import type { MouseEvent } from 'react';
import type { MatchingApiDto } from '../../api/matchingApi';
import type { User } from '../../types/user';
import AccessGuard from '../../components/common/AccessGuard';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import MatchStats, { STAT_CARDS } from './components/MatchStats';
import useAdminMatchings from './useAdminMatchings';
import './SmartMatching.css';

// [TS] 이 컴포넌트가 받는 props 의 모양 (가이드 2-4)
interface SmartMatchingProps {
  user: User | null;          // 로그인 안 했으면 null
}

// 매칭 1건의 상태(서버의 화주 · 운송사 · 최종 상태 3개) → 배지 글자 + 색
// 판단 순서 : 최종 결과(성사 / 실패) 먼저 → 진행 중이면 누가 응답했는지
function statusBadge(m: MatchingApiDto): { label: string; tone: string } {
  if (m.finalStatus === 'COMPLETED') return { label: '매칭 성사', tone: 'sm-badge--completed' };
  if (m.finalStatus === 'FAILED') {
    if (m.shipperStatus === 'REJECTED') return { label: '화주 거절', tone: 'sm-badge--failed' };
    if (m.logisticsStatus === 'REJECTED') return { label: '운송사 거절', tone: 'sm-badge--failed' };
    return { label: '매칭 실패', tone: 'sm-badge--failed' };
  }
  if (m.shipperStatus === 'ACCEPTED' && m.logisticsStatus === 'WAITING') return { label: '물류 수락 대기', tone: 'sm-badge--requested' };
  if (m.shipperStatus === 'WAITING' && m.logisticsStatus === 'WAITING') return { label: '자동 매칭 연결', tone: 'sm-badge--linked' };
  return { label: '진행 중', tone: '' };   // 위 경우에 안 맞는 조합 (기본 회색 배지)
}

// true → 'O' , false → 'X' , 값이 없으면 '-'
const ox = (value?: boolean | null) => (value == null ? '-' : value ? 'O' : 'X');

// 서버 시각 "2026-10-13T23:55:12" → "10-13 23:55" (표에서 짧게)
const shortDateTime = (value: string) => value.slice(5, 16).replace('T', ' ');

export default function SmartMatching({ user }: SmartMatchingProps) {
  // 훅은 return 보다 위에서 항상 불러야 해서 관리자 확인보다 먼저 (가이드 3-4)
  const { matchings, counts, status, page, totalCount, totalPages, loading, loadError, changeStatus, goToPage } = useAdminMatchings();

  // 관리자만 접근 가능
  if (!user || user.role !== 'admin') {
    return (
      <div className="page-container">
        <PageHeader eyebrow="Admin" title="매칭 관리" className="page-header--compact" />
        <AccessGuard
          icon="lock"
          description="매칭 관리는 관리자 계정으로만 이용할 수 있습니다."
        />
      </div>
    );
  }

  const filterLabel = STAT_CARDS.find((card) => card.key === status)?.label ?? '전체';

  // 표가 비었을 때 안내 문구 : 불러오는 중 → 오류 문구(있으면) → 결과 없음
  const emptyMessage = loading ? '매칭 목록을 불러오는 중입니다...' : loadError || '해당 상태의 매칭 건이 없습니다.';

  // 페이지 번호를 누르면 : 그 페이지로 + 화면 맨 위로 (감사 로그와 같음)
  const changePage = (nextPage: number) => {
    goToPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 추천 이유 · 주의 사항 칸 (.sm-scroll) : 마우스를 올리면 글자 끝까지 옆으로 밀어서 보여 주고 , 마우스가 나가면 처음으로
  // 글자가 칸 안에 다 들어가면 밀 거리가 0 이라 움직이지 않음 (스크롤 막대는 CSS 에서 숨김)
  const slideToEnd = (e: MouseEvent<HTMLDivElement>) => e.currentTarget.scrollTo({ left: e.currentTarget.scrollWidth, behavior: 'smooth' });
  const slideToStart = (e: MouseEvent<HTMLDivElement>) => e.currentTarget.scrollTo({ left: 0, behavior: 'smooth' });

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Admin · Matching"
        title="매칭 관리"
        subtitle="화주가 요청하고 운송사가 수락하면 매칭이 성사됩니다. 관리자는 전체 진행 상황을 확인합니다."
      />

      {/* 상태별 건수 (서버가 센 숫자 — 고른 상태와 상관없이 항상 전체 기준) */}
      <MatchStats counts={counts} filter={status} onFilterChange={changeStatus} />

      {/* 목록 위 막대 : 지금 보는 상태 + 그 상태의 전체 건수 + 페이지 */}
      <div className="sm-list-bar">
        <p className="eyebrow">매칭 목록 · {filterLabel}</p>
        <span className="sm-count">{totalCount.toLocaleString()}건</span>
        {totalPages > 1 && <span className="sm-page-info">{page} / {totalPages} 페이지</span>}
        <p className="sm-list-bar__note">점수 : 노선 30 · 가용량 25 · HS 20 · 일정 15 · 경험 10 (100점 만점)</p>
      </div>

      {/* 매칭 목록 표 (한 줄 = 매칭 1건 , 칸마다 위 · 아래 두 줄)
          화면 폭에 맞춰 고정 (표 전체 가로 스크롤 없음) — 칸이 좁으면 줄을 바꾸지 않고 "…" 로 줄임 , 마우스를 올리면 전체 글자(title)
          추천 이유 · 주의 사항 칸만 "…" 대신 칸 안에서 옆으로 밀어 끝까지 볼 수 있음 (마우스 올리기 · 터치패드 좌우 · Shift + 휠) */}
      <div className="sm-table-wrap">
        <table className="sm-table">
          <thead>
            <tr>
              {['번호 · 생성', '화주사 → 운송사', '추천 이유 · 주의 사항', '제공 조건 (운송사)', '매칭 점수', '진행 상태'].map((h) => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {matchings.map((m) => {
              const badge = statusBadge(m);
              const shipperName = m.shipperCompanyName ?? '-';
              const logisticsName = m.logisticsCompanyName ?? '-';
              // 매칭을 만들 때 남긴 글자 (값이 없으면 서버 기본값 "-")
              const reason = m.recommendReason || '-';
              const warning = m.warningMessage || '-';
              return (
                <tr key={m.matchingId}>
                  <td>
                    <p className="sm-cell__main sm-mono">#{m.matchingId}</p>
                    <p className="sm-cell__sub sm-mono">{shortDateTime(m.createdAt)}</p>
                  </td>
                  <td>
                    {/* 화주사 · 운송사는 같은 무게의 정보라 같은 모양으로 */}
                    <p className="sm-cell__party" title={shipperName}>{shipperName}</p>
                    <p className="sm-cell__party" title={logisticsName}>→ {logisticsName}</p>
                  </td>
                  <td>
                    {/* 위 : 이 운송사를 추천한 이유 (강점)  아래 : 연결 조건에서 확인할 점 (일정 차이 · 품목 · 물량 · 화물 종류)
                        두 줄을 한 상자(.sm-scroll)에 넣어서 같이 밀림 */}
                    <div className="sm-scroll" title={`${reason}\n${warning}`} onMouseEnter={slideToEnd} onMouseLeave={slideToStart}>
                      <p className="sm-cell__main">{reason}</p>
                      <p className="sm-cell__sub">{warning}</p>
                    </div>
                  </td>
                  <td>
                    <p className="sm-cell__main">
                      {m.logisticsTransportType == null ? '-' : m.logisticsTransportType ? '해상' : '항공'}
                      {' · '}정기 {ox(m.logisticsRegularRoute)} · 직항 {ox(m.logisticsDirectRoute)}
                    </p>
                    <p className="sm-cell__sub">
                      경험 {m.logisticsExperienceCount ?? '-'}회 · 평균 운송 {m.logisticsAverageTransitDays ?? '-'}일
                    </p>
                  </td>
                  <td>
                    <p className="sm-cell__main">
                      <span className="sm-score">{m.totalScore}</span><small className="sm-score__max">/100</small>
                    </p>
                    <p className="sm-cell__sub sm-mono">
                      {m.routeScore} · {m.capacityScore} · {m.itemScore} · {m.scheduleScore} · {m.experienceScore}
                    </p>
                  </td>
                  <td>
                    <span className={`sm-badge ${badge.tone}`.trim()}>{badge.label}</span>
                  </td>
                </tr>
              );
            })}
            {matchings.length === 0 && (
              <tr><td colSpan={6} className="sm-table__empty">{emptyMessage}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지 번호 (감사 로그와 같은 공통 컴포넌트 — 페이지가 2개 이상일 때만 보임) */}
      <Pagination page={page} totalPages={totalPages} onChange={changePage} />
    </div>
  );
}
