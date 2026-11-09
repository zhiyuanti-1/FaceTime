import { useEffect, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { useResumeDrawer } from "../hooks/useResumeDrawer";
import { emptyResume } from "../resume.types";
import { ResumeDetails } from "./ResumeDetails";
import { ResumeEditor } from "./ResumeEditor";
import { ResumeImport } from "./ResumeImport";
import styles from "./ResumeDrawer.module.css";

type ResumeDrawerProps = {
  drawer: ReturnType<typeof useResumeDrawer>;
};

export const ResumeDrawer = ({ drawer }: ResumeDrawerProps) => {
  const { state, pending, error, needsLogin, show, open, save, remove } = drawer;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    const wide = window.matchMedia("(min-width: 58rem)");
    const display = () => {
      if (dialog.open) dialog.close();
      if (wide.matches) dialog.show();
      else dialog.showModal();
      heading.current?.focus();
    };
    display();
    wide.addEventListener("change", display);
    return () => {
      wide.removeEventListener("change", display);
      dialog.close();
      queueMicrotask(() => {
        if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
      });
    };
  }, []);

  useEffect(() => {
    heading.current?.focus();
  }, [state.kind]);

  if (state.kind === "closed") return null;
  const close = () => show({ kind: "closed" });
  let title = "简历详情";
  if (state.kind === "edit") title = state.record ? "编辑简历" : "新建简历";
  if (state.kind === "import") title = "导入简历";
  if (state.kind === "delete") title = "删除简历";
  const record = "record" in state ? state.record : undefined;

  return (
    <dialog className={styles.drawer} ref={dialogRef} aria-labelledby="resumeDrawerTitle"
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); close(); } }}
      onCancel={(event) => { event.preventDefault(); close(); }}>
      <header className={styles.header}>
        <h2 id="resumeDrawerTitle" ref={heading} tabIndex={-1}>{title}</h2>
        <button className="prismButton" type="button" disabled={pending} onClick={close}>关闭</button>
      </header>
      {record && (
        <div className={styles.identity}>
          <div>
            <h3>{record.fields.求职意向.岗位?.trim() || "未填写岗位"}</h3>
            <p>{record.fields.基本信息.姓名?.trim() || "未填写姓名"}</p>
          </div>
          {state.kind === "view" && (
            <button className="prismButton" data-variant="primary" type="button"
              onClick={() => show({ kind: "edit", record })}>编辑简历</button>
          )}
        </div>
      )}
      <div className={styles.body}>
        {error && <p className="prismNotice" role="alert">{error}</p>}
        {needsLogin && <Link className="prismButton" to="/login?next=/resumes" target="_blank" rel="noopener">
          在新标签页登录
        </Link>}
        {state.kind === "loading" && <p role="status">正在加载简历…</p>}
        {state.kind === "failed" && !needsLogin &&
          <button className="prismButton" type="button" onClick={() => void open(state.id)}>重试</button>}
        {state.kind === "import" && <ResumeImport
          onReady={(draft) => show({ kind: "edit", draft })}
          onManual={(rawText) => show({ kind: "edit", rawText })} />}
        {state.kind === "edit" && (
          <>
            {state.draft && <p role="status">识别完成，请核对字段后保存。</p>}
            {state.rawText && <details className={styles.sourceText}>
              <summary>查看提取原文</summary>
              <pre>{state.rawText}</pre>
            </details>}
            <ResumeEditor initial={state.record?.fields ?? state.draft ?? emptyResume} pending={pending}
              onSave={save} onCancel={() => show(state.record ? { kind: "view", record: state.record } : { kind: "closed" })} />
          </>
        )}
        {state.kind === "view" && (
          <>
            <ResumeDetails fields={state.record.fields} />
            <div className={styles.actions}>
              <button className="prismButton" data-variant="danger" type="button"
                onClick={() => show({ kind: "delete", record: state.record })}>删除简历</button>
            </div>
          </>
        )}
        {state.kind === "delete" && (
          <>
            <p>将删除「{state.record.fields.基本信息.姓名?.trim() || "未填写姓名"}」的这份简历及全部明细。删除后无法恢复。</p>
            <div className={styles.actions}>
              <button className="prismButton" type="button" disabled={pending}
                onClick={() => show({ kind: "view", record: state.record })}>取消</button>
              <button className="prismButton" data-variant="danger" type="button" disabled={pending}
                onClick={remove}>{pending ? "删除中…" : "确认删除"}</button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
};
