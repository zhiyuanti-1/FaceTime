import { Steps } from "../components/PreviewUi";
import { ResumeUploadPanel } from "../features/resume/ResumeUploadPanel";
import { ResumeParseStatus } from "../features/resume/ResumeParseStatus";
import { ResumeProfilePanel } from "../features/resume/ResumeProfilePanel";

export function ResumePage() {
  return (
    <>
      <Steps current={1} />
      <div className="resume-grid">
        <div className="stack">
          <ResumeUploadPanel />
          <ResumeParseStatus />
        </div>
        <ResumeProfilePanel />
      </div>
    </>
  );
}
