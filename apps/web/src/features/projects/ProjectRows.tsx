import type { projectSummaryResponse } from "@face/shared";
import { Link } from "react-router-dom";
import type { z } from "zod";
import { WorkspaceIcon } from "./WorkspaceIcon";
import styles from "./ProjectRows.module.css";

type ProjectRowsProps = { projects: readonly z.infer<typeof projectSummaryResponse>[] };
const rowIcons = ["code", "layers", "chart"] as const;
const shortDate = new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" });

export function ProjectRows({ projects }: ProjectRowsProps) {
  if (projects.length === 0) return <p className={styles.empty}>还没有面试项目。新建项目后，可在这里继续备战。</p>;

  return <ul className={styles.list}>
    {projects.map((project, index) => <li className={styles.row} key={project.id}>
      <span className={styles.icon} data-tone={index % 3}><WorkspaceIcon name={rowIcons[index % 3] ?? "project"} /></span>
      <div className={styles.name}>
        <Link to={`/project/${project.id}`}>{[project.targetRole, project.targetCompany].filter(Boolean).join(" · ")}</Link>
      </div>
      <span className={styles.match}>待诊断</span>
      <span className={styles.date}><WorkspaceIcon name="calendar" /> 更新 <time dateTime={project.updatedAt}>{shortDate.format(new Date(project.updatedAt))}</time></span>
      <Link className="prismButton" to={`/project/${project.id}`} aria-label={`进入 ${project.targetRole}`}>进入</Link>
    </li>)}
  </ul>;
}
