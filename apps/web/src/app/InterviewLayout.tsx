import { Link, Outlet } from "react-router-dom";

export const InterviewLayout = () => (
  <>
    <header className="header"><Link to="/" className="brand">AI 面试训练</Link><Link to="/projects">退出面试</Link></header>
    <main><Outlet /></main>
  </>
);
