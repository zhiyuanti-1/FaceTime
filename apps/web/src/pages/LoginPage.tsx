import { useState, type FormEvent } from "react";
import { useAuth } from "../app/auth-context";
import { Action, Feedback } from "../components/WorkbenchUi";
import { errorMessage } from "../services/http/client";
export function LoginPage() {
  const auth = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.login(username, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-intro">
        <span className="wordmark">
          <b>F</b> Face<span>面试练习室</span>
        </span>
        <div>
          <p className="edition">YOUR NEXT CHAPTER</p>
          <h1>
            把经历讲清楚，
            <br />
            把下一步准备好。
          </h1>
          <p>
            从一份简历开始。核对原文、选择方向，
            <br />
            用每一次认真作答，让面试更从容。
          </p>
          <div className="login-sequence">
            <span>01 简历核对</span>
            <i>→</i>
            <span>02 定向练习</span>
            <i>→</i>
            <span>03 回看回答</span>
          </div>
        </div>
        <small>一份属于你的、持续积累的练习记录。</small>
      </div>
      <div className="login-form-area">
        <form onSubmit={submit}>
          <span className="edition">WELCOME BACK</span>
          <h2>登录你的练习空间</h2>
          <p>简历和回答保存在当前账号下。</p>
          <label>
            账号
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="输入账号"
              required
            />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="输入密码"
              required
            />
          </label>
          <Feedback message={error || auth.connectionError} />
          <Action type="submit" disabled={busy}>
            {busy ? "正在登录…" : "登录并开始 →"}
          </Action>
          <p className="login-help">
            当前为本机管理员账号。账号配置由本机环境文件统一管理，暂不开放注册。
          </p>
        </form>
      </div>
    </div>
  );
}
