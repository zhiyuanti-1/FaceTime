import type { ResumeDetail, ResumeSummary } from "@face/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HttpError } from "../../../services/http/client";
import { listResumes } from "../services/resume-api";

type ListState =
  | { status: "loading" | "error" }
  | { status: "ready"; items: readonly ResumeSummary[] };

export const useResumeLibrary = () => {
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [revision, setRevision] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const request = new AbortController();
    void listResumes(request.signal).then((items) => {
      if (!request.signal.aborted) setList({ status: "ready", items });
    }).catch((cause: unknown) => {
      if (request.signal.aborted) return;
      if (cause instanceof HttpError && cause.status === 401) {
        void navigate("/login?next=/resumes", { replace: true });
      } else {
        setList({ status: "error" });
      }
    });
    return () => request.abort();
  }, [navigate, revision]);

  const retry = () => {
    setList({ status: "loading" });
    setRevision((value) => value + 1);
  };

  const update = (record: ResumeDetail) => {
    const summary: ResumeSummary = {
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      fullName: record.fields.基本信息.姓名,
      desiredRole: record.fields.求职意向.岗位,
    };
    setList((current) => current.status === "ready"
      ? { status: "ready", items: [summary, ...current.items.filter(({ id }) => id !== record.id)] }
      : current);
  };

  const remove = (id: string) => setList((current) => current.status === "ready"
    ? { status: "ready", items: current.items.filter((item) => item.id !== id) }
    : current);

  return { list, retry, update, remove };
};
