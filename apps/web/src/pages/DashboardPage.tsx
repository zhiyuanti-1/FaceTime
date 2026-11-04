import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Feedback, PageHeading } from "../components/WorkbenchUi";
import { errorMessage } from "../services/http/client";
import { coreApi } from "../services/repositories/core-api";

export function DashboardPage() {
  const [data, setData] =
    useState<Awaited<ReturnType<typeof coreApi.dashboard>>>();
  const [error, setError] = useState("");
  useEffect(() => {
    coreApi
      .dashboard()
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, []);
  return (
    <>
      <PageHeading
        number="01"
        title="工作台"
        description="查看练习进度，或搭配岗位与简历开始新练习。"
      />
      <Feedback message={error} />
      <section className="paper-panel">
        <Link to="/practice/new">开始新练习</Link>
        {data ? (
          <>
            <p>
              <Link to="/me/resume">我的简历 {data.resumeCount}/3</Link> ·{" "}
              {data.practiceCount} 场练习 · {data.unfinishedCount} 场待完成
            </p>
            {data.latestScore && (
              <p>
                <Link to={`/practice/${data.latestScore.sessionId}/report`}>
                  最近报告
                </Link>{" "}
                ·{" "}
                {data.latestScore.totalScoreRange?.join("–") ??
                  data.latestScore.totalScore ??
                  "暂无有效分"}{" "}
                {data.latestScore.stale && "（已过期）"}
              </p>
            )}
            <h2>最近练习</h2>
            {data.recent.length ? (
              <ul>
                {data.recent.map((item) => (
                  <li key={item.id}>
                    <Link to={`/practice/${item.id}`}>
                      {item.jobTitle || "知识专项"} · {item.answered} 已答 /{" "}
                      {item.count} 题
                    </Link>
                    {item.hasReport && (
                      <>
                        {" "}
                        · <Link to={`/practice/${item.id}/report`}>报告</Link>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>暂无练习记录。</p>
            )}
          </>
        ) : (
          !error && <p>正在读取工作台…</p>
        )}
      </section>
    </>
  );
}
