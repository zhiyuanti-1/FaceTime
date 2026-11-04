import { useEffect, useState } from "react";
import type { Preferences, ResumeSummary, Topic } from "@face/shared";
import { useAuth } from "../app/auth-context";
import {
  Action,
  Feedback,
  PageHeading,
  downloadJson,
} from "../components/WorkbenchUi";
import { WeightEditor } from "../features/paper/WeightEditor";
import { errorMessage } from "../services/http/client";
import { coreApi } from "../services/repositories/core-api";

export function AccountPage() {
  const { logout } = useAuth();
  const [overview, setOverview] =
    useState<Awaited<ReturnType<typeof coreApi.overview>>>();
  const [diagnostics, setDiagnostics] =
    useState<Awaited<ReturnType<typeof coreApi.diagnostics>>>();
  const [preferences, setPreferences] = useState<Preferences>();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const [account, saved, library, directions] = await Promise.all([
      coreApi.overview(),
      coreApi.preferences(),
      coreApi.resumes(),
      coreApi.topics(),
    ]);
    setOverview(account);
    setPreferences(saved);
    setResumes(library);
    setTopics(directions);
  }
  useEffect(() => {
    void load().catch((err) => setError(errorMessage(err)));
    void coreApi
      .diagnostics()
      .then(setDiagnostics)
      .catch((err) => setError(errorMessage(err)));
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        number="05"
        title="个人中心"
        description="管理新练习的默认偏好、本机诊断和账号数据。"
      />
      <Feedback message={error} />
      <Feedback message={notice} tone="success" />
      <section className="paper-panel">
        <h2>账号概览</h2>
        {overview && (
          <p>
            {overview.user.username} · 简历 {overview.resumeCount}/3 · 练习{" "}
            {overview.practiceCount} 场 · 简历文件 {overview.resumeBytes} 字节 ·
            音频 {overview.audioBytes} 字节
          </p>
        )}
        <Action
          variant="secondary"
          disabled={busy}
          onClick={() => void run(logout)}
        >
          退出登录
        </Action>
      </section>
      <section className="paper-panel">
        <h2>练习偏好</h2>
        {preferences && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                setPreferences(await coreApi.savePreferences(preferences));
                setNotice("练习偏好已保存");
              });
            }}
          >
            <fieldset disabled={busy}>
              <label>
                默认岗位
                <input
                  value={preferences.jobTitle}
                  maxLength={100}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      jobTitle: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                默认简历
                <select
                  value={preferences.defaultResumeId ?? ""}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      defaultResumeId: event.target.value || null,
                    })
                  }
                >
                  <option value="">无默认简历</option>
                  {resumes.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.filename}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                默认顺序
                <select
                  value={preferences.order}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      order:
                        event.target.value === "knowledge_first"
                          ? "knowledge_first"
                          : "alternate",
                    })
                  }
                >
                  <option value="alternate">交替出题</option>
                  <option value="knowledge_first">知识题优先</option>
                </select>
              </label>
              <WeightEditor
                topics={topics}
                weights={preferences.weights}
                onChange={(id, value) =>
                  setPreferences({
                    ...preferences,
                    weights: { ...preferences.weights, [id]: value },
                  })
                }
              />
              <Action type="submit">保存偏好</Action>
            </fieldset>
          </form>
        )}
      </section>
      <section className="paper-panel">
        <h2>连接诊断</h2>
        {diagnostics && (
          <p>
            API 运行中 · Oracle{" "}
            {diagnostics.database === "up" ? "已连接" : "连接异常"} · 百度 OCR{" "}
            {diagnostics.ocr === "configured" ? "已配置" : "待配置"} · DeepSeek{" "}
            {diagnostics.deepseek === "configured" ? "已配置" : "待配置"} ·
            云端可用性未检测 · 版本 {diagnostics.version}
          </p>
        )}
        <Action
          variant="secondary"
          disabled={busy}
          onClick={() =>
            void run(async () =>
              downloadJson("连接诊断.json", await coreApi.exportDiagnostics()),
            )
          }
        >
          导出诊断
        </Action>
      </section>
      <section className="paper-panel">
        <h2>数据管理</h2>
        <p>
          个人数据导出包含简历和回答正文，请妥善保管。清理仅作用于本机账号数据。
        </p>
        <div className="answer-actions">
          <Action
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(async () =>
                downloadJson("个人练习数据.json", await coreApi.exportData()),
              )
            }
          >
            导出个人数据
          </Action>
          <Action
            variant="secondary"
            disabled={busy}
            onClick={() => {
              if (window.confirm("确认清理当前账号的音频文件？"))
                void run(async () => {
                  const { removed } = await coreApi.cleanupAudio();
                  setNotice(`已清理 ${removed} 份音频`);
                  setOverview(await coreApi.overview());
                });
            }}
          >
            清理音频
          </Action>
          <Action
            variant="secondary"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "确认删除本机账号下的全部简历、练习、报告、音频和偏好？账号会保留。",
                )
              )
                void run(async () => {
                  await coreApi.deleteData();
                  setNotice("已清除当前账号的业务数据");
                  await load();
                });
            }}
          >
            删除全部业务数据
          </Action>
        </div>
      </section>
    </>
  );
}
