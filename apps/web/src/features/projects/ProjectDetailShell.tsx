import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listResumes } from "../resume/services/resume-api";
import { getProject } from "./project-api";
import { ProjectDeleteDialog } from "./ProjectDeleteDialog";
import { ProjectEditor } from "./ProjectEditor";
import { useProjectQuery } from "./useProjectQuery";
import styles from "./ProjectDetailShell.module.css";

const tabs = [
  ["resume-job", "简历与岗位"], ["gap", "Gap 诊断"],
  ["narrative", "叙事定制"], ["questions", "题目预览"],
] as const;

type ProjectDetailShellProps = { id: string };

export function ProjectDetailShell({ id }: ProjectDetailShellProps) {
  const load = useCallback((signal: AbortSignal) => getProject(id, signal), [id]);
  const project = useProjectQuery(load);
  const resumes = useProjectQuery(listResumes, false);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [overlay, setOverlay] = useState<"edit" | "delete" | null>(null);
  const selected = tabs.find(([key]) => key === params.get("tab"))?.[0] ?? "resume-job";
  const data = project.state.status === "ready" ? project.state.data : undefined;
  const resume = resumes.state.status === "ready" ? resumes.state.data.find((item) => item.id === data?.resumeId) : undefined;
  const resumeLabel = [resume?.fullName, resume?.desiredRole].filter(Boolean).join(" · ") || "已关联简历";
  const projectName = data ? [data.targetRole, data.targetCompany].filter(Boolean).join(" · ") : "项目详情";

  return <section className="workspacePage" aria-labelledby="project-detail-title">
    <Link className={styles.back} to="/projects">← 返回面试项目</Link>
    <div className="workspaceBanner">
      <div><h1 id="project-detail-title">{projectName}</h1><p>项目详情</p></div>
      {data && <div className={styles.actions}>
        <button type="button" className="prismButton" data-variant="primary" onClick={() => setOverlay("edit")}>编辑项目</button>
        <button type="button" className="prismButton" data-variant="danger" onClick={() => setOverlay("delete")}>删除项目</button>
      </div>}
    </div>
    {project.state.status === "loading" && <p role="status">正在加载项目…</p>}
    {project.state.status === "error" && <div className="workspacePanel"><p role="alert" className="prismNotice">{project.state.message}</p><button type="button" className="prismButton" onClick={project.retry}>重试</button></div>}
    {data && <section className="workspacePanel" aria-label="项目内容">
      <nav aria-label="项目详情标签" className="tabs">
        {tabs.map(([key, label]) => (
          <button type="button" key={key} aria-current={selected === key ? "page" : undefined}
            onClick={() => setParams({ tab: key })}>{label}</button>
        ))}
      </nav>
      {selected === "resume-job" ? <div className={styles.materials}>
        <div><h2>选用简历</h2><Link to="/resumes">{resumeLabel} <span aria-hidden="true">↗</span></Link></div>
        <div><h2>岗位描述（JD）</h2><p className={styles.description}>{data.jdText}</p></div>
      </div> : <p className={styles.placeholder}>{tabs.find(([key]) => key === selected)?.[1]}待接入。</p>}
    </section>}
    {data && overlay === "edit" && <ProjectEditor project={data} onClose={() => setOverlay(null)} onSaved={(saved) => { project.setData(saved); setOverlay(null); }} />}
    {data && overlay === "delete" && <ProjectDeleteDialog id={data.id} name={projectName} onClose={() => setOverlay(null)} onDeleted={() => void navigate("/projects", { replace: true })} />}
  </section>;
}
