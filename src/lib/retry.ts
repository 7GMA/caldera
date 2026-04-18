export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatusCodes?: number[];
}

const DEFAULT_RETRYABLE = [429, 500, 502, 503, 504];

function jitter(ms: number): number {
  return ms * (0.5 + Math.random() * 0.5);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 30_000;
  const retryableStatusCodes = opts.retryableStatusCodes ?? DEFAULT_RETRYABLE;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status =
        err instanceof Error && "statusCode" in err
          ? (err as { statusCode: number }).statusCode
          : undefined;
      if (status !== undefined && !retryableStatusCodes.includes(status)) {
        throw err;
      }
      if (attempt === maxAttempts) break;
      const raw = baseDelayMs * Math.pow(2, attempt - 1);
      await delay(Math.min(jitter(raw), maxDelayMs));
    }
  }
  throw lastError;
}
