import { afterEach, describe, it, expect, vi } from "vitest";
import { z } from "zod";
vi.mock("../../apps/api/src/config.js", async () => ({
  config: {
    DEEPSEEK_API_KEY: (await import("node:crypto")).randomUUID(),
    DEEPSEEK_MODEL: "deepseek-flash",
    DEEPSEEK_TIMEOUT_MS: 1000,
    DEEPSEEK_MAX_INPUT_CHARS: 10000,
  },
}));
import { DeepSeek } from "../../apps/api/src/providers/deepseek";
afterEach(() => vi.unstubAllGlobals());
describe("DeepSeek strict JSON transport", () => {
  it("validates JSON content and sends the structured mode", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            { finish_reason: "stop", message: { content: '{"ok":true}' } },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(
      await new DeepSeek().run(
        "final-report",
        {},
        z.object({ ok: z.boolean() }),
      ),
    ).toEqual({ ok: true });
    const payload = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(payload.response_format.type).toBe("json_object");
  });
  it.each(["", '```json {"ok":true} ```', '{"wrong":true}'])(
    "rejects blank, fenced or schema-invalid content: %s",
    async (content) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              choices: [{ finish_reason: "stop", message: { content } }],
            }),
          ),
        ),
      );
      await expect(
        new DeepSeek().run("final-report", {}, z.object({ ok: z.boolean() })),
      ).rejects.toThrow("AI");
    },
  );
  it("rejects truncated output without retrying paid requests", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            { finish_reason: "length", message: { content: '{"ok":true}' } },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(
      new DeepSeek().run("final-report", {}, z.object({ ok: z.boolean() })),
    ).rejects.toThrow("截断");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("reports upstream quota failure without leaking its body", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("private upstream content", { status: 429 }),
        ),
    );
    await expect(
      new DeepSeek().run("final-report", {}, z.object({ ok: z.boolean() })),
    ).rejects.toThrow("请求失败");
  });
});
