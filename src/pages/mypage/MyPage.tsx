/* =====================================================================
   마이페이지 (주소: /mypage , 로그인한 회원 — 헤더 오른쪽 동그라미 버튼으로 들어옴)
   - 내 정보 : 로그인할 때 받은 회원 정보 표시 + 이름 · 주소 수정 (PUT /api/mypage/{memberId})
   - 관심 국가 : 최대 3개 (DB 저장 — /api/interest) → 맞춤 인사이트 페이지에 국가별로 표시 (기업 회원만)
                 3개가 찬 상태에서 새 국가를 고르면 서버가 가장 먼저 고른 국가를 빼고 추가 (밀어내기)
   - 회원 탈퇴 버튼 (기업 회원만, 실제 탈퇴 API 는 로그인 담당 팀원이 만들면 연결)
   ===================================================================== */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../types/user';
import { PAGE_PATHS } from '../../routes';
import { fetchCountries, KOREA_ID, type CountryData } from '../../api/referenceData';
import { addInterest, deleteInterest, getInterests, MAX_INTEREST_COUNTRIES, type InterestDto } from '../../api/interestApi';
import { updateMyInfo } from '../../api/mypageApi';
import PageHeader from '../../components/common/PageHeader';
import AccessGuard from '../../components/common/AccessGuard';
import './MyPage.css';

interface MyPageProps {
  user: User | null;
  onUserChange: (user: User) => void;                  // 이름·주소 수정 성공 → App 의 user 도 바꿈 (헤더 동그라미 글자 등)
  interests: InterestDto[];                            // 지금 설정된 관심 국가 (App 이 보관)
  onInterestsChange: (interests: InterestDto[]) => void; // 추가·삭제 후 다시 조회한 목록을 App 에 알림
}

// 서버 저장 실패 시 안내 문구 (본인 확인용 쿠키가 만료된 경우가 가장 흔함)
const LOGIN_EXPIRED_MESSAGE = '저장하지 못했습니다. 로그인한 지 오래되었다면 다시 로그인한 뒤 시도해 주세요.';
const SERVER_ERROR_MESSAGE = '서버 요청에 실패했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.';

export default function MyPage({ user, onUserChange, interests, onInterestsChange }: MyPageProps) {
  const navigate = useNavigate();

  // ---------- 내 정보 수정 ----------
  const [editing, setEditing] = useState(false);       // 수정 모드인지
  const [editName, setEditName] = useState('');        // 수정 중인 이름
  const [editAddress, setEditAddress] = useState('');  // 수정 중인 주소
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');  // 저장 결과 안내
  const [infoError, setInfoError] = useState('');      // 입력 / 저장 오류 안내

  // ---------- 관심 국가 ----------
  // 국가 선택 목록 (백엔드 country.csv) — 매칭 조건 설정과 같은 국가 목록 사용
  const [countryOptions, setCountryOptions] = useState<CountryData[]>([]);
  const [countryLoading, setCountryLoading] = useState(true);
  const [countryError, setCountryError] = useState('');
  const [interestBusy, setInterestBusy] = useState(false);   // 추가/삭제 요청 중 (중복 클릭 방지)
  const [interestMessage, setInterestMessage] = useState('');
  const [interestError, setInterestError] = useState('');

  const isCompany = !!user && user.role !== 'admin';   // 기업 회원(수출입기업·물류업체)인지

  // 처음 들어올 때 국가 목록 한 번 불러오기 (기업 회원만 필요)
  useEffect(() => {
    if (!isCompany) return;
    let ignore = false;   // 응답 전에 페이지를 떠나면 true → 늦게 온 응답 무시 (가이드 3-4)

    async function loadCountries() {
      try {
        const countries = await fetchCountries();
        // 대한민국을 빼고 가나다 순 정렬
        const options = countries
          .filter((country) => country.countryId !== KOREA_ID)
          .sort((a, b) => a.countryName.localeCompare(b.countryName, 'ko'));
        if (!ignore) setCountryOptions(options);
      } catch (error) {
        console.log('국가 목록 조회 실패 : ', error);
        if (!ignore) setCountryError('국가 목록을 불러오지 못했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
      } finally {
        if (!ignore) setCountryLoading(false);
      }
    }

    loadCountries();
    return () => { ignore = true; };
  }, [isCompany]);

  // 로그인 안 했으면 안내 화면
  if (!user) {
    return (
      <div className="page-container">
        <PageHeader eyebrow="My Page" title="마이페이지" className="page-header--compact" />
        <AccessGuard icon="users" short description="마이페이지는 로그인한 회원만 이용할 수 있습니다." />
      </div>
    );
  }

  const isAdmin = user.role === 'admin';
  const memberId = user.memberId;
  const isFull = interests.length >= MAX_INTEREST_COUNTRIES;   // 3개가 다 찼는지
  const countryLabel = (interest: InterestDto) => interest.countryName ?? `국가 #${interest.countryId}`;

  // 내 정보 표의 줄들 { 항목 이름, 값 } — 값이 없으면 '-'
  // (이름 · 주소는 수정 모드일 때 입력칸으로 바뀜)
  const infoRows = [
    { label: '이름', value: user.name },
    { label: '이메일', value: user.email },
    { label: '기업명', value: user.companyName ?? '-' },
    { label: '회원 유형', value: isAdmin ? '관리자' : user.companyType ?? '-' },
    { label: '사업자등록번호', value: user.businessNumber ?? '-' },
    { label: '연락처', value: user.phone ?? '-' },
    { label: '주소', value: user.address ?? '-' },
  ];

  /* ---------- 내 정보 수정 ---------- */

  // [수정] : 지금 값을 입력칸에 채우고 수정 모드로
  const startEdit = () => {
    setEditName(user.name);
    setEditAddress(user.address ?? '');
    setInfoMessage('');
    setInfoError('');
    setEditing(true);
  };

  // [저장] : 입력값 검사 → 서버 저장 → 성공하면 App 의 user 도 새 값으로
  const saveInfo = async () => {
    const name = editName.trim();
    const address = editAddress.trim();

    if (!memberId) { setInfoError('회원 번호가 없어 수정할 수 없습니다. 다시 로그인해 주세요.'); return; }
    if (!name || name.length > 50) { setInfoError('이름은 1~50자로 입력해 주세요.'); return; }
    if (!address || address.length > 300) { setInfoError('주소는 1~300자로 입력해 주세요.'); return; }

    setInfoSaving(true);
    setInfoError('');
    try {
      const ok = await updateMyInfo(memberId, name, address);
      if (!ok) {
        setInfoError(LOGIN_EXPIRED_MESSAGE);
        return;
      }
      // 기존 user 를 복사하고 이름 · 주소만 새 값으로 (B_react 의 setForm({ ...form, name }) 과 같은 방식)
      onUserChange({ ...user, name, address });
      setEditing(false);
      setInfoMessage('내 정보가 저장되었습니다.');
    } catch (error) {
      console.log('내 정보 수정 실패 : ', error);
      setInfoError(SERVER_ERROR_MESSAGE);
    } finally {
      setInfoSaving(false);
    }
  };

  /* ---------- 관심 국가 추가 / 삭제 ---------- */

  // 추가·삭제가 끝나면 DB 목록을 다시 조회해서 App 에 알림 (매칭 조건 설정의 "저장 → 다시 조회" 와 같은 흐름)
  const reloadInterests = async (id: string) => {
    const list = await getInterests(id);
    onInterestsChange(list);
  };

  // 국가 고르기 (select) → 서버에 추가 요청 (3개가 차 있으면 서버가 가장 먼저 고른 국가를 뺌)
  const addCountry = async (countryIdText: string) => {
    if (!countryIdText || !memberId || interestBusy) return;

    const country = countryOptions.find((c) => c.countryId === Number(countryIdText));
    if (!country) return;

    const oldest = isFull ? interests[0] : null;   // 밀려날 국가 (안내 문구용)

    setInterestBusy(true);
    setInterestMessage('');
    setInterestError('');
    try {
      const ok = await addInterest(memberId, country.countryId);
      if (!ok) {
        setInterestError(LOGIN_EXPIRED_MESSAGE);
        return;
      }
      await reloadInterests(memberId);
      setInterestMessage(oldest
        ? `${countryLabel(oldest)} 빠짐 · ${country.countryName} 추가 (가장 먼저 고른 국가가 빠졌어요)`
        : `${country.countryName} 추가`);
    } catch (error) {
      console.log('관심 국가 추가 실패 : ', error);
      setInterestError(SERVER_ERROR_MESSAGE);
    } finally {
      setInterestBusy(false);
    }
  };

  // 칩의 × 버튼 → 서버에 삭제 요청
  const removeCountry = async (interest: InterestDto) => {
    if (!memberId || interestBusy) return;

    setInterestBusy(true);
    setInterestMessage('');
    setInterestError('');
    try {
      const ok = await deleteInterest(interest.interestId);
      if (!ok) {
        setInterestError(LOGIN_EXPIRED_MESSAGE);
        return;
      }
      await reloadInterests(memberId);
      setInterestMessage(`${countryLabel(interest)} 삭제`);
    } catch (error) {
      console.log('관심 국가 삭제 실패 : ', error);
      setInterestError(SERVER_ERROR_MESSAGE);
    } finally {
      setInterestBusy(false);
    }
  };

  // 회원 탈퇴 버튼
  const handleWithdraw = () => {
    if (!window.confirm('정말 회원 탈퇴를 하시겠습니까?\n탈퇴하면 등록한 매칭 조건과 매칭 기록을 더 이상 이용할 수 없습니다.')) return;
    // TODO: 로그인 담당 팀원이 회원 탈퇴 API 를 만들면 여기서 호출하고, 성공하면 로그아웃 처리
    //       예) const response = await axios.delete(`/api/member/${user.memberId}`);
    alert('회원 탈퇴 기능은 준비 중입니다.');
  };

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="My Page"
        title="마이페이지"
        subtitle={isAdmin ? '관리자 계정' : <>{user.companyName} · {user.companyType}</>}
      />

      <div className={isCompany ? 'mypage-grid' : 'mypage-grid mypage-grid--single'}>
        {/* ---------- 내 정보 ---------- */}
        <section className="mypage-card">
          <div className="mypage-profile">
            <div className="mypage-profile__avatar">{user.name.charAt(0)}</div>
            <div className="mypage-profile__text">
              <p className="mypage-profile__name">{user.name}</p>
              {/* 기업명 · 회원 유형 */}
              <p className="mypage-profile__company">{user.companyName ?? '-'} · {isAdmin ? '관리자' : user.companyType}</p>
              <p className="mypage-profile__email">{user.email}</p>
            </div>
            {/* 수정 모드가 아닐 때만 [수정] 버튼 */}
            {!editing && (
              <button onClick={startEdit} className="mypage-edit-btn">수정</button>
            )}
          </div>

          <dl className="mypage-info">
            {infoRows.map((row) => (
              <div key={row.label} className="mypage-info__row">
                <dt>{row.label}</dt>
                {/* 수정 모드에서는 이름 · 주소만 입력칸으로 (나머지는 그대로 글자) */}
                {editing && row.label === '이름' && (
                  <dd><input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={50} className="mypage-input" /></dd>
                )}
                {editing && row.label === '주소' && (
                  <dd><input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} maxLength={300} className="mypage-input" /></dd>
                )}
                {!(editing && (row.label === '이름' || row.label === '주소')) && <dd>{row.value}</dd>}
              </div>
            ))}
          </dl>

          {infoError && <p className="mypage-error">{infoError}</p>}
          {infoMessage && <p className="mypage-notice">{infoMessage}</p>}

          {/* 수정 모드 : [취소] [저장] */}
          {editing && (
            <div className="mypage-edit-actions">
              <button onClick={() => { setEditing(false); setInfoError(''); }} disabled={infoSaving} className="mypage-cancel-btn">취소</button>
              <button onClick={saveInfo} disabled={infoSaving} className="mypage-save-btn">
                {infoSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </section>

        {/* ---------- 관심 국가 설정 (기업 회원만) ---------- */}
        {isCompany && (
          <section className="mypage-card">
            <div className="mypage-card__head">
              <h2 className="mypage-card__title">관심 국가</h2>
              <span className="mypage-card__count">{interests.length} / {MAX_INTEREST_COUNTRIES}</span>
            </div>
            <p className="mypage-card__desc">
              최대 {MAX_INTEREST_COUNTRIES}개까지 고를 수 있어요. {MAX_INTEREST_COUNTRIES}개가 찬 상태에서 새 국가를 고르면 가장 먼저 고른 국가가 빠지고 새 국가가 들어갑니다.
            </p>

            {/* 국가 고르기 — value 를 항상 '' 로 두어서, 고르고 나면 다시 "국가 선택" 으로 돌아옴 */}
            <select
              value=""
              onChange={(e) => addCountry(e.target.value)}
              disabled={countryLoading || !!countryError || interestBusy}
              className="mypage-select"
            >
              <option value="">
                {countryLoading ? '국가 목록을 불러오는 중...' : interestBusy ? '저장 중...' : '국가 선택'}
              </option>
              {/* 이미 고른 국가는 목록에서 빼고 보여줌 */}
              {countryOptions
                .filter((country) => !interests.some((interest) => interest.countryId === country.countryId))
                .map((country) => <option key={country.countryId} value={country.countryId}>{country.countryName}</option>)}
            </select>

            {/* 3개가 찼을 때 : 다음에 빠질 국가 미리 알려주기 */}
            {isFull && (
              <p className="mypage-hint">새 국가를 고르면 가장 먼저 고른 <strong>{countryLabel(interests[0])}</strong>이(가) 빠집니다.</p>
            )}
            {countryError && <p className="mypage-error">{countryError}</p>}
            {interestError && <p className="mypage-error">{interestError}</p>}
            {interestMessage && <p className="mypage-notice">{interestMessage}</p>}

            {/* 고른 국가 칩 (번호 = 고른 순서 , × 를 누르면 삭제) */}
            <div className="mypage-chips">
              {interests.length === 0 && <p className="mypage-empty">아직 고른 관심 국가가 없습니다.</p>}
              {interests.map((interest, index) => (
                <span key={interest.interestId} className="mypage-chip">
                  <span className="mypage-chip__order">{index + 1}</span>
                  {countryLabel(interest)}
                  <button
                    onClick={() => removeCountry(interest)}
                    disabled={interestBusy}
                    className="mypage-chip__remove"
                    aria-label={`${countryLabel(interest)} 삭제`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <button onClick={() => navigate(PAGE_PATHS.insights)} className="mypage-link-btn">
              맞춤 인사이트 보기 →
            </button>
          </section>
        )}
      </div>

      {/* ---------- 회원 탈퇴 (기업 회원만) ---------- */}
      {isCompany && (
        <section className="mypage-withdraw">
          <div>
            <p className="mypage-withdraw__title">회원 탈퇴</p>
            <p className="mypage-withdraw__desc">탈퇴하면 계정과 매칭 정보를 더 이상 이용할 수 없습니다.</p>
          </div>
          <button onClick={handleWithdraw} className="mypage-withdraw__btn">회원 탈퇴</button>
        </section>
      )}
    </div>
  );
}
