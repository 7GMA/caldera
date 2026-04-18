export class CalendarProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly providerCode?: string,
  ) {
    super(message);
    this.name = "CalendarProviderError";
  }
}

export class TokenExpiredError extends CalendarProviderError {
  constructor(provider: string) {
    super("Access token expired", provider, 401);
    this.name = "TokenExpiredError";
  }
}

export class RateLimitError extends CalendarProviderError {
  constructor(provider: string, public readonly retryAfterMs?: number) {
    super("Rate limit exceeded", provider, 429);
    this.name = "RateLimitError";
  }
}

export class NotFoundError extends CalendarProviderError {
  constructor(provider: string, resource: string) {
    super(`${resource} not found`, provider, 404);
    this.name = "NotFoundError";
  }
}
