import { useEffect, useState } from "react";
import { Action, PageHeading, Feedback } from "../../components/WorkbenchUi";
import { coreApi } from "../../services/repositories/core-api";
import { errorMessage } from "../../services/http/client";
import { useResumeWorkspace } from "./use-resume-workspace";
import { ResumeUpload } from "./ResumeUpload";
import { ResumeLibrary } from "./ResumeLibrary";
import { ResumeDocument } from "./ResumeDocument";
import { ResumeStructureEditor } from "./ResumeStructureEditor";
import { ResumeAttachment } from "./ResumeAttachment";

export function ResumeWorkspace() {
  const [adding, setAdding] = useState(false);
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const [fieldsBusy, setFieldsBusy] = useState(false);
  const [text, setText] = useState("");
  const [maxMb, setMaxMb] = useState<number>();
  const [settingsError, setSettingsError] = useState("");
  const state = useResumeWorkspace();
  const busy = !!state.busy || fieldsBusy;
  useEffect(() => {
    if (!adding) return;
    coreApi
      .settings()
      .then((value) => setMaxMb(value.uploadMaxMb))
      .catch((error) => setSettingsError(errorMessage(error)));
  }, [adding]);
  function back() {
    if (
      (state.dirty || fieldsDirty) &&
      !window.confirm("确认放弃尚未保存的简历修改或草稿？")
    )
      return;
    setAdding(false);
    setText("");
    state.close();
  }

  return (
    <>
      <PageHeading
        number="01"
        title={state.selected ? "简历详情" : adding ? "新增简历" : "我的简历"}
        description={
          state.selected
            ? "按章节核对内容，旁边可查看导入的原件。"
            : `已使用 ${state.items.length} / 3 个简历名额`
        }
        aside={
          (adding || state.selected) && (
            <Action variant="secondary" disabled={busy} onClick={back}>
              返回简历列表
            </Action>
          )
        }
      />
      <Feedback message={state.error} />
      <Feedback message={state.notice} tone="success" />
      <Feedback message={state.busy} tone="info" />
      {state.selected ? (
        <>
          <div className="resume-detail-layout">
            <ResumeStructureEditor
              key={state.selected.id}
              resume={state.selected}
              imported={state.fieldsDraft}
              onDiscardImport={state.clearFieldsDraft}
              disabled={!!state.busy || state.dirty}
              onBusy={setFieldsBusy}
              onDirty={setFieldsDirty}
            />
            <ResumeAttachment key={state.selected.id} resume={state.selected} />
          </div>
          <details className="paper-panel resume-source-tools">
            <summary>核对识别原文与练习入口</summary>
            <ResumeDocument
              key={state.selected.id}
              resume={state.selected}
              draft={state.draft}
              onDraft={state.setDraft}
              onSave={state.save}
              onRetry={state.recognize}
              onDiscard={state.discard}
              busy={busy || fieldsDirty}
              dirty={state.dirty}
            />
          </details>
        </>
      ) : adding ? (
        <>
          <Feedback message={settingsError} />
          {maxMb !== undefined && (
            <ResumeUpload
              busy={busy || state.items.length >= 3}
              maxMb={maxMb}
              onUpload={state.upload}
              onError={state.setError}
            />
          )}
          <details className="paper-panel resume-source-tools">
            <summary>粘贴简历文本</summary>
            <textarea
              aria-label="粘贴简历文本"
              value={text}
              maxLength={200000}
              onChange={(event) => setText(event.target.value)}
              disabled={busy}
            />
            <Action
              disabled={!text.trim() || busy || state.items.length >= 3}
              onClick={() => void state.paste(text)}
            >
              保存粘贴简历
            </Action>
          </details>
        </>
      ) : state.loading ? (
        <p>正在读取简历列表…</p>
      ) : !state.listReady ? (
        <Action variant="secondary" onClick={() => void state.retryList()}>
          重新读取简历列表
        </Action>
      ) : (
        <ResumeLibrary
          items={state.items}
          busy={busy}
          onSelect={(id) => void state.select(id)}
          onRemove={(id) => void state.remove(id)}
          onAdd={() => {
            setSettingsError("");
            state.setError("");
            setAdding(true);
          }}
        />
      )}
    </>
  );
}
