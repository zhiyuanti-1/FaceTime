import type { ResumeSummary } from "@face/shared";
import { Action, DocumentIcon, formatDate } from "../../components/WorkbenchUi";

export function ResumeLibrary({
  items,
  onSelect,
  onAdd,
  onRemove,
  busy,
}: {
  items: ResumeSummary[];
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  busy: boolean;
}) {
  return (
    <ul className="resume-card-grid" aria-label="我的简历">
      {items.map((item) => (
        <li key={item.id} className="paper-panel resume-card">
          <button
            type="button"
            className="resume-card-open"
            onClick={() => onSelect(item.id)}
            disabled={busy}
          >
            <DocumentIcon />
            <strong>{item.filename}</strong>
            <small>
              {formatDate(item.updatedAt)} ·{" "}
              {item.status === "failed"
                ? "识别失败"
                : item.status === "ready"
                  ? "可查看"
                  : "处理中"}
            </small>
          </button>
          <Action
            variant="quiet"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `确认删除「${item.filename}」及原附件？历史练习保留创建时的快照。`,
                )
              )
                onRemove(item.id);
            }}
          >
            删除
          </Action>
        </li>
      ))}
      {items.length < 3 && (
        <li className="paper-panel resume-card resume-card-add">
          <button
            type="button"
            className="resume-card-open"
            onClick={onAdd}
            disabled={busy}
          >
            <span aria-hidden="true">＋</span>
            <strong>新增简历</strong>
            <small>导入文件并核对内容</small>
          </button>
        </li>
      )}
    </ul>
  );
}
