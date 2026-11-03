import {
  Badge,
  Button,
  Card,
  Heading,
  Notice,
} from "../../components/PreviewUi";

export function ResumeUploadPanel() {
  return (
    <Card>
      <Heading title="① 上传简历" subtitle="让问题围绕你的真实经历展开" />
      <div className="segments upload-tabs">
        <span>PDF</span>
        <span className="selected">图片</span>
        <span>粘贴文本</span>
      </div>
      <div className="upload-zone" aria-disabled="true">
        <span className="upload-icon">↥</span>
        <strong>拖入图片，或点击选择</strong>
        <p className="muted">支持 jpg / png / webp，单张 ≤10MB</p>
        <Badge>扫描件会走 OCR</Badge>
        <small>静态预览 · 上传未开放</small>
      </div>
      <Notice tone="amber">
        脱敏提示示例：检测到 1 处手机号，建议打码后再解析。
        <div className="inline-actions">
          <Button>一键打码</Button>
          <Button>仍然继续</Button>
        </div>
      </Notice>
    </Card>
  );
}
