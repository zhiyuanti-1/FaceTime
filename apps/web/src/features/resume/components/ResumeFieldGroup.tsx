import { ResumeTextItems } from "./ResumeTextItems";
import styles from "./ResumeEditor.module.css";

export type FieldValues = Record<string, string | null | string[]>;

type ResumeFieldGroupProps<T extends FieldValues> = {
  value: T;
  onChange: (value: T) => void;
};

export const ResumeFieldGroup = <T extends FieldValues,>({ value, onChange }: ResumeFieldGroupProps<T>) => (
  <div className={styles.grid}>
    {Object.entries(value).map(([label, field]) => Array.isArray(field) ? (
      <ResumeTextItems key={label} label={label} items={field}
        onChange={(items) => onChange({ ...value, [label]: items })} />
    ) : (
      <label className={styles.field} key={label}>
        {label}
        <input className="prismInput" value={field ?? ""} maxLength={2000}
          onChange={(event) => onChange({ ...value, [label]: event.target.value || null })} />
      </label>
    ))}
  </div>
);
