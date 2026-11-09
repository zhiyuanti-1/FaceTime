import type { ZodType } from "zod";

export class HttpError extends Error {
  constructor(readonly status: number, readonly body?: unknown) {
    super("请求未完成");
  }
}

export const requestJson = async <T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers);
  if (typeof init?.body === "string") headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/v1${path}`, { ...init, headers, credentials: "same-origin" });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    throw new HttpError(response.status, body);
  }
  const data: unknown = response.status === 204 ? undefined : await response.json();
  return schema.parse(data);
};
