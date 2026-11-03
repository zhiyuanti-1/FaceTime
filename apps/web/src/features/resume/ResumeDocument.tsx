import { useState } from "react";
import type { Resume } from "@face/shared";
import { Link } from "react-router-dom";
import { Action, Feedback, formatDate } from "../../components/WorkbenchUi";
export function ResumeDocument({
  resume,
  draft,
  onDraft,
  onSave,
  onRetry,
  onDiscard,
  busy,
  dirty,
}: {
  resume: Resume;
  draft: string;
  onDraft: (text: string) => void;
  onSave: () => Promise<void>;
  onRetry: () => Promise<void>;
  onDiscard: () => void;
  busy: boolean;
  dirty: boolean;
}) {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(resume.rawText);
      setMessage("识别原文已复制");
    } catch {
      setMessage("浏览器未允许复制，请选中原文手动复制");
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([resume.rawText], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = resume.filename + ".识别原文.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="resume-document">
      <div className="document-toolbar">
        <div>
          <h2>{resume.filename}</h2>
          <p>
            {resume.source === "pdf"
              ? resume.status === "ready"
                ? "百度 OCR · 逐页原文"
                : "百度 OCR · 待识别"
              : "本机文字提取"}{" "}
            · {formatDate(resume.updatedAt)}
          </p>
        </div>
        <a className="text-link" href={`/api/v1/resumes/${resume.id}/file`}>
          下载原文件 ↗
        </a>
      </div>
      {resume.error && (
        <div className="document-alert">
          <Feedback message={resume.error} />
          <Action
            variant="secondary"
            onClick={() => {
              void onRetry();
            }}
            disabled={busy}
          >
            重新识别
          </Action>
        </div>
      )}
      <div className="document-columns">
        <div className="source-pane">
          <div className="pane-heading">
            <h3>识别原文</h3>
            <div>
              <button
                onClick={() => {
                  void copy();
                }}
                disabled={!resume.rawText}
              >
                复制
              </button>
              <button onClick={download} disabled={!resume.rawText}>
                导出 TXT
              </button>
            </div>
          </div>
          <p className="pane-note">保留原始输出，用于核对识别是否正确。</p>
          {resume.pages.length ? (
            <div className="source-pages">
              {resume.pages.map((page) => (
                <article key={page.page}>
                  <span className="page-label">第 {page.page} 页</span>
                  <pre>{page.text}</pre>
                </article>
              ))}
            </div>
          ) : (
            <div className="document-empty">
              尚无可展示的识别文字。
              <br />
              原文件已保存，可以配置后重试，或在右侧手动录入。
            </div>
          )}
        </div>
        <div className="edit-pane">
          <div className="pane-heading">
            <h3>确认文本</h3>
            <span className={dirty ? "edited-marker" : "caption"}>
              {dirty
                ? "未保存修订"
                : resume.editedText !== null
                  ? "已确认"
                  : "待核对"}
            </span>
          </div>
          <p className="pane-note">
            修正错字或换行。保存副本不会覆盖识别原文。
          </p>
          <textarea
            aria-label="确认后的简历文本"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            placeholder="核对原文后，在这里修正或补充内容…"
            disabled={busy}
          />
          <div className="editor-bottom">
            <span>{[...draft].length.toLocaleString()} 字符</span>
            <button onClick={onDiscard} disabled={busy || !dirty}>
              放弃修订
            </button>
          </div>
          <Action
            onClick={() => {
              void onSave();
            }}
            disabled={busy || !draft.trim()}
          >
            确认并保存文本
          </Action>
          <Link className="practice-link" to={`/practice?resume=${resume.id}`}>
            去选择方向，开始文字练习 →
          </Link>
        </div>
      </div>
      <Feedback message={message} tone="info" />
    </section>
  );
}
