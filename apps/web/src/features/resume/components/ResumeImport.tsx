import type { ResumeFields } from "@face/shared";
import { Link } from "react-router-dom";
import { useResumeImport } from "../hooks/useResumeImport";
import styles from "./ResumeDrawer.module.css";

type ResumeImportProps = {
  onReady: (fields: ResumeFields) => void;
  onManual: (rawText?: string) => void;
};

export const ResumeImport = ({ onReady, onManual }: ResumeImportProps) => {
  const { file, pending, error, choose, submit } = useResumeImport(onReady);
  return (
    <form className={styles.importForm} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label className={styles.fileLabel}>
        选择简历文件
        <input className="prismInput" type="file" accept=".pdf,.docx,.doc,.txt" disabled={pending}
          aria-describedby="resumeImportHint" onChange={(event) => choose(event.target.files?.[0])} />
      </label>
      <p id="resumeImportHint">支持 PDF、Word 和 UTF-8 TXT。PDF 将发送给百度 OCR，Word 和 TXT 在本机提取文字。</p>
      {pending && <p role="status">正在提取文字和识别简历字段，请稍候…</p>}
      {error && <p className="prismNotice" role="alert">{error.message}</p>}
      {error?.needsLogin && <Link to="/login?next=/resumes" target="_blank" rel="noopener">在新标签页登录</Link>}
      <div className={styles.actions}>
        <button className="prismButton" type="button" disabled={pending} onClick={() => onManual(error?.rawText)}>
          手动录入
        </button>
        <button className="prismButton" data-variant="primary" type="submit" disabled={!file || pending}>
          {pending ? "识别中…" : error ? "重试识别" : "开始识别"}
        </button>
      </div>
    </form>
  );
};
