import { useRef, useState, type DragEvent } from "react";
import { Action, DocumentIcon } from "../../components/WorkbenchUi";
export function ResumeUpload({
  busy,
  onUpload,
  maxMb,
  onError,
}: {
  busy: boolean;
  onUpload: (file: File) => Promise<void>;
  maxMb: number;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [dragging, setDragging] = useState(false);
  function choose(value: File | undefined) {
    if (!value) return;
    if (!/\.(pdf|docx?|txt)$/i.test(value.name)) {
      onError("仅支持PDF、DOC、DOCX或UTF-8 TXT文件");
      return;
    }
    if (value.size > maxMb * 1024 * 1024) {
      onError(`文件超过${maxMb}MB，请压缩后上传`);
      return;
    }
    setFile(value);
    setAgreed(false);
    onError("");
  }
  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0]);
  }
  async function upload() {
    if (!file) return;
    await onUpload(file);
    setFile(null);
    setAgreed(false);
    if (input.current) input.current.value = "";
  }
  const pdf = !!file && /\.pdf$/i.test(file.name);
  return (
    <section className="upload-panel">
      <div>
        <span className="small-heading">导入你的简历</span>
        <p>支持 Word、PDF 与 TXT。完整保留提取原文，不做 AI 润色。</p>
      </div>
      <div
        className={`upload-drop ${dragging ? "dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          if (!busy) drop(event);
          else event.preventDefault();
        }}
      >
        <DocumentIcon kind="upload" />
        <div>
          <strong>{file ? file.name : "将简历拖到这里，或选择文件"}</strong>
          <p>
            {file
              ? `${(file.size / 1024).toFixed(1)} KB · 尚未上传`
              : `.doc / .docx / .pdf / .txt · 不超过 ${maxMb}MB`}
          </p>
        </div>
        <input
          ref={input}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          disabled={busy}
          onChange={(e) => choose(e.target.files?.[0])}
          className="visually-hidden"
          aria-label="选择简历文件"
        />
        <Action
          variant="secondary"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          选择文件
        </Action>
        <Action
          onClick={() => {
            void upload();
          }}
          disabled={busy || !file || (pdf && !agreed)}
        >
          {busy ? "正在处理…" : "上传并提取 →"}
        </Action>
      </div>
      {pdf && (
        <label className="consent">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={busy}
          />
          我确认将这份 PDF 发送至百度 OCR
          做文字识别；原文件与结果保存在当前账号下。
        </label>
      )}
      <p className="upload-note">
        Word / TXT 在本机提取文字；PDF
        经百度逐页识别。建议先在文档中移除不必要的身份证号等信息。
      </p>
    </section>
  );
}
