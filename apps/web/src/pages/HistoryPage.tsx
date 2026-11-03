import { Badge, Button, Card, Heading, Notice } from "../components/PreviewUi";
const records = [
  ["11-03 09:41", "前端 · 自定义", "10", "78.4", "已完成"],
  ["11-02 22:10", "前端 · 自定义", "10", "—", "未完成 6/10"],
  ["11-02 20:03", "后端 · Java", "10", "71.2", "已完成"],
  ["11-01 19:22", "前端 · 自定义", "10", "65.8", "已完成"],
  ["10-31 21:05", "前端 · 自定义", "8", "—", "已放弃"],
] as const;
export function HistoryPage() {
  return (
    <div className="history-page">
      <Card className="history-toolbar">
        <Heading title="历史记录" />
        <strong>共 5 场 · 示例</strong>
        <div className="segments">
          <span className="selected">全部</span>
          <span>已完成</span>
          <span>未完成</span>
        </div>
        <span className="muted">按时间倒序</span>
      </Card>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {["时间", "岗位", "题量", "总分", "状态", "操作"].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map(([time, role, count, score, status]) => (
              <tr key={time}>
                <td>
                  {time}
                  {status.startsWith("未完成") && (
                    <small>离开时停在第6题，可继续（该题需重录）</small>
                  )}
                </td>
                <td>{role}</td>
                <td>{count}</td>
                <td>
                  <strong className={score === "—" ? "muted" : ""}>
                    {score}
                  </strong>
                </td>
                <td>
                  <Badge
                    tone={
                      status === "已完成"
                        ? "green"
                        : status.startsWith("未完成")
                          ? "amber"
                          : ""
                    }
                  >
                    {status}
                  </Badge>
                </td>
                <td>
                  <Button primary={status.startsWith("未完成")}>
                    {status.startsWith("未完成") ? "继续" : "查看"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Notice>
        <strong>恢复规则</strong>
        <p>
          刷新或崩溃后回到「当前题」重录，已完成题目不丢；音频默认保留 7
          天，超期自动清理但保留报告。
        </p>
        <p>
          删除记录 = 同时删除 session / audio / report 三处，并在 IndexedDB
          中真实清除。
        </p>
        <p className="muted">
          以上为未来功能说明；当前历史列表为固定示例，没有读取本地数据。
        </p>
      </Notice>
      <div className="actions right">
        <Button>清除全部音频</Button>
      </div>
    </div>
  );
}
