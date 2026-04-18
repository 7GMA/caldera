import { decrypt } from "../../crypto/encryption.js";
import type { ProviderContext } from "../types.js";
import { withRetry } from "../../lib/retry.js";

const BASE = "https://graph.microsoft.com/v1.0";

export async function graphFetch<T>(
  ctx: ProviderContext,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = decrypt(ctx.accessToken);
  return withRetry(async () => {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`Graph API error ${res.status}: ${body}`) as Error & { statusCode: number };
      err.statusCode = res.status;
      throw err;
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  });
}

export async function graphFetchAll<T>(
  ctx: ProviderContext,
  path: string,
): Promise<T[]> {
  const items: T[] = [];
  let url: string | undefined = path;
  while (url) {
    type PagedResponse = { value: T[]; "@odata.nextLink"?: string };
    const res: PagedResponse = await graphFetch<PagedResponse>(ctx, url);
    items.push(...(res.value ?? []));
    // nextLink is a full URL; strip base prefix for relative call
    url = res["@odata.nextLink"]?.replace(BASE, "") ?? undefined;
  }
  return items;
}
