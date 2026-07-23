export async function safeReadBody(
  response: Response,
  signal: AbortSignal,
): Promise<string> {
  try {
    return await readWithAbort(response.text(), signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return '(unreadable body)';
  }
}

export function readWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(createAbortError());
    };

    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export function createAbortError(): Error {
  if (typeof DOMException === 'function') {
    return new DOMException('This operation was aborted', 'AbortError');
  }
  const error = new Error('This operation was aborted');
  error.name = 'AbortError';
  return error;
}

export function truncateLogBody(body: string, maxLength = 500): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}…`;
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
