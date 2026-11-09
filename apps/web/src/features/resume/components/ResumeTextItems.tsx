import styles from "./ResumeEditor.module.css";

type ResumeTextItemsProps = {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
};

export const ResumeTextItems = ({ label, items, onChange }: ResumeTextItemsProps) => (
  <fieldset className={styles.items}>
    <legend>{label}</legend>
    {items.map((item, index) => (
      <div className={styles.item} key={index}>
        <textarea
          className="prismInput"
          aria-label={`${label}第 ${index + 1} 条`}
          rows={2}
          maxLength={2000}
          value={item}
          onChange={(event) => onChange(items.map((text, position) =>
            position === index ? event.target.value : text))}
        />
        <button className="prismButton" type="button" aria-label={`移除${label}第 ${index + 1} 条`}
          onClick={() => onChange(items.filter((_, position) => position !== index))}>移除</button>
      </div>
    ))}
    <button className="prismButton" type="button" disabled={items.length >= 40}
      onClick={() => onChange([...items, ""])}>添加{label}</button>
  </fieldset>
);
