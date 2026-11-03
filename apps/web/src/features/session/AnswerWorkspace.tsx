import { Link, useParams } from "react-router-dom";
import { Action, Feedback, PageHeading } from "../../components/WorkbenchUi";
import { useAnswerWorkspace } from "./use-answer-workspace";
import { QuestionIndex } from "./QuestionIndex";
export function AnswerWorkspace() {
  const { id } = useParams();
  const {
    practice,
    index,
    draft,
    error,
    busy,
    turn,
    dirty,
    select,
    save,
    setDraft,
  } = useAnswerWorkspace(id);
  return (
    <>
      <PageHeading
        number="02"
        title="一次只专注一个问题。"
        description="用自己的语言回答。内容保存到当前账号，可以随时回来继续。"
        aside={
          <Link className="text-link" to="/history">
            查看练习记录 ↗
          </Link>
        }
      />
      <Feedback message={error} />
      <Feedback message={practice?.warnings.join("；") ?? ""} tone="info" />
      {practice && turn ? (
        <div className="answer-layout">
          <QuestionIndex
            practice={practice}
            index={index}
            busy={busy}
            onSelect={select}
          />
          <section className="paper-panel answer-paper">
            <span className="edition">
              QUESTION {String(index + 1).padStart(2, "0")}
            </span>
            <h2>{turn.question.text}</h2>
            <p className="muted">
              {turn.question.topicName} · 难度 {turn.question.difficulty} ·{" "}
              {turn.question.stage === "seed" ? "种子题" : "正式题"}
            </p>
            <label htmlFor="answer">你的回答</label>
            <textarea
              id="answer"
              value={draft}
              maxLength={20000}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="从你的理解开始，也可以结合实际经历展开。"
              disabled={busy}
            />
            <div className="answer-actions">
              <span>
                {draft.length} / 20000 ·{" "}
                {dirty
                  ? "尚未保存"
                  : turn.answerText
                    ? "回答已保存"
                    : "等待输入"}
              </span>
              <div>
                <Action
                  variant="quiet"
                  disabled={!dirty || busy}
                  onClick={() => setDraft(turn.answerText)}
                >
                  还原
                </Action>
                <Action
                  disabled={busy || !draft.trim()}
                  onClick={() => {
                    void save();
                  }}
                >
                  {busy ? "保存中…" : "保存回答"}
                </Action>
              </div>
            </div>
            <p className="muted">本阶段不生成评分，也不会自动改写你的回答。</p>
          </section>
        </div>
      ) : (
        <p className="muted">正在读取练习…</p>
      )}
    </>
  );
}
