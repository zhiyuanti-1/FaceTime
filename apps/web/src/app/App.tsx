import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth-context";
import { LoginPage } from "../pages/LoginPage";
import { ResumeWorkspace } from "../features/resume/ResumeWorkspace";
import { PracticeSetup } from "../features/paper/PracticeSetup";
import { AnswerWorkspace } from "../features/session/AnswerWorkspace";
import { PracticeHistoryPage } from "../pages/PracticeHistoryPage";
import { ConnectionSettings } from "../pages/ConnectionSettings";
import { DashboardPage } from "../pages/DashboardPage";
import { AccountPage } from "../pages/AccountPage";
import { PracticeReportPage } from "../pages/PracticeReportPage";

function Frame() {
  const { user, checking } = useAuth();
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
            工作台
          </NavLink>
          <NavLink to="/practice/new">新练习</NavLink>
          <NavLink to="/history">练习记录</NavLink>
          <span className="message-entry">
            消息 <small>待接入</small>
          </span>
          <NavLink to="/me/resume">简历</NavLink>
          <NavLink
            className="account"
            to="/me"
            end
            aria-label={`个人中心，${user.username}`}
          >
            <span>{user.username}</span>
            <span className="avatar" aria-hidden="true">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
          </NavLink>
        </nav>
      </header>
      <main id="content" className="workbench-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/me/resume" element={<ResumeWorkspace />} />
          <Route path="/me" element={<AccountPage />} />
          <Route path="/practice/new" element={<PracticeSetup />} />
          <Route path="/practice/:id" element={<AnswerWorkspace />} />
          <Route path="/history" element={<PracticeHistoryPage />} />
          <Route path="/practice/:id/report" element={<PracticeReportPage />} />
          <Route path="/settings" element={<ConnectionSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="workbench-footer">
        <span>Face · 让每一次表达都有积累</span>
        <span>本机面试练习</span>
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
