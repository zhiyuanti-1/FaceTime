import { Card, Heading } from "../../components/PreviewUi";
const weights = [
  ["Vue", "vue", 20],
  ["计算机网络", "network", 20],
  ["React", "react", 20],
  ["前端工程化", "engineering", 20],
  ["Java", "java", 10],
  ["JavaScript", "js", 0],
  ["HTML / CSS", "html", 0],
  ["数据结构与算法", "algorithm", 0],
  ["数据库", "database", 0],
  ["操作系统", "os", 0],
] as const;

export function WeightPanel() {
  return (
    <Card>
      <Heading
        title="知识点权重"
        subtitle="相对重要性，不是题量；总和不必为 100，内部归一化"
      />
      <div className="weight-list">
        {weights.map(([name, id, weight]) => (
          <div className={`weight-row ${weight === 0 ? "muted" : ""}`} key={id}>
            <label htmlFor={`weight-${id}`}>
              {name}
              <small>{id}</small>
            </label>
            <input
              id={`weight-${id}`}
              type="range"
              min="0"
              max="30"
              value={weight}
              disabled
            />
            <strong>{weight}</strong>
          </div>
        ))}
      </div>
      <p className="footnote">
        示例采用需求 §3.3 的冻结算例。控件为静态展示，未实现预览算法。
      </p>
    </Card>
  );
}
