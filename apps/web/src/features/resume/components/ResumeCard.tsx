import type { ResumeSummary } from "@face/shared";
import styles from "./ResumeLibraryView.module.css";

const dateFormat = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" });

type ResumeCardProps = {
  resume: ResumeSummary;
  selected: boolean;
  disabled: boolean;
  onOpen: () => void;
};

export const ResumeCard = ({ resume, selected, disabled, onOpen }: ResumeCardProps) => {
  const role = resume.desiredRole?.trim() || "未填写岗位";
  const name = resume.fullName?.trim() || "未填写姓名";
  return (
    <li>
      <button className={styles.card} type="button" aria-current={selected ? "true" : undefined}
        aria-label={`查看 ${name} 的简历，${role}`} disabled={disabled} onClick={onOpen}>
        <span className={styles.cover} aria-hidden="true"><span className={styles.paper} /></span>
        <span className={styles.cardBody}>
          <strong>{role}</strong>
          <span>{name}</span>
          <span>更新于 <time dateTime={resume.updatedAt}>{dateFormat.format(new Date(resume.updatedAt))}</time></span>
        </span>
        <span className={styles.cardArrow} aria-hidden="true">›</span>
      </button>
    </li>
  );
};
