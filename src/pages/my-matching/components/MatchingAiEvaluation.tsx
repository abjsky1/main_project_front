import { useEffect, useState } from 'react';
import type { MatchingApiDto } from '../../../api/matchingApi';
import {
  evaluateMatchingAi,
  getCachedMatchingAi,
  type MatchingAiDto,
  type MatchingAiReason
} from '../../../api/matchingAiApi';

interface Props {
  match: MatchingApiDto;
  memberId: string;
  view: 'list' | 'detail';
}

// Java/LLM 평가 항목과 Gemini의 scoreReasons 필드 연결
function makeScoreRows(match: MatchingApiDto, ai: MatchingAiDto) {
  return [
    { label: '노선', java: match.routeScore, llm: ai.routeScore, max: 30, detail: ai.scoreReasons?.route },
    { label: '가용량', java: match.capacityScore, llm: ai.capacityScore, max: 25, detail: ai.scoreReasons?.capacity },
    { label: 'HS CODE', java: match.itemScore, llm: ai.itemScore, max: 20, detail: ai.scoreReasons?.item },
    { label: '일정', java: match.scheduleScore, llm: ai.scheduleScore, max: 15, detail: ai.scoreReasons?.schedule },
    { label: '운송 경험', java: match.experienceScore, llm: ai.experienceScore, max: 10, detail: ai.scoreReasons?.experience }
  ];
}

function ReasonText({ detail }: { detail?: MatchingAiReason }) {
  if (!detail?.calculation && !detail?.reason) return <span>평가 근거 없음</span>;
  return (
    <div className="mm-ai-reason">
      {detail.calculation && <span className="mm-ai-reason__calc">{detail.calculation}</span>}
      {detail.reason && <p>{detail.reason}</p>}
    </div>
  );
}

// 목록/상세가 같은 컴포넌트와 메모리 캐시를 사용하므로 중복 호출하지 않는다.
export default function MatchingAiEvaluation({ match, memberId, view }: Props) {
  const [result, setResult] = useState<MatchingAiDto | null>(() =>
    getCachedMatchingAi(memberId, match.matchingId)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setResult(getCachedMatchingAi(memberId, match.matchingId));
    setError('');
    setLoading(false);
  }, [memberId, match.matchingId]);

  const handleEvaluate = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const data = await evaluateMatchingAi(memberId, match.matchingId);
      setResult(data);
    } catch (err) {
      console.error('LLM API 평가 실패:', err);
      setError(err instanceof Error ? err.message : 'LLM 평가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isScored = result?.evaluationStatus === 'SCORED'
    && typeof result.totalScore === 'number';

  const button = !isScored && (
    <button
      type="button"
      className="mm-ai-btn"
      onClick={handleEvaluate}
      disabled={loading}
    >
      {loading ? '평가 중...' : '✦ LLM API 평가'}
    </button>
  );

  if (view === 'list') {
    return (
      <div className="mm-ai-inline">
        {button}
        {isScored && <span className="mm-ai-result">LLM {result.totalScore}/100</span>}
        {result && !isScored && (
          <span className="mm-ai-error" role="status">
            {result.evaluationStatus}{result.missingFields?.length ? ` (${result.missingFields.join(', ')})` : ''}
          </span>
        )}
        {error && <span className="mm-ai-error" role="alert" title={error}>평가 오류 · 다시 시도</span>}
      </div>
    );
  }

  return (
    <section className="mm-card mm-card--wide mm-ai-card">
      <div className="mm-ai-heading">
        <div>
          <h2 className="mm-card__title">LLM API 평가 · Java 점수 비교</h2>
          <p className="mm-ai-help">기존 Java 점수는 그대로 유지하고, 버튼을 누른 경우에만 Gemini가 별도로 평가합니다.</p>
        </div>
        {button}
      </div>

      {error && <p className="mm-ai-error" role="alert">{error}</p>}

      {!result && !loading && !error && (
        <p className="mm-ai-placeholder">아직 LLM 평가 전입니다. 위 버튼을 눌러 점수와 평가 근거를 확인해 주세요.</p>
      )}
      {loading && <p className="mm-ai-placeholder" role="status">Gemini가 매칭 조건을 평가하고 있습니다...</p>}

      {result && !isScored && (
        <p className="mm-ai-error" role="status">
          평가 상태: {result.evaluationStatus}
          {result.missingFields?.length ? ` · 누락 항목: ${result.missingFields.join(', ')}` : ''}
        </p>
      )}

      {result && isScored && (
        <>
          <div className="mm-ai-totals">
            <div><span>기존 Java 매칭 적합도</span><strong>{match.totalScore}<small>/100</small></strong></div>
            <div><span>LLM API 매칭 적합도</span><strong>{result.totalScore}<small>/100</small></strong></div>
          </div>

          <div className="mm-table-wrap">
            <table className="mm-table mm-ai-table">
              <thead>
                <tr><th>평가 항목</th><th>Java</th><th>LLM API</th><th>LLM 평가 근거</th></tr>
              </thead>
              <tbody>
                {makeScoreRows(match, result).map((row) => (
                  <tr key={row.label}>
                    <td className="mm-table__label">{row.label}</td>
                    <td>{row.java}/{row.max}</td>
                    <td className={row.llm !== row.java ? 'mm-ai-different' : ''}>
                      {row.llm == null ? '-' : `${row.llm}/${row.max}`}
                    </td>
                    <td className="mm-ai-table__reason"><ReasonText detail={row.detail} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.recommendReason && (
            <div className="mm-ai-summary">
              <h3>LLM 종합 추천 이유</h3>
              <p>{result.recommendReason}</p>
            </div>
          )}
          {result.warningMessage && (
            <div className="mm-ai-summary mm-ai-summary--warning">
              <h3>LLM 주의사항</h3>
              <p>{result.warningMessage}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
