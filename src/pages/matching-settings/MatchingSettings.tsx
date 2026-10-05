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

interface MatchingSettingsProps {
  user: User | null;
  onLoginClick: () => void;
  onMatchingUpdate?: (countries: string[]) => void;
  shipperRows: ShipperCondition[];
  logisticsRows: LogisticsCondition[];
  onShipperRowsChange: (rows: ShipperCondition[]) => void;
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
  const [consented, setConsented] = useState(false);
  const [shipperForm, setShipperForm] = useState(emptyShipper());
  const [logisticsForm, setLogisticsForm] = useState(emptyLogistics());

  // 백엔드 static CSV에서 받아오는 기준 데이터
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState('');

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const saving = useRef(false);
  const mounted = useRef(false);
  const memberId = user?.memberId;
  const companyType = user?.companyType;

  // DB에 저장된 내 매칭 조건 목록을 조회합니다.
  const loadRows = useCallback(async (signal?: AbortSignal) => {
    if (!memberId || !companyType || countries.length === 0 || routes.length === 0) return;
    setLoading(true);
    setLoadError('');
    try {
      if (companyType === '수출입기업') {
        const rows = await loadShipperRows(memberId, countries, routes, signal);
        if (!mounted.current || signal?.aborted) return;
        onShipperRowsChange(rows);
        onLogisticsRowsChange([]);
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
      throw error;
    } finally {
      if (mounted.current && !signal?.aborted) setLoading(false);
    }
  }, [memberId, companyType, countries, routes, onShipperRowsChange, onLogisticsRowsChange, onMatchingUpdate]);

  // 컴포넌트 생명주기 확인
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 1. 백엔드에 있는 country.csv / route.csv를 한 번 불러옵니다.
  useEffect(() => {
    const controller = new AbortController();

    const loadReferenceData = async () => {
      setReferenceLoading(true);
      setReferenceError('');

      try {
        const [countryRows, routeRows] = await Promise.all([
          fetchCountries(controller.signal),
          fetchRoutes(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        if (countryRows.length === 0 || routeRows.length === 0) {
          throw new Error('국가 또는 경로 CSV 데이터가 비어 있습니다.');
        }

        setCountries(countryRows);
        setRoutes(routeRows);
      } catch (error) {
        if (!controller.signal.aborted) {
          setReferenceError(
            axios.isAxiosError(error)
              ? '국가/경로 데이터를 불러오지 못했습니다. Spring 서버와 Vite proxy 설정을 확인해 주세요.'
              : error instanceof Error
                ? error.message
                : '국가/경로 데이터를 불러오지 못했습니다.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setReferenceLoading(false);
      }
    };

    void loadReferenceData();

    return () => controller.abort();
  }, []);

  // 2. 기준 데이터가 준비되면 로그인 회원의 DB 조건을 조회합니다.
  useEffect(() => {
    const controller = new AbortController();

    onShipperRowsChange([]);
    onLogisticsRowsChange([]);
    onMatchingUpdate?.([]);

    if (!memberId) {
      setLoadError('DB 회원 ID가 없습니다. 실제 회원으로 로그인해 주세요.');
      return () => controller.abort();
    }

    if (referenceLoading || referenceError || countries.length === 0 || routes.length === 0) {
      return () => controller.abort();
    }

    void loadRows(controller.signal).catch(() => {});

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
    let body: ReturnType<typeof buildShipperRequest>;
    try {
      // 입력값 검사 + DTO 변환 (실패하면 알림만 띄움)
      body = buildShipperRequest(shipperForm, user.memberId ?? '', consented, countries, routes);
    } catch (error) {
      alert(errorMessage(error));
      return;
    }
    void saveCondition(() => createCscore(body), () => setShipperForm(emptyShipper()));
  };

  const addLogisticsRow = () => {
    if (saving.current) return;
    let body: ReturnType<typeof buildLogisticsRequest>;
    try {
      body = buildLogisticsRequest(logisticsForm, user.memberId ?? '', consented, countries, routes);
    } catch (error) {
      alert(errorMessage(error));
      return;
    }
    void saveCondition(() => createLscore(body), () => setLogisticsForm(emptyLogistics()));
  };

  const deleteRow = async (id: number) => {
    if (saving.current || !user.memberId) return;
    saving.current = true;
    setBusy(true);
    let deleted = false;
    try {
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
  const formDisabled = !consented || busy || referenceLoading || !!referenceError;
  const addDisabled = busy || loading || referenceLoading || !consented || !user.memberId || !!loadError || !!referenceError;

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
            onClick={() => void loadRows().catch(() => {})}
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

      {consented&& (consented || shipperRows.length > 0 || logisticsRows.length > 0) && (
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
