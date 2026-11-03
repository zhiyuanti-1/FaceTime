import { Badge, Button, Card } from "../../components/PreviewUi";

export function ReportSummary() {
  return (
    <Card className="report-summary">
      <div>
        <p className="eyebrow">INTERVIEW REPORT · 示例报告</p>
        <div className="score-title">
          <h1>78.4</h1>
          <div>
            <span className="muted">总分 / 100</span>
            <p>
              <Badge tone="green">练习反馈 · 有继续提升的空间</Badge>
            </p>
          </div>
        </div>
        <p className="muted">覆盖率 89% · 样本充足，输出点值（固定示例）</p>
        <p className="muted small">
          scoringVersion 1.0.0 · 题库 1.0.0-seed · 提示词 1.0.0
        </p>
      </div>
      <div className="report-export">
        <div className="actions">
          <Button>JSON</Button>
          <Button>打印</Button>
        </div>
        <Badge tone="amber">占位题库 · 质量未校验</Badge>
      </div>
    </Card>
  );
}
