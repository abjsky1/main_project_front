
/* =====================================================================
   매칭 조건 설정 페이지 (주소: /matching-settings , 일반 회원 전용)

   - 수출입기업 / 물류업체가 매칭에 쓸 조건을 등록하고 삭제
   - 국가/항구 CSV 조회
   - DB에 저장된 내 매칭 조건 조회
   - 조건 등록 후 자동 매칭은 백엔드 Service에서 실행
   - 등록/삭제 후 DB 목록 새로고침
   ===================================================================== */

import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';

import type { User } from '../../types/user';

import {
  fetchCountries,
  fetchRoutes,
  type CountryData,
  type RouteData
} from '../../api/referenceData';

import {
  createCscore,
  createLscore,
  deleteCscore,
  deleteLscore
} from '../../api/scoreApi';

import PageHeader from '../../components/common/PageHeader';
import AccessGuard from '../../components/common/AccessGuard';

import ConsentBox from './components/ConsentBox';
import ShipperConditionForm from './components/ShipperConditionForm';
import LogisticsConditionForm from './components/LogisticsConditionForm';

import {
  ShipperConditionTable,
  LogisticsConditionTable
} from './components/ConditionTables';

import {
  emptyLogistics,
  emptyShipper,
  type LogisticsCondition,
  type PortType,
  type ShipperCondition
} from './matchingTypes';

import {
  changeDeparture,
  changeDestination,
  changeFormField
} from './routeUtils';

import {
  buildLogisticsRequest,
  buildShipperRequest,
  errorMessage,
  loadLogisticsRows,
  loadShipperRows
} from './conditionApi';

import './MatchingSettings.css';


// [1] App.tsx에서 전달받는 데이터
interface MatchingSettingsProps {

  user: User | null;

  shipperRows: ShipperCondition[];

  logisticsRows: LogisticsCondition[];

  onShipperRowsChange: (rows: ShipperCondition[]) => void;

  onLogisticsRowsChange: (rows: LogisticsCondition[]) => void;

}


// [2] 매칭 서비스 참여 동의 저장
// 브라우저에 회원별로 저장
const consentKey = (memberId?: string) => {

  return `macross:matching-consent:${memberId ?? 'guest'}`;

};


// 저장된 동의 여부 가져오기
function loadConsent(memberId?: string): boolean {

  try {

    return localStorage.getItem(consentKey(memberId)) === 'true';

  } catch {

    return false;

  }

}


// 동의 여부 저장하기
function saveConsent(
  memberId: string | undefined,
  checked: boolean
) {

  try {

    localStorage.setItem(consentKey(memberId), String(checked));

  } catch {

    // 브라우저 저장 실패 시 별도 동작 없음

  }

}


// [3] 섹션 제목
const SectionTitle = ({ children }: { children: string }) => (

  <div className="ms-section-title">

    <p className="eyebrow">

      {children}

    </p>

    <div className="ms-section-title__line" />

  </div>

);


// [4] 매칭 조건 설정 컴포넌트
export default function MatchingSettings({

  user,
  shipperRows,
  logisticsRows,
  onShipperRowsChange,
  onLogisticsRowsChange

}: MatchingSettingsProps) {


  // 매칭 참여 동의
  const [consented, setConsented] = useState(
    () => loadConsent(user?.memberId)
  );


  // 수출입기업 입력폼
  const [shipperForm, setShipperForm] = useState(
    emptyShipper()
  );


  // 물류업체 입력폼
  const [logisticsForm, setLogisticsForm] = useState(
    emptyLogistics()
  );


  // 국가 및 노선 데이터
  const [countries, setCountries] = useState<CountryData[]>([]);

  const [routes, setRoutes] = useState<RouteData[]>([]);


  // CSV 조회 상태
  const [referenceLoading, setReferenceLoading] = useState(true);

  const [referenceError, setReferenceError] = useState('');


  // 저장/삭제 중 여부
  const [busy, setBusy] = useState(false);


  // DB 목록 조회 상태
  const [loading, setLoading] = useState(false);

  const [loadError, setLoadError] = useState('');


  // [추가] 조건 등록·삭제 성공 안내
  const [statusMessage, setStatusMessage] = useState('');


  // 저장 중 중복 클릭 방지
  const saving = useRef(false);


  // 현재 화면이 열려 있는지 확인
  const mounted = useRef(false);


  // 로그인한 회원 정보
  const memberId = user?.memberId;

  const companyType = user?.companyType;


  // [5] DB에 저장된 내 매칭 조건 목록 조회
  const loadRows = useCallback(async (signal?: AbortSignal) => {

    // 회원 정보 또는 CSV가 준비되지 않으면 조회하지 않음
    if (
      !memberId ||
      !companyType ||
      countries.length === 0 ||
      routes.length === 0
    ) {

      return;

    }


    setLoading(true);

    setLoadError('');


    try {

      // 1. 수출입기업인 경우
      if (companyType === '수출입기업') {

        // 백엔드 GET /api/cscore 호출
        const rows = await loadShipperRows(
          memberId,
          countries,
          routes,
          signal
        );


        // 페이지를 떠났으면 응답 무시
        if (!mounted.current || signal?.aborted) {

          return;

        }


        // 조회한 화주 조건 저장
        onShipperRowsChange(rows);

        onLogisticsRowsChange([]);

      } else {

        // 2. 물류업체인 경우

        // 백엔드 GET /api/lscore 호출
        const rows = await loadLogisticsRows(
          memberId,
          countries,
          routes,
          signal
        );


        if (!mounted.current || signal?.aborted) {

          return;

        }


        // 조회한 물류업체 조건 저장
        onLogisticsRowsChange(rows);

        onShipperRowsChange([]);

      }

    } catch (error) {

      // DB 조회 실패 안내
      if (mounted.current && !signal?.aborted) {

        setLoadError(errorMessage(error));

      }

      // 저장 후 재조회에서도 실패를 확인하도록 기존 방식 유지
      throw error;

    } finally {

      if (mounted.current && !signal?.aborted) {

        setLoading(false);

      }

    }

  }, [
    memberId,
    companyType,
    countries,
    routes,
    onShipperRowsChange,
    onLogisticsRowsChange
  ]);


  // [6] 화면이 열려 있는지 확인
  useEffect(() => {

    mounted.current = true;


    return () => {

      mounted.current = false;

    };

  }, []);


  // [7] 국가 및 노선 CSV 조회
  useEffect(() => {

    const controller = new AbortController();


    const loadReferenceData = async () => {

      setReferenceLoading(true);

      setReferenceError('');


      try {

        // 1. 국가와 노선 CSV 조회
        const [countryRows, routeRows] = await Promise.all([

          fetchCountries(controller.signal),

          fetchRoutes(controller.signal)

        ]);


        // 요청 취소 여부 확인
        if (controller.signal.aborted) {

          return;

        }


        // 2. CSV 데이터 확인
        if (countryRows.length === 0 || routeRows.length === 0) {

          throw new Error(
            '국가 또는 경로 CSV 데이터가 비어 있습니다.'
          );

        }


        // 3. 조회한 데이터 저장
        setCountries(countryRows);

        setRoutes(routeRows);

      } catch (error) {

        if (!controller.signal.aborted) {

          let message = '국가/경로 데이터를 불러오지 못했습니다.';


          if (axios.isAxiosError(error)) {

            message =
              '국가/경로 데이터를 불러오지 못했습니다. Spring 서버와 Vite proxy 설정을 확인해 주세요.';

          } else if (error instanceof Error) {

            message = error.message;

          }


          setReferenceError(message);

        }

      } finally {

        if (!controller.signal.aborted) {

          setReferenceLoading(false);

        }

      }

    };


    loadReferenceData();


    // 페이지 이동 시 요청 취소
    return () => {

      controller.abort();

    };

  }, []);


  // [8] CSV 조회 완료 후 내 DB 조건 조회
  useEffect(() => {

    const controller = new AbortController();


    // 이전 회원의 조건 목록 초기화
    onShipperRowsChange([]);

    onLogisticsRowsChange([]);


    // 회원 번호가 없으면 조회 실패
    if (!memberId) {

      setLoadError(
        'DB 회원 ID가 없습니다. 실제 회원으로 로그인해 주세요.'
      );

      return () => controller.abort();

    }


    // CSV가 아직 준비되지 않았으면 기다리기
    if (
      referenceLoading ||
      referenceError ||
      countries.length === 0 ||
      routes.length === 0
    ) {

      return () => controller.abort();

    }


    // 실제 DB 조건 목록 조회
    loadRows(controller.signal).catch(() => {});


    return () => {

      controller.abort();

    };

  }, [
    memberId,
    referenceLoading,
    referenceError,
    countries,
    routes,
    loadRows,
    onShipperRowsChange,
    onLogisticsRowsChange
  ]);


  // [9] 기업 회원이 아니면 접근 안내
  if (!user || user.role === 'admin') {

    return (

      <div className="page-container">

        <PageHeader
          eyebrow="Matching"
          title="매칭 조건 설정"
          className="page-header--compact"
        />

        <AccessGuard
          icon="users"
          short
          description="매칭 조건 설정은 기업 회원(수출입기업·물류업체)만 이용할 수 있습니다."
        />

      </div>

    );

  }


  // [10] 수출입기업 구분
  const isShipper = user.companyType === '수출입기업';


  // [11] 매칭 서비스 참여 동의 변경
  const toggleConsent = () => {

    setStatusMessage('');

    const next = !consented;

    setConsented(next);

    saveConsent(user.memberId, next);

  };


  // [12] 매칭 조건 저장 공통 함수
  const saveCondition = async (
    send: () => Promise<boolean>,
    resetForm: () => void
  ) => {

    // 중복 저장 방지
    if (saving.current) {

      return;

    }


    setStatusMessage('');

    let saved = false;


    try {

      saving.current = true;

      setBusy(true);


      // 1. 백엔드에 저장 요청
      const data = await send();


      // 2. 저장 결과 확인
      if (data !== true) {

        throw new Error(
          '조건 저장에 실패했습니다. 로그인 상태와 입력한 조건을 확인해 주세요.'
        );

      }


      saved = true;


      if (!mounted.current) {

        return;

      }


      // 3. 저장 성공 시 입력폼 초기화
      resetForm();


      // 4. 저장된 DB 목록 다시 조회
      await loadRows();


      // [추가] 저장 성공 안내
      if (mounted.current) {

        setStatusMessage(
          '매칭 조건이 등록되었습니다. 조건에 맞는 업체가 있으면 내 매칭에서 확인할 수 있습니다.'
        );

      }

    } catch (error) {

      if (mounted.current) {

        alert(
          saved
            ? '저장은 완료됐지만 목록 조회에 실패했습니다. 다시 조회 버튼을 눌러 주세요.'
            : errorMessage(error)
        );

      }

    } finally {

      saving.current = false;


      if (mounted.current) {

        setBusy(false);

      }

    }

  };


  // [13] 수출입기업 매칭 조건 등록
  const addShipperRow = () => {

    if (saving.current) {

      return;

    }


    try {

      // 1. 화주 입력폼을 Spring DTO 형식으로 변환
      const body = buildShipperRequest(
        shipperForm,
        user.memberId ?? '',
        consented,
        countries,
        routes
      );


      // 2. POST /api/cscore 요청
      saveCondition(
        () => createCscore(body),
        () => setShipperForm(emptyShipper())
      );

    } catch (error) {

      alert(errorMessage(error));

    }

  };


  // [14] 물류기업 매칭 조건 등록
  const addLogisticsRow = () => {

    if (saving.current) {

      return;

    }


    try {

      // 1. 물류업체 입력폼을 Spring DTO 형식으로 변환
      const body = buildLogisticsRequest(
        logisticsForm,
        user.memberId ?? '',
        consented,
        countries,
        routes
      );


      // 2. POST /api/lscore 요청
      saveCondition(
        () => createLscore(body),
        () => setLogisticsForm(emptyLogistics())
      );

    } catch (error) {

      alert(errorMessage(error));

    }

  };


  // [15] 매칭 조건 삭제
  const deleteRow = async (id: number) => {

    if (saving.current || !user.memberId) {

      return;

    }


    setStatusMessage('');

    saving.current = true;

    setBusy(true);

    let deleted = false;


    try {

      // 1. 기업 유형에 따라 삭제 API 호출
      const data = await (
        isShipper
          ? deleteCscore(id)
          : deleteLscore(id)
      );


      // 2. 삭제 실패
      if (data !== true) {

        if (mounted.current) {

          alert(
            '조건을 삭제할 수 없습니다. 진행 중이거나 완료된 매칭 또는 로그인 상태를 확인해 주세요.'
          );

        }

        return;

      }


      deleted = true;


      // 3. 삭제 성공 후 DB 목록 새로고침
      if (mounted.current) {

        await loadRows();


        // [추가] 삭제 성공 안내
        setStatusMessage(
          '매칭 조건이 삭제되었습니다.'
        );

      }

    } catch (error) {

      if (mounted.current) {

        alert(
          deleted
            ? '삭제는 완료됐지만 목록 조회에 실패했습니다. 다시 조회 버튼을 눌러 주세요.'
            : errorMessage(error)
        );

      }

    } finally {

      saving.current = false;


      if (mounted.current) {

        setBusy(false);

      }

    }

  };


  // [16] 입력폼 활성화 여부
  const formDisabled =
    !consented ||
    busy ||
    referenceLoading ||
    !!referenceError;


  // [17] 조건 추가 버튼 활성화 여부
  const addDisabled =
    busy ||
    loading ||
    referenceLoading ||
    !consented ||
    !user.memberId ||
    !!loadError ||
    !!referenceError;


  // [18] 화면 출력
  return (

    <div className="page-container">

      {/* 페이지 제목 */}
      <PageHeader
        eyebrow="Matching"
        title="매칭 조건 설정"
        subtitle={
          <>
            {user.companyName} · {user.companyType}
          </>
        }
      />


      {/* CSV 조회 안내 */}
      {referenceLoading && (

        <p className="ms-status" role="status">
          국가/경로 데이터를 불러오는 중입니다...
        </p>

      )}


      {/* CSV 조회 오류 */}
      {referenceError && (

        <div className="ms-status ms-status--error" role="alert">
          {referenceError}
        </div>

      )}


      {/* DB 목록 조회 안내 */}
      {loading && (

        <p className="ms-status" role="status">
          DB 목록을 불러오는 중입니다...
        </p>

      )}


      {/* DB 조회 오류 및 재조회 버튼 */}
      {loadError && (

        <div className="ms-status ms-status--error" role="alert">

          {loadError}{' '}

          <button

            disabled={
              loading ||
              busy ||
              referenceLoading ||
              !memberId ||
              !!referenceError
            }

            onClick={() => {
              loadRows().catch(() => {});
            }}

            className="ms-retry-btn"

          >

            다시 조회

          </button>

        </div>

      )}


      {/* 매칭 서비스 참여 동의 */}
      <ConsentBox
        checked={consented}
        onToggle={toggleConsent}
      />


      {/* [추가] 기존 조건의 동의 상태는 바뀌지 않음 */}
      <p className="ms-status">

        동의 체크는 새로 등록하는 조건에 적용됩니다.
        기존에 등록한 조건의 동의 상태는 변경되지 않습니다.

      </p>


      {/* [추가] 등록·삭제 성공 안내 */}
      {statusMessage && (

        <p className="ms-status" role="status">

          {statusMessage}

        </p>

      )}


      {/* 동의하지 않은 경우 안내 */}
      {!consented && (

        <div className="ms-consent-needed" role="status">

          <p>
            매칭 서비스 참여에 동의하시면 조건을 설정할 수 있습니다.
          </p>

        </div>

      )}


      {/* ============================================
          수출입기업 매칭 조건 설정
          ============================================ */}

      {isShipper && (

        <div>

          <SectionTitle>
            수출입기업 매칭 조건
          </SectionTitle>


          {/* 화주 매칭 조건 입력폼 */}
          <ShipperConditionForm

            form={shipperForm}

            countries={countries}

            routes={routes}

            disabled={formDisabled}

            addDisabled={addDisabled}

            onFieldChange={(key, val) => {

              setShipperForm((p) => changeFormField(p, key, val));

            }}

            onDepartureChange={(val: string, pt: PortType) => {

              setShipperForm((p) => changeDeparture(p, val, pt));

            }}

            onDestinationChange={(val: string, pt: PortType) => {

              setShipperForm((p) => changeDestination(p, val, pt));

            }}

            onAdd={addShipperRow}

          />


          {/* DB에 등록된 화주 조건 목록 */}
          {shipperRows.length > 0 && (

            <ShipperConditionTable

              rows={shipperRows}

              deleteDisabled={busy || loading}

              onDelete={deleteRow}

            />

          )}

        </div>

      )}


      {/* ============================================
          물류기업 매칭 조건 설정
          ============================================ */}

      {!isShipper && (

        <div>

          <SectionTitle>
            물류업체 매칭 조건
          </SectionTitle>


          {/* 물류기업 매칭 조건 입력폼 */}
          <LogisticsConditionForm

            form={logisticsForm}

            countries={countries}

            routes={routes}

            disabled={formDisabled}

            addDisabled={addDisabled}

            onFieldChange={(key, val) => {

              setLogisticsForm((p) => changeFormField(p, key, val));

            }}

            onDepartureChange={(val: string, pt: PortType) => {

              setLogisticsForm((p) => changeDeparture(p, val, pt));

            }}

            onDestinationChange={(val: string, pt: PortType) => {

              setLogisticsForm((p) => changeDestination(p, val, pt));

            }}

            onAdd={addLogisticsRow}

          />


          {/* DB에 등록된 물류기업 조건 목록 */}
          {logisticsRows.length > 0 && (

            <LogisticsConditionTable

              rows={logisticsRows}

              deleteDisabled={busy || loading}

              onDelete={deleteRow}

            />

          )}

        </div>

      )}

    </div>

  );

}
