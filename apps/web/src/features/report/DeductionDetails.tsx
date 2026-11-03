import { Badge, Button, Card, Heading } from "../../components/PreviewUi";

export function DeductionDetails() {
  return (
    <Card>
      <Heading title="扣分明细" subtitle="规则、时间点与原文的静态展示" />
      <div className="deduction-list">
        {[
          [
            "FIL-001",
            "口头禅密度超标",
            "3",
            "00:12.8 · 7.2次/分 > 阈值6.0",
            "额……那个，我当时主要是负责这个模块",
          ],
          [
            "CNT-002",
            "仅复述概念，无具体案例",
            "8",
            "缺少实现细节与取舍",
            "Proxy 就是比 defineProperty 更好用",
          ],
          [
            "RES-001",
            "简历疑点未澄清",
            "6",
            "第8题 · 追问2次仍无量化口径",
            "性能提升300%，未说明基线",
          ],
        ].map(([rule, title, points, detail, evidence]) => (
          <article className="deduction" key={rule}>
            <div className="deduction-title">
              <Badge tone="amber">{rule}</Badge>
              <strong>{title}</strong>
              <b>扣 {points}</b>
            </div>
            <p className="muted small">{detail}</p>
            <div className="deduction-quote">
              <span>「{evidence}」</span>
              <Button>申请复核</Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
