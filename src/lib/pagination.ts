export interface Page<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export function decodeCursor(cursor: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
}
