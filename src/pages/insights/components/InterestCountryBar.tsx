import { useEffect, useState } from 'react';
import { fetchCountries, KOREA_ID, type CountryData } from '../../../api/referenceData';
import { addInterest, deleteInterest, getInterests, MAX_INTEREST_COUNTRIES, type InterestDto } from '../../../api/interestApi';

interface InterestCountryBarProps {
  memberId?: string;
  interests: InterestDto[];                              // 지금 설정된 관심 국가 (App 이 보관)
  onInterestsChange: (interests: InterestDto[]) => void; // 추가·삭제 후 다시 조회한 목록을 App 에 알림
}

// 서버 저장 실패 시 안내 문구 (본인 확인용 쿠키가 만료된 경우가 가장 흔함)
const LOGIN_EXPIRED_MESSAGE = '저장하지 못했습니다. 로그인한 지 오래되었다면 다시 로그인한 뒤 시도해 주세요.';
const SERVER_ERROR_MESSAGE = '서버 요청에 실패했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.';

// 맞춤 인사이트 상단 : 관심 국가 설정 (최대 3개 , DB 저장 — /api/interest)
// (예전 마이페이지의 관심 국가 카드를 옮김)
// 3개가 찬 상태에서 새 국가를 고르면 서버가 가장 먼저 고른 국가를 빼고 추가 (밀어내기)
export default function InterestCountryBar({ memberId, interests, onInterestsChange }: InterestCountryBarProps) {
  // 국가 선택 목록 (백엔드 country.csv) — 매칭 조건 설정과 같은 국가 목록 사용
  const [countryOptions, setCountryOptions] = useState<CountryData[]>([]);
  const [countryLoading, setCountryLoading] = useState(true);
  const [countryError, setCountryError] = useState('');
  const [busy, setBusy] = useState(false);       // 추가/삭제 요청 중 (중복 클릭 방지)
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isFull = interests.length >= MAX_INTEREST_COUNTRIES;   // 3개가 다 찼는지
  const countryLabel = (interest: InterestDto) => interest.countryName ?? `국가 #${interest.countryId}`;

  // 처음 들어올 때 국가 목록 한 번 불러오기
  useEffect(() => {
    let ignore = false;   // 응답 전에 페이지를 떠나면 true → 늦게 온 응답 무시 (가이드 3-4)

    async function loadCountries() {
      try {
        const countries = await fetchCountries();
        // 대한민국을 빼고 가나다 순 정렬
        const options = countries
          .filter((country) => country.countryId !== KOREA_ID)
          .sort((a, b) => a.countryName.localeCompare(b.countryName, 'ko'));
        if (!ignore) setCountryOptions(options);
      } catch (e) {
        console.log('국가 목록 조회 실패 : ', e);
        if (!ignore) setCountryError('국가 목록을 불러오지 못했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.');
      } finally {
        if (!ignore) setCountryLoading(false);
      }
    }

    loadCountries();
    return () => { ignore = true; };
  }, []);

  // 추가·삭제가 끝나면 DB 목록을 다시 조회해서 App 에 알림 (매칭 조건 설정의 "저장 → 다시 조회" 와 같은 흐름)
  const reloadInterests = async (id: string) => {
    const list = await getInterests(id);
    onInterestsChange(list);
  };

  // 국가 고르기 (select) → 서버에 추가 요청 (3개가 차 있으면 서버가 가장 먼저 고른 국가를 뺌)
  const addCountry = async (countryIdText: string) => {
    if (!countryIdText || !memberId || busy) return;

    const country = countryOptions.find((c) => c.countryId === Number(countryIdText));
    if (!country) return;

    const oldest = isFull ? interests[0] : null;   // 밀려날 국가 (안내 문구용)

    setBusy(true);
    setMessage('');
    setError('');
    try {
      const ok = await addInterest(memberId, country.countryId);
      if (!ok) {
        setError(LOGIN_EXPIRED_MESSAGE);
        return;
      }
      await reloadInterests(memberId);
      setMessage(oldest
        ? `${countryLabel(oldest)} 빠짐 · ${country.countryName} 추가 (가장 먼저 고른 국가가 빠졌어요)`
        : `${country.countryName} 추가`);
    } catch (e) {
      console.log('관심 국가 추가 실패 : ', e);
      setError(SERVER_ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  };

  // 칩의 × 버튼 → 서버에 삭제 요청
  const removeCountry = async (interest: InterestDto) => {
    if (!memberId || busy) return;

    setBusy(true);
    setMessage('');
    setError('');
    try {
      const ok = await deleteInterest(interest.interestId);
      if (!ok) {
        setError(LOGIN_EXPIRED_MESSAGE);
        return;
      }
      await reloadInterests(memberId);
      setMessage(`${countryLabel(interest)} 삭제`);
    } catch (e) {
      console.log('관심 국가 삭제 실패 : ', e);
      setError(SERVER_ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="interest-bar">
      <div className="interest-bar__row">
        <div className="interest-bar__title">
          <p className="eyebrow">관심 국가</p>
          <span className="interest-bar__count">{interests.length} / {MAX_INTEREST_COUNTRIES}</span>
        </div>

        {/* 고른 국가 칩 (번호 = 고른 순서 , × 를 누르면 삭제) */}
        <div className="interest-bar__chips">
          {interests.length === 0 && <p className="interest-bar__empty">아직 고른 관심 국가가 없습니다.</p>}
          {interests.map((interest, index) => (
            <span key={interest.interestId} className="interest-chip">
              <span className="interest-chip__order">{index + 1}</span>
              {countryLabel(interest)}
              <button
                onClick={() => removeCountry(interest)}
                disabled={busy}
                className="interest-chip__remove"
                aria-label={`${countryLabel(interest)} 삭제`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* 국가 고르기 — value 를 항상 '' 로 두어서, 고르고 나면 다시 "국가 추가" 로 돌아옴 */}
        <select
          value=""
          onChange={(e) => addCountry(e.target.value)}
          disabled={countryLoading || !!countryError || busy}
          className="interest-bar__select"
        >
          <option value="">
            {countryLoading ? '국가 목록을 불러오는 중...' : busy ? '저장 중...' : '+ 국가 추가'}
          </option>
          {/* 이미 고른 국가는 목록에서 빼고 보여줌 */}
          {countryOptions
            .filter((country) => !interests.some((interest) => interest.countryId === country.countryId))
            .map((country) => <option key={country.countryId} value={country.countryId}>{country.countryName}</option>)}
        </select>
      </div>

      {/* 안내 / 결과 문구 */}
      <p className="interest-bar__desc">
        {isFull
          ? <>새 국가를 고르면 가장 먼저 고른 <strong>{countryLabel(interests[0])}</strong>이(가) 빠집니다.</>
          : `최대 ${MAX_INTEREST_COUNTRIES}개까지 고를 수 있어요. 고른 국가마다 아래에 인사이트가 생깁니다.`}
      </p>
      {countryError && <p className="interest-bar__error">{countryError}</p>}
      {error && <p className="interest-bar__error">{error}</p>}
      {message && <p className="interest-bar__notice">{message}</p>}
    </section>
  );
}
