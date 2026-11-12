import { useEffect, useRef, type ReactNode } from "react";
import styles from "./ProjectDialog.module.css";

type ProjectDialogProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
};

export function ProjectDialog({ title, children, onClose, busy }: ProjectDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="projectDialogTitle"
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className={styles.heading}>
      <h2 id="projectDialogTitle">{title}</h2>
      <button type="button" aria-label="关闭" disabled={busy} onClick={onClose}>×</button>
    </div>
    {children}
  </dialog>;
}
