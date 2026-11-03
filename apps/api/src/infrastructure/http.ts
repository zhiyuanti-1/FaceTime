import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  BadRequestException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
export type Account = { id: string; username: string };
export interface AccountRequest extends Request {
  account: Account;
}
export class ApiError extends HttpException {
  constructor(code: string, message: string, status = 400) {
    super({ error: { code, message } }, status);
    this.message = message;
  }
}
export function input<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new BadRequestException({
      error: {
        code: "E_VALIDATION",
        message: parsed.error.issues[0]?.message ?? "请求格式不正确",
      },
    });
  return parsed.data;
}
@Catch()
export class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      const body = error.getResponse();
      const parsed = z
        .object({ error: z.object({ code: z.string(), message: z.string() }) })
        .safeParse(body);
      response
        .status(error.getStatus())
        .json(
          parsed.success
            ? parsed.data
            : { error: { code: "E_REQUEST", message: error.message } },
        );
      return;
    }
    response.status(500).json({
      error: {
        code: "E_SERVER",
        message: "服务暂时无法完成操作，请重试并检查本机数据库连接",
      },
    });
  }
}
