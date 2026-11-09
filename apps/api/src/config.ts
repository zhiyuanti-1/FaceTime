import { config as dotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { z } from "zod";

dotenv({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"),
  quiet: true,
});
const schema = z.object({
  API_HOST: z.literal("127.0.0.1").default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  ADMIN_USERNAME: z.string().min(1).max(128).optional(),
  ADMIN_PASSWORD: z.string().min(1).max(512).optional(),
  ADMIN_OWNER_ID: z.uuid().optional(),
  DB_USER: z.literal("FACE_RUNTIME").optional(),
  DB_SCHEMA: z.literal("FACE_APP").optional(),
  DB_PASSWORD: z.string().optional(),
  DB_CONNECT_STRING: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().default(""),
  DEEPSEEK_MODEL: z.string().default("deepseek-flash"),
  DEEPSEEK_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  DEEPSEEK_MAX_INPUT_CHARS: z.coerce.number().int().positive().default(80000),
  BAIDU_AK: z.string().default(""),
  BAIDU_SK: z.string().default(""),
  BAIDU_OCR_ENDPOINT: z
    .enum(["accurate_basic", "general_basic"])
    .default("accurate_basic"),
  UPLOAD_MAX_MB: z.coerce.number().positive().max(10).default(4),
  PDF_MAX_PAGES: z.coerce.number().int().positive().max(30).default(10),
});
const configured = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);
const result = schema.safeParse(configured);
if (!result.success)
  throw new Error(
    "请检查 apps/api/.env 配置项：" +
      result.error.issues.map((i) => i.path.join(".")).join(", "),
  );
export const config = result.data;
