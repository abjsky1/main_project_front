/* =====================================================================
   내 매칭 상세 (주소: /:matchId , 예: /1001 — 메인 페이지 "내 매칭" 표의 [상세보기])
   - 상대 기업의 [기본 기업정보] · [사업자 확인 정보] · [매칭 관련 정보] · [운송 조건 비교]
   - 화주 : 매칭 요청 보내기 / 거절      운송사 : 수락(= 매칭 성사) / 거절
   ⚠️ 지금은 더미 데이터(myMatchingData.ts)로 동작하는 회의용 예시
   ===================================================================== */
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { User } from '../../types/user';
import PageHeader from '../../components/common/PageHeader';
import AccessGuard from '../../components/common/AccessGuard';
import {
  getStage, logisticsAccept, logisticsReject, requestLockReason, shipperAccept, shipperReject,
  type BizCheck, type Stage,
} from './myMatchingData';
import useMyMatchingDemo from './useMyMatchingDemo';
import ProgressSteps from './components/ProgressSteps';
import ScoreBar from './components/ScoreBar';
import StageBadge from './components/StageBadge';
import './MyMatching.css';

// true → 'O' , false → 'X'
const ox = (value: boolean) => (value ? 'O' : 'X');

// 사업자 상태 → 배지 색 클래스
function bizTone(status: BizCheck['status']) {
  if (status === '계속사업자') return 'mm-biz mm-biz--ok';
  if (status === '휴업자') return 'mm-biz mm-biz--warn';
  return 'mm-biz mm-biz--closed';
}

export default function MyMatchingDetail({ user }: { user: User | null }) {
  // useParams : 주소 /1001 의 1001 을 꺼냄 (B_react View.jsx 의 const { id } = useParams() 와 같음)
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { matches, updateMatch } = useMyMatchingDemo();
  const [notice, setNotice] = useState('');   // 버튼을 누른 뒤 결과 안내

  // 메인 페이지 아래쪽에서 넘어오므로 , 상세 페이지는 맨 위부터 보이게
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [matchId]);

  // 숫자가 아닌 주소(예: /abc)는 없는 페이지 → 메인으로
  // (/:matchId 는 한 칸짜리 주소를 모두 받기 때문에 여기서 한 번 더 확인)
  if (!/^\d+$/.test(matchId ?? '')) {
    return <Navigate to="/" replace />;
  }

  const isShipper = user?.companyType === '수출입기업';
  const match = matches.find((m) => m.id === Number(matchId));

  // 메인 페이지로 돌아가기 : 이 매칭의 조건이 왼쪽 목록에서 골라진 상태로 (?condition=번호)
  const backToList = () => {
    if (!match) return navigate('/');
    navigate(`/?condition=${isShipper ? match.conditionId : match.logisticsConditionId}`);
  };

  // 기업 회원이 아니면 안내 화면
  if (!user || user.role === 'admin') {
    return (
      <div className="page-container">
        <PageHeader eyebrow="My Matching" title="내 매칭" className="page-header--compact" />
        <AccessGuard icon="users" short description="내 매칭은 기업 회원(수출입기업·물류업체)만 이용할 수 있습니다." />
      </div>
    );
  }

  // 내 매칭인지 확인 (운송사는 화주가 요청을 보낸 건만 볼 수 있음)
  const isMine = !!match && (isShipper
    ? match.shipperMemberId === user.memberId
    : match.logisticsMemberId === user.memberId && match.shipper.response === 'accepted');

  if (!match || !isMine) {
    return (
      <div className="page-container">
        <button onClick={backToList} className="mm-back-btn">← 내 매칭</button>
        <div className="mm-empty">
          <p>매칭 정보를 찾을 수 없습니다.</p>
          <p className="mm-empty__sub">주소가 잘못되었거나 내 매칭이 아닙니다.</p>
        </div>
      </div>
    );
  }

  const stage: Stage = getStage(match);
  const partner = isShipper ? match.logistics : match.shipper;          // 상대 기업
  const partnerBiz = isShipper ? match.logisticsBiz : match.shipperBiz; // 상대 기업의 사업자 확인 결과
  const lockReason = isShipper ? requestLockReason(match, matches) : null;
  const { request, offer } = match;

  // 세부 점수 5개 (MatchingService 의 점수 기준 : 노선 30 , 가용량 25 , HS 20 , 일정 15 , 경험 10)
  const scores = [
    { label: '노선', score: match.routeScore, max: 30 },
    { label: '가용량', score: match.capacityScore, max: 25 },
    { label: 'HS CODE', score: match.itemScore, max: 20 },
    { label: '일정', score: match.scheduleScore, max: 15 },
    { label: '운송 경험', score: match.experienceScore, max: 10 },
  ];

  // 화물 특성 4가지 (화주가 보면 운송사가 취급 가능한지 , 운송사가 보면 화주 화물이 필요한지)
  const cargoFlags = isShipper
    ? [{ label: '냉장/냉동', on: offer.refrigeration }, { label: '위험물', on: offer.hazmat }, { label: '중량물', on: offer.heavy }, { label: '특수화물', on: offer.special }]
    : [{ label: '냉장/냉동', on: request.refrigeration }, { label: '위험물', on: request.hazmat }, { label: '중량물', on: request.heavy }, { label: '특수화물', on: request.special }];

  // 운송 조건 비교표 { 항목, 화주 요청, 운송사 제공 }
  const compareRows = [
    { label: '출발지 → 도착지', request: `${request.departure} → ${request.destination}`, offer: `${offer.departure} → ${offer.destination}` },
    { label: '운송방식', request: request.transport, offer: offer.transport === 'SEA' ? '해상' : '항공' },
    { label: 'HS 코드', request: request.hsCode, offer: offer.hsCode },
    { label: '물량', request: `${request.volume}t`, offer: `가용 ${offer.availableCapacity}t` },
    { label: '일정', request: `희망 ${request.schedule}`, offer: `운송 가능 ${offer.availableDate}` },
    { label: '노선', request: '-', offer: `정기노선 ${ox(offer.regularRoute)} · 직항 ${ox(offer.directRoute)} · 리드타임 ${offer.leadTime}일` },
  ];

  /* ---------- 버튼 ---------- */

  // 화주 : 매칭 요청 보내기
  const handleRequest = () => {
    if (!window.confirm(`${partner.companyName}에 매칭을 요청할까요?\n운송사가 수락하면 매칭이 성사됩니다.`)) return;
    updateMatch(match.id, shipperAccept);
    setNotice('매칭 요청을 보냈습니다. 운송사가 수락하면 매칭이 성사돼요.');
  };

  // 화주 : 이 운송사 거절
  const handleShipperReject = () => {
    if (!window.confirm(`${partner.companyName}을(를) 거절할까요? 거절한 운송사에는 요청을 보낼 수 없습니다.`)) return;
    updateMatch(match.id, shipperReject);
    setNotice('이 운송사를 거절했습니다.');
  };

  // 운송사 : 요청 수락
  const handleAccept = () => {
    if (!window.confirm(`${partner.companyName}의 매칭 요청을 수락할까요?\n수락하면 바로 매칭이 성사됩니다.`)) return;
    updateMatch(match.id, logisticsAccept);
    setNotice('요청을 수락했습니다. 매칭이 성사되었어요.');
  };

  // 운송사 : 요청 거절
  const handleLogisticsReject = () => {
    if (!window.confirm(`${partner.companyName}의 매칭 요청을 거절할까요?`)) return;
    updateMatch(match.id, logisticsReject);
    setNotice('요청을 거절했습니다.');
  };

  // 버튼이 없는 단계에서 보여줄 안내 문구
  const STAGE_MESSAGE: Record<Stage, string> = {
    recommended: isShipper ? '' : '화주가 아직 요청하지 않은 매칭입니다.',
    shipperRejected: '화주가 거절한 매칭입니다.',
    requested: isShipper ? '운송사의 응답을 기다리고 있어요.' : '',
    logisticsRejected: `운송사가 요청을 거절했어요.${match.logistics.rejectReason ? ` (사유: ${match.logistics.rejectReason})` : ''}`,
    completed: '매칭이 성사되었습니다. 담당자 연락처로 운송 일정을 협의하세요.',
  };

  return (
    <div className="page-container">
      <button onClick={backToList} className="mm-back-btn">← 내 매칭</button>

      {/* 제목 : 상대 기업 + 총점 */}
      <div className="mm-detail-head">
        <div>
          <p className="eyebrow">{isShipper ? `추천 운송사 · 내 화물 조건 #${match.conditionId}` : '매칭을 요청한 화주'}</p>
          <h1 className="page-title">{partner.companyName}</h1>
          <p className="page-subtitle">
            {request.departure} → {request.destination} · {request.transport} · HS {request.hsCode} · {request.volume}t
          </p>
        </div>
        <div className="mm-detail-score">
          <p className="mm-detail-score__label">총 매칭 적합도</p>
          <p className="mm-detail-score__value">{match.totalScore}<small>/100</small></p>
          <StageBadge stage={stage} viewer={isShipper ? 'shipper' : 'logistics'} />
        </div>
      </div>

      {/* 진행 상황 */}
      <ProgressSteps stage={stage} />

      {notice && <p className="mm-notice">{notice}</p>}

      <div className="mm-detail-grid">
        {/* [기본 기업정보] */}
        <section className="mm-card">
          <h2 className="mm-card__title">기본 기업정보</h2>
          <dl className="mm-rows">
            <div className="mm-rows__row"><dt>회사명</dt><dd>{partner.companyName}</dd></div>
            <div className="mm-rows__row"><dt>담당자명</dt><dd>{partner.contactName}</dd></div>
            <div className="mm-rows__row"><dt>연락처</dt><dd>{partner.phone}</dd></div>
            <div className="mm-rows__row"><dt>주소</dt><dd>{partner.address}</dd></div>
            <div className="mm-rows__row"><dt>사업자등록번호</dt><dd className="mm-mono">{partner.bizNumber}</dd></div>
          </dl>
        </section>

        {/* [사업자 확인 정보] */}
        <section className="mm-card">
          <h2 className="mm-card__title">사업자 확인 정보</h2>
          <dl className="mm-rows">
            <div className="mm-rows__row"><dt>사업자 상태</dt><dd><span className={bizTone(partnerBiz.status)}>{partnerBiz.status}</span></dd></div>
            <div className="mm-rows__row">
              <dt>계속사업 / 휴업 / 폐업</dt>
              <dd>{partnerBiz.status === '계속사업자' ? '계속사업 중' : partnerBiz.status === '휴업자' ? '휴업' : '폐업'}</dd>
            </div>
            <div className="mm-rows__row"><dt>과세 유형</dt><dd>{partnerBiz.taxType}</dd></div>
            <div className="mm-rows__row"><dt>확인일</dt><dd className="mm-mono">{partnerBiz.checkedAt}</dd></div>
          </dl>
          <p className="mm-card__note">국세청 사업자등록 상태조회 API 연결 예정 (지금은 예시 값)</p>
        </section>

        {/* [매칭 관련 정보] */}
        <section className="mm-card mm-card--wide">
          <h2 className="mm-card__title">매칭 관련 정보</h2>
          <div className="mm-scores">
            <ScoreBar label="총 매칭 적합도" score={match.totalScore} />
            {scores.map((item) => (
              <ScoreBar key={item.label} label={item.label} score={item.score} max={item.max} />
            ))}
          </div>
          <p className="mm-card__sub">운송 경험 : 같은 HS 코드 취급 {offer.experience}회</p>

          <p className="mm-card__sub">{isShipper ? '취급 가능 특수화물' : '요청 화물 특성'}</p>
          <div className="mm-flags">
            {cargoFlags.map((flag) => (
              <span key={flag.label} className={flag.on ? 'mm-flag is-on' : 'mm-flag'}>
                {flag.label} {ox(flag.on)}
              </span>
            ))}
          </div>

          <p className="mm-card__sub">매칭 분석 요소</p>
          <div className="mm-flags">
            {match.matchFactors.map((factor) => <span key={factor} className="mm-flag is-factor">✓ {factor}</span>)}
          </div>
        </section>

        {/* [운송 조건 비교] */}
        <section className="mm-card mm-card--wide">
          <h2 className="mm-card__title">운송 조건 비교</h2>
          <div className="mm-table-wrap">
            <table className="mm-table">
              <thead>
                <tr><th>항목</th><th>화주 요청</th><th>운송사 제공</th></tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.label}>
                    <td className="mm-table__label">{row.label}</td>
                    <td>{row.request}</td>
                    <td>{row.offer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* 아래 버튼 영역 */}
      <div className="mm-actions">
        {/* 화주 · 검토 대기 : 요청 / 거절 (같은 조건에 진행 중인 요청이 있으면 잠금) */}
        {isShipper && stage === 'recommended' && (lockReason
          ? <p className="mm-actions__message">{lockReason}</p>
          : (
            <>
              <button onClick={handleShipperReject} className="mm-reject-btn">이 운송사 거절</button>
              <button onClick={handleRequest} className="mm-primary-btn">매칭 요청 보내기</button>
            </>
          ))}

        {/* 운송사 · 응답 필요 : 수락 / 거절 */}
        {!isShipper && stage === 'requested' && (
          <>
            <button onClick={handleLogisticsReject} className="mm-reject-btn">거절</button>
            <button onClick={handleAccept} className="mm-primary-btn">수락</button>
          </>
        )}

        {/* 그 밖의 단계 : 안내 문구만 */}
        {STAGE_MESSAGE[stage] && <p className="mm-actions__message">{STAGE_MESSAGE[stage]}</p>}
      </div>
    </div>
  );
}
