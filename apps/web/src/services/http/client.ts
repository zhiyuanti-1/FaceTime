import { z } from "zod";
export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
const failure = z.object({ error: z.object({ message: z.string() }) });
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout =
    path.startsWith("/resumes") && options.method === "POST" ? 960000 : 30000;
  const timer = setTimeout(() => controller.abort(), timeout);
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  try {
    const headers = new Headers(options.headers);
    if (options.body && !(options.body instanceof FormData))
      headers.set("Content-Type", "application/json");
    const response = await fetch(`/api/v1${path}`, {
      ...options,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
    const raw: unknown = await response.json();
    if (!response.ok) {
      if (response.status === 401)
        window.dispatchEvent(new Event("face:unauthorized"));
      const parsed = failure.safeParse(raw);
      throw new RequestError(
        parsed.success ? parsed.data.error.message : "操作失败，请重试",
        response.status,
      );
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success)
      throw new RequestError("服务器返回格式异常，请稍后重试", 502);
    return parsed.data;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    if (controller.signal.aborted)
      throw new RequestError("操作已取消或处理超时，请重试", 408);
    throw new RequestError("无法连接后端，请确认本机服务已启动", 0);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请重试";
}
