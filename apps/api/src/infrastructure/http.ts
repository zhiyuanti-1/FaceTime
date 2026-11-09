import {
  ArgumentsHost,
  Catch,
  HttpException,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";

export type AccountRequest = Request & {
  account: { id: string; username: string };
};

export class ApiError extends HttpException {
  constructor(readonly code: string, message: string, status = 400) {
    super({ error: { code, message } }, status);
    this.message = message;
  }
}

export function input<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const path = result.error.issues[0]?.path.join(".");
    throw new ApiError(
      "E_VALIDATION",
      path ? `字段 ${path} 的格式不正确` : "请求格式不正确",
    );
  }
  return result.data;
}

@Catch()
export class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof ApiError) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const message =
      status === 404
        ? "未找到接口"
        : status === 413
          ? "请求或上传文件过大"
          : status >= 500
            ? "操作未完成，请检查本机服务后重试"
            : "请求格式不正确";
    response
      .status(status)
      .json({
        error: { code: status >= 500 ? "E_SERVER" : "E_REQUEST", message },
      });
  }
}
