import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type { FormEvent } from 'react';

import {
  deleteInsightHistory,
  generateInsights,
  getErrorMessage,
  getInsightHistory,
  getInsightHistoryDetail,
  getInsightOptions,
  searchInsightItems,
} from './insightApi';

import {
  formatDate,
  historyStatusLabels,
  objectiveLabels,
} from './insightsData';

import type {
  Condition,
  Filters,
  HistoryDetail,
  HistoryPage,
  InsightResult,
  Item,
  Options,
} from './insightsData';

import InsightSet from './components/InsightSet';

import './Insights.css';

interface InsightsProps {
  user: {
    memberId?: string;
    role?: string;
  } | null;
}

interface DisplayResult {
  historyId: number | null;
  result: InsightResult;
  history: HistoryDetail | null;
}

type BusyAction =
  | ''
  | 'generate'
  | 'view'
  | 'delete'
  | 'prepare';

const EMPTY_FILTERS: Filters = {
  countryIds: [],
  hsCode: '',
  direction: 'EXPORT',
  start: '',
  end: '',
  objective: '',
  conditionId: null,
};

const detailLabels: Record<string, string> = {
  transport: '운송 방식',
  departureId: '출발지 코드',
  arrivalId: '도착지 코드',
  requestWeight: '요청 물량',
  desiredDate: '희망일',
  availableCapacity: '가용 물량',
  availableDate: '가용일',
  averageTransitDays: '평균 운송일',
  experienceCount: '등록 경험 횟수',
  regularRoute: '정기 노선',
  directRoute: '직항 노선',
  generalContainer: '일반 컨테이너',
  refrigerated: '냉장·냉동',
  dangerous: '위험물',
  heavyCargo: '중량 화물',
  specialCargo: '특수 화물',
};

const cardDetailKeys = [
  'transport',
  'requestWeight',
  'availableCapacity',
  'desiredDate',
  'availableDate',
];

const busyMessages: Record<
  Exclude<BusyAction, ''>,
  string
> = {
  generate:
    '무역 통계를 조회하고 맞춤 분석을 작성하고 있습니다. 자료량에 따라 시간이 걸릴 수 있습니다.',
  view: '분석 기록을 불러오고 있습니다…',
  delete: '기록을 삭제하고 있습니다…',
  prepare: '현재 업무 조건을 확인하고 있습니다…',
};

function validCondition(
  condition: Condition,
  options: Options,
): boolean {
  return Boolean(
    condition.hsCode
    && /^[0-9]{10}$/.test(condition.hsCode)
    && (
      condition.direction === 'EXPORT'
      || condition.direction === 'IMPORT'
    )
    && options.countries.some(
      country => country.id === condition.countryId,
    ),
  );
}

function detailText(
  key: string,
  value: string | number | boolean,
  details: Condition['details'],
): string {
  if (
    key === 'requestWeight'
    || key === 'availableCapacity'
  ) {
    const amount = typeof value === 'number'
      ? new Intl.NumberFormat('ko-KR', {
          maximumFractionDigits: 20,
        }).format(value)
      : String(value);

    return details[`${key}Unit`] === 't'
      ? `${amount} t`
      : `${amount} (단위 미확인)`;
  }

  if (key === 'averageTransitDays') {
    return `${value}일`;
  }

  if (typeof value === 'boolean') {
    return value ? '예' : '아니요';
  }

  if (key === 'transport') {
    if (value === 'SEA') return '해상';
    if (value === 'AIR') return '항공';
  }

  return String(value);
}

function monthNumber(value: string): number {
  const [year, month] = value.split('-').map(Number);

  return year * 12 + month - 1;
}

function validateFilters(
  filters: Filters,
  options: Options,
): string | null {
  if (
    filters.countryIds.length < 1
    || filters.countryIds.length > 3
  ) {
    return '국가를 1~3개 선택해 주세요.';
  }

  if (
    new Set(filters.countryIds).size
      !== filters.countryIds.length
    || filters.countryIds.some(id =>
      !options.countries.some(
        country => country.id === id,
      ),
    )
  ) {
    return '국가 선택값을 확인해 주세요.';
  }

  if (!/^[0-9]{10}$/.test(filters.hsCode)) {
    return '검색 결과에서 HS 코드 10자리 품목을 선택해 주세요.';
  }

  if (
    filters.direction !== 'EXPORT'
    && filters.direction !== 'IMPORT'
  ) {
    return '수출 또는 수입을 선택해 주세요.';
  }

  if (
    !/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(filters.start)
    || !/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(filters.end)
  ) {
    return '시작·종료 월을 확인해 주세요.';
  }

  const months =
    monthNumber(filters.end)
    - monthNumber(filters.start)
    + 1;

  const minMonth = options.minMonth || '2000-01';

  if (
    months < 1
    || months > 60
    || filters.start < minMonth
    || !options.maxMonth
    || filters.end > options.maxMonth
  ) {
    return `${minMonth}부터 ${options.maxMonth || '최신 자료 월'}까지의 범위에서 최대 60개월을 선택해 주세요.`;
  }

  if (!options.objectives.includes(filters.objective)) {
    return '분석 목표를 선택해 주세요.';
  }

  if (filters.conditionId != null) {
    const condition = options.conditions.find(
      item => item.id === filters.conditionId,
    );

    if (
      !condition
      || !validCondition(condition, options)
    ) {
      return '선택한 업무를 사용할 수 없습니다. 업무를 다시 선택해 주세요.';
    }

    if (
      filters.countryIds.length !== 1
      || filters.countryIds[0] !== condition.countryId
      || filters.hsCode !== condition.hsCode
      || filters.direction !== condition.direction
    ) {
      return '선택한 업무와 분석 조건이 다릅니다. 업무를 다시 선택하거나 직접 조건으로 분석해 주세요.';
    }
  }

  return null;
}

export default function Insights({
  user,
}: InsightsProps) {
  if (!user) {
    return (
      <main className="personalized-insights">
        <h1>맞춤 인사이트</h1>

        <div className="pi-panel">
          로그인 후 이용해 주세요.
        </div>
      </main>
    );
  }

  if (
    user.role === 'admin'
    || user.role === 'ROLE_ADMIN'
  ) {
    return (
      <main className="personalized-insights">
        <h1>맞춤 인사이트</h1>

        <div className="pi-panel">
          수출입기업·물류업체 회원을 위한 기능입니다.
        </div>
      </main>
    );
  }

  if (!user.memberId) {
    return (
      <main className="personalized-insights">
        <h1>맞춤 인사이트</h1>

        <div className="pi-panel">
          회원 정보를 확인할 수 없습니다.
          다시 로그인해 주세요.
        </div>
      </main>
    );
  }

  return <Workspace key={user.memberId} />;
}

function Workspace() {
  const [options, setOptions] =
    useState<Options | null>(null);

  const [filters, setFilters] =
    useState<Filters>(EMPTY_FILTERS);

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [display, setDisplay] =
    useState<DisplayResult | null>(null);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<BusyAction>('');

  const [optionReload, setOptionReload] = useState(0);
  const [historyReload, setHistoryReload] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const actionRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  // [1] 로그인 회원의 업무 목록과 분석 선택지 조회
  useEffect(() => {
    const controller = new AbortController();

    setError('');

    getInsightOptions(controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;

        setOptions(data);

        setFilters({
          ...EMPTY_FILTERS,
          countryIds: [],
          start: data.start,
          end: data.end,
          objective: data.objectives[0] ?? '',
        });

        setQuery('');
        setItems([]);
        setDisplay(null);
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(error));
        }
      });

    return () => controller.abort();
  }, [optionReload]);

  useEffect(() => {
    return () => actionRef.current?.abort();
  }, []);

  // [2] 품목 검색
  useEffect(() => {
    setItems([]);
    setSearchDone(false);
    setSearchError('');

    if (query.trim().length < 2 || filters.hsCode) {
      setSearching(false);
      return;
    }

    const controller = new AbortController();

    setSearching(true);

    const timer = window.setTimeout(() => {
      searchInsightItems(
        query.trim(),
        controller.signal,
      )
        .then(data => {
          if (controller.signal.aborted) return;

          setItems(data);
          setSearchDone(true);
        })
        .catch(error => {
          if (!controller.signal.aborted) {
            setSearchError(getErrorMessage(error));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setSearching(false);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, filters.hsCode]);

  // 분석 결과 또는 과거 기록을 표시하면 결과 위치로 이동
  useEffect(() => {
    if (!display) return;

    resultRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [display]);

  function change(patch: Partial<Filters>) {
    const conditionCleared =
      filters.conditionId != null
      && patch.conditionId === null;

    setFilters(current => ({
      ...current,
      ...patch,
    }));

    setDisplay(null);
    setError('');

    setNotice(
      conditionCleared
        ? '업무 선택이 해제되었습니다. 현재 입력된 조건으로 시장을 분석하며, 등록 업무의 물량·일정·화물 특성은 반영하지 않습니다.'
        : '',
    );
  }

  // 등록 업무 선택 → 국가·품목·방향 자동 입력
  function selectCondition(value: string) {
    if (!options || busy || actionRef.current) return;

    const condition = options.conditions.find(
      item => String(item.id) === value,
    );

    if (!condition) {
      change({ conditionId: null });
      return;
    }

    if (
      !validCondition(condition, options)
      || !condition.hsCode
      || !condition.direction
    ) {
      setError(
        '업무의 국가·품목·방향을 확인할 수 없습니다. 등록 정보를 확인하거나 직접 조건으로 분석해 주세요.',
      );
      return;
    }

    change({
      conditionId: condition.id,
      countryIds: [condition.countryId],
      hsCode: condition.hsCode,
      direction: condition.direction,
    });

    setQuery(condition.hsCode);
    setItems([]);
    setSearchDone(false);
    setSearchError('');
  }

  function startAction(
    type: Exclude<BusyAction, ''>,
  ): AbortController {
    const controller = new AbortController();

    actionRef.current = controller;

    setBusy(type);
    setError('');
    setNotice('');

    return controller;
  }

  function finishAction(controller: AbortController) {
    if (actionRef.current === controller) {
      actionRef.current = null;
      setBusy('');
    }
  }

  // [3] 분석 생성 및 서버의 저장 결과 확인
  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!options || busy || actionRef.current) return;

    const validation = validateFilters(
      filters,
      options,
    );

    if (validation) {
      setError(validation);
      return;
    }

    const controller = startAction('generate');

    setDisplay(null);
    setShowHistory(false);

    try {
      const response = await generateInsights(
        {
          ...filters,
          countryIds: [...filters.countryIds],
        },
        controller.signal,
      );

      if (controller.signal.aborted) return;

      setDisplay({
        historyId: response.historyId,
        result: response.result,
        history: null,
      });

      setNotice(
        response.saveMessage
        || (
          response.saved
            ? '분석 조건과 결과를 저장했습니다.'
            : '분석 결과는 생성되었지만 기록을 저장하지 못했습니다.'
        ),
      );

      if (response.saved) {
        setHistoryReload(value => value + 1);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(getErrorMessage(error));
      }
    } finally {
      finishAction(controller);
    }
  }

  // [4] 저장된 결과 조회
  async function openHistory(id: number) {
    if (busy || actionRef.current) return;

    const controller = startAction('view');

    try {
      const detail = await getInsightHistoryDetail(
        id,
        controller.signal,
      );

      if (controller.signal.aborted) return;

      setDisplay({
        historyId: detail.id,
        result: detail.result,
        history: detail,
      });

      setShowHistory(false);

      setNotice(
        '저장된 당시 결과입니다. 현재 입력 중인 조건과 다를 수 있습니다.',
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(getErrorMessage(error));
      }
    } finally {
      finishAction(controller);
    }
  }

  // [5] 기록 삭제
  async function removeHistory(id: number) {
    if (busy || actionRef.current) return;

    if (!window.confirm('이 분석 기록을 삭제할까요?')) {
      return;
    }

    const controller = startAction('delete');

    try {
      const deleted = await deleteInsightHistory(
        id,
        controller.signal,
      );

      if (controller.signal.aborted) return;

      if (!deleted) {
        throw new Error('기록이 삭제되지 않았습니다.');
      }

      if (display?.historyId === id) {
        setDisplay(null);
      }

      setNotice('분석 기록을 삭제했습니다.');
      setHistoryReload(value => value + 1);
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(getErrorMessage(error));
      }
    } finally {
      finishAction(controller);
    }
  }

  // [6] 과거 조건을 불러와 새 분석 준비
  async function prepareReanalysis(
    detail: HistoryDetail,
  ) {
    if (busy || actionRef.current) return;

    const controller = startAction('prepare');

    try {
      const currentOptions = await getInsightOptions(
        controller.signal,
      );

      if (controller.signal.aborted) return;

      const previous = detail.condition.filters;

      const next: Filters = {
        ...previous,
        countryIds: previous.countryIds.filter(id =>
          currentOptions.countries.some(
            country => country.id === id,
          ),
        ),
        objective: currentOptions.objectives.includes(
          previous.objective,
        )
          ? previous.objective
          : currentOptions.objectives[0] ?? '',
        conditionId: null,
      };

      let message =
        '과거 분석 조건을 불러왔습니다. 조건과 기간을 확인한 뒤 분석 버튼을 누르세요.';

      if (previous.conditionId != null) {
        const sameMemberType =
          detail.condition.memberType
          === currentOptions.memberType;

        const currentCondition = sameMemberType
          ? currentOptions.conditions.find(
              item => item.id === previous.conditionId,
            )
          : undefined;

        if (
          currentCondition
          && validCondition(
            currentCondition,
            currentOptions,
          )
          && currentCondition.hsCode
          && currentCondition.direction
        ) {
          next.conditionId = currentCondition.id;
          next.countryIds = [currentCondition.countryId];
          next.hsCode = currentCondition.hsCode;
          next.direction = currentCondition.direction;

          message =
            '업무 조건은 현재 DB의 값으로 불러왔습니다. 과거와 다를 수 있으므로 물량·일정을 확인한 뒤 분석해 주세요.';
        } else {
          message =
            '이전 업무를 현재 사용할 수 없어 직접 조건으로 불러왔습니다. 국가·품목·기간을 확인해 주세요.';
        }
      }

      setOptions(currentOptions);
      setFilters(next);

      setQuery(next.hsCode);
      setItems([]);
      setSearchDone(false);
      setSearchError('');

      setDisplay(null);
      setShowHistory(false);
      setNotice(message);

      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(getErrorMessage(error));
      }
    } finally {
      finishAction(controller);
    }
  }

  const selectedCondition = options?.conditions.find(
    item => item.id === filters.conditionId,
  );

  // 현재 입력 중인 업무가 아니라 분석 당시 업무를 사용
  const resultBusinessConditions =
    display?.result.businessConditions
    ?? display?.history?.condition.businessConditions
    ?? [];

  return (
    <main className="personalized-insights">
      <header className="pi-page-header">
        <p className="pi-eyebrow">
          Personalized insights
        </p>

        <div className="pi-section-title">
          <h1>내 업무 맞춤 인사이트</h1>

          <button
            type="button"
            disabled={!options}
            aria-expanded={showHistory}
            aria-controls="insight-history"
            onClick={() =>
              setShowHistory(value => !value)
            }
          >
            분석 기록 {showHistory ? '닫기' : '보기'}
          </button>
        </div>

        <p>
          등록한 업무와 무역 통계를 함께 살펴보고,
          내 업무에 필요한 다음 행동을 확인하세요.
        </p>
      </header>

      {error && (
        <p className="pi-alert" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="pi-notice" role="status">
          {notice}
        </p>
      )}

      {!options ? (
        <section className="pi-panel">
          <p role="status">
            {error
              ? '초기 정보를 불러오지 못했습니다.'
              : '회원 유형과 업무 정보를 확인하고 있습니다…'}
          </p>

          {error && (
            <button
              type="button"
              onClick={() =>
                setOptionReload(value => value + 1)
              }
            >
              다시 불러오기
            </button>
          )}
        </section>
      ) : (
        <>
          <div
            id="insight-history"
            hidden={!showHistory}
          >
            {showHistory && (
              <HistoryList
                reload={historyReload}
                disabled={Boolean(busy)}
                onView={openHistory}
                onDelete={removeHistory}
              />
            )}
          </div>

          <form
            ref={formRef}
            className="pi-panel pi-form"
            onSubmit={submit}
          >
            <div className="pi-section-title">
              <div>
                <h2>분석할 업무 선택</h2>

                <p className="pi-muted">
                  등록한 업무를 선택하면 국가·품목·방향을
                  자동으로 불러옵니다.
                </p>
              </div>

              <span className="pi-badge">
                {options.memberType === 'SHIPPER'
                  ? '수출입기업'
                  : '물류운송업체'}
              </span>
            </div>

            <fieldset disabled={Boolean(busy)}>
              <legend className="pi-sr-only">
                업무 선택과 분석 조건 설정
              </legend>

              <section
                className="pi-business-picker"
                aria-label="내 업무 선택"
              >
                <p className="pi-eyebrow">
                  01 · 내 업무
                </p>

                <h3>
                  {options.memberType === 'SHIPPER'
                    ? '어떤 운송 요청을 분석할까요?'
                    : '어떤 운송 노선을 분석할까요?'}
                </h3>

                <div className="pi-business-cards">
                  {options.conditions.map(condition => {
                    const valid = validCondition(
                      condition,
                      options,
                    );

                    const selected =
                      filters.conditionId === condition.id;

                    const summary = Object.entries(
                      condition.details,
                    )
                      .filter(([key]) =>
                        cardDetailKeys.includes(key),
                      )
                      .map(([key, value]) =>
                        `${detailLabels[key]} ${
                          detailText(
                            key,
                            value,
                            condition.details,
                          )
                        }`,
                      )
                      .join(' · ');

                    return (
                      <button
                        type="button"
                        key={condition.id}
                        className="pi-business-card"
                        aria-pressed={selected}
                        disabled={!valid}
                        onClick={() =>
                          selectCondition(
                            String(condition.id),
                          )
                        }
                      >
                        <strong>
                          {condition.label}
                        </strong>

                        {summary && (
                          <span>{summary}</span>
                        )}

                        {selected && (
                          <small>분석할 업무로 선택됨</small>
                        )}

                        {!valid && (
                          <small>
                            국가·품목·방향 정보 확인 필요
                          </small>
                        )}
                      </button>
                    );
                  })}
                </div>

                {options.conditions.length === 0 && (
                  <p className="pi-notice">
                    등록한 업무가 없습니다.
                    매칭 조건을 등록하거나 직접 조건으로
                    시장을 분석해 보세요.
                  </p>
                )}

                {selectedCondition ? (
                  <>
                    <button
                      type="button"
                      onClick={() => selectCondition('')}
                    >
                      업무 선택 해제
                    </button>

                    <p className="pi-muted">
                      선택한 업무의 물량·일정·화물 특성을 분석에 반영합니다.
                      국가·품목·방향을 변경하면 업무 선택이 해제됩니다.
                      분석 기간과 목표를 변경하면 선택은 유지됩니다.
                    </p>
                  </>
                ) : (
                  <p className="pi-muted">
                    등록 업무를 선택하거나, 아래에서 분석 조건을 직접 입력하세요.
                    업무를 선택하지 않으면 등록 업무의 물량·일정·화물 특성은
                    분석에 반영되지 않습니다.
                  </p>
                )}

                {selectedCondition && (
                  <details
                    className="pi-condition-details"
                    open
                  >
                    <summary>
                      선택한 업무 정보
                    </summary>

                    <dl className="pi-detail">
                      <div>
                        <dt>국가</dt>

                        <dd>
                          {options.countries.find(
                            country =>
                              country.id
                              === selectedCondition.countryId,
                          )?.name ?? '미확인'}
                        </dd>
                      </div>

                      <div>
                        <dt>HS 코드</dt>

                        <dd>
                          {selectedCondition.hsCode
                            || '미확인'}
                        </dd>
                      </div>

                      <div>
                        <dt>거래 방향</dt>

                        <dd>
                          {selectedCondition.direction
                            === 'EXPORT'
                            ? '수출'
                            : selectedCondition.direction
                                === 'IMPORT'
                              ? '수입'
                              : '미확인'}
                        </dd>
                      </div>

                      {Object.entries(
                        selectedCondition.details,
                      )
                        .filter(([key]) =>
                          !key.endsWith('Unit'),
                        )
                        .map(([key, value]) => (
                          <div key={key}>
                            <dt>
                              {detailLabels[key] ?? key}
                            </dt>

                            <dd>
                              {detailText(
                                key,
                                value,
                                selectedCondition.details,
                              )}
                            </dd>
                          </div>
                        ))}
                    </dl>

                    <p className="pi-muted">
                      등록된 물량과 일정이 현재도 유효한지
                      확인해 주세요.
                      분석 기간과 목표를 바꿔도 업무 선택은 유지됩니다.
                    </p>
                  </details>
                )}
              </section>

              <p className="pi-eyebrow">
                02 · 분석 범위와 목표
              </p>

              <div className="pi-fields">
                <label>
                  분석 목표

                  <select
                    value={filters.objective}
                    onChange={event =>
                      change({
                        objective: event.target.value,
                      })
                    }
                  >
                    {options.objectives.map(objective => (
                      <option
                        key={objective}
                        value={objective}
                      >
                        {objectiveLabels[objective]
                          ?? objective}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="pi-country-section">
                <p className="pi-label">
                  분석 국가 · 최대 3개
                </p>

                <div className="pi-countries">
                  {filters.countryIds.map(id => {
                    const country = options.countries.find(
                      item => item.id === id,
                    );

                    return (
                      <button
                        key={id}
                        type="button"
                        aria-label={`${country?.name ?? id} 제외`}
                        onClick={() =>
                          change({
                            countryIds:
                              filters.countryIds.filter(
                                value => value !== id,
                              ),
                            conditionId: null,
                          })
                        }
                      >
                        {country?.name ?? id} ×
                      </button>
                    );
                  })}

                  <select
                    aria-label="분석 국가 추가"
                    value=""
                    disabled={
                      filters.countryIds.length >= 3
                    }
                    onChange={event => {
                      if (!event.target.value) return;

                      const id = Number(
                        event.target.value,
                      );

                      if (
                        filters.countryIds.includes(id)
                        || filters.countryIds.length >= 3
                      ) {
                        return;
                      }

                      change({
                        countryIds: [
                          ...filters.countryIds,
                          id,
                        ],
                        conditionId: null,
                      });
                    }}
                  >
                    <option value="">
                      국가 선택
                    </option>

                    {options.countries
                      .filter(country =>
                        !filters.countryIds.includes(
                          country.id,
                        ),
                      )
                      .map(country => (
                        <option
                          key={country.id}
                          value={country.id}
                        >
                          {country.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <label>
                품목 · HS 코드 10자리

                <input
                  value={query}
                  maxLength={80}
                  autoComplete="off"
                  placeholder="품목명 또는 HS 코드 2자 이상 입력"
                  onChange={event => {
                    setQuery(event.target.value);
                    setItems([]);
                    setSearchDone(false);

                    change({
                      hsCode: '',
                      conditionId: null,
                    });
                  }}
                />
              </label>

              {searching && (
                <p
                  className="pi-muted"
                  role="status"
                >
                  품목 검색 중…
                </p>
              )}

              {searchError && (
                <p
                  className="pi-alert"
                  role="alert"
                >
                  {searchError}
                </p>
              )}

              {items.length > 0 && (
                <ul className="pi-search-results">
                  {items.map(item => (
                    <li key={item.code}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(
                            `${item.name} · ${item.code}`,
                          );

                          setItems([]);

                          change({
                            hsCode: item.code,
                            conditionId: null,
                          });
                        }}
                      >
                        {item.name}
                        <small>{item.code}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {searchDone
                && !searching
                && !searchError
                && !filters.hsCode
                && items.length === 0 && (
                  <p className="pi-muted">
                    검색 결과가 없습니다.
                    다른 품목명이나 코드를 입력해 주세요.
                  </p>
                )}

              {filters.hsCode && (
                <p className="pi-muted">
                  선택 HS 코드: {filters.hsCode}
                </p>
              )}

              <div className="pi-fields pi-fields-three">
                <label>
                  거래 방향 · 한국 기준

                  <select
                    value={filters.direction}
                    onChange={event =>
                      change({
                        direction: event.target.value as Filters['direction'],
                        conditionId: null,
                      })
                    }
                  >
                    <option value="EXPORT">
                      수출
                    </option>

                    <option value="IMPORT">
                      수입
                    </option>
                  </select>
                </label>

                <label>
                  시작 월

                  <input
                    type="month"
                    required
                    min={options.minMonth || '2000-01'}
                    max={
                      filters.end
                      || options.maxMonth
                      || undefined
                    }
                    value={filters.start}
                    onChange={event =>
                      change({
                        start: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  종료 월

                  <input
                    type="month"
                    required
                    min={
                      filters.start
                      || options.minMonth
                      || '2000-01'
                    }
                    max={
                      options.maxMonth || undefined
                    }
                    value={filters.end}
                    onChange={event =>
                      change({
                        end: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <p className="pi-muted">
                최대 60개월을 분석할 수 있습니다.
                {' '}
                최신 자료: {options.maxMonth || '자료 없음'}
              </p>

              {!options.maxMonth && (
                <p
                  className="pi-alert"
                  role="status"
                >
                  분석 가능한 통계 기간을 확인할 수 없습니다.
                  현재는 분석을 실행할 수 없습니다.
                </p>
              )}

              <div className="pi-form-footer">
                <p className="pi-muted">
                  분석 실행 후 사용한 조건과 결과를 함께 저장합니다.
                  저장 여부는 완료 메시지에서 확인할 수 있습니다.
                </p>

                <button
                  className="pi-primary"
                  type="submit"
                  disabled={
                    Boolean(busy)
                    || !options.maxMonth
                    || !filters.hsCode
                    || filters.countryIds.length === 0
                    || !filters.objective
                  }
                >
                  {busy === 'generate'
                    ? '분석 중…'
                    : selectedCondition
                      ? '이 업무로 분석하기'
                      : '선택 조건으로 분석하기'}
                </button>
              </div>
            </fieldset>
          </form>

          {busy && (
            <p
              className="pi-panel"
              role="status"
              aria-live="polite"
            >
              {busyMessages[busy]}
            </p>
          )}

          <div ref={resultRef}>
            {display ? (
              <>
                <div className="pi-record-heading">
                  <span className="pi-badge">
                    {display.history
                      ? `과거 기록 #${display.historyId}`
                      : display.historyId != null
                        ? `새 분석 · 기록 #${display.historyId}`
                        : '새 분석 · 저장되지 않음'}
                  </span>

                  {display.history && (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => {
                        if (display.history) {
                          void prepareReanalysis(
                            display.history,
                          );
                        }
                      }}
                    >
                      이 조건으로 다시 분석 준비
                    </button>
                  )}
                </div>

                {!display.history
                  && display.historyId == null && (
                    <p
                      className="pi-alert"
                      role="status"
                    >
                      분석 결과는 생성되었지만 기록은 저장되지
                      않았습니다. 새로고침하거나 조건을 변경하기
                      전에 필요한 결과를 복사해 주세요.
                    </p>
                  )}

                <InsightSet
                  result={display.result}
                  businessConditions={
                    resultBusinessConditions
                  }
                />
              </>
            ) : (
              !busy && (
                <section className="pi-panel pi-empty">
                  <h2>
                    내 업무를 선택하고 분석을 시작하세요
                  </h2>

                  <p>
                    등록한 업무와 시장 통계를 함께 분석합니다.
                    이전 결과는 상단의 ‘분석 기록 보기’에서
                    확인할 수 있습니다.
                  </p>
                </section>
              )
            )}
          </div>
        </>
      )}
    </main>
  );
}

interface HistoryListProps {
  reload: number;
  disabled: boolean;
  onView: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

// 기록을 펼쳤을 때 목록 조회
function HistoryList({
  reload,
  disabled,
  onView,
  onDelete,
}: HistoryListProps) {
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);

  const [data, setData] =
    useState<HistoryPage | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError('');

    getInsightHistory(page, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;

        if (
          page > 0
          && page >= result.totalPages
        ) {
          setPage(
            Math.max(0, result.totalPages - 1),
          );
          return;
        }

        setData(result);
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [page, refresh, reload]);

  return (
    <section className="pi-panel">
      <div className="pi-section-title">
        <div>
          <h2>분석 기록</h2>

          <p className="pi-muted">
            저장한 조건과 분석 결과를 다시 확인할 수 있습니다.
            기록을 조회할 때는 새 분석을 실행하지 않습니다.
          </p>
        </div>

        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => {
            setPage(0);
            setRefresh(value => value + 1);
          }}
        >
          기록 새로고침
        </button>
      </div>

      {error && (
        <p
          className="pi-alert"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p role="status">
          기록을 불러오는 중…
        </p>
      ) : data ? (
        <>
          {data.items.length === 0 ? (
            <p className="pi-muted">
              저장된 분석 기록이 없습니다.
            </p>
          ) : (
            <div className="pi-table-wrap">
              <table className="pi-history-table">
                <caption className="pi-sr-only">
                  본인의 분석 기록 목록
                </caption>

                <thead>
                  <tr>
                    <th scope="col">생성 시각</th>
                    <th scope="col">품목</th>
                    <th scope="col">방향</th>
                    <th scope="col">기간</th>
                    <th scope="col">상태</th>
                    <th scope="col">관리</th>
                  </tr>
                </thead>

                <tbody>
                  {data.items.map(item => (
                    <tr key={item.id}>
                      <td>
                        {formatDate(item.createdAt)}
                      </td>

                      <td>
                        <strong>
                          {item.itemName}
                        </strong>

                        <small>
                          {item.hsCode}
                        </small>
                      </td>

                      <td>
                        {item.direction === 'EXPORT'
                          ? '수출'
                          : '수입'}
                      </td>

                      <td>
                        {item.start} ~ {item.end}
                      </td>

                      <td>
                        <span className="pi-badge">
                          {historyStatusLabels[item.status]
                            ?? item.status}
                        </span>
                      </td>

                      <td>
                        <div className="pi-actions">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              void onView(item.id)
                            }
                          >
                            보기
                          </button>

                          <button
                            type="button"
                            className="pi-danger"
                            disabled={disabled}
                            onClick={() =>
                              void onDelete(item.id)
                            }
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pi-pagination">
            <span className="pi-muted">
              총 {data.totalElements}개
              {' · '}
              {data.totalPages === 0
                ? 0
                : data.page + 1}
              /{data.totalPages}페이지
            </span>

            <div className="pi-actions">
              <button
                type="button"
                disabled={disabled || page === 0}
                onClick={() =>
                  setPage(value => value - 1)
                }
              >
                이전
              </button>

              <button
                type="button"
                disabled={
                  disabled
                  || page + 1 >= data.totalPages
                }
                onClick={() =>
                  setPage(value => value + 1)
                }
              >
                다음
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}