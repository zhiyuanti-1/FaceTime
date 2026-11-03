import { Badge, Button, Card } from "../components/PreviewUi";
import { RecordingPanel } from "../features/session/RecordingPanel";
import { TranscriptPanel } from "../features/session/TranscriptPanel";
import { QuestionInfo } from "../features/session/QuestionInfo";

export function InterviewPage() {
  return (
    <>
      <div className="interview-progress card">
        <strong>第 3 / 10 题</strong>
        <Badge tone="blue">八股 · Vue · 中等</Badge>
        <strong>00:42</strong>
        <span className="muted">本题限时 03:00</span>
        <div className="progress-track">
          <span style={{ width: "30%" }} />
        </div>
        <Button>结束本场</Button>
      </div>
      <div className="interview-grid">
        <div className="stack">
          <Card className="question-card">
            <p className="label">题目</p>
            <h1>
              Vue 3 为什么改用 Proxy 实现响应式？它解决了 Vue 2 的哪些问题？
            </h1>
            <p className="muted">
              本题为口头作答。评分依据：命中核心差异 + 具体案例 + 权衡取舍。
            </p>
          </Card>
          <RecordingPanel />
          <TranscriptPanel />
        </div>
        <QuestionInfo />
      </div>
    </>
  );
}
