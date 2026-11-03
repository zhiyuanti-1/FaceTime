import { Card, Heading, Notice } from "../../components/PreviewUi";

export function ResumeParseStatus() {
  return (
    <Card>
      <Heading title="② 解析状态" subtitle="以下为固定成功与失败状态示例" />
      <dl className="status-list">
        <div>
          <dt>OCR 文本提取</dt>
          <dd className="green-text">完成 · 3 812 字</dd>
        </div>
        <div>
          <dt>结构化解析</dt>
          <dd className="green-text">完成 · 置信度 0.86</dd>
        </div>
        <div>
          <dt>疑点识别</dt>
          <dd className="blue-text">3 条 · 高 2 / 中 1</dd>
        </div>
      </dl>
      <div className="divider" />
      <p className="label">失败示例</p>
      <Notice>
        <span className="amber-text">E_OCR_LOW_QUALITY</span>
        <p>图片可能不清晰 → 直接进入手填，不再弹二次确认</p>
      </Notice>
    </Card>
  );
}
