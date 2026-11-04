import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Report } from "@face/shared";
import { Action, Feedback, PageHeading } from "../components/WorkbenchUi";
import { errorMessage, RequestError } from "../services/http/client";
import { coreApi } from "../services/repositories/core-api";
import { downloadJson } from "../components/WorkbenchUi";

const dimensions = {
  CONTENT: "内容质量",
  RESUME: "简历",
  FIT: "岗位匹配",
  FLUENCY: "流畅度",
  FILLER: "口头禅",
  BODY: "动作表现",
};
const statuses = {
  SCORED: "已评分",
  NEEDS_REVIEW: "需复核",
  NOT_APPLICABLE: "不适用",
  NOT_ENABLED: "未启用",
};
export function PracticeReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState<Report | null>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  async function read(practiceId: string) {
    try {
      setReport(await coreApi.report(practiceId));
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) setReport(null);
      else throw err;
    }
  }
  useEffect(() => {
    if (id) void read(id).catch((err) => setError(errorMessage(err)));
  }, [id]);
  async function generate() {
    if (!id || !consent) return;
    setBusy(true);
    setError("");
    try {
      setReport(await coreApi.generateReport(id));
    } catch (err) {
      setError(errorMessage(err));
      try {
        await read(id);
      } catch (readError) {
        setError(
          `${errorMessage(err)}。读取报告状态失败：${errorMessage(readError)}`,
        );
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        number="04"
        title="练习报告"
        description="查看服务端评分、证据与逐题反馈。"
      />
      <Feedback message={error} />
      <section className="paper-panel">
        <Link to={`/practice/${id}`}>返回作答</Link>
        <p>
          {report === null
            ? "尚未生成报告。请先完成或跳过全部题目。"
            : report === undefined && !error
              ? "正在读取报告…"
              : ""}
        </p>
        <label>
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />{" "}
          同意将评分和总结所需文本发送给 DeepSeek
        </label>
        <div className="answer-actions">
          <Action
            disabled={!consent || busy || report === undefined}
            onClick={() => void generate()}
          >
            {busy
              ? "正在生成，可能需要数分钟…"
              : report
                ? "重新生成或补全报告"
                : "生成报告"}
          </Action>
          {id && (
            <Action
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setError("");
                void read(id).catch((err) => setError(errorMessage(err)));
              }}
            >
              刷新报告状态
            </Action>
          )}
        </div>
        {report && (
          <>
            <Feedback
              tone="info"
              message={report.stale ? "回答已变化，当前报告已过期。" : ""}
            />
            <h2>
              {report.totalScoreRange?.join("–") ??
                report.totalScore ??
                "暂无有效总分"}
            </h2>
            <p>
              覆盖率 {Math.round(report.coverage * 100)}% · 已答{" "}
              {report.answeredCount} · 跳过 {report.skippedCount} · 已评分{" "}
              {report.scoredCount} · 未评分 {report.unscoredCount} · 简历题{" "}
              {report.resumeQuestionCount}
            </p>
            <p>
              评分版本 {report.scoringVersion} · 题库 {report.bankVersion} ·
              报告版本 {report.revision}
            </p>
            {report.needsReview && <p>本报告需复核。</p>}
            {[...report.warnings, ...report.reviewLog].map((message, index) => (
              <p key={index}>{message}</p>
            ))}
            <p>{report.summary}</p>
            <dl>
              {report.dimensions.map((item) => (
                <div key={item.code}>
                  <dt>{dimensions[item.code]}</dt>
                  <dd>{item.score ?? statuses[item.status]}</dd>
                </div>
              ))}
            </dl>
            <h3>加扣分依据</h3>
            {[
              ...report.deductions.map((item) => ({ ...item, label: "扣" })),
              ...report.bonuses.map((item) => ({ ...item, label: "加" })),
            ].map((item, index) => (
              <p key={index}>
                {item.ruleId} ·{" "}
                {item.status === "APPLIED"
                  ? `${item.label} ${item.points}`
                  : "未计入评分"}{" "}
                · {item.evidence}
              </p>
            ))}
            <h3>逐题回顾</h3>
            {report.turns.map((turn) => (
              <details key={turn.id}>
                <summary>{turn.question}</summary>
                <p>
                  {turn.answerText ||
                    (turn.status === "skipped" ? "已跳过" : "暂无回答")}
                </p>
                <p>
                  {turn.score?.totalScoreRange?.join("–") ??
                    turn.score?.totalScore ??
                    "暂无有效分"}
                </p>
                <p>{turn.score?.improvements.join("；")}</p>
              </details>
            ))}
            {report.resumeFlags.map((flag, index) => (
              <blockquote key={index}>
                {flag.quote} · {flag.reason}
              </blockquote>
            ))}
            <p>{[...report.strengths, ...report.improvements].join("；")}</p>
            <Action
              variant="secondary"
              onClick={() => downloadJson("练习报告.json", report)}
            >
              导出当前报告
            </Action>
          </>
        )}
      </section>
    </>
  );
}
