import { Card, Heading } from "../../components/PreviewUi";

export function TurnReview() {
  return (
    <Card>
      <Heading
        title="逐题回顾"
        subtitle="固定分数示例；查看转写、追问与建议功能暂未开放"
      />
      <div className="turn-grid">
        {[82, 76, 71, 88, 64, 79, 83, 58, 77, 81].map((score, i) => (
          <div className="turn-card" key={i}>
            <span className="muted">第 {i + 1} 题</span>
            <div>
              <strong>{score}</strong>
              {score < 65 && <span className="amber-text">偏弱</span>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
