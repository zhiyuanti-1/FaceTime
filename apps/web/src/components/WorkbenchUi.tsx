import type { ReactNode } from "react";
export function Action({
  children,
  onClick,
  disabled = false,
  type = "button",
  variant = "primary",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`action ${variant}`}
    >
      {children}
    </button>
  );
}
export function Feedback({
  message,
  tone = "error",
}: {
  message: string;
  tone?: "error" | "success" | "info";
}) {
  return message ? (
    <div
      className={`feedback ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {message}
    </div>
  ) : null;
}
export function DocumentIcon({
  kind = "file",
}: {
  kind?: "file" | "upload" | "check";
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="document-icon"
    >
      <path
        d="M9 3.5h10l7 7V28H6V3.5h3Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M19 4v7h7M10 17h12M10 22h8"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      {kind === "upload" && (
        <path
          d="m12 14 4-4 4 4m-4-3v10"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      )}
      {kind === "check" && (
        <path d="m11 16 4 4 7-7" stroke="currentColor" strokeWidth="2" />
      )}
    </svg>
  );
}
export function PageHeading({
  number,
  title,
  description,
  aside,
}: {
  number: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div className="title-content">
        <span className="section-number">{number}</span>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {aside}
    </div>
  );
}
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <DocumentIcon />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function downloadJson(filename: string, value: object) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
