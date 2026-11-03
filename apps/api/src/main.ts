import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";
import { Errors } from "./infrastructure/http.js";
import { config } from "./config.js";
export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
    abortOnError: false,
  });
  app.useBodyParser("json", { limit: "2mb" });
  app.use(cookieParser());
  app.useGlobalFilters(new Errors());
  app.enableShutdownHooks();
  return app;
}
async function main() {
  const app = await createApp();
  try {
    await app.listen(config.API_PORT, config.API_HOST);
  } catch (error) {
    await app.close();
    throw error;
  }
  console.info(`Face API ready: http://${config.API_HOST}:${config.API_PORT}`);
}
main().catch((error: unknown) => {
  if (
    error instanceof Error &&
    "code" in error &&
    error.code === "EADDRINUSE"
  ) {
    console.error("后端端口已占用，请使用已有服务或在.env调整API_PORT");
    process.exitCode = 1;
    return;
  }
  console.error(
    "后端启动失败，请检查apps/api/.env、Oracle连接和005迁移状态；未输出凭证或SQL参数",
  );
  process.exitCode = 1;
});
