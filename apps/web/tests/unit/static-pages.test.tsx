import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { App } from "../../src/app/App";
import { ResumeUpload } from "../../src/features/resume/ResumeUpload";
import { WeightEditor } from "../../src/features/paper/WeightEditor";
import { Feedback } from "../../src/components/WorkbenchUi";
describe("authenticated workspace boundaries", () => {
  it("shows connection state before exposing account data", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(html).toContain("正在连接");
    expect(html).not.toContain("六维得分");
  });
  it("offers real document upload and no image format", () => {
    const html = renderToStaticMarkup(
      <ResumeUpload
        busy={false}
        maxMb={4}
        onUpload={async () => {}}
        onError={() => {}}
      />,
    );
    expect(html).toContain('type="file"');
    expect(html).toContain(".pdf,.doc,.docx,.txt");
    expect(html).not.toContain(".png");
    expect(html).toContain("4MB");
  });
  it("renders only topics supplied by the API", () => {
    const html = renderToStaticMarkup(
      <WeightEditor
        topics={[
          { id: "from-db", name: "数据库方向", count: 7, stage: "seed" },
        ]}
        weights={{ "from-db": 3 }}
        onChange={() => {}}
      />,
    );
    expect(html).toContain("数据库方向");
    expect(html).toContain('value="3"');
    expect(html).not.toContain("Vue");
  });
  it("announces errors accessibly", () => {
    expect(renderToStaticMarkup(<Feedback message="请求失败" />)).toContain(
      'role="alert"',
    );
  });
});
