
import { useEffect, useRef, useState } from 'react';
import {
  useNavigate,
  useSearchParams,
  useLocation
} from 'react-router-dom';

import type { User } from '../../../types/user';
import { PAGE_PATHS } from '../../../routes';

import NoticePanel from '../../../components/common/NoticePanel';

import { fetchCountries, fetchRoutes } from '../../../api/referenceData';

import {
  getMemberMatchingList,
  type MatchingApiDto
} from '../../../api/matchingApi';

import {
  loadShipperRows,
  loadLogisticsRows
} from '../../matching-settings/conditionApi';

import type { Stage } from '../myMatchingData';

import ScoreBar from './ScoreBar';
import StageBadge from './StageBadge';

import '../MyMatching.css';


// 메인페이지 아래쪽 "내 매칭" (기업 회원)
// - 왼쪽 : DB에 등록된 내 매칭 조건 목록
// - 오른쪽 : 화주의 추천 운송사 / 물류기업이 받은 요청
// - 선택한 조건은 주소의 ?condition=번호에 저장
// - 헤더 알림에서 이동하면 내 매칭 영역으로 자동 스크롤


// [1] DB 조건 1개와 해당 조건의 매칭 결과
interface BoardCondition {

  id: number;

  departure: string;

  destination: string;

  hsCode: string;

  date: string;

  rows: MatchingApiDto[];

  actionCount: number;

}


// [2] 백엔드 매칭 상태를 기존 프론트 상태값으로 변환
function getServerStage(match: MatchingApiDto): Stage {

  // 매칭 완료
  if (match.finalStatus === 'COMPLETED') {

    return 'completed';

  }

  // 화주 거절
  if (match.shipperStatus === 'REJECTED') {

    return 'shipperRejected';

  }

  // 물류기업 거절
  if (match.logisticsStatus === 'REJECTED') {

    return 'logisticsRejected';

  }

  // 아직 화주가 요청하지 않은 추천 상태
  if (match.shipperStatus === 'WAITING') {

    return 'recommended';

  }

  // 화주가 요청하고 물류기업 응답 대기 중
  return 'requested';

}


// [3] 물류기업이 응답해야 하는 요청인지 확인
function needsLogisticsResponse(match: MatchingApiDto) {

  if (match.finalStatus === 'PENDING'
      && match.shipperStatus === 'ACCEPTED'
      && match.logisticsStatus === 'WAITING') {

    return true;

  }

  return false;

}


// [4] 내 매칭 메인 컴포넌트
export default function MatchingBoard({ user }: { user: User }) {

  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  // [추가] 현재 주소와 이동할 때 전달받은 정보 확인
  const location = useLocation();

  const boardRef = useRef<HTMLDivElement>(null);


  // DB에서 조회한 매칭 조건 목록
  const [conditions, setConditions] = useState<BoardCondition[]>([]);

  // 로딩 상태
  const [loading, setLoading] = useState(true);

  // 조회 오류
  const [loadError, setLoadError] = useState('');

  // 새로고침 여부
  const [reloadCount, setReloadCount] = useState(0);


  // 로그인한 회원 번호
  const memberId = user.memberId;

  // 수출입기업인지 구분
  const isShipper = user.companyType === '수출입기업';


  // [5] 헤더 알림 또는 상세페이지에서 이동한 경우 자동 스크롤
  // [수정] 기존에는 최초 렌더링 시 한 번만 실행했지만,
  // 이제 주소 변경이나 DB 로딩 완료 시에도 확인
  useEffect(() => {

    // 1. 헤더 알림의 "내 매칭 확인하기" 버튼을 누른 경우
    const fromNotification =
      location.state?.scrollToMatching === true;

    // 2. 상세페이지에서 조건 번호를 가지고 돌아온 경우
    const fromDetail =
      searchParams.has('condition');


    // 3. 이동 요청이 있고 데이터 로딩이 완료된 경우
    if ((fromNotification || fromDetail) && loading === false) {

      // 메인페이지의 내 매칭 위치로 스크롤
      boardRef.current?.scrollIntoView({

        behavior: 'smooth',

        block: 'start'

      });

    }

  }, [location.key, location.search, location.state, searchParams, loading]);


  // [6] 로그인 회원의 매칭 조건과 매칭 결과 조회
  useEffect(() => {

    const controller = new AbortController();


    // DB 데이터 조회 함수
    const loadData = async () => {

      setLoading(true);

      setLoadError('');

      setConditions([]);


      // 1. 회원 번호 확인
      if (!memberId) {

        setLoadError(
          '회원 정보를 확인할 수 없습니다. 다시 로그인해 주세요.'
        );

        setLoading(false);

        return;

      }


      try {

        // 2. 국가, 노선, 실제 매칭 결과 조회
        const [countries, routes, matchingList] = await Promise.all([

          fetchCountries(controller.signal),

          fetchRoutes(controller.signal),

          getMemberMatchingList(memberId, controller.signal)

        ]);


        // 요청이 취소되었다면 종료
        if (controller.signal.aborted) {

          return;

        }


        // 화면에 표시할 매칭 조건 배열
        let rows: BoardCondition[] = [];


        // 3. 화주 회원인 경우
        if (isShipper) {

          // 화주가 등록한 매칭 조건 조회
          const shipperConditions = await loadShipperRows(

            memberId,

            countries,

            routes,

            controller.signal

          );


          // 각각의 매칭 조건에 추천 물류기업 연결
          rows = shipperConditions.map((condition) => {

            // 현재 화주 조건에 해당하는 추천 결과
            const matches = matchingList

              .filter((match) => {

                return match.cscore1Id === condition.id;

              })

              // 매칭 점수가 높은 순서로 정렬
              .sort((a, b) => {

                return b.totalScore - a.totalScore;

              });


            return {

              id: condition.id,

              departure: condition.departure,

              destination: condition.destination,

              hsCode: condition.hsCode,

              date: condition.schedule,

              rows: matches,

              actionCount: 0

            };

          });

        } else {

          // 4. 물류기업 회원인 경우

          // 물류기업이 등록한 매칭 조건 조회
          const logisticsConditions = await loadLogisticsRows(

            memberId,

            countries,

            routes,

            controller.signal

          );


          // 각각의 물류기업 조건에 화주 매칭 요청 연결
          rows = logisticsConditions.map((condition) => {

            // 현재 물류기업 조건에 해당하는 요청 조회
            const matches = matchingList

              .filter((match) => {

                return match.lscore1Id === condition.id;

              })

              // 화주가 실제 매칭 요청을 보낸 건만 조회
              .filter((match) => {

                return match.shipperStatus === 'ACCEPTED';

              })

              // 물류기업이 아직 응답하지 않은 요청을 위로 정렬
              .sort((a, b) => {

                const aPending = needsLogisticsResponse(a) ? 1 : 0;

                const bPending = needsLogisticsResponse(b) ? 1 : 0;

                return bPending - aPending;

              });


            return {

              id: condition.id,

              departure: condition.departure,

              destination: condition.destination,

              hsCode: condition.hsCode,

              date: condition.availableDate,

              rows: matches,

              // 물류기업이 응답해야 하는 요청 개수
              actionCount: matches.filter(needsLogisticsResponse).length

            };

          });

        }


        // 5. 운송 날짜가 빠른 순서로 정렬
        rows.sort((a, b) => {

          return a.date.localeCompare(b.date);

        });


        // 6. 조회한 데이터 저장
        if (!controller.signal.aborted) {

          setConditions(rows);

        }

      } catch (error) {

        if (!controller.signal.aborted) {

          console.error('내 매칭 조회 실패:', error);

          setLoadError(
            '내 매칭 정보를 불러오지 못했습니다. 서버와 로그인 상태를 확인해 주세요.'
          );

        }

      } finally {

        if (!controller.signal.aborted) {

          setLoading(false);

        }

      }

    };


    // DB 조회 실행
    loadData();


    // 컴포넌트 종료 시 요청 취소
    return () => {

      controller.abort();

    };

  }, [memberId, isShipper, reloadCount]);


  // [7] 선택된 매칭 조건 확인
  const selectedId = Number(searchParams.get('condition'));

  const selected = conditions.find((condition) => {

    return condition.id === selectedId;

  }) ?? conditions[0];


  // [8] 왼쪽 매칭 조건 선택
  const selectCondition = (id: number) => {

    setSearchParams(

      { condition: String(id) },

      { replace: true }

    );

  };


  // [9] 매칭 상세보기
  const openDetail = (matchId: number) => {

    // 실제 매칭 상세 페이지로 이동
    navigate(`/${matchId}`);

  };


  // [10] 매칭 결과 새로고침
  const refreshMatches = () => {

    setReloadCount((count) => count + 1);

  };


  // [11] 로딩 화면
  if (loading) {

    return (

      <div
        ref={boardRef}
        className="mb-wrap"
        style={{ scrollMarginTop: '76px' }}
      >

        <p role="status">

          내 매칭 정보를 불러오는 중입니다...

        </p>

      </div>

    );

  }


  // [12] 조회 오류 화면
  if (loadError) {

    return (

      <div
        ref={boardRef}
        className="mb-wrap"
        style={{ scrollMarginTop: '76px' }}
      >

        <p role="alert">

          {loadError}

        </p>

        <button
          className="mm-reset-btn"
          onClick={refreshMatches}
        >

          다시 조회

        </button>

      </div>

    );

  }


  // [13] 등록된 매칭 조건이 없는 경우
  if (conditions.length === 0) {

    return (

      <div
        ref={boardRef}
        style={{ scrollMarginTop: '76px' }}
      >

        <NoticePanel

          icon="route"

          title="매칭 조건을 설정해 주세요"

          description={
            isShipper

              ? '화물 조건을 등록하면 조건에 맞는 운송사를 자동으로 찾아 이곳에 보여드려요.'

              : '운송 조건을 등록하면 화주가 보낸 매칭 요청을 이곳에서 확인할 수 있어요.'
          }

          buttonLabel="매칭 조건 설정하기"

          onButtonClick={() => {

            navigate(PAGE_PATHS['matching-settings']);

          }}

        />

      </div>

    );

  }


  // [14] 매칭 화면 출력
  return (

    <div
      ref={boardRef}
      className="mb-wrap"
      style={{ scrollMarginTop: '76px' }}
    >

      <div className="mb-board">


        {/* ============================================
            왼쪽 : 내가 등록한 매칭 조건 목록
            ============================================ */}

        <section className="mb-panel">

          <div className="mb-panel__head">

            <p className="eyebrow">

              내 매칭 조건

            </p>

            <span className="mb-panel__count">

              {conditions.length}건

            </span>

          </div>


          <div className="mb-panel__body">

            <p className="mb-list__sort">

              {isShipper ? '희망 일정' : '운송 가능일'} 빠른 순

            </p>


            <ul className="mb-list">

              {conditions.map((condition) => (

                <li key={condition.id}>

                  <button

                    onClick={() => {

                      selectCondition(condition.id);

                    }}

                    className={
                      condition.id === selected.id

                        ? 'mb-list__item is-selected'

                        : 'mb-list__item'
                    }

                  >

                    <span className="mb-list__text">

                      <span className="mb-list__route">

                        {condition.departure}

                        {' → '}

                        {condition.destination}

                      </span>


                      <span className="mb-list__meta">

                        HS {condition.hsCode}

                        {' · '}

                        {isShipper ? '희망' : '운송 가능'}

                        {' '}

                        {condition.date}

                      </span>

                    </span>


                    <span

                      className={
                        condition.actionCount > 0

                          ? 'mb-list__badge is-action'

                          : 'mb-list__badge'
                      }

                    >

                      {condition.actionCount > 0

                        ? `응답 필요 ${condition.actionCount}`

                        : isShipper

                          ? `추천 ${condition.rows.length}곳`

                          : `요청 ${condition.rows.length}건`
                      }

                    </span>

                  </button>

                </li>

              ))}

            </ul>

          </div>

        </section>


        {/* ============================================
            오른쪽 : 선택한 조건의 실제 매칭 결과
            ============================================ */}

        <section className="mb-panel">

          <div className="mb-panel__head">

            <p className="eyebrow">

              {isShipper ? '추천 운송사' : '받은 매칭 요청'}

            </p>


            <p className="mb-panel__route">

              {selected.departure}

              {' → '}

              {selected.destination}

              <small>

                HS {selected.hsCode}

                {' · '}

                {isShipper ? '희망' : '운송 가능'}

                {' '}

                {selected.date}

              </small>

            </p>


            <span className="mb-panel__count">

              {selected.rows.length}

              {isShipper ? '곳' : '건'}

            </span>

          </div>


          <div className="mb-panel__body">

            {isShipper ? (

              // 화주 : 추천 물류기업 목록

              <table className="mm-table mb-table">

                <thead>

                  <tr>

                    {[
                      '순위',
                      '매칭 업체명',
                      '매칭 적합도',
                      '진행 상태',
                      ''
                    ].map((h) => (

                      <th key={h}>

                        {h}

                      </th>

                    ))}

                  </tr>

                </thead>


                <tbody>

                  {selected.rows.map((match, index) => (

                    <tr key={match.matchingId}>

                      <td className="mm-table__rank">

                        {index + 1}

                      </td>


                      <td className="mm-table__company">

                        {match.logisticsCompanyName ?? '업체 정보 없음'}

                      </td>


                      <td>

                        <ScoreBar score={match.totalScore} />

                      </td>


                      <td>

                        <StageBadge
                          stage={getServerStage(match)}
                          viewer="shipper"
                        />

                      </td>


                      <td className="mb-table__action">

                        <button
                          onClick={() => openDetail(match.matchingId)}
                          className="mm-detail-btn"
                        >

                          상세보기

                        </button>

                      </td>

                    </tr>

                  ))}


                  {selected.rows.length === 0 && (

                    <tr>

                      <td
                        colSpan={5}
                        className="mb-table__empty"
                      >

                        아직 추천된 운송사가 없습니다.

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            ) : (

              // 물류기업 : 실제 화주의 매칭 요청 목록

              <table className="mm-table mb-table">

                <thead>

                  <tr>

                    {[
                      '화주 업체명',
                      '매칭 적합도',
                      '물량 · 희망 일정',
                      '진행 상태',
                      ''
                    ].map((h) => (

                      <th key={h}>

                        {h}

                      </th>

                    ))}

                  </tr>

                </thead>


                <tbody>

                  {selected.rows.map((match) => (

                    <tr key={match.matchingId}>

                      <td className="mm-table__company">

                        {match.shipperCompanyName ?? '업체 정보 없음'}

                      </td>


                      <td>

                        <ScoreBar score={match.totalScore} />

                      </td>


                      {/* MatchingDto에 물량/일정 정보가 없으므로 임의 데이터 사용하지 않음 */}
                      <td>

                        정보 없음

                      </td>


                      <td>

                        <StageBadge
                          stage={getServerStage(match)}
                          viewer="logistics"
                        />

                      </td>


                      <td className="mb-table__action">

                        <button
                          onClick={() => openDetail(match.matchingId)}
                          className="mm-detail-btn"
                        >

                          상세보기

                        </button>

                      </td>

                    </tr>

                  ))}


                  {selected.rows.length === 0 && (

                    <tr>

                      <td
                        colSpan={5}
                        className="mb-table__empty"
                      >

                        이 조건으로 받은 매칭 요청이 아직 없습니다.

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            )}

          </div>

        </section>

      </div>


      {/* ============================================
          하단 안내 및 새로고침
          ============================================ */}

      <div className="mb-foot">

        <p className="mb-foot__note">

          {isShipper

            ? '상세보기에서 운송사에 매칭을 요청하고, 운송사가 수락하면 매칭이 성사됩니다.'

            : '상세보기에서 요청을 수락하면 바로 매칭이 성사됩니다.'
          }

        </p>


        <button
          onClick={refreshMatches}
          className="mm-reset-btn"
        >

          새로고침

        </button>

      </div>

    </div>

  );

}
