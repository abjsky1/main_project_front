/* =====================================================================
   매칭 조건 설정 페이지 (주소: /matching-settings , 일반 회원 전용)
   - 수출입기업 / 물류업체가 매칭에 쓸 조건을 등록하고 삭제하는 화면
   - 흐름
     1. 처음 들어오면 국가/항구 CSV 를 불러옴 (referenceData.ts)
     2. CSV 가 준비되면 내가 DB 에 저장한 조건 목록을 불러옴 (conditionApi.ts)
     3. [+ 조건 추가] → 입력값 검사 → 서버 저장 → 목록 다시 불러오기
   - 입력폼 화면은 components/ShipperConditionForm, LogisticsConditionForm 이 그림
   ===================================================================== */
import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { User } from '../../types/user';
import { fetchCountries, fetchRoutes, type CountryData, type RouteData } from '../../api/referenceData';
import { createCscore, createLscore, deleteCscore, deleteLscore } from '../../api/scoreApi';
import PageHeader from '../../components/common/PageHeader';
import AccessGuard from '../../components/common/AccessGuard';
import ConsentBox from './components/ConsentBox';
import ShipperConditionForm from './components/ShipperConditionForm';
import LogisticsConditionForm from './components/LogisticsConditionForm';
import { ShipperConditionTable, LogisticsConditionTable } from './components/ConditionTables';
import { emptyLogistics, emptyShipper, type LogisticsCondition, type PortType, type ShipperCondition } from './matchingTypes';
import { changeDeparture, changeDestination, changeFormField } from './routeUtils';
import { buildLogisticsRequest, buildShipperRequest, errorMessage, loadLogisticsRows, loadShipperRows } from './conditionApi';
import './MatchingSettings.css';

// App.tsx 에서 받는 props
// 조건 목록(shipperRows/logisticsRows)은 App 이 보관 → 이 페이지는 받아서 그리고, 바뀌면 onXxxChange 로 알려줌
interface MatchingSettingsProps {
  user: User | null;
  onLoginClick: () => void;
  onMatchingUpdate?: (countries: string[]) => void;           // 등록한 국가 목록 → 대시보드 맞춤 인사이트에 사용
  shipperRows: ShipperCondition[];
  logisticsRows: LogisticsCondition[];
  onShipperRowsChange: (rows: ShipperCondition[]) => void;    // [TS] (rows: ...) => void : rows 를 받는 함수
  onLogisticsRowsChange: (rows: LogisticsCondition[]) => void;
}

// 섹션 제목 (작은 라벨 + 그라데이션 선)
const SectionTitle = ({ children }: { children: string }) => (
  <div className="ms-section-title">
    <p className="eyebrow">{children}</p>
    <div className="ms-section-title__line" />
  </div>
);

export default function MatchingSettings({ user, onLoginClick, onMatchingUpdate, shipperRows, logisticsRows, onShipperRowsChange, onLogisticsRowsChange }: MatchingSettingsProps) {
  const [consented, setConsented] = useState(false);                     // 매칭 서비스 참여 동의 체크
  const [shipperForm, setShipperForm] = useState(emptyShipper());         // 수출입기업 입력폼 값
  const [logisticsForm, setLogisticsForm] = useState(emptyLogistics());   // 물류업체 입력폼 값

  // 백엔드 static CSV에서 받아오는 기준 데이터
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState('');

  const [busy, setBusy] = useState(false);         // 저장/삭제 요청 중 (버튼 잠그기)
  const [loading, setLoading] = useState(false);   // DB 목록 불러오는 중
  const [loadError, setLoadError] = useState('');
  // useRef : 값이 바뀌어도 화면을 다시 그리지 않는 변수 (가이드 3-2)
  const saving = useRef(false);    // 저장 중이면 true → 버튼 연타로 2번 저장되는 것 방지
  const mounted = useRef(false);   // 이 페이지가 화면에 떠 있으면 true → 떠난 뒤에 도착한 응답은 무시
  const memberId = user?.memberId;
  const companyType = user?.companyType;

  // DB에 저장된 내 매칭 조건 목록을 조회합니다.
  // useCallback : 함수를 기억해 두는 훅 (가이드 3-3). 아래 useEffect 의존성 배열에 이 함수를 넣기 위해 사용
  //               [ ] 안의 값이 바뀔 때만 함수를 새로 만듦
  const loadRows = useCallback(async (signal?: AbortSignal) => {
    if (!memberId || !companyType || countries.length === 0 || routes.length === 0) return;
    setLoading(true);
    setLoadError('');
    try {
      if (companyType === '수출입기업') {
        const rows = await loadShipperRows(memberId, countries, routes, signal);
        if (!mounted.current || signal?.aborted) return;   // 페이지를 떠났거나 요청이 취소됐으면 무시
        onShipperRowsChange(rows);
        onLogisticsRowsChange([]);
        // 등록한 국가들을 중복 없이 모아서 App 에 전달
        // flatMap : 각 조건의 countries 배열을 하나로 이어 붙임 → new Set : 중복 제거 → [... ] : 다시 배열로
        onMatchingUpdate?.([...new Set(rows.flatMap((row) => row.countries))]);
      } else {
        const rows = await loadLogisticsRows(memberId, countries, routes, signal);
        if (!mounted.current || signal?.aborted) return;
        onLogisticsRowsChange(rows);
        onShipperRowsChange([]);
        onMatchingUpdate?.([...new Set(rows.flatMap((row) => row.countries))]);
      }
    } catch (error) {
      if (mounted.current && !signal?.aborted) setLoadError(errorMessage(error));
      throw error;   // 호출한 쪽에도 실패를 알림 (저장 후 다시 조회할 때 안내 문구를 고르기 위해)
    } finally {
      if (mounted.current && !signal?.aborted) setLoading(false);
    }
  }, [memberId, companyType, countries, routes, onShipperRowsChange, onLogisticsRowsChange, onMatchingUpdate]);

  // 컴포넌트 생명주기 확인 (B_react Lifecycle 예제의 마운트 / 언마운트)
  useEffect(() => {
    mounted.current = true;          // 화면에 나타남
    return () => {
      mounted.current = false;       // 화면에서 사라짐 (다른 페이지로 이동)
    };
  }, []);

  // 1. 백엔드에 있는 country.csv / route.csv를 한 번 불러옵니다.
  useEffect(() => {
    // 요청 취소 도구 (가이드 3-4) — 페이지를 떠나면 아래 return 에서 취소
    const controller = new AbortController();

    const loadReferenceData = async () => {
      setReferenceLoading(true);
      setReferenceError('');

      try {
        // 국가 CSV, 항구 CSV 를 동시에 요청하고 둘 다 끝날 때까지 기다림 (가이드 3-5)
        const [countryRows, routeRows] = await Promise.all([
          fetchCountries(controller.signal),
          fetchRoutes(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        if (countryRows.length === 0 || routeRows.length === 0) {
          // throw : 직접 오류를 만들어서 아래 catch 로 보냄
          throw new Error('국가 또는 경로 CSV 데이터가 비어 있습니다.');
        }

        setCountries(countryRows);
        setRoutes(routeRows);
      } catch (error) {
        if (!controller.signal.aborted) {
          // 오류 종류에 따라 안내 문구 고르기
          let message = '국가/경로 데이터를 불러오지 못했습니다.';
          if (axios.isAxiosError(error)) {
            message = '국가/경로 데이터를 불러오지 못했습니다. Spring 서버와 Vite proxy 설정을 확인해 주세요.';   // 서버 통신 오류
          } else if (error instanceof Error) {
            message = error.message;   // 위에서 throw 한 오류
          }
          setReferenceError(message);
        }
      } finally {
        if (!controller.signal.aborted) setReferenceLoading(false);
      }
    };

    loadReferenceData();

    return () => controller.abort();
  }, []);

  // 2. 기준 데이터가 준비되면 로그인 회원의 DB 조건을 조회합니다.
  useEffect(() => {
    const controller = new AbortController();

    // 이전 회원의 목록이 잠깐 보이지 않도록 먼저 비우기
    onShipperRowsChange([]);
    onLogisticsRowsChange([]);
    onMatchingUpdate?.([]);

    if (!memberId) {
      setLoadError('DB 회원 ID가 없습니다. 실제 회원으로 로그인해 주세요.');
      return () => controller.abort();
    }

    // CSV 가 아직 준비 안 됐으면 기다림 (준비되면 의존성 값이 바뀌어서 이 effect 가 다시 실행됨)
    if (referenceLoading || referenceError || countries.length === 0 || routes.length === 0) {
      return () => controller.abort();
    }

    // .catch(() => {}) : 오류 안내는 loadRows 안에서 이미 화면에 표시하므로 여기서는 조용히 무시
    loadRows(controller.signal).catch(() => {});

    return () => controller.abort();
  }, [
    memberId,
    referenceLoading,
    referenceError,
    countries,
    routes,
    loadRows,
    onShipperRowsChange,
    onLogisticsRowsChange,
    onMatchingUpdate,
  ]);

  // 로그인 안 했으면 안내 화면
  if (!user) {
    return (
      <div className="page-container">
        <PageHeader eyebrow="Matching" title="매칭 조건 설정" className="page-header--compact" />
        <AccessGuard
          icon="users"
          short
          title="로그인이 필요합니다"
          description="매칭 조건 설정은 로그인 후 이용 가능합니다."
          buttonLabel="로그인 / 회원가입"
          onLoginClick={onLoginClick}
        />
      </div>
    );
  }

  const isShipper = user.companyType === '수출입기업';

  /* ---------- 저장 / 삭제 ---------- */

  // 저장 공통 흐름: 요청 → 성공 확인 → 폼 비우기 → 목록 다시 조회
  // send      : 서버에 저장 요청을 보내는 함수 (수출입기업 / 물류업체에 따라 다름)
  // resetForm : 저장 성공 후 입력폼을 비우는 함수
  // [TS] () => Promise<boolean> : "실행하면 나중에 true/false 를 돌려주는 함수"
  const saveCondition = async (send: () => Promise<boolean>, resetForm: () => void) => {
    if (saving.current) return;
    let saved = false;
    try {
      saving.current = true;
      setBusy(true);
      // 5. 서버에 저장
      const data = await send();
      if (data !== true) throw new Error('저장에 실패했습니다. DB에 회원 ID가 존재하는지 확인해 주세요.');
      saved = true;
      if (!mounted.current) return;
      resetForm();
      // 6. DB 목록 다시 조회
      await loadRows();
    } catch (error) {
      if (mounted.current) alert(saved ? '저장은 완료됐지만 목록 조회에 실패했습니다. 다시 조회 버튼을 눌러 주세요.' : errorMessage(error));
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const addShipperRow = () => {
    if (saving.current) return;
    try {
      // 입력값 검사 + DTO 변환 (잘못된 값이면 오류가 던져져서 catch 로 이동 → 알림만 띄움)
      const body = buildShipperRequest(shipperForm, user.memberId ?? '', consented, countries, routes);
      // 서버 저장 (saveCondition 은 자기 안에서 오류를 처리하므로 여기 catch 로 오지 않음)
      saveCondition(() => createCscore(body), () => setShipperForm(emptyShipper()));
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  const addLogisticsRow = () => {
    if (saving.current) return;
    try {
      const body = buildLogisticsRequest(logisticsForm, user.memberId ?? '', consented, countries, routes);
      saveCondition(() => createLscore(body), () => setLogisticsForm(emptyLogistics()));
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  const deleteRow = async (id: number) => {
    if (saving.current || !user.memberId) return;
    saving.current = true;
    setBusy(true);
    let deleted = false;
    try {
      // 수출입기업이면 cscore 삭제, 물류업체면 lscore 삭제
      const data = await (isShipper ? deleteCscore(id) : deleteLscore(id));
      if (data !== true) {
        if (mounted.current) alert('매칭 결과에 사용 중인 조건은 삭제할 수 없습니다.');
        return;
      }
      deleted = true;
      if (mounted.current) await loadRows();
    } catch (error) {
      if (mounted.current) alert(deleted ? '삭제는 완료됐지만 목록 조회에 실패했습니다. 다시 조회 버튼을 눌러 주세요.' : errorMessage(error));
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  /* ---------- 화면 상태 ---------- */
  // !!referenceError : 오류 글자가 있으면 true, 빈 글자('')면 false
  const formDisabled = !consented || busy || referenceLoading || !!referenceError;   // 입력폼 전체 잠금
  const addDisabled = busy || loading || referenceLoading || !consented || !user.memberId || !!loadError || !!referenceError;   // [+ 조건 추가] 버튼 잠금

  return (
    <div className="page-container">
      <PageHeader eyebrow="Matching" title="매칭 조건 설정" subtitle={<>{user.companyName} · {user.companyType}</>} />

      {/* 불러오는 중 / 오류 안내 */}
      {referenceLoading && <p className="ms-status" role="status">국가/경로 데이터를 불러오는 중입니다...</p>}
      {referenceError && <div className="ms-status ms-status--error" role="alert">{referenceError}</div>}
      {loading && <p className="ms-status" role="status">DB 목록을 불러오는 중입니다...</p>}
      {loadError && (
        <div className="ms-status ms-status--error" role="alert">
          {loadError}{' '}
          <button
            disabled={loading || busy || referenceLoading || !memberId || !!referenceError}
            onClick={() => loadRows().catch(() => {})}
            className="ms-retry-btn"
          >
            다시 조회
          </button>
        </div>
      )}

      {/* 매칭 서비스 참여 동의 */}
      <ConsentBox checked={consented} onToggle={() => setConsented(!consented)} />

      {!consented && (
        <div className="ms-consent-needed">
          <p>매칭 서비스 참여에 동의하시면 조건을 설정할 수 있습니다.</p>
        </div>
      )}

      {/* 동의했을 때만 입력폼 + 등록 목록 표시 */}
      {consented && (
        <>
          {/* 수출입기업 화면 */}
          {isShipper && (
            <div>
              <SectionTitle>수출입기업 매칭 조건</SectionTitle>
              <ShipperConditionForm
                form={shipperForm}
                countries={countries}
                routes={routes}
                disabled={formDisabled}
                addDisabled={addDisabled}
                // 입력칸이 바뀌면 routeUtils 의 함수로 새 폼 값을 만들어서 저장 (p = 바뀌기 전 폼 값)
                onFieldChange={(key, val) => setShipperForm((p) => changeFormField(p, key, val))}
                onDepartureChange={(val: string, pt: PortType) => setShipperForm((p) => changeDeparture(p, val, pt))}
                onDestinationChange={(val: string, pt: PortType) => setShipperForm((p) => changeDestination(p, val, pt))}
                onAdd={addShipperRow}
              />
              {shipperRows.length > 0 && (
                <ShipperConditionTable rows={shipperRows} deleteDisabled={busy || loading} onDelete={deleteRow} />
              )}
            </div>
          )}

          {/* 물류업체 화면 */}
          {!isShipper && (
            <div>
              <SectionTitle>물류업체 매칭 조건</SectionTitle>
              <LogisticsConditionForm
                form={logisticsForm}
                countries={countries}
                routes={routes}
                disabled={formDisabled}
                addDisabled={addDisabled}
                onFieldChange={(key, val) => setLogisticsForm((p) => changeFormField(p, key, val))}
                onDepartureChange={(val: string, pt: PortType) => setLogisticsForm((p) => changeDeparture(p, val, pt))}
                onDestinationChange={(val: string, pt: PortType) => setLogisticsForm((p) => changeDestination(p, val, pt))}
                onAdd={addLogisticsRow}
              />
              {logisticsRows.length > 0 && (
                <LogisticsConditionTable rows={logisticsRows} deleteDisabled={busy || loading} onDelete={deleteRow} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
