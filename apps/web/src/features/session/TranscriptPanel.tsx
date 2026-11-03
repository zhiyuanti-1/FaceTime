import { Badge, Card } from "../../components/PreviewUi";

export function TranscriptPanel() {
  return (
    <Card>
      <div className="transcript-header">
        <span className="label">转写结果（编辑态示例）</span>
        <Badge tone="green">ASR 置信度 0.93 · 示例</Badge>
        <span className="muted">按静默切段，时间戳误差 ±1.5s</span>
      </div>
      <textarea
        aria-label="转写结果示例"
        readOnly
        value="Proxy 拦截的是整个对象的读写，所以新增、删除属性都能被捕获，不用再写 $set。Vue 2 用 defineProperty 只能劫持已有属性，数组下标也监听不到……"
      />
      <p className="label">你的口头禅统计（静态示例）</p>
      <p className="amber-text">额 ×3　 那个 ×2　 就是 ×1　 密度 7.2 次/分</p>
      <p className="muted small">
        实时统计仅作提示；缺少词级置信度时不可据此扣分。
      </p>
    </Card>
  );
}
