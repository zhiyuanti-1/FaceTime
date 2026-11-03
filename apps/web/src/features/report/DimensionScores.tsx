import { Card, Heading } from "../../components/PreviewUi";
const dimensions = [
  ["内容质量", "CONTENT", 40, 82],
  ["表达流畅", "FLUENCY", 15, 74],
  ["口头禅", "FILLER", 10, 90],
  ["动作表现", "BODY", 0, null],
  ["简历追问", "RESUME", 15, 68],
  ["岗位匹配", "FIT", 10, 80],
] as const;

export function DimensionScores() {
  return (
    <Card>
      <Heading title="六维得分" subtitle="BODY 在 1.0 未启用，不参与加权" />
      <div className="dimension-list">
        {dimensions.map(([name, code, weight, score]) => (
          <div className="dimension-row" key={code}>
            <div>
              <strong>{name}</strong>
              <small>
                {code} · 权重 {weight}
              </small>
            </div>
            <div className="dimension-track">
              {score !== null && <span style={{ width: `${score}%` }} />}
            </div>
            <strong className={score === null ? "muted" : ""}>
              {score === null ? "未启用" : score}
            </strong>
            <span className="muted">{score === null ? "" : "已评分"}</span>
          </div>
        ))}
      </div>
      <p className="footnote">
        不计入分母的维度会剔除并重新归一化，不会记 0 分。
      </p>
    </Card>
  );
}
