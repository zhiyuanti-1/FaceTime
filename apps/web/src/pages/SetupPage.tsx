import { Badge, Card, Heading, Notice, Steps } from "../components/PreviewUi";
import { WeightPanel } from "../features/paper/WeightPanel";
import { QuotaPanel } from "../features/paper/QuotaPanel";

export function SetupPage() {
  return (
    <>
      <Steps current={0} />
      <div className="setup-grid">
        <Card>
          <Heading title="岗位与模式" subtitle="定制属于你的练习方向" />
          <div className="form-section">
            <p className="label">岗位族</p>
            <div className="segments">
              <span className="selected">自定义</span>
              <span>前端</span>
              <span>后端</span>
              <span>测试</span>
            </div>
          </div>
          <div className="form-section">
            <p className="label">级别</p>
            <div className="segments">
              <span>初级</span>
              <span className="selected">中级</span>
              <span>高级</span>
            </div>
          </div>
          <div className="form-section">
            <p className="label">题量（固定）</p>
            <div className="well">八股 5 道 + 简历 5 道 = 10 题</div>
          </div>
          <div className="form-section">
            <p className="label">顺序策略</p>
            <div className="option selected">
              <span className="radio-dot" />
              <strong>交替</strong>
              <span>八股 / 拷打穿插（默认）</span>
            </div>
            <div className="option">
              <span className="radio-dot" />
              <strong>分块</strong>
              <span>5 八股 → 5 拷打</span>
            </div>
          </div>
          <Notice>
            <p>权重全为 0 时禁止开始</p>
            <p>题库不足时减题，最低 6 题</p>
            <p>简历为空时改用通用深挖题</p>
            <strong className="amber-text">
              权重只影响配额，不影响评分权重
            </strong>
          </Notice>
          <div className="setup-summary">
            <Badge tone="blue">示例配额：5 道 · 覆盖 5 个方向</Badge>
          </div>
        </Card>
        <WeightPanel />
        <QuotaPanel />
      </div>
    </>
  );
}
