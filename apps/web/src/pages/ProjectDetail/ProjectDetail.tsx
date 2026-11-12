import { useParams } from "react-router-dom";
import { ProjectDetailShell } from "../../features/projects/ProjectDetailShell";

export function ProjectDetail() {
  const { id = "" } = useParams();
  return <ProjectDetailShell key={id} id={id} />;
}
