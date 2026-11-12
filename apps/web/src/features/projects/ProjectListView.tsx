import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { listProjects } from "./project-api";
import { ProjectEditor } from "./ProjectEditor";
import { ProjectRows } from "./ProjectRows";
import { useProjectQuery } from "./useProjectQuery";

export function ProjectListView() {
  const { state, retry } = useProjectQuery(listProjects);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  return <section className="workspacePage" aria-labelledby="project-list-title">
    <div className="workspaceBanner">
      <div><h1 id="project-list-title">面试项目</h1><p>查看备战进度，继续完善你的面试准备。</p></div>
      <button type="button" className="prismButton" data-variant="primary" onClick={() => setCreating(true)}>＋ 新建面试项目</button>
    </div>
    <section className="workspacePanel" aria-labelledby="project-list-recent">
      <div className="workspaceSectionHeading"><h2 id="project-list-recent">最近活跃项目</h2></div>
      {state.status === "loading" && <p role="status">正在加载项目…</p>}
      {state.status === "error" && <div><p role="alert" className="prismNotice">{state.message}</p><button type="button" className="prismButton" onClick={retry}>重试</button></div>}
      {state.status === "ready" && <ProjectRows projects={state.data} />}
    </section>
    {creating && <ProjectEditor onClose={() => setCreating(false)} onSaved={(project) => void navigate(`/project/${project.id}`)} />}
  </section>;
}
