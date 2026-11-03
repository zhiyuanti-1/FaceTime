import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth-context";
import { LoginPage } from "../pages/LoginPage";
import { ResumeWorkspace } from "../features/resume/ResumeWorkspace";
import { PracticeSetup } from "../features/paper/PracticeSetup";
import { AnswerWorkspace } from "../features/session/AnswerWorkspace";
import { PracticeHistoryPage } from "../pages/PracticeHistoryPage";
import { ConnectionSettings } from "../pages/ConnectionSettings";
import { useState } from "react";
import { Feedback } from "../components/WorkbenchUi";
function Frame() {
  const { user, checking, logout } = useAuth();
  const [error, setError] = useState("");
  if (checking)
    return (
      <div className="connection-loading">
        <span className="wordmark">
          <b>F</b> Face
        </span>
        <p>正在连接你的练习空间…</p>
      </div>
    );
  if (!user) return <LoginPage />;
  return (
    <div className="workbench">
      <a className="skip-link" href="#content">
        跳到主要内容
      </a>
      <header className="workbench-header">
        <NavLink to="/" className="wordmark">
          <b>F</b> Face<span>面试练习室</span>
        </NavLink>
        <nav aria-label="主要导航">
          <NavLink to="/" end>
            简历空间
          </NavLink>
          <NavLink to="/practice">定向练习</NavLink>
          <NavLink to="/history">练习记录</NavLink>
          <NavLink to="/settings">设置</NavLink>
        </nav>
        <div className="account">
          <span className="avatar">
            {user.username.slice(0, 1).toUpperCase()}
          </span>
          <span>{user.username}</span>
          <button
            onClick={() => {
              logout().catch(() => setError("退出失败，请重试"));
            }}
          >
            退出
          </button>
        </div>
      </header>
      <main id="content" className="workbench-main">
        <Feedback message={error} />
        <Routes>
          <Route path="/" element={<ResumeWorkspace />} />
          <Route path="/resume" element={<Navigate to="/" replace />} />
          <Route path="/practice" element={<PracticeSetup />} />
          <Route path="/practice/:id" element={<AnswerWorkspace />} />
          <Route path="/history" element={<PracticeHistoryPage />} />
          <Route path="/settings" element={<ConnectionSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="workbench-footer">
        <span>Face · 让每一次表达都有积累</span>
        <span>本轮只练习与记录，暂不评分</span>
      </footer>
    </div>
  );
}
export function App() {
  return (
    <AuthProvider>
      <Frame />
    </AuthProvider>
  );
}
