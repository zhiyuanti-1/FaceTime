import {
  Badge,
  Button,
  Card,
  Field,
  Heading,
} from "../../components/PreviewUi";

export function ResumeProfilePanel() {
  return (
    <Card>
      <Heading
        title="③ 解析结果（编辑态展示）"
        subtitle="所有内容为合成示例，字段只读，编辑功能暂未实现"
      />
      <div className="resume-fields">
        <Field label="姓名 / 岗位" value="示例候选人 · 前端工程师" />
        <Field label="工作年限" value="3 年" />
        <Field label="教育" value="2016.09 – 2020.06 · 本科 · 计算机" />
        <Field
          label="经历 1"
          value="2021.03 – 2023.06 · 示例电商 · 前端 · 6 人"
        />
        <Field label="项目" value="商品中台 · 主导 · React / Vite" />
      </div>
      <h3>简历疑点（将用于追问）</h3>
      <div className="suspicion-list">
        {[
          ["METRIC", "「性能提升 300%」无统计口径", "高"],
          ["TIME_GAP", "2022.01 – 2022.08 无说明", "高"],
          ["OWNERSHIP", "「主导」与 6 人团队需澄清", "中"],
        ].map(([kind, text, risk]) => (
          <div className="suspicion" key={kind}>
            <div>
              <Badge>{kind}</Badge>
              <span className="amber-text">{risk}</span>
            </div>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <p className="footnote">提示：疑点不等于造假，追问只用于澄清事实。</p>
      <div className="actions right">
        <Button>重新解析</Button>
        <Button primary>确认并组卷</Button>
      </div>
    </Card>
  );
}
