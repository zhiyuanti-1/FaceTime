import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadDashboard } from "../projects/project-api";
import { ProjectDialog } from "../projects/ProjectDialog";
import { ProjectEditor } from "../projects/ProjectEditor";
import { ProjectRows } from "../projects/ProjectRows";
import { useProjectQuery } from "../projects/useProjectQuery";
import { WorkspaceIcon } from "../projects/WorkspaceIcon";
import styles from "./DashboardView.module.css";

const metrics = [
  { title: "项目数", icon: "project" }, { title: "已完成面试", icon: "interview" },
  { title: "平均分", icon: "score" }, { title: "待办", icon: "checklist" },
] as const;

export function DashboardView() {
  const overview = useProjectQuery(loadDashboard);
  const navigate = useNavigate();
  const [overlay, setOverlay] = useState<"create" | "reports" | null>(null);
  const data = overview.state.status === "ready" ? overview.state.data : undefined;

  return <section className="workspacePage" aria-label="工作台">
    <div className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1>{data ? `你好，${data.username}` : "工作台"}</h1>
        <p>整理岗位与简历，继续你的面试备战。</p>
      </div>
      <div className={styles.art} aria-hidden="true">
        <span className={styles.facet} /><span className={styles.facetPink} />
        <span className={styles.paper}><span><WorkspaceIcon name="score" /> AI 面试</span><i /><i /><i /></span>
        <span className={styles.chart}><WorkspaceIcon name="chart" /></span>
      </div>
    </div>

    <dl className={styles.metrics} aria-label="备战概览">
      {metrics.map(({ title, icon }, index) => <div className={styles.metric} data-tone={index} key={title}>
        <span className={styles.metricIcon}><WorkspaceIcon name={icon} /></span>
        <dt>{title}</dt><dd>{index === 0 && data ? data.projectCount : "—"}</dd>
        {index !== 0 && <small>待接入</small>}
      </div>)}
    </dl>

    <section className="workspacePanel" aria-labelledby="recent-projects">
      <div className="workspaceSectionHeading"><h2 id="recent-projects">最近项目</h2><Link to="/projects">查看全部 <span aria-hidden="true">→</span></Link></div>
      {overview.state.status === "loading" && <p role="status">正在加载工作台…</p>}
      {overview.state.status === "error" && <div><p className="prismNotice" role="alert">{overview.state.message}</p><button type="button" className="prismButton" onClick={overview.retry}>重试</button></div>}
      {data && <ProjectRows projects={data.recentProjects} />}
    </section>

    <section className="workspacePanel" aria-labelledby="quick-actions">
      <div className="workspaceSectionHeading"><h2 id="quick-actions">快捷操作</h2></div>
      <div className={styles.actions}>
        <button type="button" className="prismButton" data-variant="primary" onClick={() => setOverlay("create")}><WorkspaceIcon name="plus" /> 新建面试项目</button>
        <Link className="prismButton" to="/resumes?import=1"><WorkspaceIcon name="document" /> 上传简历</Link>
        <button type="button" className="prismButton" onClick={() => setOverlay("reports")}><WorkspaceIcon name="project" /> 查看历史报告</button>
      </div>
    </section>
    {overlay === "create" && <ProjectEditor onClose={() => setOverlay(null)} onSaved={(project) => void navigate(`/project/${project.id}`)} />}
    {overlay === "reports" && <ProjectDialog title="历史报告" onClose={() => setOverlay(null)}><p>历史报告功能待接入。你可以先在面试项目中准备岗位和简历。</p><Link className="prismButton" to="/projects">查看面试项目</Link></ProjectDialog>}
  </section>;
}
