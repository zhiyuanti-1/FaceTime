import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { App } from "../../src/app/App";

function render(path: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
describe("static preview routes and boundaries", () => {
  it.each([
    ["/", "开始一场模拟面试"],
    ["/setup", "知识点权重"],
    ["/resume", "上传简历"],
    ["/interview", "Vue 3 为什么改用 Proxy"],
    ["/report/demo", "六维得分"],
    ["/history", "历史记录"],
    ["/settings", "隐私说明"],
    ["/states", "降级状态展示"],
  ])("%s renders its intended view", (path, title) => {
    const html = render(path);
    expect(html).toContain(title);
    expect(html).toContain("静态界面预览");
    expect(html).not.toContain("页面不存在");
    const buttons = html.match(/<button\b[^>]*>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((button) => button.includes('disabled=""'))).toBe(
      true,
    );
    expect(html).not.toContain('type="file"');
  });
  it("keeps score, seed and privacy disclosures visible", () => {
    const report = render("/report/demo");
    expect(report).toContain("未启用");
    expect(report).toContain("扣 3");
    expect(report).toContain("占位题库");
    const settings = render("/settings");
    expect(settings).toContain("不上传自有服务器");
    expect(settings).toContain("会发送至百度 / DeepSeek");
  });
  it("provides a safe unknown route", () => {
    expect(render("/unknown")).toContain("页面不存在");
  });
});
