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
  formatDate,
  formatNumber,
  objectiveLabels,
} from '../insightsData';

import type {
  InsightResult,
  Metric,
} from '../insightsData';

interface InsightSetProps {
  result: InsightResult;
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

  return (
    <section
      className="pi-results"
      aria-label="분석 결과"
    >
      <div className="pi-result-heading">
        <div>
          <p className="pi-eyebrow">
            Personalized insights
          </p>

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

      <div className="pi-layout">
        <div className="pi-left">
          {result.series.map(series => (
            <section
              className="pi-panel"
              key={series.country}
            >
              <div className="pi-section-title">
                <h3>
                  {series.country} · 시장 지표
                </h3>

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
                        stroke="#e7e3ed"
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
                        stroke="#7540d2"
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
                  표시할 월별 자료가 없습니다.
                </p>
              )}

              <details>
                <summary>
                  월별 수치와 출처 확인
                </summary>

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

                <p className="pi-muted">
                  출처: 등록된 무역 CSV.
                  자료 부족은 거래금액 0을 의미하지 않습니다.
                </p>
              </details>
            </section>
          ))}

          <section className="pi-panel">
            <p className="pi-eyebrow">Analysis</p>
            <h3>나에게 중요한 변화</h3>

            {narrative.personalAnalysis.length === 0 && (
              <p className="pi-muted">
                표시할 개인화 분석이 없습니다.
                데이터 범위와 안내를 확인해 주세요.
              </p>
            )}

            {narrative.personalAnalysis.map(analysis => (
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

                <small>
                  근거: {evidence(analysis.metricIds)}
                </small>
              </article>
            ))}
          </section>

          <section className="pi-panel">
            <p className="pi-eyebrow">Next action</p>
            <h3>맞춤 피드백</h3>

            {narrative.recommendations.length === 0 && (
              <p className="pi-muted">
                현재 표시할 추천 행동이 없습니다.
              </p>
            )}

            {narrative.recommendations.map(action => (
              <article
                className="pi-entry"
                key={action.id}
              >
                <span className="pi-badge">
                  {priorityLabels[action.priority]}
                </span>

                <h4>{action.action}</h4>
                <p>{action.reasonForYou}</p>

                <ul>
                  {action.checksBeforeAction.map(
                    (check, index) => (
                      <li key={index}>{check}</li>
                    ),
                  )}
                </ul>

                <small>
                  근거: {evidence(action.evidenceIds)}
                </small>
              </article>
            ))}
          </section>
        </div>

        <aside className="pi-right">
          <section className="pi-panel">
            <p className="pi-eyebrow">
              Related trends
            </p>

            <h3>관련 트렌드</h3>

            <p className="pi-muted">
              선택 조건과 관련된 무역 통계 변화입니다.
            </p>

            {selectedTrends.length === 0 && (
              <p>
                비교 가능한 트렌드가 없습니다.
              </p>
            )}

            {selectedTrends.map(trend => {
              const explanation =
                narrative.relatedTrends.find(
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

                      <small>
                        {explanation.caveat}
                      </small>
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

          <section className="pi-panel pi-summary">
            <p className="pi-eyebrow">Summary</p>
            <h3>최종 요약</h3>

            <p>
              {narrative.finalSummary.currentSituation}
            </p>

            <p>
              {narrative.finalSummary.meaningForYou}
            </p>

            {narrative.finalSummary.nextActionIds.map(id => {
              const action =
                narrative.recommendations.find(
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

            <small>
              {narrative.finalSummary.caution}
            </small>
          </section>

          <details className="pi-panel">
            <summary>
              데이터 범위와 해석 한계
            </summary>

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