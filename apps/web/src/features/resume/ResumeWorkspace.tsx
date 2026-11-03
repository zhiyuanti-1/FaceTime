import { useEffect, useState } from "react";
import {
  PageHeading,
  Feedback,
  EmptyState,
} from "../../components/WorkbenchUi";
import { coreApi } from "../../services/repositories/core-api";
import { useResumeWorkspace } from "./use-resume-workspace";
import { ResumeUpload } from "./ResumeUpload";
import { ResumeLibrary } from "./ResumeLibrary";
import { ResumeDocument } from "./ResumeDocument";
export function ResumeWorkspace() {
  const state = useResumeWorkspace();
  const [maxMb, setMaxMb] = useState(4);
  useEffect(() => {
    coreApi
      .settings()
      .then((value) => setMaxMb(value.uploadMaxMb))
      .catch(() => state.setError("无法读取上传配置，请刷新页面重试"));
  }, []);
  return (
    <>
      <PageHeading
        number="01"
        title="先从一份简历开始。"
        description="上传、核对原文，再开始属于你的定向练习。"
        aside={<span className="workspace-note">你的经历，始终由你确认。</span>}
      />
      <ResumeUpload
        busy={!!state.busy}
        onUpload={state.upload}
        maxMb={maxMb}
        onError={state.setError}
      />
      <Feedback message={state.error} />
      <Feedback message={state.notice} tone="success" />
      <Feedback message={state.busy} tone="info" />
      <div className="resume-workspace">
        <ResumeLibrary
          items={state.items}
          selectedId={state.selected?.id}
          onSelect={(id) => {
            void state.select(id);
          }}
          busy={!!state.busy}
          loading={state.loading}
        />
        {state.selected ? (
          <ResumeDocument
            key={state.selected.id}
            resume={state.selected}
            draft={state.draft}
            onDraft={state.setDraft}
            onSave={state.save}
            onRetry={state.recognize}
            onDiscard={state.discard}
            busy={!!state.busy}
            dirty={state.dirty}
          />
        ) : (
          <EmptyState
            title="让简历里的每一句，都被准确看见。"
            description="上传后，这里会展示完整识别原文和确认文本。不会自动补全经历，也不会用AI改写你的内容。"
          />
        )}
      </div>
    </>
  );
}
