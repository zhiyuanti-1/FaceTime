import { Button, Card, Heading } from "../../components/PreviewUi";

export function QuotaPanel() {
  return (
    <Card className="quota-card">
      <Heading title="预计出题" subtitle="固定示例 · 非实时计算" />
      <div className="quota-list">
        {["Vue", "网络", "React", "工程化", "Java"].map((name) => (
          <div className="well" key={name}>
            <span>{name}</span>
            <strong>1 道</strong>
          </div>
        ))}
      </div>
      <p className="green-text">覆盖 5 个方向，满足 ≥3 主题</p>
      <p className="amber-text">Java 权重 10，通过最大余额补足 1 道</p>
      <p className="muted">题库不足会自动降级并提示</p>
      <div className="push-bottom">
        <Button primary>
          下一步：上传简历 <span>→</span>
        </Button>
      </div>
    </Card>
  );
}
