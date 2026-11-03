import type { ResumeSummary } from "@face/shared";
import { DocumentIcon, formatDate } from "../../components/WorkbenchUi";
export function ResumeLibrary({
  items,
  selectedId,
  onSelect,
  busy,
  loading,
}: {
  items: ResumeSummary[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  busy: boolean;
  loading: boolean;
}) {
  return (
    <aside className="resume-library">
      <div className="library-heading">
        <h2>我的简历</h2>
        <span>{items.length} 份</span>
      </div>
      <p className="caption">持续保存，随时回来核对。</p>
      {loading ? (
        <p className="library-message">正在加载…</p>
      ) : !items.length ? (
        <p className="library-message">
          上传第一份简历后，
          <br />
          它会保存在这里。
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button
                className={`resume-item ${selectedId === item.id ? "active" : ""}`}
                onClick={() => onSelect(item.id)}
                disabled={busy}
              >
                <DocumentIcon />
                <span>
                  <strong>{item.filename}</strong>
                  <small>
                    {formatDate(item.createdAt)} ·{" "}
                    {item.status === "ready"
                      ? "已提取"
                      : item.status === "failed"
                        ? "待重新识别"
                        : "处理中"}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="library-bottom">
        <span className="tiny-dot" />
        内容仅归属当前登录账号
      </div>
    </aside>
  );
}
