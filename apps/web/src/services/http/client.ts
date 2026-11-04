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
    options.method === "POST" &&
    (path.startsWith("/resumes") || path.startsWith("/practices"))
      ? 960000
      : 30000;
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

export async function requestFile(path: string, signal: AbortSignal) {
  const response = await fetch(`/api/v1${path}`, {
    credentials: "include",
    signal,
  });
  if (response.status === 401)
    window.dispatchEvent(new Event("face:unauthorized"));
  if (!response.ok)
    throw new RequestError("无法读取附件，请重试", response.status);
  const file = await response.blob();
  const mediaType = file.type.split(";")[0];
  if (mediaType === "application/octet-stream") {
    const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, index) => signature[index] === byte,
    );
    const jpeg =
      signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
    if (png || jpeg)
      return file.slice(0, file.size, png ? "image/png" : "image/jpeg");
  }
  if (
    !["application/pdf", "image/png", "image/jpeg", "text/plain"].includes(
      mediaType ?? "",
    )
  ) {
    throw new RequestError("该附件格式需要下载后查看", 415);
  }
  return file;
}
