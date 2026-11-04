import { useEffect, useState } from "react";
import { z } from "zod";
import { resumeFields, type Resume, type ResumeFields } from "@face/shared";
import { Action, Feedback } from "../../components/WorkbenchUi";
import { errorMessage } from "../../services/http/client";
import { coreApi } from "../../services/repositories/core-api";

import { emptyField, ResumeField } from "./ResumeField";

export function ResumeStructureEditor({
  resume,
  imported,
  onDiscardImport,
  disabled,
  onBusy,
  onDirty,
}: {
  resume: Resume;
  imported: ResumeFields | null;
  onDiscardImport: () => void;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const [saved, setSaved] = useState<ResumeFields | null>();
  const [draft, setDraft] = useState<unknown>();
  const [generated, setGenerated] = useState<ResumeFields | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const preview = generated ?? imported;
  const value = draft ?? preview ?? saved;
  const editing = draft !== undefined;
  const fields =
    value == null ? null : z.record(z.string(), z.unknown()).parse(value);
  useEffect(() => {
    onDirty(editing || !!preview);
    return () => onDirty(false);
  }, [editing, preview, onDirty]);
  useEffect(() => {
    let active = true;
    coreApi
      .structure(resume.id)
      .then((result) => {
        if (active) setSaved(result.structured);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [resume.id, reload]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  function discard() {
    setDraft(undefined);
    setGenerated(null);
    onDiscardImport();
  }
  return (
    <article className="paper-panel resume-sheet">
      <header className="panel-heading">
        <div>
          <h2>{resume.filename}</h2>
          <p>
            {preview
              ? "导入草稿 · 待核对保存"
              : saved
                ? "已保存的简历"
                : "结构化简历"}
          </p>
        </div>
        {!editing && saved !== undefined && (
          <Action
            disabled={disabled || busy}
            onClick={() => setDraft(value ?? emptyField(resumeFields))}
          >
            编辑
          </Action>
        )}
      </header>
      <Feedback message={error} />
      {saved === undefined &&
        !preview &&
        (error ? (
          <Action
            variant="secondary"
            onClick={() => {
              setError("");
              setReload(reload + 1);
            }}
          >
            重新读取
          </Action>
        ) : (
          <p>正在读取简历…</p>
        ))}
      {saved === null && !preview && !editing && (
        <p>暂无已保存的章节，可生成草稿或手工编辑。</p>
      )}
      {!editing && !preview && resume.status === "ready" && resume.rawText && (
        <Action
          variant="secondary"
          disabled={disabled || busy}
          onClick={() =>
            void run(async () => {
              setGenerated(
                (await coreApi.importStructure(resume.id)).structured,
              );
            })
          }
        >
          从原文生成草稿
        </Action>
      )}
      {fields && (
        <fieldset disabled={disabled || busy} className="resume-chapters">
          {Object.entries(resumeFields.shape).map(([title, schema]) => {
            return (
              <section key={title} className="resume-chapter">
                <h3>{title === "基本信息" ? "个人信息" : title}</h3>
                <ResumeField
                  title=""
                  schema={schema}
                  value={fields[title]}
                  change={
                    (editing &&
                      ((next) => setDraft({ ...fields, [title]: next }))) ||
                    undefined
                  }
                />
              </section>
            );
          })}
          {(editing || preview) && (
            <div className="answer-actions">
              <Action
                onClick={() =>
                  void run(async () => {
                    const parsed = resumeFields.safeParse(value);
                    if (!parsed.success) {
                      const issue = parsed.error.issues[0];
                      throw new Error(
                        `${issue?.path.map(String).join(" / ") ?? "简历字段"}：请检查内容和日期格式。`,
                      );
                    }
                    const result = await coreApi.saveStructure(
                      resume.id,
                      parsed.data,
                    );
                    setSaved(result.structured);
                    discard();
                  })
                }
              >
                {busy ? "正在处理…" : "保存简历"}
              </Action>
              <Action
                variant="quiet"
                onClick={() => (editing ? setDraft(undefined) : discard())}
              >
                {editing ? "取消编辑" : "放弃草稿"}
              </Action>
            </div>
          )}
        </fieldset>
      )}
    </article>
  );
}
