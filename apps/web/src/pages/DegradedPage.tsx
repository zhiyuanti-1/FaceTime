import { Badge, Button, Card, Heading, Notice } from "../components/PreviewUi";
const states = [
  {
    id: "D1",
    title: "ASR 识别失败",
    reason: "语音识别不可用（重试失败 / 配额耗尽）",
    message: "切「文字作答」，已转写内容保留；后续将自动聚焦输入框。",
    result: "请手动输入刚才的回答……",
  },
  {
    id: "D2",
    title: "OCR 失败",
    reason: "图片质量低 / 接口报错",
    message: "跳出手填面板，直接编辑简历文本，不弹二次确认。",
    result: "E_OCR_LOW_QUALITY · 图片可能不清晰",
  },
  {
    id: "D3",
    title: "AI 评分失败",
    reason: "超时 / 非法 JSON / 额度用尽",
    message: "用可观测规则项 + 模板追问继续，报告标注「AI 不可用」。",
    result: "本题规则分示例 74 · 内容维度待复核，不给点值",
  },
  {
    id: "D4",
    title: "动作未启用",
    reason: "1.0 无姿态模型",
    message: "报告显示「未启用」而非 0 分，权重剔除并归一化。",
    result: "动作表现　未启用　权重 0　已从分母剔除",
  },
];
export function DegradedPage() {
  return (
    <div className="stack degraded-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">RESILIENT BY DESIGN</p>
          <h1>降级状态展示</h1>
          <p>任何一条降级发生后，本场仍必须能产出报告。</p>
        </div>
        <Badge tone="amber">四条链路 · 固定示例</Badge>
      </div>
      <div className="grid two">
        {states.map((state) => (
          <Card key={state.id}>
            <div className="state-heading">
              <span className="state-id">{state.id}</span>
              <Heading title={state.title} subtitle={state.reason} />
            </div>
            <Notice tone="amber">
              <strong>系统提示条（页内内联）</strong>
              <p>{state.message}</p>
            </Notice>
            {state.id === "D1" ? (
              <div className="actions manual-answer">
                <input
                  readOnly
                  value=""
                  placeholder={state.result}
                  aria-label="手动回答示例"
                />
                <Button>提交</Button>
              </div>
            ) : (
              <div className={`well ${state.id === "D4" ? "muted" : ""}`}>
                {state.result}
              </div>
            )}
            <p className="muted small">
              验收目标：{state.id}{" "}
              发生后仍能出报告，且报告有对应标注。当前未实现降级逻辑。
            </p>
          </Card>
        ))}
      </div>
      <Card>
        <Heading title="统一规则（四条共用）" />
        <p>
          ① 提示必须页内内联，禁用 alert / confirm；② 每个错误都要映射到「重试 /
          降级 / 跳过」之一。
        </p>
        <p>
          ③ 降级后仍要落库并出报告，报告顶部保留降级说明；④
          不允许静默丢弃用户已作答内容。
        </p>
        <p className="muted">本页为状态目录，所有内容均为静态展示。</p>
      </Card>
    </div>
  );
}
