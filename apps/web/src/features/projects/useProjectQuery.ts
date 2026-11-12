import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HttpError } from "../../services/http/client";
import { projectErrorMessage } from "./project-api";

type QueryState<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; message: string };

export function useProjectQuery<T>(load: (signal: AbortSignal) => Promise<T>, redirectOnUnauthorized = true) {
  const [state, setState] = useState<QueryState<T>>({ status: "loading" });
  const [revision, setRevision] = useState(0);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(() => {
    const request = new AbortController();
    void load(request.signal).then((data) => {
      if (!request.signal.aborted) setState({ status: "ready", data });
    }).catch((cause: unknown) => {
      if (request.signal.aborted) return;
      if (redirectOnUnauthorized && cause instanceof HttpError && cause.status === 401) {
        const next = encodeURIComponent(`${pathname}${search}`);
        void navigate(`/login?next=${next}`, { replace: true });
        return;
      }
      setState({ status: "error", message: projectErrorMessage(cause, "加载失败，请检查本机服务后重试。") });
    });
    return () => request.abort();
  }, [load, navigate, pathname, search, redirectOnUnauthorized, revision]);

  const retry = () => {
    setState({ status: "loading" });
    setRevision((value) => value + 1);
  };
  return { state, retry, setData: (data: T) => setState({ status: "ready", data }) };
}
