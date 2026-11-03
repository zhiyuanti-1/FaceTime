import { Badge, Button, Card } from "../../components/PreviewUi";
const bars = [
  10, 22, 30, 34, 28, 16, 12, 18, 14, 10, 12, 9, 16, 28, 30, 22, 12, 20, 34, 32,
  28, 16, 12, 20, 17, 13, 10, 8, 18, 24, 20, 17, 12, 18, 28, 34, 20, 12, 17, 22,
  24, 18, 10, 8, 12, 16, 18, 15, 22, 31, 34, 20, 12, 22, 28, 24, 17, 12,
];

export function RecordingPanel() {
  return (
    <Card>
      <p className="label">录音界面示例</p>
      <div className="record-status">
        <strong>
          <i />
          录音中 · 00:42
        </strong>
        <span className="muted">采样 16 kHz · 已切 3 段（示例）</span>
        <Badge>未调用麦克风</Badge>
      </div>
      <div className="waveform" aria-label="静态音频波形">
        {bars.map((height, i) => (
          <span key={i} className={i < 28 ? "blue" : ""} style={{ height }} />
        ))}
      </div>
      <div className="actions">
        <Button primary>结束作答</Button>
        <Button>跳过</Button>
        <span className="muted">快捷键暂未启用</span>
      </div>
    </Card>
  );
}
