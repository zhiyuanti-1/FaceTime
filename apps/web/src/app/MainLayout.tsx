import { NavLink, Outlet } from "react-router-dom";
import { LogoutButton } from "../features/auth/components/LogoutButton";

export const MainLayout = () => (
  <>
    <header className="header">
      <NavLink to="/" className="brand">AI 面试训练</NavLink>
      <nav aria-label="主导航" className="navigation">
        <NavLink to="/" end>工作台</NavLink>
        <NavLink to="/projects">面试项目</NavLink>
        <NavLink to="/resumes">简历库</NavLink>
      </nav>
      <div className="account">
        <button type="button" disabled>帮助</button>
        <details>
          <summary>个人中心</summary>
          <nav aria-label="个人中心菜单" className="accountMenu">
            <NavLink to="/profile">个人资料</NavLink>
            <NavLink to="/resumes">简历库</NavLink>
            <NavLink to="/settings">设置</NavLink>
            <LogoutButton />
          </nav>
        </details>
      </div>
    </header>
    <main><Outlet /></main>
  </>
);
