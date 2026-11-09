import type { ResumeFields } from "@face/shared";
import { useState } from "react";
import type { FieldValues } from "./ResumeFieldGroup";
import styles from "./ResumeEditor.module.css";
import panel from "./ResumeDrawer.module.css";

const populated = (value: FieldValues[string]) => Array.isArray(value) ? value.length > 0 : Boolean(value);

const showFields = (fields: FieldValues) => {
  const entries = Object.entries(fields).filter(([, value]) => populated(value));
  if (!entries.length) return <p className={styles.hint}>暂无填写</p>;
  return (
    <dl className={styles.detailFields}>
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{Array.isArray(value) ? <ul>{value.map((item, index) => <li key={index}>{item || "空条目"}</li>)}</ul> : value}</dd>
        </div>
      ))}
    </dl>
  );
};

type ResumeDetailsProps = {
  fields: ResumeFields;
};

export const ResumeDetails = ({ fields }: ResumeDetailsProps) => {
  const [active, setActive] = useState("identity");
  const sections: { id: string; label: string; entries: readonly FieldValues[] }[] = [
    { id: "identity", label: "基本信息", entries: [fields.基本信息] },
    { id: "intent", label: "求职意向", entries: [fields.求职意向] },
    { id: "education", label: "学业情况", entries: fields.教育经历 },
    { id: "work", label: "实习 / 工作经历", entries: fields["实习/工作经历"] },
    { id: "project", label: "项目经历", entries: fields.项目经历 },
    { id: "campus", label: "校园经历", entries: fields.校园经历 },
    { id: "skill", label: "技能与语言", entries: [{ 技能: fields.技能 }, ...fields.语言能力] },
    { id: "other", label: "自我评价与其他", entries: [{ 自我评价: fields.自我评价, 爱好: fields.爱好, 其他: fields.其他 }] },
  ];
  return (
    <div className={panel.detailLayout}>
      <nav aria-label="简历详情分区" className={panel.sectionNav}>
        {sections.map(({ id, label }) => (
          <button key={id} type="button" aria-current={id === active ? "location" : undefined} onClick={() => {
            const heading = document.getElementById(`resume-section-${id}`);
            heading?.scrollIntoView({ block: "nearest" });
            heading?.focus({ preventScroll: true });
            setActive(id);
          }}>{label}</button>
        ))}
      </nav>
      <div className={styles.formBody}>
        {sections.map(({ id, label, entries }) => (
          <section className={styles.group} key={id}>
            <h3 id={`resume-section-${id}`} tabIndex={-1}>{label}</h3>
            {entries.length ? entries.map((entry, index) =>
              <div className={entries.length > 1 ? styles.entry : undefined} key={index}>{showFields(entry)}</div>
            ) : <p className={styles.hint}>暂无填写</p>}
          </section>
        ))}
      </div>
    </div>
  );
};
