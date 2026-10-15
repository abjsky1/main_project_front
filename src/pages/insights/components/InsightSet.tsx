import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  detailLabels,
  detailText,
  formatDate,
  formatNumber,
  objectiveLabels,
} from '../insightsData';

import type {
  Condition,
  InsightResult,
  Metric,
} from '../insightsData';

interface InsightSetProps {
  result: InsightResult;
  businessConditions?: Condition[];
}

const priorityLabels = {
  high: '우선 확인',
  medium: '후속 검토',
  low: '참고',
};

function metricText(metric: Metric): string {
  const unit = metric.value == null
    ? ''
    : ` ${metric.unit}`;

  return `${metric.country} · ${metric.name}: ${
    formatNumber(metric.value)
  }${unit}`;
}

export default function InsightSet({
  result,
  businessConditions = [],
}: InsightSetProps) {
  const narrative = result.narrative;

  const warnings = [
    ...new Set([
      ...result.limitations,
      ...narrative.limitations,
    ]),
  ];

  const selectedTrends = result.aiStatus === 'ready'
    ? result.trends.filter(trend =>
        narrative.relatedTrends.some(
          item => item.trendId === trend.id,
        ),
      )
    : result.trends;

  function evidence(ids: string[]): string {
    return ids
      .map(id => {
        const metric = result.metrics.find(
          item => item.id === id,
        );

        if (metric) {
          return metricText(metric);
        }

        return result.trends.find(
          item => item.id === id,
        )?.title ?? '';
      })
      .filter(Boolean)
      .join(' / ');
  }

  function conditionEvidence(ids: string[]): string {
    return ids
      .map(id =>
        businessConditions.find(
          condition => String(condition.id) === id,
        )?.label,
      )
      .filter(Boolean)
      .join(' / ');
  }

  return (
    <section
      className="pi-results"
      aria-label="분석 결과"
    >
      <div className="pi-result-heading">
        <div>
          <p className="pi-eyebrow">분석 결과</p>

          <h2>{result.itemName}</h2>

          <p>
            {result.filters.hsCode}
            {' · '}
            {result.filters.direction === 'EXPORT'
              ? '수출'
              : '수입'}
            {' · '}
            {objectiveLabels[result.filters.objective]
              ?? result.filters.objective}
          </p>

          <p className="pi-muted">
            {result.series
              .map(series => series.country)
              .join(' · ')}
          </p>
        </div>

        <div>
          <p>
            {result.filters.start} ~ {result.filters.end}
          </p>

          <p className="pi-muted">
            생성: {formatDate(result.generatedAt)}
          </p>
        </div>
      </div>

      {result.aiStatus === 'unavailable' && (
        <p className="pi-alert" role="status">
          실제 통계는 조회했지만 AI 해석을 제공하지 못했습니다.
        </p>
      )}

      {result.aiStatus === 'not_requested' && (
        <p className="pi-alert" role="status">
          선택 조건의 통계 자료가 없어 AI 분석을 요청하지 않았습니다.
        </p>
      )}

      <section className="pi-panel pi-summary">
        <p className="pi-eyebrow">핵심 결론</p>
        <h3>이번 분석의 핵심</h3>

        <p>{narrative.finalSummary.currentSituation}</p>
        <p>{narrative.finalSummary.meaningForYou}</p>

        {narrative.finalSummary.nextActionIds.map(id => {
          const action = narrative.recommendations.find(
            item => item.id === id,
          );

          return action ? (
            <p
              className="pi-summary-action"
              key={id}
            >
              먼저 할 일 · {action.action}
            </p>
          ) : null;
        })}

        {narrative.finalSummary.caution && (
          <small>
            {narrative.finalSummary.caution}
          </small>
        )}
      </section>

      <details className="pi-panel">
        <summary>분석에 반영한 내 업무</summary>

        {businessConditions.length > 0 ? (
          businessConditions.map(condition => (
            <div key={condition.id}>
              <h4>{condition.label}</h4>

              <dl className="pi-detail">
                {Object.entries(condition.details)
                  .filter(([key]) => !key.endsWith('Unit'))
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{detailLabels[key] ?? key}</dt>

                      <dd>
                        {detailText(
                          key,
                          value,
                          condition.details,
                        )}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          ))
        ) : (
          <p className="pi-muted">
            {result.filters.conditionId == null
              ? '직접 선택한 시장 조건으로 분석했습니다.'
              : '이 기록에는 화면에 표시할 업무 상세 정보가 없습니다.'}
          </p>
        )}
      </details>

      <div className="pi-personal-grid">
        <section className="pi-panel">
          <p className="pi-eyebrow">내 업무에 미치는 영향</p>
          <h3>나에게 중요한 변화</h3>

          {narrative.personalAnalysis.length === 0 && (
            <p className="pi-muted">
              표시할 개인화 분석이 없습니다.
              데이터 범위와 안내를 확인해 주세요.
            </p>
          )}

          {narrative.personalAnalysis.map(analysis => {
            const conditionText = conditionEvidence(
              analysis.conditionIds,
            );

            const metricEvidence = evidence(
              analysis.metricIds,
            );

            return (
              <article
                className="pi-entry"
                key={analysis.id}
              >
                <h4>
                  {analysis.title}
                  {' '}

                  {analysis.interpretationType === 'hypothesis' && (
                    <span className="pi-badge">
                      추정
                    </span>
                  )}
                </h4>

                <p>{analysis.finding}</p>

                <p className="pi-personal">
                  {analysis.whyItMattersToYou}
                </p>

                {metricEvidence && (
                  <small>
                    근거: {metricEvidence}
                  </small>
                )}

                {conditionText && (
                  <small className="pi-condition-evidence">
                    반영 업무: {conditionText}
                  </small>
                )}
              </article>
            );
          })}
        </section>

        <section className="pi-panel">
          <p className="pi-eyebrow">다음 단계</p>
          <h3>추천 행동</h3>

          {narrative.recommendations.length === 0 && (
            <p className="pi-muted">
              현재 표시할 추천 행동이 없습니다.
            </p>
          )}

          {narrative.recommendations.map(action => {
            const conditionText = conditionEvidence(
              action.conditionIds,
            );

            const actionEvidence = evidence(
              action.evidenceIds,
            );

            return (
              <article
                className="pi-entry"
                key={action.id}
              >
                <span className="pi-badge">
                  {priorityLabels[action.priority]}
                </span>

                <h4>{action.action}</h4>
                <p>{action.reasonForYou}</p>

                {action.checksBeforeAction.length > 0 && (
                  <ul>
                    {action.checksBeforeAction.map(
                      (check, index) => (
                        <li key={index}>{check}</li>
                      ),
                    )}
                  </ul>
                )}

                {actionEvidence && (
                  <small>
                    근거: {actionEvidence}
                  </small>
                )}

                {conditionText && (
                  <small className="pi-condition-evidence">
                    반영 업무: {conditionText}
                  </small>
                )}
              </article>
            );
          })}
        </section>
      </div>

      <div className="pi-layout">
        <div className="pi-left">
          {result.series.length === 0 && (
            <section className="pi-panel pi-empty">
              표시할 시장 통계가 없습니다.
            </section>
          )}

          {result.series.map(series => (
            <section
              className="pi-panel"
              key={series.country}
            >
              <div className="pi-section-title">
                <h3>{series.country} · 시장 지표</h3>

                <span className="pi-muted">
                  {series.observedMonths}
                  /{series.expectedMonths}개월 확인
                </span>
              </div>

              <div className="pi-metrics">
                {result.metrics
                  .filter(metric =>
                    metric.country === series.country,
                  )
                  .map(metric => (
                    <div
                      className="pi-metric"
                      key={metric.id}
                    >
                      <p>{metric.name}</p>

                      <strong>
                        {formatNumber(metric.value)}
                      </strong>

                      <span>
                        {metric.value == null
                          ? ''
                          : metric.unit}
                      </span>

                      <small className="pi-condition-evidence">
                        {metric.period}
                        {' · '}
                        {metric.completeness === 'complete'
                          ? '기간 자료 확인'
                          : metric.completeness === 'partial'
                            ? '일부 자료'
                            : '자료 부족'}
                      </small>

                      <small className="pi-condition-evidence">
                        출처: {metric.source}
                      </small>
                    </div>
                  ))}
              </div>

              <p className="pi-muted">
                월별 수출입 · USD.
                자료가 없는 구간은 연결하지 않습니다.
              </p>

              {series.observedMonths > 0 ? (
                <div
                  className="pi-chart"
                  role="group"
                  aria-label={`${series.country} 월별 수출입 그래프. 아래 표에서 수치를 확인할 수 있습니다.`}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={series.points}
                      margin={{
                        top: 12,
                        right: 18,
                        bottom: 8,
                        left: 10,
                      }}
                    >
                      <CartesianGrid
                        stroke="#e2e7ef"
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11 }}
                        minTickGap={28}
                      />

                      <YAxis
                        width={80}
                        tick={{ fontSize: 11 }}
                        tickFormatter={value =>
                          new Intl.NumberFormat('ko-KR', {
                            notation: 'compact',
                          }).format(Number(value))
                        }
                      />

                      <Tooltip
                        formatter={(value: unknown) =>
                          `${formatNumber(
                            value == null
                              ? null
                              : Number(value),
                          )} USD`
                        }
                      />

                      <Legend />

                      <Line
                        type="linear"
                        dataKey="exportAmount"
                        name="수출액"
                        stroke="#6255bd"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls={false}
                      />

                      <Line
                        type="linear"
                        dataKey="importAmount"
                        name="수입액"
                        stroke="#0891b2"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="pi-empty">
                  선택한 기간에 확인된 통계 자료가 없습니다.
                </p>
              )}

              <details>
                <summary>월별 수치 확인</summary>

                <div className="pi-table-wrap">
                  <table>
                    <caption>
                      {series.country} 월별 무역 통계 · USD
                    </caption>

                    <thead>
                      <tr>
                        <th scope="col">월</th>
                        <th scope="col">수출액</th>
                        <th scope="col">수입액</th>
                        <th scope="col">무역수지</th>
                      </tr>
                    </thead>

                    <tbody>
                      {series.points.map(point => (
                        <tr key={point.period}>
                          <th scope="row">
                            {point.period}
                          </th>

                          <td>
                            {formatNumber(point.exportAmount)}
                          </td>

                          <td>
                            {formatNumber(point.importAmount)}
                          </td>

                          <td>
                            {formatNumber(point.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
          ))}
        </div>

        <aside className="pi-right">
          <section className="pi-panel">
            <p className="pi-eyebrow">통계 변화</p>
            <h3>관련 트렌드</h3>

            <p className="pi-muted">
              선택 조건과 관련된 무역 통계 변화입니다.
            </p>

            {selectedTrends.length === 0 && (
              <p className="pi-muted">
                비교 가능한 트렌드가 없습니다.
              </p>
            )}

            {selectedTrends.map(trend => {
              const explanation = narrative.relatedTrends.find(
                item => item.trendId === trend.id,
              );

              return (
                <article
                  className="pi-entry"
                  key={trend.id}
                >
                  <span className="pi-badge">
                    {trend.country}
                  </span>

                  <h4>{trend.title}</h4>
                  <p>{trend.description}</p>

                  {explanation && (
                    <>
                      <p className="pi-personal">
                        {explanation.relevanceToYou}
                      </p>

                      <p>{explanation.implication}</p>

                      <small>{explanation.caveat}</small>
                    </>
                  )}

                  <p className="pi-muted">
                    기준 기간: {trend.period}
                    <br />
                    출처: {trend.source}
                  </p>
                </article>
              );
            })}
          </section>

          <details className="pi-panel">
            <summary>데이터 범위와 해석 한계</summary>

            <ul>
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>

            <p className="pi-muted">
              생성 시각은 원본 통계의 최신 시점과 다를 수 있습니다.
            </p>
          </details>
        </aside>
      </div>
    </section>
  );
}