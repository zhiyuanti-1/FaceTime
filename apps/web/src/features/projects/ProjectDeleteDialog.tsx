import { useEffect, useRef, useState } from "react";
import { deleteProject, prepareProjectDelete, projectErrorMessage } from "./project-api";
import { ProjectDialog } from "./ProjectDialog";
import styles from "./ProjectDialog.module.css";

type ProjectDeleteDialogProps = { id: string; name: string; onClose: () => void; onDeleted: () => void };

export function ProjectDeleteDialog({ id, name, onClose, onDeleted }: ProjectDeleteDialogProps) {
  const [token, setToken] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (token && !pending) cancelButton.current?.focus();
  }, [pending, token]);

  const confirm = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      if (token) {
        await deleteProject(id, token);
        onDeleted();
      } else {
        const confirmation = await prepareProjectDelete(id);
        setToken(confirmation.token);
      }
    } catch (cause) {
      setToken(undefined);
      setError(projectErrorMessage(cause, "删除操作未完成，请重新确认。"));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  return <ProjectDialog title={token ? "最后确认 · 2/2" : "删除项目 · 1/2"} onClose={onClose} busy={pending}>
    <p>项目 <strong>{name}</strong></p>
    <p className={styles.intro}>{token ? "确认后将永久删除该项目。关联的简历仍可在简历库使用。" : "请核对项目名称，继续后还需确认一次。"}</p>
    {error && <p className="prismNotice" role="alert">{error}</p>}
    <div className={styles.actions}>
      <button ref={cancelButton} className="prismButton" type="button" onClick={onClose} disabled={pending}>取消</button>
      <button key={token ? "second" : "first"} className="prismButton" data-variant="danger" type="button" onClick={() => void confirm()} disabled={pending}>
        {pending ? "处理中…" : token ? "永久删除" : "继续确认"}
      </button>
    </div>
  </ProjectDialog>;
}
