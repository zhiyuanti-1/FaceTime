import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Badge } from "../components/PreviewUi";
import { HomePage } from "../pages/HomePage";
import { SetupPage } from "../pages/SetupPage";
import { ResumePage } from "../pages/ResumePage";
import { InterviewPage } from "../pages/InterviewPage";
import { ReportPage } from "../pages/ReportPage";
import { HistoryPage } from "../pages/HistoryPage";
import { SettingsPage } from "../pages/SettingsPage";
import { DegradedPage } from "../pages/DegradedPage";

const previews = [
  ["/", "首页"],
  ["/setup", "岗位权重"],
  ["/resume", "简历"],
  ["/interview", "面试"],
  ["/report/demo", "报告"],
  ["/history", "历史"],
  ["/settings", "系统设置"],
  ["/states", "降级态"],
] as const;
export function App() {
  const { pathname } = useLocation();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        跳到页面内容
      </a>
      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="Face 首页">
          <span className="brand-mark">F</span>
          <strong>Face</strong>
          <span className="brand-caption">AI 模拟面试练习</span>
        </NavLink>
        <nav aria-label="主导航">
          <NavLink to="/" end>
            首页
          </NavLink>
          <NavLink to="/history">历史</NavLink>
          <NavLink to="/settings">设置</NavLink>
        </nav>
        <Badge tone="amber">seed · 200 题</Badge>
      </header>
      <div className="preview-banner">
        <span>
          <i />
          静态界面预览
        </span>
        <span>所有数值均为示例 · 业务功能暂未实现</span>
      </div>
      <main id="main" key={pathname}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/states" element={<DegradedPage />} />
          <Route
            path="*"
            element={
              <section className="card not-found">
                <h1>页面不存在</h1>
                <p>请通过底部导航查看静态页面。</p>
                <NavLink to="/">返回首页</NavLink>
              </section>
            }
          />
        </Routes>
      </main>
      <footer className="preview-footer">
        <span>页面预览</span>
        <nav aria-label="静态页面预览">
          {previews.map(([path, label]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <span className="footer-version">Face 1.0 · 仅静态展示</span>
      </footer>
    </div>
  );
}
