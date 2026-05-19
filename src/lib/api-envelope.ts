/**
 * Identity (and most services) wrap payloads as `{ success, data, meta }`.
 * Axios `response.data` is the full envelope — auth payloads live in `.data`.
 */
export function unwrapApiData<T>(body: unknown): T {
  if (body !== null && typeof body === 'object' && 'data' in body) {
    const envelope = body as { success?: boolean; data: T }
    if (envelope.success === true) {
      return envelope.data
    }
    // practice-service and a few internal routes return `{ data }` without `success`.
    if (envelope.success === undefined) {
      return envelope.data
    }
  }
  return body as T
}

type ApiErrorBody = {
  message?: string
  error?: {
    code?: string
    message?: string
  }
}

export function getApiErrorDetails(body: unknown): { code?: string; message?: string } {
  if (body === null || typeof body !== 'object') {
    return {}
  }

  const payload = body as ApiErrorBody
  if (payload.error && typeof payload.error === 'object') {
    return {
      code: typeof payload.error.code === 'string' ? payload.error.code : undefined,
      message:
        typeof payload.error.message === 'string' && payload.error.message.trim() !== ''
          ? payload.error.message
          : undefined,
    }
  }

  if (typeof payload.message === 'string' && payload.message.trim() !== '') {
    return { message: payload.message }
  }

  return {}
}

export function getApiErrorMessage(body: unknown, fallback = 'An error occurred'): string {
  return getApiErrorDetails(body).message ?? fallback
}
