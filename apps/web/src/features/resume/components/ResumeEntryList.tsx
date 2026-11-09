import { ResumeFieldGroup, type FieldValues } from "./ResumeFieldGroup";
import styles from "./ResumeEditor.module.css";

type ResumeEntryListProps<T extends FieldValues> = {
  label: string;
  entries: T[];
  empty: T;
  onChange: (entries: T[]) => void;
};

export const ResumeEntryList = <T extends FieldValues,>({ label, entries, empty, onChange }: ResumeEntryListProps<T>) => (
  <details className={styles.group}>
    <summary>{label}（{entries.length}）</summary>
    {entries.map((entry, index) => (
      <fieldset className={styles.entry} key={index}>
        <legend>{label}第 {index + 1} 条</legend>
        <ResumeFieldGroup value={entry} onChange={(value) =>
          onChange(entries.map((item, position) => position === index ? value : item))} />
        <button className="prismButton" type="button" aria-label={`移除${label}第 ${index + 1} 条`}
          onClick={() => onChange(entries.filter((_, position) => position !== index))}>移除条目</button>
      </fieldset>
    ))}
    <button className="prismButton" type="button" disabled={entries.length >= 40}
      onClick={() => onChange([...entries, empty])}>添加{label}</button>
  </details>
);
