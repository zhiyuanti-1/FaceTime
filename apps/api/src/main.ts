import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";
import { config } from "./config.js";
import { Errors } from "./infrastructure/http.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix("api/v1", {
    exclude: ["debug/resume", "debug/resume/{*path}"],
  });
  app.useBodyParser("json", { limit: "80mb" });
  app.use(cookieParser());
  app.useGlobalFilters(new Errors());
  app.enableShutdownHooks();
  await app.listen(config.API_PORT, config.API_HOST);
  console.info(`后端已启动：http://${config.API_HOST}:${config.API_PORT}`);
  console.info(
    `简历提示词调试：http://${config.API_HOST}:${config.API_PORT}/debug/resume`,
  );
}
bootstrap().catch(() => {
  console.error("后端启动失败，请检查本机端口占用与配置。");
  process.exitCode = 1;
});
