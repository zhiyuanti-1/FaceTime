import { Button, Card, Heading, Notice } from "../../components/PreviewUi";

export function QuestionInfo() {
  return (
    <Card className="question-info">
      <Heading title="本题信息" />
      <dl className="info-list">
        <div>
          <dt>方向</dt>
          <dd>Vue · 响应式原理</dd>
        </div>
        <div>
          <dt>难度</dt>
          <dd>中等（2/3）</dd>
        </div>
        <div>
          <dt>追问</dt>
          <dd>第 0 层 / 最多 2 层</dd>
        </div>
      </dl>
      <div className="divider" />
      <p className="label">练习说明</p>
      <p>围绕具体做法、案例和技术取舍组织回答。</p>
      <p className="muted">评分要点在实际答题界面不提前展示。</p>
      <div className="divider" />
      <p className="label">追问规则</p>
      <p>L1 澄清事实 → L2 追问细节 → L3 压力测试</p>
      <p>追问不计入 10 题，单独记录。</p>
      <Notice tone="amber">
        <strong>降级提示（示例）</strong>
        <p>语音识别不可用 → 可直接打字作答，不会中断本场面试。</p>
      </Notice>
      <div className="divider" />
      <p className="label">本场 · 示例</p>
      <p>已完成 2 题 · 剩余 8 题</p>
      <p className="muted">当前没有保存会话数据</p>
      <div className="push-bottom">
        <Button>结束并出报告</Button>
      </div>
    </Card>
  );
}
