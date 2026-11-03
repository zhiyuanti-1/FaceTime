import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Button({
  children,
  primary = false,
}: {
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled
      title="静态预览，功能暂未实现"
      className={`button ${primary ? "primary" : ""}`}
    >
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Notice({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <div className={`notice ${tone}`}>{children}</div>;
}
export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {subtitle && <p className="muted">{subtitle}</p>}
    </div>
  );
}
export function Steps({ current }: { current: number }) {
  return (
    <ol className="steps" aria-label="面试步骤">
      {["岗位与权重", "简历", "面试", "报告"].map((label, i) => (
        <li
          key={label}
          className={i === current ? "current" : i < current ? "complete" : ""}
        >
          <span>{i + 1}</span>
          {label}
          {i < 3 && <b aria-hidden="true">—</b>}
        </li>
      ))}
    </ol>
  );
}
export function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} readOnly aria-readonly="true" />
    </label>
  );
}
export function PrivacyNotes() {
  return (
    <div className="privacy-notes">
      <Notice tone="green">
        ① 数据保存在本机浏览器（IndexedDB），不上传自有服务器。
      </Notice>
      <Notice tone="amber">
        ② 简历文本与录音会发送至百度 / DeepSeek 做识别与评分。
      </Notice>
      <p className="muted">
        以上为产品处理说明。当前静态预览不采集、不上传、不保存任何数据。
      </p>
    </div>
  );
}
