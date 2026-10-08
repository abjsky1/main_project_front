import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { User } from '../../../types/user';
import { PAGE_PATHS } from '../../../routes';
import NoticePanel from '../../../components/common/NoticePanel';
import { getLogisticsConditions, getShipperConditions } from '../myMatchingData';
import useMyMatchingDemo from '../useMyMatchingDemo';
import ConditionList from './ConditionList';
import ShipperMatchTable from './ShipperMatchTable';
import LogisticsRequestTable from './LogisticsRequestTable';
import '../MyMatching.css';

// 메인 페이지 아래쪽 "내 매칭" (기업 회원)
// - 왼쪽(1) : 내 매칭 조건 목록   - 오른쪽(3) : 고른 조건의 추천 운송사(화주) / 받은 요청(운송사)
// - 고른 조건은 주소 뒤 ?condition=번호 에 저장 → 상세 페이지에서 돌아와도 , 새로고침해도 그대로
// ⚠️ 지금은 더미 데이터(myMatchingData.ts)로 동작
export default function MatchingBoard({ user }: { user: User }) {
  const navigate = useNavigate();
  // useSearchParams : 주소의 ?condition=101 같은 부분을 읽고 바꾸는 훅 (useState 와 비슷하지만 값이 주소에 저장됨)
  const [searchParams, setSearchParams] = useSearchParams();
  const { matches, resetDemo } = useMyMatchingDemo();
  // useRef : 화면 요소를 직접 잡아 두는 상자 (가이드 3-2)
  const boardRef = useRef<HTMLDivElement>(null);

  // 상세 페이지에서 돌아왔을 때(주소에 ?condition= 이 있을 때) : 대표 이미지 아래의 보드로 바로 스크롤
  // [] : 처음 화면에 나타날 때 한 번만 (조건을 고를 때마다 스크롤되지 않도록)
  useEffect(() => {
    if (searchParams.has('condition')) boardRef.current?.scrollIntoView({ block: 'start' });
  }, []);

  const isShipper = user.companyType === '수출입기업';
  const conditions = isShipper
    ? getShipperConditions(matches, user.memberId)
    : getLogisticsConditions(matches, user.memberId);

  // 매칭 조건이 하나도 없으면 : 조건 설정 안내
  if (conditions.length === 0) {
    return (
      <NoticePanel
        icon="route"
        title="매칭 조건을 설정해 주세요"
        description={isShipper
          ? '화물 조건을 등록하면 조건에 맞는 운송사를 자동으로 찾아 이곳에 보여드려요. (예시 데이터는 ybtex@test.com 계정에 있어요)'
          : '운송 조건을 등록하면 화주가 보낸 매칭 요청을 이곳에서 확인할 수 있어요. (예시 데이터는 hmm@logis.com 계정에 있어요)'}
        buttonLabel="매칭 조건 설정하기"
        onButtonClick={() => navigate(PAGE_PATHS['matching-settings'])}
      />
    );
  }

  // 고른 조건 : 주소의 ?condition= 값 → 목록에 없으면 첫 번째 조건
  const selectedId = Number(searchParams.get('condition'));
  const selected = conditions.find((c) => c.id === selectedId) ?? conditions[0];

  // 조건 고르기 : 주소만 바꿈 (replace : 뒤로 가기 기록을 쌓지 않음)
  const selectCondition = (id: number) => setSearchParams({ condition: String(id) }, { replace: true });

  // 상세 페이지로 이동 (주소 예: /1001 — 상세 페이지가 useParams 로 번호를 꺼냄)
  const openDetail = (matchId: number) => navigate(`/${matchId}`);

  // [데모 초기화] : 시연 전에 처음 상태로 되돌리기
  const handleReset = () => {
    if (window.confirm('데모 데이터를 처음 상태로 되돌릴까요? (요청 · 수락 · 거절한 내용이 모두 초기화됩니다)')) resetDemo();
  };

  return (
    <div ref={boardRef} className="mb-wrap">
      <div className="mb-board">
        <ConditionList
          conditions={conditions}
          selectedId={selected.id}
          dateLabel={isShipper ? '희망' : '운송 가능'}
          countLabel={(count) => (isShipper ? `추천 ${count}곳` : `요청 ${count}건`)}
          onSelect={selectCondition}
        />

        <section className="mb-panel">
          <div className="mb-panel__head">
            <p className="eyebrow">{isShipper ? '추천 운송사' : '받은 매칭 요청'}</p>
            <p className="mb-panel__route">
              {selected.departure} → {selected.destination}
              <small>HS {selected.hsCode} · {isShipper ? '희망' : '운송 가능'} {selected.date}</small>
            </p>
            <span className="mb-panel__count">{selected.rows.length}{isShipper ? '곳' : '건'}</span>
          </div>

          <div className="mb-panel__body">
            {isShipper
              ? <ShipperMatchTable matches={selected.rows} onDetail={openDetail} />
              : <LogisticsRequestTable matches={selected.rows} onDetail={openDetail} />}
          </div>
        </section>
      </div>

      <div className="mb-foot">
        <p className="mb-foot__note">
          {isShipper
            ? '상세보기에서 운송사에 매칭을 요청하고 , 운송사가 수락하면 매칭이 성사됩니다.'
            : '상세보기에서 요청을 수락하면 바로 매칭이 성사됩니다.'}
          {' '}(더미 데이터로 동작하는 예시 화면)
        </p>
        <button onClick={handleReset} className="mm-reset-btn">데모 초기화</button>
      </div>
    </div>
  );
}
