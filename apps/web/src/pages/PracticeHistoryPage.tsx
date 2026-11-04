import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PracticeHistory } from "@face/shared";
import { coreApi } from "../services/repositories/core-api";
import { errorMessage } from "../services/http/client";
import {
  EmptyState,
  Feedback,
  PageHeading,
  formatDate,
} from "../components/WorkbenchUi";
export function PracticeHistoryPage() {
  const [items, setItems] = useState<PracticeHistory>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    coreApi
      .history()
      .then(setItems)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <PageHeading
        number="03"
        title="每一次认真回答，都有迹可循。"
        description="打开一份练习，继续作答或回看已经保存的内容。"
        aside={
          <Link className="text-link" to="/practice/new">
            开始新的练习 ↗
          </Link>
        }
      />
      <Feedback message={error} />
      <section className="paper-panel">
        <div className="panel-heading">
          <h2>练习记录</h2>
          <span>{items.length} 次练习</span>
        </div>
        {loading ? (
          <p>正在读取记录…</p>
        ) : items.length ? (
          items.map((item, i) => (
            <div key={item.id}>
              <Link className="history-row" to={`/practice/${item.id}`}>
                <span className="section-number">
                  {String(items.length - i).padStart(2, "0")}
                </span>
                <div>
                  <h3>
                    {item.answered + item.skipped === item.count
                      ? "已完成练习"
                      : "继续这次练习"}
                  </h3>
                  <p>
                    {item.jobTitle || "知识专项"} · {formatDate(item.createdAt)}{" "}
                    · {item.count} 道题
                  </p>
                </div>
                <span>
                  {item.answered} / {item.count} 已回答 →
                </span>
              </Link>
              {item.latestReport && (
                <Link to={`/practice/${item.id}/report`}>
                  查看报告{item.latestReport.stale && "（已过期）"}
                </Link>
              )}
            </div>
          ))
        ) : (
          <EmptyState
            title="积累从第一题开始"
            description="生成一份定向练习后，这里会保存你的题目和回答。"
          />
        )}
      </section>
    </>
  );
}
