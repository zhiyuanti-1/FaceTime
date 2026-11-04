import { z } from "zod";
import { Action } from "../../components/WorkbenchUi";

export function emptyField(schema: z.ZodType): unknown {
  if (schema instanceof z.ZodArray) return [];
  if (schema instanceof z.ZodObject) {
    return Object.fromEntries(
      Object.entries(schema.shape).map(([key, field]) => [
        key,
        field instanceof z.ZodType ? emptyField(field) : null,
      ]),
    );
  }
  return null;
}

export function ResumeField({
  title,
  schema,
  value,
  change,
}: {
  title: string;
  schema: z.ZodType;
  value: unknown;
  change?: (value: unknown) => void;
}) {
  if (schema instanceof z.ZodObject) {
    const parsed = z.record(z.string(), z.unknown()).parse(value);
    return (
      <div className="resume-field-group">
        {Object.entries(schema.shape).map(
          ([key, field]) =>
            field instanceof z.ZodType && (
              <ResumeField
                key={key}
                title={key}
                schema={field}
                value={parsed[key]}
                change={
                  change && ((next) => change({ ...parsed, [key]: next }))
                }
              />
            ),
        )}
      </div>
    );
  }
  if (schema instanceof z.ZodArray && schema.element instanceof z.ZodType) {
    const element = schema.element;
    const items = z.array(z.unknown()).parse(value);
    if (!change && !items.length) return null;
    return (
      <div className="resume-field-list">
        {title && <strong>{title}</strong>}
        <ol>
          {items.map((item, index) => (
            <li key={index}>
              <ResumeField
                title={`第 ${index + 1} 项`}
                schema={element}
                value={item}
                change={
                  change &&
                  ((next) =>
                    change(
                      items.map((entry, at) => (at === index ? next : entry)),
                    ))
                }
              />
              {change && (
                <Action
                  variant="quiet"
                  onClick={() => change(items.filter((_, at) => at !== index))}
                >
                  删除第 {index + 1} 项
                </Action>
              )}
            </li>
          ))}
        </ol>
        {change && (
          <Action
            variant="secondary"
            disabled={items.length >= 40}
            onClick={() =>
              change([
                ...items,
                element instanceof z.ZodObject ? emptyField(element) : "",
              ])
            }
          >
            添加{title || "条目"}
          </Action>
        )}
      </div>
    );
  }
  const text = typeof value === "string" ? value : "";
  if (change) {
    const label = ["开始", "结束", "出生日期"].includes(title)
      ? `${title}（YYYY、YYYY-MM、YYYY-MM-DD 或至今）`
      : title || "内容";
    return (
      <label className="resume-field">
        {label}
        <textarea
          rows={title === "自我评价" ? 3 : 1}
          value={text}
          maxLength={2000}
          onChange={(event) =>
            change(
              schema instanceof z.ZodNullable && !event.target.value.trim()
                ? null
                : event.target.value,
            )
          }
        />
      </label>
    );
  }
  return text ? (
    <div className="resume-field">
      {title && !title.startsWith("第 ") && <span>{title}</span>}
      <p>{text}</p>
    </div>
  ) : null;
}
