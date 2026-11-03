import { Badge, Card, Heading, Notice } from "../components/PreviewUi";
import { ReportSummary } from "../features/report/ReportSummary";
import { DimensionScores } from "../features/report/DimensionScores";
import { DeductionDetails } from "../features/report/DeductionDetails";
import { TurnReview } from "../features/report/TurnReview";

export function ReportPage() {
  return (
    <div className="stack report-page">
      <ReportSummary />
      <div className="grid two">
        <DimensionScores />
        <DeductionDetails />
      </div>
      <Notice tone="amber">
        <strong>本场说明（不可隐藏）</strong>
        <p>
          使用占位题库（seed 200 题），题目质量未人工校验 · BODY 动作维度未启用
          · 本次为「交替」顺序
        </p>
      </Notice>
      <TurnReview />
      <div className="grid two">
        <Card>
          <Heading title="加分与优势 · 示例" />
          <Badge tone="green">BON-001 · 加 2</Badge>
          <p>回答按情境、任务、行动与结果组织，表达结构清晰。</p>
        </Card>
        <Card>
          <Heading title="下一步练习 · 示例" />
          <p>
            选一个项目，用 2 分钟讲清问题、具体动作与量化结果，并补充指标基线。
          </p>
        </Card>
      </div>
    </div>
  );
}
