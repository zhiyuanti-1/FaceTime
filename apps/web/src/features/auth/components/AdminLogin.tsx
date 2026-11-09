import { useState } from "react";
import { useLogin } from "../hooks/useLogin";
import styles from "./AdminLogin.module.css";

export const AdminLogin = () => {
  const { submit, pending, error } = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  return (
    <main className={styles.page}>
      <form className={styles.panel} onSubmit={(event) => {
        event.preventDefault();
        void submit({ username, password });
      }}>
        <p className={styles.brand}>AI 面试训练</p>
        <h1>管理员登录</h1>
        <label>账号
          <input className="prismInput" name="username" autoComplete="username" maxLength={128}
            value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label>密码
          <input className="prismInput" name="password" type="password" autoComplete="current-password" maxLength={512}
            value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error && <p className="prismNotice" role="alert">{error}</p>}
        <button className="prismButton" data-variant="primary" type="submit" disabled={pending}>
          {pending ? "登录中…" : "登录"}
        </button>
      </form>
    </main>
  );
};
