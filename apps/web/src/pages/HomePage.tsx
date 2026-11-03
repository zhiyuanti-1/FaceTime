import { Badge, Button, Card, Notice } from "../components/PreviewUi";

export function HomePage() {
  return (
    <div className="home-page">
      <Card className="hero">
        <div className="eyebrow">PREPARE. PRACTICE. PROGRESS.</div>
        <Badge tone="blue">你的下一场面试，从这里开始</Badge>
        <h1>开始一场模拟面试</h1>
        <p className="hero-description">
          10 道题：5 道八股 + 5 道简历拷打。
          <br className="mobile-break" />
          每题最多两层追问，追问不计入题量。
        </p>
        <p className="muted">
          BODY 维度在 1.0 未启用，报告会明确标注「未启用」。
        </p>
        <div className="hero-actions">
          <Button primary>
            开始新面试 <span aria-hidden="true">↗</span>
          </Button>
          <Button>
            继续未完成 <span className="muted">第 6 / 10 题</span>
            <Badge>本地恢复</Badge>
          </Button>
        </div>
        <div className="hero-motif" aria-hidden="true">
          <div />
          <div />
          <div />
          <span>F</span>
        </div>
      </Card>
      <div className="grid three stats">
        <Card>
          <span className="stat-icon">▤</span>
          <p className="muted">题库</p>
          <h2>10 个知识点池 · 200 题</h2>
          <p className="muted">seed 阶段，质量未校验 · 报告会标注</p>
        </Card>
        <Card>
          <span className="stat-icon">↗</span>
          <p className="muted">最近一次 · 示例</p>
          <h2>
            78.4 <small>分 · 前端 · 10 题</small>
          </h2>
          <p className="muted">覆盖率 89%，样本不足时只给区间</p>
        </Card>
        <Card>
          <span className="stat-icon">⌂</span>
          <p className="muted">数据位置</p>
          <h2>保存在本机浏览器</h2>
          <p className="muted">简历与录音会上传第三方识别</p>
        </Card>
      </div>
      <Notice>
        <strong>练习反馈，不是招聘结论。</strong>
        <p>
          评分不作为简历真实性判定。种子题库仅用于打通链路，报告中的「占位题库」提示不会隐藏。
        </p>
      </Notice>
      <Card className="first-visit">
        <span className="guide-number">01</span>
        <strong>第一次使用？</strong>
        <p>
          先选岗位与权重 <span>→</span> 上传简历 <span>→</span>{" "}
          开始练习。权重不写死，随时可改。
        </p>
        <Badge>约 1 分钟</Badge>
      </Card>
      <div className="mode-row" aria-label="练习模式展示">
        <span>练习模式</span>
        <span>快速练习</span>
        <span>简历拷打</span>
        <span>专项训练</span>
        <span className="muted">功能暂未开放</span>
      </div>
    </div>
  );
}
