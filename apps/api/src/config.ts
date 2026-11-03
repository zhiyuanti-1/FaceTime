import { config as dotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { z } from "zod";
dotenv({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"),
  quiet: true,
});
const schema = z.object({
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_CONNECT_STRING: z.string().min(1),
  DB_SCHEMA: z.literal("FACE_APP"),
  API_HOST: z.literal("127.0.0.1").default("127.0.0.1"),
  API_PORT: z.coerce.number().int().default(3000),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(6),
  BAIDU_AK: z.string().default(""),
  BAIDU_SK: z.string().default(""),
  BAIDU_OCR_ENDPOINT: z
    .enum(["accurate_basic", "general_basic"])
    .default("accurate_basic"),
  UPLOAD_MAX_MB: z.coerce.number().positive().max(10).default(4),
  PDF_MAX_PAGES: z.coerce.number().int().positive().max(30).default(10),
  AUTH_TTL_HOURS: z.coerce.number().positive().default(12),
});
const result = schema.safeParse(process.env);
if (!result.success)
  throw new Error(
    `请检查apps/api/.env配置项：${result.error.issues.map((i) => i.path.join(".")).join(", ")}`,
  );
export const config = result.data;
export const dataRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../data",
);
