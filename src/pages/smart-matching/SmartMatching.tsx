/* =====================================================================
   매칭 관리 페이지 (주소: /matching , 관리자 전용)
   - 새 매칭 흐름(화주 요청 → 운송사 수락 = 매칭 성사)은 관리자 승인 단계가 없어서 , 이 화면은 진행 상황 확인용
   - 위 : 상태별 건수 5칸 (누르면 아래 목록을 그 상태만 보기)
   - 아래 : 매칭 목록 표 50건씩 + 페이지 번호 — 한 줄에 업체 · 추천 이유 · 운송사 제공 조건 · 점수 · 상태 (화면 폭에 고정 , 가로 스크롤 없음)
   - 필터 : [필터] 버튼을 누르면 표 머리글 바로 아래에 필터 줄이 열림 → 각 조건이 해당 컬럼 위에 있음
       매칭 ID · 매칭 점수 정렬 , 업체 이름 · 추천 이유 검색([검색] 버튼 / Enter) , 제공 조건(해상/항공 · 정기 · 직항) , 진행 상태
       (사용자 권한 관리 · 감사 로그 · 무역 조건 검색도 같은 모양 — 공통 스타일 styles/common.css 의 .col-filter-row)
       서버가 거르고 정렬해서 50건씩 보내 줌 (카드 숫자도 필터에 맞는 건수로 바뀜)
   - 맨 왼쪽 번호 : 지금 화면에 보이는 순서 (정렬 · 필터가 바뀌어도 첫 줄은 항상 1 , 2 페이지는 51 부터)
   - 데이터 : GET /api/matching/admin 한 번으로 "카드 숫자 5개 + 고른 상태의 50건" (useAdminMatchings)
     고른 상태 · 페이지는 주소에 저장 → /matching?status=completed&page=2 (새로고침 · 뒤로 가기 유지)
   ===================================================================== */
import type { KeyboardEvent, MouseEvent } from 'react';
import type { MatchingApiDto, MatchingStatusFilter } from '../../api/matchingApi';
import type { User } from '../../types/user';
import AccessGuard from '../../components/common/AccessGuard';
import FilterButton from '../../components/common/FilterButton';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import MatchStats, { STAT_CARDS } from './components/MatchStats';
import useAdminMatchings, { type MatchingSortField, type RouteOptions } from './useAdminMatchings';
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
  const {
    matchings, counts, status, page, pageSize, totalCount, totalPages, loading, loadError, changeStatus, goToPage,
    filterOpen, setFilterOpen, keywordInput, setKeywordInput, reasonInput, setReasonInput, search, routes, changeRoute,
    sortField, sortDir, changeSort, resetFilters, filtersActive,
  } = useAdminMatchings();

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
  const emptyMessage = loading ? '매칭 목록을 불러오는 중입니다...' : loadError || '해당 조건의 매칭 건이 없습니다.';

  // 이번 페이지 첫 줄의 번호 : 1 페이지 = 1 , 2 페이지 = 51 ... (화면에 보이는 순서대로 이어서 매김)
  const firstNo = (page - 1) * pageSize + 1;

  // 페이지 번호를 누르면 : 그 페이지로 + 화면 맨 위로 (감사 로그와 같음)
  const changePage = (nextPage: number) => {
    goToPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 추천 이유 · 주의 사항 칸 (.sm-scroll) : 마우스를 올리면 글자 끝까지 옆으로 밀어서 보여 주고 , 마우스가 나가면 처음으로
  // 글자가 칸 안에 다 들어가면 밀 거리가 0 이라 움직이지 않음 (스크롤 막대는 CSS 에서 숨김)
  const slideToEnd = (e: MouseEvent<HTMLDivElement>) => e.currentTarget.scrollTo({ left: e.currentTarget.scrollWidth, behavior: 'smooth' });
  const slideToStart = (e: MouseEvent<HTMLDivElement>) => e.currentTarget.scrollTo({ left: 0, behavior: 'smooth' });

  // 검색칸에서 Enter = [검색]
  const searchOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') search();
  };

  // 정렬 버튼 글자 : 지금 정렬 중인 기준이면 방향 , 아니면 "정렬 ↕"
  //   desc / asc 일 때 보여 줄 말을 기준마다 다르게 (매칭 ID : 최신순 / 오래된순 , 점수 : 높은순 / 낮은순)
  const sortLabel = (field: MatchingSortField, descText: string, ascText: string) => {
    if (field !== sortField) return '정렬 ↕';
    return sortDir === 'desc' ? `${descText} ↓` : `${ascText} ↑`;
  };

  // 머리글 옆 화살표 : 그 컬럼으로 정렬 중일 때만 (↓ 내림 / ↑ 오름)
  const headerArrow = (field: MatchingSortField) => {
    if (field !== sortField) return '';
    return sortDir === 'desc' ? ' ↓' : ' ↑';
  };

  return (
    <div className="page-container">
      <PageHeader eyebrow="Admin · Matching" title="매칭 관리" />

      {/* 상태별 건수 (서버가 센 숫자 — 필터를 걸면 필터에 맞는 매칭의 건수) */}
      <MatchStats counts={counts} filter={status} onFilterChange={changeStatus} />

      {/* 목록 위 막대 : 지금 보는 상태 + 그 상태의 전체 건수 + 페이지 | 점수 설명 + 필터 버튼 */}
      <div className="sm-list-bar">
        <p className="eyebrow">매칭 목록 · {filterLabel}</p>
        <span className="sm-count">{totalCount.toLocaleString()}건</span>
        {totalPages > 1 && <span className="sm-page-info">{page} / {totalPages} 페이지</span>}
        <div className="sm-list-bar__right">
          <p className="sm-list-bar__note">점수 : 노선 30 · 가용량 25 · HS 20 · 일정 15 · 경험 10 (100점 만점)</p>
          {filtersActive && <button onClick={resetFilters} className="filter-reset-btn">필터 초기화</button>}
          <FilterButton active={filterOpen} onClick={() => setFilterOpen(!filterOpen)} />
        </div>
      </div>

      {/* 매칭 목록 표 (한 줄 = 매칭 1건 , 칸마다 위 · 아래 두 줄)
          화면 폭에 맞춰 고정 (표 전체 가로 스크롤 없음) — 칸이 좁으면 줄을 바꾸지 않고 "…" 로 줄임 , 마우스를 올리면 전체 글자(title)
          추천 이유 · 주의 사항 칸만 "…" 대신 칸 안에서 옆으로 밀어 끝까지 볼 수 있음 (마우스 올리기 · 터치패드 좌우 · Shift + 휠) */}
      <div className="sm-table-wrap">
        <table className="sm-table">
          <thead>
            <tr>
              <th>번호</th>
              <th>매칭 ID · 생성{headerArrow('id')}</th>
              <th>화주사 → 운송사</th>
              <th>추천 이유 · 주의 사항</th>
              <th>제공 조건 (운송사)</th>
              <th>매칭 점수{headerArrow('score')}</th>
              <th>진행 상태</th>
            </tr>

            {/* 필터 줄 — 각 조건이 바로 위 컬럼에 대한 것
                검색칸은 [검색] 버튼 / Enter 로 적용 (두 검색칸 중 어느 버튼을 눌러도 둘 다 적용) , 선택칸 · 정렬 버튼은 바로 적용 (useAdminMatchings) */}
            {filterOpen && (
              <tr className="col-filter-row">
                {/* 번호 : 화면 순서라서 거를 조건이 없음 */}
                <th />
                <th>
                  <button onClick={() => changeSort('id')} className={sortField === 'id' ? 'col-sort-btn is-active' : 'col-sort-btn'}>
                    {sortLabel('id', '최신순', '오래된순')}
                  </button>
                </th>
                <th>
                  <div className="col-search">
                    <input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={searchOnEnter}
                      placeholder="업체 이름"
                      className="col-filter-input"
                    />
                    <button onClick={search} className="col-search__btn">검색</button>
                  </div>
                </th>
                <th>
                  <div className="col-search">
                    <input
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      onKeyDown={searchOnEnter}
                      placeholder="추천 이유 · 주의 사항"
                      className="col-filter-input"
                    />
                    <button onClick={search} className="col-search__btn">검색</button>
                  </div>
                </th>
                <th>
                  {/* 제공 조건 3개 : 값이 'all' 이면 전체 , 고른 값과 다르면 회색 글씨가 아니라 보라색(has-value)
                      [TS] as RouteOptions['transport'] : select 값은 글자라서 "이 칸에 들어갈 수 있는 값" 이라고 알려 줌 (가이드 2-6) */}
                  <div className="col-filter-group">
                    <select
                      value={routes.transport}
                      onChange={(e) => changeRoute('transport', e.target.value as RouteOptions['transport'])}
                      className={routes.transport === 'all' ? 'col-filter-select' : 'col-filter-select has-value'}
                    >
                      <option value="all">운송</option>
                      <option value="sea">해상</option>
                      <option value="air">항공</option>
                    </select>
                    <select
                      value={routes.regular}
                      onChange={(e) => changeRoute('regular', e.target.value as RouteOptions['regular'])}
                      className={routes.regular === 'all' ? 'col-filter-select' : 'col-filter-select has-value'}
                    >
                      <option value="all">정기</option>
                      <option value="O">정기 O</option>
                      <option value="X">정기 X</option>
                    </select>
                    <select
                      value={routes.direct}
                      onChange={(e) => changeRoute('direct', e.target.value as RouteOptions['direct'])}
                      className={routes.direct === 'all' ? 'col-filter-select' : 'col-filter-select has-value'}
                    >
                      <option value="all">직항</option>
                      <option value="O">직항 O</option>
                      <option value="X">직항 X</option>
                    </select>
                  </div>
                </th>
                <th>
                  <button onClick={() => changeSort('score')} className={sortField === 'score' ? 'col-sort-btn is-active' : 'col-sort-btn'}>
                    {sortLabel('score', '높은순', '낮은순')}
                  </button>
                </th>
                <th>
                  {/* 진행 상태 : 위 카드 5칸과 같은 값 (어느 쪽에서 바꿔도 주소의 ?status= 가 바뀜) */}
                  <select
                    value={status}
                    onChange={(e) => changeStatus(e.target.value as MatchingStatusFilter)}
                    className={status === 'all' ? 'col-filter-select' : 'col-filter-select has-value'}
                  >
                    {STAT_CARDS.map((card) => <option key={card.key} value={card.key}>{card.label}</option>)}
                  </select>
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {matchings.map((m, index) => {
              const badge = statusBadge(m);
              const shipperName = m.shipperCompanyName ?? '-';
              const logisticsName = m.logisticsCompanyName ?? '-';
              // 매칭을 만들 때 남긴 글자 (값이 없으면 서버 기본값 "-")
              const reason = m.recommendReason || '-';
              const warning = m.warningMessage || '-';
              return (
                <tr key={m.matchingId}>
                  {/* 화면에 보이는 순서 번호 (첫 줄 = firstNo) */}
                  <td className="cell-no">{firstNo + index}</td>
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
              <tr><td colSpan={7} className="sm-table__empty">{emptyMessage}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지 번호 (감사 로그와 같은 공통 컴포넌트 — 페이지가 2개 이상일 때만 보임) */}
      <Pagination page={page} totalPages={totalPages} onChange={changePage} />
    </div>
  );
}
