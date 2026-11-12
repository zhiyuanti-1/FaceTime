import { resumeSaveRequest, type ResumeDetail, type ResumeFields } from "@face/shared";
import { useEffect, useRef, useState } from "react";
import { HttpError } from "../../../services/http/client";
import type { ResumeDrawerState } from "../resume.types";
import { deleteResume, getResume, saveResume } from "../services/resume-api";

const actionError = (cause: unknown, fallback: string) => {
  if (cause instanceof HttpError && cause.status === 401) return "登录已失效，请重新登录后再操作。";
  if (cause instanceof HttpError && cause.status === 404) return "这份简历已不存在，请刷新列表。";
  if (cause instanceof HttpError && cause.status === 409) return "这份简历正在被项目使用，请先在对应项目中更换简历。";
  return fallback;
};

export const useResumeDrawer = (onSave: (record: ResumeDetail) => void, onRemove: (id: string) => void, openImport = false) => {
  const [state, setState] = useState<ResumeDrawerState>(openImport ? { kind: "import" } : { kind: "closed" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const request = useRef<AbortController>();
  const mutating = useRef(false);

  useEffect(() => () => request.current?.abort(), []);

  const show = (next: ResumeDrawerState) => {
    if (mutating.current) return;
    request.current?.abort();
    setError("");
    setNeedsLogin(false);
    setState(next);
  };

  const fail = (cause: unknown, fallback: string) => {
    setError(actionError(cause, fallback));
    setNeedsLogin(cause instanceof HttpError && cause.status === 401);
  };

  const open = async (id: string) => {
    if (mutating.current) return;
    show({ kind: "loading", id });
    const current = new AbortController();
    request.current = current;
    try {
      const record = await getResume(id, current.signal);
      if (!current.signal.aborted) setState({ kind: "view", record });
    } catch (cause) {
      if (current.signal.aborted) return;
      fail(cause, "简历详情加载失败，请重试。");
      setState({ kind: "failed", id });
    }
  };

  const mutate = async (action: () => Promise<void>, fallback: string) => {
    if (mutating.current) return;
    mutating.current = true;
    setPending(true);
    setError("");
    setNeedsLogin(false);
    try {
      await action();
    } catch (cause) {
      fail(cause, fallback);
    } finally {
      mutating.current = false;
      setPending(false);
    }
  };

  const save = (fields: ResumeFields) => {
    if (state.kind !== "edit" || mutating.current) return;
    const result = resumeSaveRequest.safeParse(fields);
    if (!result.success) {
      setError("请检查字段长度和条目数量后重试。");
      return;
    }
    void mutate(async () => {
      const record = await saveResume(result.data, state.record?.id);
      onSave(record);
      setState({ kind: "view", record });
    }, "保存失败，当前编辑内容已保留，请重试。");
  };

  const remove = () => {
    if (state.kind !== "delete") return;
    const { id } = state.record;
    void mutate(async () => {
      await deleteResume(id);
      onRemove(id);
      setState({ kind: "closed" });
    }, "删除失败，请重试。");
  };

  return { state, pending, error, needsLogin, show, open, save, remove };
};
