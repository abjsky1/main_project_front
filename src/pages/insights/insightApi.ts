import type {
  Filters,
  Generation,
  HistoryDetail,
  HistoryPage,
  Item,
  Options,
} from './insightsData';

const BASE_URL = '/api/insights';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '요청을 처리하지 못했습니다.';
}

// 기존 프로젝트가 다른 CSRF 방식을 사용한다면
// 해당 프로젝트의 토큰 전달 방식에 맞춰 변경합니다.
function getCsrfToken(): string | null {
  const cookie = document.cookie
    .split('; ')
    .find(value => value.startsWith('XSRF-TOKEN='));

  if (!cookie) {
    return null;
  }

  try {
    return decodeURIComponent(
      cookie.substring('XSRF-TOKEN='.length),
    );
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    signal,
    timeoutMs = 30000,
  } = options;

  const controller = new AbortController();
  let timedOut = false;

  const cancel = () => controller.abort();

  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener('abort', cancel, { once: true });
  }

  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (method !== 'GET') {
      const csrfToken = getCsrfToken();

      if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
      }
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers,
      body: body === undefined
        ? undefined
        : JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 401) {
      throw new Error(
        '로그인이 필요하거나 만료되었습니다. 다시 로그인해 주세요.',
      );
    }

    const contentType =
      response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
      if (response.status === 403) {
        throw new Error(
          '접근 권한 또는 보안 토큰을 확인해 주세요.',
        );
      }

      throw new Error(
        '서버 응답 형식이 올바르지 않습니다. 로그인과 /api 프록시 설정을 확인해 주세요.',
      );
    }

    const payload: unknown = await response.json();

    if (!response.ok) {
      const serverMessage =
        typeof payload === 'object'
        && payload !== null
        && 'message' in payload
        && typeof payload.message === 'string'
          ? payload.message
          : null;

      if (serverMessage) {
        throw new Error(serverMessage);
      }

      if (response.status === 403) {
        throw new Error(
          '접근 권한 또는 보안 토큰을 확인해 주세요.',
        );
      }

      throw new Error(
        `요청 처리에 실패했습니다. (${response.status})`,
      );
    }

    return payload as T;

  } catch (error) {
    if (timedOut) {
      throw new Error(
        method === 'POST'
          ? '응답 시간이 초과되었습니다. 서버에서는 분석이 계속될 수 있으므로 잠시 후 기록을 새로고침해 주세요.'
          : '응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
      );
    }

    if (signal?.aborted) {
      throw new DOMException(
        '요청이 취소되었습니다.',
        'AbortError',
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        '서버에 연결하지 못했습니다. 백엔드 실행 상태와 프록시 설정을 확인해 주세요.',
      );
    }

    throw error;

  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

// 초기 선택지
export function getInsightOptions(signal?: AbortSignal) {
  return request<Options>('/options', { signal });
}

// 품목 검색
export function searchInsightItems(
  query: string,
  signal?: AbortSignal,
) {
  return request<Item[]>(
    `/items?q=${encodeURIComponent(query)}`,
    { signal },
  );
}

// 분석 생성 및 자동 저장
export function generateInsights(
  filters: Filters,
  signal?: AbortSignal,
) {
  return request<Generation>('', {
    method: 'POST',
    body: filters,
    signal,
    timeoutMs: 300000,
  });
}

// 본인 기록 목록
export function getInsightHistory(
  page: number,
  signal?: AbortSignal,
) {
  return request<HistoryPage>(
    `/history?page=${page}&size=10`,
    { signal },
  );
}

// 본인 기록 상세
export function getInsightHistoryDetail(
  historyId: number,
  signal?: AbortSignal,
) {
  return request<HistoryDetail>(
    `/history/${historyId}`,
    { signal },
  );
}

// 본인 기록 삭제
export function deleteInsightHistory(
  historyId: number,
  signal?: AbortSignal,
) {
  return request<boolean>(
    `/history/${historyId}`,
    {
      method: 'DELETE',
      signal,
    },
  );
}