
/* =========================================================
   내 매칭 상세 페이지

   - 기존 더미 데이터 제거
   - 실제 Spring Boot 매칭 API 연결
   - 화주 : 매칭 요청 / 거절
   - 물류기업 : 매칭 수락 / 거절
   - 기존 UI와 CSS 유지
   ========================================================= */

import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import type { User } from '../../types/user';

import PageHeader from '../../components/common/PageHeader';
import AccessGuard from '../../components/common/AccessGuard';

import { fetchRoutes } from '../../api/referenceData';
import { getRouteName } from '../matching-settings/routeUtils';

import {
  getCscore1List,
  getCscore2,
  getCscore3,
  getLscore1List,
  getLscore2,
  getLscore3,
  type CargoDto
} from '../../api/scoreApi';

import {
  getMemberMatchingList,
  acceptShipperMatching,
  rejectShipperMatching,
  acceptLogisticsMatching,
  rejectLogisticsMatching,
  type MatchingApiDto
} from '../../api/matchingApi';

import type { Stage } from './myMatchingData';

import ProgressSteps from './components/ProgressSteps';
import ScoreBar from './components/ScoreBar';
import StageBadge from './components/StageBadge';

import './MyMatching.css';


// [1] 내 매칭 조건 상세 정보
interface MyConditionDetail {

  departure: string;
  destination: string;
  transport: string;
  hsCode: string;

  weight: string;
  date: string;

  regularRoute?: boolean;
  directRoute?: boolean;
  experience?: number;
  leadTime?: number;

  cargo: CargoDto;

}


// [2] true / false를 O / X로 표시
const ox = (value: boolean) => {

  return value ? 'O' : 'X';

};


// [3] 백엔드 상태값을 기존 Stage로 변경
function getServerStage(match: MatchingApiDto): Stage {

  if (match.finalStatus === 'COMPLETED') {

    return 'completed';

  }

  if (match.shipperStatus === 'REJECTED') {

    return 'shipperRejected';

  }

  if (match.logisticsStatus === 'REJECTED') {

    return 'logisticsRejected';

  }

  if (match.shipperStatus === 'WAITING') {

    return 'recommended';

  }

  return 'requested';

}


// [4] 내 매칭 상세 페이지
export default function MyMatchingDetail({
  user
}: {
  user: User | null
}) {

  const { matchId } = useParams();

  const navigate = useNavigate();

  // 로그인 회원 정보
  const memberId = user?.memberId;

  const isShipper = user?.companyType === '수출입기업';


  // 서버에서 조회한 전체 내 매칭 목록
  const [matches, setMatches] = useState<MatchingApiDto[]>([]);

  // 현재 매칭의 내 조건
  const [myCondition, setMyCondition] = useState<MyConditionDetail | null>(null);

  // 로딩 및 오류
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // 버튼 처리 상태
  const [saving, setSaving] = useState(false);

  // 안내 문구
  const [notice, setNotice] = useState('');

  // 서버 데이터 새로고침
  const [reloadCount, setReloadCount] = useState(0);


  // [5] 상세 페이지 이동 시 화면 위로
  useEffect(() => {

    window.scrollTo(0, 0);

    setNotice('');

  }, [matchId]);


  // [6] 실제 매칭 정보 조회
  useEffect(() => {

    const controller = new AbortController();

    const loadData = async () => {

      setLoading(true);
      setLoadError('');
      setMatches([]);
      setMyCondition(null);


      // 로그인하지 않았으면 조회 중단
      if (!memberId || !user || user.role === 'admin') {

        setLoading(false);

        return;

      }

      // 매칭 번호가 올바르지 않으면 조회 중단
      if (!/^\d+$/.test(matchId ?? '')) {

        setLoading(false);

        return;

      }


      try {

        // 1. 실제 내 매칭 결과 조회
        const matchingList = await getMemberMatchingList(
          memberId,
          controller.signal
        );

        if (controller.signal.aborted) {

          return;

        }

        // 2. 현재 주소의 매칭 번호 확인
        const currentMatch = matchingList.find((item) => {

          return item.matchingId === Number(matchId);

        });


        // 본인에게 공개된 매칭이 아니면 상세 조회하지 않음
        if (!currentMatch) {

          setMatches(matchingList);

          return;

        }


        // 3. 국가/노선 중 노선 정보 조회
        const routes = await fetchRoutes(controller.signal);

        if (controller.signal.aborted) {

          return;

        }


        // 4. 화주인 경우 : 내 화물 조건 조회
        if (isShipper) {

          const conditionList = await getCscore1List(
            memberId,
            controller.signal
          );

          const condition = conditionList.find((item) => {

            return item.cscore1Id === currentMatch.cscore1Id;

          });


          if (condition) {

            const [second, third] = await Promise.all([

              getCscore2(condition.cscore1Id, controller.signal),

              getCscore3(condition.cscore1Id, controller.signal)

            ]);


            if (second && third) {

              setMyCondition({

                departure: getRouteName(routes, condition.departure),

                destination: getRouteName(routes, condition.arrival),

                transport: condition.transportType ? '해상' : '항공',

                hsCode: condition.hsCode,

                weight: `${second.requestWeight}t`,

                date: second.desiredDate,

                cargo: third

              });

            }

          }

        } else {

          // 5. 물류기업인 경우 : 내 운송 조건 조회
          const conditionList = await getLscore1List(
            memberId,
            controller.signal
          );

          const condition = conditionList.find((item) => {

            return item.lscore1Id === currentMatch.lscore1Id;

          });


          if (condition) {

            const [second, third] = await Promise.all([

              getLscore2(condition.lscore1Id, controller.signal),

              getLscore3(condition.lscore1Id, controller.signal)

            ]);


            if (second && third) {

              setMyCondition({

                departure: getRouteName(routes, condition.departure),

                destination: getRouteName(routes, condition.arrival),

                transport: condition.transportType ? '해상' : '항공',

                hsCode: condition.hsCode,

                weight: `${second.availableCapacity}t`,

                date: second.availableDate,

                regularRoute: condition.regularRoute,

                directRoute: condition.directRoute,

                experience: condition.experienceCount,

                leadTime: second.averageTransitDays,

                cargo: third

              });

            }

          }

        }


        // 6. 매칭 목록 저장
        if (!controller.signal.aborted) {

          setMatches(matchingList);

        }

      } catch (error) {

        if (!controller.signal.aborted) {

          console.error('매칭 상세 조회 실패:', error);

          setLoadError(
            '매칭 정보를 불러오지 못했습니다. 서버와 로그인 상태를 확인해 주세요.'
          );

        }

      } finally {

        if (!controller.signal.aborted) {

          setLoading(false);

        }

      }

    };


    loadData();


    return () => {

      controller.abort();

    };

  }, [memberId, matchId, isShipper, reloadCount]);


  // [7] 현재 매칭 찾기
  const match = matches.find((item) => {

    return item.matchingId === Number(matchId);

  });


  // [8] 내 매칭 목록으로 이동
  const backToList = () => {

    if (!match) {

      navigate('/');

      return;

    }

    const conditionId = isShipper
      ? match.cscore1Id
      : match.lscore1Id;

    navigate(`/?condition=${conditionId}`);

  };


  // [9] DB 데이터 새로고침
  const refreshMatch = () => {

    setReloadCount((count) => count + 1);

  };


  // [10] 매칭 요청 / 수락 / 거절
  const handleAction = async (
    action: 'shipperAccept' | 'shipperReject' | 'logisticsAccept' | 'logisticsReject'
  ) => {

    // 회원 번호 또는 매칭이 없으면 중단
    if (!memberId || !match || saving) {

      return;

    }


    // 상대 기업 이름
    const partnerName = isShipper
      ? match.logisticsCompanyName
      : match.shipperCompanyName;


    // 버튼별 확인 문구
    let confirmMessage = '';

    if (action === 'shipperAccept') {

      confirmMessage =
        `${partnerName}에 매칭을 요청할까요?\n운송사가 수락하면 매칭이 성사됩니다.`;

    } else if (action === 'shipperReject') {

      confirmMessage =
        `${partnerName}을(를) 거절할까요?\n거절하면 이 추천을 다시 요청할 수 없습니다.`;

    } else if (action === 'logisticsAccept') {

      confirmMessage =
        `${partnerName}의 매칭 요청을 수락할까요?\n수락하면 바로 매칭이 성사됩니다.`;

    } else if (action === 'logisticsReject') {

      confirmMessage =
        `${partnerName}의 매칭 요청을 거절할까요?`;

    }


    // 확인을 누르지 않으면 요청하지 않음
    if (!window.confirm(confirmMessage)) {

      return;

    }


    setSaving(true);
    setNotice('');


    try {

      let result = false;


      // 1. 화주 매칭 요청
      if (action === 'shipperAccept') {

        result = await acceptShipperMatching(
          match.matchingId,
          memberId
        );

      }


      // 2. 화주 매칭 거절
      if (action === 'shipperReject') {

        result = await rejectShipperMatching(
          match.matchingId,
          memberId
        );

      }


      // 3. 물류기업 매칭 수락
      if (action === 'logisticsAccept') {

        result = await acceptLogisticsMatching(
          match.matchingId,
          memberId
        );

      }


      // 4. 물류기업 매칭 거절
      if (action === 'logisticsReject') {

        result = await rejectLogisticsMatching(
          match.matchingId,
          memberId
        );

      }


      // 5. 서버에서 false를 반환한 경우
      if (result === false) {

        setNotice(
          '요청을 처리하지 못했습니다. 로그인 상태와 매칭 진행 상태를 확인해 주세요.'
        );

        return;

      }


      // 6. 성공 안내 문구
      if (action === 'shipperAccept') {

        setNotice(
          '매칭 요청을 보냈습니다. 운송사가 수락하면 매칭이 성사됩니다.'
        );

      } else if (action === 'shipperReject') {

        setNotice('이 운송사를 거절했습니다.');

      } else if (action === 'logisticsAccept') {

        setNotice('요청을 수락했습니다. 매칭이 성사되었습니다.');

      } else if (action === 'logisticsReject') {

        setNotice('매칭 요청을 거절했습니다.');

      }


      // 7. 변경된 상태를 서버에서 다시 조회
      refreshMatch();

    } catch (error) {

      console.error('매칭 상태 변경 오류:', error);

      setNotice(
        '서버 요청 중 오류가 발생했습니다. 다시 시도해 주세요.'
      );

    } finally {

      setSaving(false);

    }

  };


  // [11] 잘못된 주소 확인
  if (!/^\d+$/.test(matchId ?? '')) {

    return <Navigate to="/" replace />;

  }


  // [12] 기업 회원이 아닌 경우
  if (!user || user.role === 'admin'
      || !user.companyType || !memberId) {

    return (

      <div className="page-container">

        <PageHeader
          eyebrow="My Matching"
          title="내 매칭"
          className="page-header--compact"
        />

        <AccessGuard
          icon="users"
          short
          description="내 매칭은 기업 회원만 이용할 수 있습니다."
        />

      </div>

    );

  }


  // [13] 로딩
  if (loading) {

    return (

      <div className="page-container">

        <p role="status">
          매칭 정보를 불러오는 중입니다...
        </p>

      </div>

    );

  }


  // [14] 조회 오류
  if (loadError) {

    return (

      <div className="page-container">

        <button onClick={backToList} className="mm-back-btn">
          ← 내 매칭
        </button>

        <p role="alert">{loadError}</p>

        <button onClick={refreshMatch} className="mm-reset-btn">
          다시 조회
        </button>

      </div>

    );

  }


  // [15] 매칭 정보가 없는 경우
  if (!match) {

    return (

      <div className="page-container">

        <button onClick={backToList} className="mm-back-btn">
          ← 내 매칭
        </button>

        <div className="mm-empty">

          <p>매칭 정보를 찾을 수 없습니다.</p>

          <p className="mm-empty__sub">
            주소가 잘못되었거나 조회할 수 없는 매칭입니다.
          </p>

        </div>

      </div>

    );

  }


  // [16] 화면에 표시할 실제 매칭 정보

  const stage = getServerStage(match);

  // 상대 기업 이름
  const partnerName = isShipper
    ? match.logisticsCompanyName
    : match.shipperCompanyName;

  // 상대 기업 담당자
  const partnerContact = isShipper
    ? match.logisticsContactName
    : match.shipperContactName;

  // 상대 기업 연락처
  const partnerPhone = isShipper
    ? match.logisticsPhone
    : match.shipperPhone;

  // 상대 기업 주소
  const partnerAddress = isShipper
    ? match.logisticsAddress
    : match.shipperAddress;

  // 상대 기업 사업자등록번호
  const partnerBizNumber = isShipper
    ? match.logisticsBizNumber
    : match.shipperBizNumber;


  // [17] 세부 매칭 점수
  const scores = [

    { label: '노선', score: match.routeScore, max: 30 },

    { label: '가용량', score: match.capacityScore, max: 25 },

    { label: 'HS CODE', score: match.itemScore, max: 20 },

    { label: '일정', score: match.scheduleScore, max: 15 },

    { label: '운송 경험', score: match.experienceScore, max: 10 }

  ];


  // [18] 내 조건의 특수화물 정보
  const cargo = myCondition?.cargo;

  const cargoFlags = cargo ? [

    { label: '일반 컨테이너', on: cargo.generalContainer },

    { label: '냉장/냉동', on: cargo.refrigerated },

    { label: '위험물', on: cargo.dangerous },

    { label: '중량물', on: cargo.heavyCargo },

    { label: '특수화물', on: cargo.specialCargo }

  ] : [];


  // [19] 운송 조건 비교
  // 현재 백엔드는 상대방의 상세 운송 조건을 제공하지 않음
  // 본인 조건만 실제 DB 값으로 표시
  const route = myCondition
    ? `${myCondition.departure} → ${myCondition.destination}`
    : '정보 없음';

  const compareRows = [

    {
      label: '출발지 → 도착지',
      request: isShipper ? route : '정보 제공 전',
      offer: isShipper ? '정보 제공 전' : route
    },

    {
      label: '운송방식',
      request: isShipper ? myCondition?.transport ?? '-' : '정보 제공 전',
      offer: isShipper ? '정보 제공 전' : myCondition?.transport ?? '-'
    },

    {
      label: 'HS 코드',
      request: isShipper ? myCondition?.hsCode ?? '-' : '정보 제공 전',
      offer: isShipper ? '정보 제공 전' : myCondition?.hsCode ?? '-'
    },

    {
      label: '물량',
      request: isShipper ? myCondition?.weight ?? '-' : '정보 제공 전',
      offer: isShipper ? '정보 제공 전' : myCondition?.weight ?? '-'
    },

    {
      label: '일정',
      request: isShipper ? myCondition?.date ?? '-' : '정보 제공 전',
      offer: isShipper ? '정보 제공 전' : myCondition?.date ?? '-'
    },

    {
      label: '노선',
      request: '-',
      offer: isShipper
        ? '정보 제공 전'
        : myCondition
          ? `정기노선 ${ox(myCondition.regularRoute ?? false)}
             · 직항 ${ox(myCondition.directRoute ?? false)}
             · 리드타임 ${myCondition.leadTime ?? '-'}일`
          : '-'
    }

  ];


  // [20] 같은 화주 조건으로 진행 중인 다른 매칭 확인
  let lockReason = '';

  if (isShipper && stage === 'recommended') {

    for (const other of matches) {

      if (other.matchingId === match.matchingId) {

        continue;

      }

      if (other.cscore1Id !== match.cscore1Id) {

        continue;

      }

      // 다른 운송사와 이미 매칭 완료
      if (other.finalStatus === 'COMPLETED') {

        lockReason = '이 화물 조건은 다른 운송사와 이미 매칭이 성사되었습니다.';

        break;

      }

      // 다른 운송사에 이미 매칭 요청
      if (other.finalStatus === 'PENDING'
          && other.shipperStatus === 'ACCEPTED') {

        lockReason = '진행 중인 매칭 요청이 끝나면 다른 운송사에 요청할 수 있습니다.';

        break;

      }

    }

  }


  // [21] 현재 매칭 단계의 안내 메시지
  const STAGE_MESSAGE: Record<Stage, string> = {

    recommended: isShipper
      ? ''
      : '화주가 아직 요청하지 않은 매칭입니다.',

    shipperRejected: '화주가 거절한 매칭입니다.',

    requested: isShipper
      ? '운송사의 응답을 기다리고 있습니다.'
      : '',

    logisticsRejected: '운송사가 매칭 요청을 거절했습니다.',

    completed: '매칭이 성사되었습니다. 담당자 연락처로 운송 일정을 협의하세요.'

  };


  // [22] 상세 페이지 화면
  return (

    <div className="page-container">

      {/* 내 매칭으로 돌아가기 */}
      <button onClick={backToList} className="mm-back-btn">
        ← 내 매칭
      </button>


      {/* 제목 및 매칭 점수 */}
      <div className="mm-detail-head">

        <div>

          <p className="eyebrow">

            {isShipper
              ? `추천 운송사 · 내 화물 조건 #${match.cscore1Id}`
              : '매칭을 요청한 화주'}

          </p>

          <h1 className="page-title">

            {partnerName ?? '업체 정보 없음'}

          </h1>

          <p className="page-subtitle">

            {route}

            {' · '}

            {myCondition?.transport ?? '-'}

            {' · HS '}

            {myCondition?.hsCode ?? '-'}

          </p>

        </div>


        <div className="mm-detail-score">

          <p className="mm-detail-score__label">

            총 매칭 적합도

          </p>

          <p className="mm-detail-score__value">

            {match.totalScore}

            <small>/100</small>

          </p>

          <StageBadge
            stage={stage}
            viewer={isShipper ? 'shipper' : 'logistics'}
          />

        </div>

      </div>


      {/* 진행 단계 */}
      <ProgressSteps stage={stage} />


      {/* 서버 처리 결과 안내 */}
      {notice && (

        <p className="mm-notice">

          {notice}

        </p>

      )}


      <div className="mm-detail-grid">


        {/* [기본 기업정보] */}
        <section className="mm-card">

          <h2 className="mm-card__title">

            기본 기업정보

          </h2>

          <dl className="mm-rows">

            <div className="mm-rows__row">

              <dt>회사명</dt>

              <dd>{partnerName ?? '-'}</dd>

            </div>

            <div className="mm-rows__row">

              <dt>담당자명</dt>

              <dd>{partnerContact ?? '-'}</dd>

            </div>

            <div className="mm-rows__row">

              <dt>연락처</dt>

              <dd>{partnerPhone ?? '-'}</dd>

            </div>

            <div className="mm-rows__row">

              <dt>주소</dt>

              <dd>{partnerAddress ?? '-'}</dd>

            </div>

            <div className="mm-rows__row">

              <dt>사업자등록번호</dt>

              <dd className="mm-mono">

                {partnerBizNumber ?? '-'}

              </dd>

            </div>

          </dl>

        </section>


        {/* [사업자 확인 정보] */}
        <section className="mm-card">

          <h2 className="mm-card__title">

            사업자 확인 정보

          </h2>

          <dl className="mm-rows">

            <div className="mm-rows__row">

              <dt>사업자 상태</dt>

              <dd>

                <span className="mm-biz">

                  확인 전

                </span>

              </dd>

            </div>

            <div className="mm-rows__row">

              <dt>계속사업 / 휴업 / 폐업</dt>

              <dd>조회되지 않음</dd>

            </div>

            <div className="mm-rows__row">

              <dt>과세 유형</dt>

              <dd>조회되지 않음</dd>

            </div>

            <div className="mm-rows__row">

              <dt>확인일</dt>

              <dd>-</dd>

            </div>

          </dl>

          <p className="mm-card__note">

            사업자 상태조회 API가 연동되지 않아 실제 조회 결과는 표시하지 않습니다.

          </p>

        </section>


        {/* [매칭 관련 정보] */}
        <section className="mm-card mm-card--wide">

          <h2 className="mm-card__title">

            매칭 관련 정보

          </h2>


          <div className="mm-scores">

            <ScoreBar
              label="총 매칭 적합도"
              score={match.totalScore}
            />

            {scores.map((item) => (

              <ScoreBar

                key={item.label}

                label={item.label}

                score={item.score}

                max={item.max}

              />

            ))}

          </div>


          {/* 내 조건의 화물 정보 */}
          <p className="mm-card__sub">

            {isShipper ? '내 화물 특성' : '내 취급 가능 화물'}

          </p>


          <div className="mm-flags">

            {cargoFlags.map((flag) => (

              <span

                key={flag.label}

                className={
                  flag.on ? 'mm-flag is-on' : 'mm-flag'
                }

              >

                {flag.label} {ox(flag.on)}

              </span>

            ))}

            {cargoFlags.length === 0 && (

              <p>화물 조건 정보를 확인할 수 없습니다.</p>

            )}

          </div>


          {/* 서버에서 제공하는 추천 이유 */}
          <p className="mm-card__sub">

            매칭 분석 요소

          </p>

          <div className="mm-flags">

            {match.recommendReason ? (

              <span className="mm-flag is-factor">

                {match.recommendReason}

              </span>

            ) : (

              <p>서버에서 제공한 추천 이유가 없습니다.</p>

            )}

          </div>


          {/* 경고 메시지 */}
          {match.warningMessage && (

            <p className="mm-card__note">

              {match.warningMessage}

            </p>

          )}

        </section>


        {/* [운송 조건 비교] */}
        <section className="mm-card mm-card--wide">

          <h2 className="mm-card__title">

            운송 조건 비교

          </h2>

          <div className="mm-table-wrap">

            <table className="mm-table">

              <thead>

                <tr>

                  <th>항목</th>

                  <th>화주 요청</th>

                  <th>운송사 제공</th>

                </tr>

              </thead>


              <tbody>

                {compareRows.map((row) => (

                  <tr key={row.label}>

                    <td className="mm-table__label">

                      {row.label}

                    </td>

                    <td>{row.request}</td>

                    <td>{row.offer}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

          <p className="mm-card__note">

            상대방의 상세 운송 조건은 현재 매칭 API에서 제공하지 않습니다.

          </p>

        </section>

      </div>


      {/* [매칭 요청 및 수락/거절 버튼] */}
      <div className="mm-actions">


        {/* 화주 : 추천 업체에 요청 또는 거절 */}
        {isShipper && stage === 'recommended' && (

          lockReason ? (

            <p className="mm-actions__message">

              {lockReason}

            </p>

          ) : (

            <>

              <button

                className="mm-reject-btn"

                disabled={saving}

                onClick={() => handleAction('shipperReject')}

              >

                이 운송사 거절

              </button>


              <button

                className="mm-primary-btn"

                disabled={saving}

                onClick={() => handleAction('shipperAccept')}

              >

                {saving ? '처리 중...' : '매칭 요청 보내기'}

              </button>

            </>

          )

        )}


        {/* 물류기업 : 요청 수락 또는 거절 */}
        {!isShipper && stage === 'requested' && (

          <>

            <button

              className="mm-reject-btn"

              disabled={saving}

              onClick={() => handleAction('logisticsReject')}

            >

              거절

            </button>


            <button

              className="mm-primary-btn"

              disabled={saving}

              onClick={() => handleAction('logisticsAccept')}

            >

              {saving ? '처리 중...' : '수락'}

            </button>

          </>

        )}


        {/* 처리 완료 또는 응답 대기 안내 */}
        {STAGE_MESSAGE[stage] && (

          <p className="mm-actions__message">

            {STAGE_MESSAGE[stage]}

          </p>

        )}

      </div>

    </div>

  );

}
