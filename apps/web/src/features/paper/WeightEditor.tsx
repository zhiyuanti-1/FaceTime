import type { Topic } from "@face/shared";
export function WeightEditor({
  topics,
  weights,
  onChange,
}: {
  topics: Topic[];
  weights: Record<string, number>;
  onChange: (id: string, value: number) => void;
}) {
  return (
    <div className="weight-grid">
      {topics.map((topic) => (
        <label className="weight-row" key={topic.id}>
          <span>
            {topic.name}
            <small>{topic.count} 道可用题目</small>
          </span>
          <input
            aria-label={`${topic.name}权重`}
            type="number"
            min="0"
            max="100"
            value={weights[topic.id] ?? 0}
            onChange={(e) => onChange(topic.id, Number(e.target.value))}
          />
          <span className="weight-unit">份</span>
        </label>
      ))}
    </div>
  );
}
