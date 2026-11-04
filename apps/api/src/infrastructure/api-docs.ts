import {
  ApiBody,
  DocumentBuilder,
  SwaggerModule,
  type ApiBodyOptions,
} from "@nestjs/swagger";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Express } from "express";
import { resolve } from "node:path";
import { z } from "zod";
import { dataRoot } from "../config.js";

export function ApiJsonBody(schema: z.ZodType) {
  return ApiBody({
    schema: z.toJSONSchema(schema, { target: "openapi-3.0" }) as Extract<
      ApiBodyOptions,
      { schema: unknown }
    >["schema"],
  });
}

export function setupApiDocs(app: NestExpressApplication) {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Face API")
      .setDescription("在同一页面调用登录接口，浏览器会自动携带管理员 Cookie。")
      .setVersion("1.0")
      .build(),
  );
  const resources = resolve(dataRoot, "knife4j/META-INF/resources");
  app.useStaticAssets(resources);
  const express = app.getHttpAdapter().getInstance() as Express;
  express.get("/doc.html", (_req, res) => {
    res.sendFile(resolve(resources, "doc.html"), (error) => {
      if (error && !res.headersSent)
        res
          .status(503)
          .send("请运行 scripts/install-local-resume.ps1 -Component Docs");
    });
  });
  express.get("/swagger-resources", (_req, res) =>
    res.json([
      {
        name: "Face API",
        url: "/v3/api-docs",
        location: "/v3/api-docs",
        swaggerVersion: "3.0",
        openapi: "3.0.0",
      },
    ]),
  );
  express.get("/v3/api-docs", (_req, res) => res.json(document));
  express.get("/v3/api-docs/swagger-config", (_req, res) =>
    res.json({
      url: "/v3/api-docs",
      urls: [{ name: "Face API", url: "/v3/api-docs" }],
    }),
  );
}
