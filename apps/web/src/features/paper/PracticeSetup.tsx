import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Topic } from "@face/shared";
import { coreApi } from "../../services/repositories/core-api";
import { errorMessage } from "../../services/http/client";
import { Action, Feedback, PageHeading } from "../../components/WorkbenchUi";
import { WeightEditor } from "./WeightEditor";
export function PracticeSetup() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [count, setCount] = useState(5);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  useEffect(() => {
    coreApi
      .topics()
      .then((data) => {
        setTopics(data);
        setWeights(Object.fromEntries(data.map((topic) => [topic.id, 1])));
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const practice = await coreApi.createPractice({
        weights,
        count,
        resumeId: params.get("resume"),
      });
      navigate(`/practice/${practice.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        number="02"
        title="把练习，放在你关心的方向。"
        description="手动设置相对权重，后端从数据库题库抽题。回答只记录，暂不判分。"
      />
      <form className="practice-layout" onSubmit={submit}>
        <section className="paper-panel">
          <div className="panel-heading">
            <h2>选择练习方向</h2>
            <span>权重为 0 时不选取</span>
          </div>
          <WeightEditor
            topics={topics}
            weights={weights}
            onChange={(id, value) =>
              setWeights((previous) => ({ ...previous, [id]: value }))
            }
          />
        </section>
        <aside className="paper-panel setup-summary">
          <span className="edition">YOUR PRACTICE</span>
          <h2>安排这一次练习</h2>
          <label>
            题目数量
            <input
              type="number"
              min="1"
              max="20"
              required
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <p>
            权重按比例分配，数量不足时自动调整。每次练习保存题目快照，便于继续作答。
          </p>
          <p>
            {params.get("resume")
              ? "已关联当前简历。"
              : "本次不关联简历，也可以直接开始。"}
          </p>
          <Feedback message={error} />
          <Action type="submit" disabled={busy || !topics.length || !total}>
            {busy ? "正在准备题目…" : "生成练习 →"}
          </Action>
          <small>当前题库含种子题，请结合实际情况使用。</small>
        </aside>
      </form>
    </>
  );
}
