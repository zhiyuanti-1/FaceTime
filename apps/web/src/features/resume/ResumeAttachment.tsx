import { useEffect, useState } from "react";
import type { Resume } from "@face/shared";
import { Action, Feedback } from "../../components/WorkbenchUi";
import { errorMessage } from "../../services/http/client";
import { coreApi } from "../../services/repositories/core-api";

export function ResumeAttachment({ resume }: { resume: Resume }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ url: string; text?: string }>();
  const [error, setError] = useState("");
  const supported = ["pdf", "image", "txt"].includes(resume.source);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let url: string | undefined;
    void coreApi
      .previewResumeFile(resume.id, controller.signal)
      .then(async (file) => {
        const text = resume.source === "txt" ? await file.text() : undefined;
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(file);
        setPreview({ url, text });
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, resume.id, resume.source]);

  return (
    <aside className="paper-panel resume-attachment">
      <h2>附件原件</h2>
      <p>{resume.filename}</p>
      <a className="text-link" href={coreApi.fileUrl(resume.id)}>
        下载原件
      </a>
      {supported && (
        <Action
          variant="secondary"
          onClick={() => {
            setPreview(undefined);
            setError("");
            setOpen(!open);
          }}
        >
          {open ? "收起预览" : "查看原件"}
        </Action>
      )}
      {!supported && <p>下载后可使用本机文档应用查看。</p>}
      <Feedback message={error} />
      {open && !preview && !error && <p>正在读取原件…</p>}
      {open &&
        preview &&
        (preview.text !== undefined ? (
          <pre>{preview.text}</pre>
        ) : resume.source === "image" ? (
          <img src={preview.url} alt="简历附件原件" />
        ) : (
          <iframe src={preview.url} title="简历 PDF 原件" />
        ))}
    </aside>
  );
}
