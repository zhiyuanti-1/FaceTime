import { Injectable } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { config } from "../config.js";
import { ApiError } from "../infrastructure/http.js";
const envelope = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string(),
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
  usage: z
    .object({ prompt_tokens: z.number(), completion_tokens: z.number() })
    .optional(),
});
@Injectable()
export class DeepSeek {
  private active = false;
  async run<T>(
    task: "parse-resume" | "resume-probes" | "score-answer" | "final-report",
    data: unknown,
    schema: z.ZodType<T>,
  ): Promise<T> {
    if (!config.DEEPSEEK_API_KEY)
      throw new ApiError(
        "E_KEY_MISSING",
        "请在apps/api/.env配置DEEPSEEK_API_KEY并重启后端",
        503,
      );
    if (this.active)
      throw new ApiError("E_AI_BUSY", "AI正在处理其他请求，请稍后重试", 409);
    const user = JSON.stringify(data);
    if (user.length > config.DEEPSEEK_MAX_INPUT_CHARS)
      throw new ApiError(
        "E_AI_INPUT",
        "本次AI输入超过本机配置上限，请精简简历或回答",
        400,
      );
    this.active = true;
    try {
      const system = await readFile(
        new URL(
          `../../../../packages/ai/prompts/${task}/1.0.0.md`,
          import.meta.url,
        ),
        "utf8",
      );
      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.DEEPSEEK_MODEL,
            thinking: { type: "disabled" },
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            response_format: { type: "json_object" },
            max_tokens: 8192,
            stream: false,
          }),
          signal: AbortSignal.timeout(config.DEEPSEEK_TIMEOUT_MS),
        },
      );
      if (!response.ok)
        throw new ApiError(
          response.status === 429 ? "E_LLM_QUOTA" : "E_LLM_UPSTREAM",
          "DeepSeek请求失败，请检查凭证、模型权限和额度后重试",
          502,
        );
      const raw: unknown = await response.json();
      const parsed = envelope.safeParse(raw);
      const choice = parsed.success ? parsed.data.choices[0] : undefined;
      if (
        !choice ||
        choice.finish_reason !== "stop" ||
        !choice.message.content.trim()
      )
        throw new ApiError(
          "E_LLM_SCHEMA",
          "AI返回空内容或输出被截断，请重试",
          502,
        );
      let content: unknown;
      try {
        content = JSON.parse(choice.message.content) as unknown;
      } catch {
        throw new ApiError("E_LLM_SCHEMA", "AI输出不是有效JSON，请重试", 502);
      }
      const result = schema.safeParse(content);
      if (!result.success)
        throw new ApiError(
          "E_LLM_SCHEMA",
          "AI输出不符合约定，结果未生效，请重试",
          502,
        );
      return result.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        "E_LLM_NETWORK",
        "DeepSeek连接失败或超时，请稍后重试",
        502,
      );
    } finally {
      this.active = false;
    }
  }
}
