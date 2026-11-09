import type { ResumeFields } from "@face/shared";
import { useState } from "react";
import { ResumeEntryList } from "./ResumeEntryList";
import { ResumeFieldGroup } from "./ResumeFieldGroup";
import { ResumeTextItems } from "./ResumeTextItems";
import styles from "./ResumeEditor.module.css";

type ResumeEditorProps = {
  initial: ResumeFields;
  pending: boolean;
  onSave: (fields: ResumeFields) => void;
  onCancel: () => void;
};

export const ResumeEditor = ({ initial, pending, onSave, onCancel }: ResumeEditorProps) => {
  const [fields, setFields] = useState(initial);
  const change = <K extends keyof ResumeFields,>(key: K, value: ResumeFields[K]) =>
    setFields((current) => ({ ...current, [key]: value }));

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave(fields); }}>
      <fieldset className={styles.formBody} disabled={pending}>
        <section className={styles.group} aria-label="基本信息">
          <h3>基本信息</h3>
          <ResumeFieldGroup value={fields.基本信息} onChange={(value) => change("基本信息", value)} />
        </section>
        <section className={styles.group} aria-label="求职意向">
          <h3>求职意向</h3>
          <ResumeFieldGroup value={fields.求职意向} onChange={(value) => change("求职意向", value)} />
        </section>
        <ResumeEntryList label="教育经历" entries={fields.教育经历} onChange={(value) => change("教育经历", value)}
          empty={{ 学校: null, 学历: null, 专业: null, 开始: null, 结束: null, 学制: null, 学习形式: null, 排名: null }} />
        <ResumeEntryList label="实习/工作经历" entries={fields["实习/工作经历"]}
          onChange={(value) => change("实习/工作经历", value)}
          empty={{ 公司名: null, 工作类型: null, 部门: null, 职位: null, 开始: null, 结束: null, 主要工作内容: [] }} />
        <ResumeEntryList label="项目经历" entries={fields.项目经历} onChange={(value) => change("项目经历", value)}
          empty={{ 项目名称: null, 开始: null, 结束: null, 职责: [], 成果: [] }} />
        <ResumeEntryList label="校园经历" entries={fields.校园经历} onChange={(value) => change("校园经历", value)}
          empty={{ 组织名称: null, 职位: null, 主要工作内容: [] }} />
        <ResumeEntryList label="语言能力" entries={fields.语言能力} onChange={(value) => change("语言能力", value)}
          empty={{ 语言: null, 等级: null }} />
        <details className={styles.group}>
          <summary>技能、自我评价与其他</summary>
          <ResumeTextItems label="技能" items={fields.技能} onChange={(items) => change("技能", items)} />
          <label className={styles.field}>自我评价
            <textarea className="prismInput" rows={4} maxLength={2000} value={fields.自我评价 ?? ""}
              onChange={(event) => change("自我评价", event.target.value || null)} />
          </label>
          <ResumeTextItems label="爱好" items={fields.爱好} onChange={(items) => change("爱好", items)} />
          <ResumeTextItems label="其他" items={fields.其他} onChange={(items) => change("其他", items)} />
        </details>
      </fieldset>
      <div className={styles.actions}>
        <button className="prismButton" type="button" disabled={pending} onClick={onCancel}>取消</button>
        <button className="prismButton" data-variant="primary" type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存简历"}
        </button>
      </div>
    </form>
  );
};
