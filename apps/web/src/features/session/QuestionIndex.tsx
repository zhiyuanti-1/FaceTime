import type { Practice } from "@face/shared";
export function QuestionIndex({
  practice,
  index,
  busy,
  onSelect,
}: {
  practice: Practice;
  index: number;
  busy: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <aside className="paper-panel question-index">
      <h2>本次题目</h2>
      <p>
        {practice.turns.filter((item) => item.answerText).length} /{" "}
        {practice.turns.length} 已回答
      </p>
      {practice.turns.map((item, i) => (
        <button
          key={item.id}
          className={i === index ? "selected" : ""}
          onClick={() => onSelect(i)}
          disabled={busy}
        >
          <span>
            {String(i + 1).padStart(2, "0")} · {item.question.topicName}
          </span>
          <small>{item.answerText ? "已保存" : "待回答"}</small>
        </button>
      ))}
    </aside>
  );
}
