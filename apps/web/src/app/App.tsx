import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { InterviewLayout } from "./InterviewLayout";
import { Dashboard } from "../pages/Dashboard";
import { ProjectList } from "../pages/ProjectList";
import { ProjectDetail } from "../pages/ProjectDetail";
import { InterviewConfig } from "../pages/InterviewConfig";
import { Report } from "../pages/Report";
import { Trend } from "../pages/Trend";
import { ResumeLibrary } from "../pages/ResumeLibrary";
import { Profile } from "../pages/Profile";
import { Settings } from "../pages/Settings";
import { Interview } from "../pages/Interview";
import { Login } from "../pages/Login";
import { NotFound } from "../pages/NotFound";

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="/project/:id/config" element={<InterviewConfig />} />
        <Route path="/report/:sessionId" element={<Report />} />
        <Route path="/project/:id/trend" element={<Trend />} />
        <Route path="/resumes" element={<ResumeLibrary />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route element={<InterviewLayout />}>
        <Route path="/interview/:sessionId" element={<Interview />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
