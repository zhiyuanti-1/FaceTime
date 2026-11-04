import { Action, Feedback, PageHeading } from "../../components/WorkbenchUi";
import { WeightEditor } from "./WeightEditor";
import { usePracticeSetup } from "./use-practice-setup";

export function PracticeSetup() {
  const {
    topics,
    weights,
    setWeights,
    mode,
    setMode,
    jobTitle,
    setJobTitle,
    order,
    setOrder,
    resumes,
    resumeId,
    setResumeId,
    consent,
    setConsent,
    preview,
    setPreview,
    last,
    count,
    setCount,
    error,
    busy,
    total,
    canCreate,
    submit,
    loadPreview,
  } = usePracticeSetup();
  return (
    <>
      <PageHeading
        number="02"
        title="把练习，放在你关心的方向。"
        description="手动设置相对权重，后端从数据库题库抽题。常规练习可自由组合岗位与简历。"
      />
      <form
        className="practice-layout"
        onSubmit={submit}
        onChange={() => setPreview(undefined)}
      >
        <section className="paper-panel">
          <fieldset disabled={busy}>
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
          </fieldset>
        </section>
        <aside className="paper-panel setup-summary">
          <span className="edition">YOUR PRACTICE</span>
          <h2>安排这一次练习</h2>
          <fieldset disabled={busy}>
            {last && (
              <Action
                variant="quiet"
                onClick={() => {
                  setMode(last.mode);
                  setJobTitle(last.jobTitle);
                  setOrder(last.order);
                  setWeights(last.weights);
                  setResumeId(last.resumeId ?? "");
                  setConsent(false);
                  setPreview(undefined);
                }}
              >
                沿用上次配置
              </Action>
            )}
            <label>
              模式
              <select
                value={mode}
                onChange={(event) => {
                  setMode(
                    event.target.value === "interview"
                      ? "interview"
                      : "knowledge",
                  );
                  setConsent(false);
                }}
              >
                <option value="knowledge">知识专项</option>
                <option value="interview">常规面试</option>
              </select>
            </label>
            <label>
              岗位
              <input
                value={jobTitle}
                maxLength={100}
                required={mode === "interview"}
                onChange={(event) => setJobTitle(event.target.value)}
              />
            </label>
            {mode === "interview" && (
              <>
                <label>
                  本场简历
                  <select
                    required
                    value={resumeId}
                    onChange={(event) => {
                      setResumeId(event.target.value);
                      setConsent(false);
                    }}
                  >
                    <option value="">请选择已确认的简历</option>
                    {resumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>
                        {resume.filename}
                      </option>
                    ))}
                  </select>
                </label>
                {!resumes.length && <p>请先在简历页保存一份已核对的简历。</p>}
                <label>
                  出题顺序
                  <select
                    value={order}
                    onChange={(event) =>
                      setOrder(
                        event.target.value === "knowledge_first"
                          ? "knowledge_first"
                          : "alternate",
                      )
                    }
                  >
                    <option value="alternate">交替出题</option>
                    <option value="knowledge_first">知识题优先</option>
                  </select>
                </label>
                <p>共 10 题，包含 5 道知识题和 5 道深挖题。</p>
                <label>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  同意将必要的简历文本发送给 DeepSeek 出题
                </label>
              </>
            )}
            {mode === "knowledge" && (
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
            )}
          </fieldset>
          <p>
            权重按比例分配，数量不足时自动调整。每次练习保存题目快照，便于继续作答。
          </p>
          <Action
            variant="secondary"
            disabled={busy || !total}
            onClick={() => void loadPreview()}
          >
            预览题量
          </Action>
          {preview && (
            <ul>
              {preview.quotas.map((item) => (
                <li key={item.id}>
                  {topics.find((topic) => topic.id === item.id)?.name ??
                    item.id}{" "}
                  · {item.count} 题
                </li>
              ))}
            </ul>
          )}
          <Feedback message={error} />
          <Action
            type="submit"
            disabled={busy || !topics.length || !total || !canCreate}
          >
            {busy ? "正在处理…" : "生成练习 →"}
          </Action>
          <small>当前题库含种子题，请结合实际情况使用。</small>
        </aside>
      </form>
    </>
  );
}
