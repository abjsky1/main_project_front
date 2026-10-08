/* =====================================================================
   매칭 관리 페이지 (주소: /matching , 관리자 전용)
   - 새 매칭 흐름(화주 요청 → 운송사 수락 = 매칭 성사)은 관리자 승인 단계가 없어서 , 이 화면은 진행 상황 확인용
   - 위 : 상태별 건수 5칸 (누르면 아래 목록을 그 상태만 보기)
   - 아래 : 매칭 목록 표 — 한 줄에 업체 · 화물 조건 · 운송사 제공 조건 · 점수 · 상태를 모두 (세부 탭 없음)
   ⚠️ 회원 화면(메인 페이지 "내 매칭")과 같은 더미 데이터(my-matching/myMatchingData.ts)를 사용
      → 회원이 요청 / 수락 / 거절하면 이 화면 숫자도 바로 바뀜 (같은 브라우저)
   ===================================================================== */
import { useState } from 'react';
import type { User } from '../../types/user';
import AccessGuard from '../../components/common/AccessGuard';
import PageHeader from '../../components/common/PageHeader';
import { getStage, getStageGroup, type MyMatchItem, type Stage } from '../my-matching/myMatchingData';
import useMyMatchingDemo from '../my-matching/useMyMatchingDemo';
import MatchStats, { STAT_CARDS, type MatchFilter } from './components/MatchStats';
import './SmartMatching.css';

// [TS] 이 컴포넌트가 받는 props 의 모양 (가이드 2-4)
interface SmartMatchingProps {
  user: User | null;          // 로그인 안 했으면 null
}

// 진행 단계 → 관리자 화면 배지 글자 + 색
const STAGE_BADGE: Record<Stage, { label: string; tone: string }> = {
  recommended:       { label: '자동 매칭 연결', tone: 'sm-badge--linked' },
  requested:         { label: '물류 수락 대기', tone: 'sm-badge--requested' },
  completed:         { label: '매칭 성사', tone: 'sm-badge--completed' },
  shipperRejected:   { label: '화주 거절', tone: 'sm-badge--failed' },
  logisticsRejected: { label: '운송사 거절', tone: 'sm-badge--failed' },
};

// true → 'O' , false → 'X'
const ox = (value: boolean) => (value ? 'O' : 'X');

// 날짜 '2026-11-20' → '11-20' (표에서 짧게)
const shortDate = (date: string) => date.slice(5);

export default function SmartMatching({ user }: SmartMatchingProps) {
  const { matches } = useMyMatchingDemo();
  const [filter, setFilter] = useState<MatchFilter>('all');

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

  // 상태별 건수
  const counts: Record<MatchFilter, number> = { all: matches.length, linked: 0, requested: 0, completed: 0, failed: 0 };
  for (const m of matches) {
    counts[getStageGroup(getStage(m))] += 1;
  }

  // 고른 상태만 + 최근 생성 순
  const rows: MyMatchItem[] = matches
    .filter((m) => filter === 'all' || getStageGroup(getStage(m)) === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);

  const filterLabel = STAT_CARDS.find((card) => card.key === filter)?.label ?? '전체';

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Admin · Matching"
        title="매칭 관리"
        subtitle="화주가 요청하고 운송사가 수락하면 매칭이 성사됩니다. 관리자는 전체 진행 상황을 확인합니다."
      />

      {/* 상태별 건수 */}
      <MatchStats counts={counts} filter={filter} onFilterChange={setFilter} />

      {/* 목록 위 막대 : 지금 보는 상태 + 건수 */}
      <div className="sm-list-bar">
        <p className="eyebrow">매칭 목록 · {filterLabel}</p>
        <span className="sm-count">{rows.length}건</span>
        <p className="sm-list-bar__note">점수 : 노선 30 · 가용량 25 · HS 20 · 일정 15 · 경험 10 (100점 만점)</p>
      </div>

      {/* 매칭 목록 표 (한 줄 = 매칭 1건 , 칸마다 위 · 아래 두 줄) */}
      <div className="sm-table-wrap">
        <table className="sm-table">
          <thead>
            <tr>
              {['번호 · 생성', '화주사 → 운송사', '화물 조건 (화주)', '제공 조건 (운송사)', '매칭 점수', '진행 상태'].map((h) => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const stage = getStage(m);
              const badge = STAGE_BADGE[stage];
              const { request, offer } = m;
              return (
                <tr key={m.id}>
                  <td>
                    <p className="sm-cell__main sm-mono">#{m.id}</p>
                    <p className="sm-cell__sub sm-mono">{m.createdAt.slice(5)}</p>
                  </td>
                  <td>
                    <p className="sm-cell__main">{m.shipper.companyName}</p>
                    <p className="sm-cell__sub">→ {m.logistics.companyName}</p>
                  </td>
                  <td>
                    <p className="sm-cell__main">{request.departure} → {request.destination}</p>
                    <p className="sm-cell__sub">
                      {request.transport} · {request.tradeType} · {request.country} · HS {request.hsCode} · {request.volume}t · 희망 {shortDate(request.schedule)}
                    </p>
                  </td>
                  <td>
                    <p className="sm-cell__main">가용 {offer.availableCapacity}t · 가능 {shortDate(offer.availableDate)}</p>
                    <p className="sm-cell__sub">
                      정기 {ox(offer.regularRoute)} · 직항 {ox(offer.directRoute)} · 리드 {offer.leadTime}일 · 경험 {offer.experience}회
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
                    <span className={`sm-badge ${badge.tone}`}>{badge.label}</span>
                    {stage === 'logisticsRejected' && m.logistics.rejectReason && (
                      <p className="sm-cell__sub">사유: {m.logistics.rejectReason}</p>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="sm-table__empty">해당 상태의 매칭 건이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
