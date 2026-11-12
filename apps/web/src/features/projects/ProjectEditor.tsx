import { projectSaveRequest, type projectDetailResponse } from "@face/shared";
import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { z } from "zod";
import { listResumes } from "../resume/services/resume-api";
import { createProject, projectErrorMessage, replaceProject } from "./project-api";
import { ProjectDialog } from "./ProjectDialog";
import { useProjectQuery } from "./useProjectQuery";
import styles from "./ProjectDialog.module.css";

type ProjectDetail = z.infer<typeof projectDetailResponse>;
type ProjectEditorProps = { project?: ProjectDetail; onClose: () => void; onSaved: (project: ProjectDetail) => void };

export function ProjectEditor({ project, onClose, onSaved }: ProjectEditorProps) {
  const resumes = useProjectQuery(listResumes, false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const choices = resumes.state.status === "ready" ? resumes.state.data : [];

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || choices.length === 0) return;
    const data = new FormData(event.currentTarget);
    const parsed = projectSaveRequest.safeParse({
      targetRole: data.get("role"), targetCompany: String(data.get("company") ?? "").trim() || null,
      resumeId: data.get("resume"), jdText: data.get("jd"),
    });
    if (!parsed.success) { setError("请填写目标岗位、选择简历，并填写岗位描述（JD）。"); return; }
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      const saved = project
        ? await replaceProject(project.id, { ...parsed.data, expectedUpdatedAt: project.updatedAt })
        : await createProject(parsed.data);
      onSaved(saved);
    } catch (cause) {
      setError(projectErrorMessage(cause, "保存失败，已保留当前输入，请重试。"));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  return <ProjectDialog title={project ? "编辑项目" : "新建面试项目"} onClose={onClose} busy={pending}>
    <p className={styles.intro}>填写岗位信息，选用一份简历，建立你的备战计划。</p>
    <form className={styles.form} onSubmit={(event) => void save(event)}>
      <label>目标岗位<input name="role" className="prismInput" required maxLength={200} defaultValue={project?.targetRole} placeholder="例如：Java 后端开发" /></label>
      <label>目标公司（选填）<input name="company" className="prismInput" maxLength={200} defaultValue={project?.targetCompany ?? ""} placeholder="填写目标公司" /></label>
      <label>选用简历<select name="resume" className="prismInput" required defaultValue={project?.resumeId ?? ""} disabled={choices.length === 0}
        key={resumes.state.status}>
        <option value="" disabled>{resumes.state.status === "loading" ? "正在加载简历…" : "请选择一份简历"}</option>
        {choices.map((resume) => <option key={resume.id} value={resume.id}>
          {[resume.fullName || "未填写姓名", resume.desiredRole].filter(Boolean).join(" · ")}
        </option>)}
      </select></label>
      {resumes.state.status === "error" && <p role="alert" className="prismNotice">{resumes.state.message} <button type="button" onClick={resumes.retry}>重试</button></p>}
      {resumes.state.status === "ready" && choices.length === 0 && <p className={styles.intro}>简历库为空。<Link className="prismButton" to="/resumes?import=1" target="_blank" rel="noreferrer">在新标签页导入简历</Link> <button type="button" onClick={resumes.retry}>刷新简历</button></p>}
      <label>岗位描述（JD）<textarea name="jd" className="prismInput" required rows={5} defaultValue={project?.jdText} placeholder="粘贴岗位职责与招聘要求" /></label>
      {error && <p className="prismNotice" role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="button" className="prismButton" disabled={pending} onClick={onClose}>取消</button>
        <button type="submit" className="prismButton" data-variant="primary" disabled={pending || choices.length === 0}>{pending ? "保存中…" : "保存项目"}</button>
      </div>
    </form>
  </ProjectDialog>;
}
