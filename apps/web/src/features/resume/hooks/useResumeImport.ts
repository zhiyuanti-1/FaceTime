import { resumeParseFailure, type ResumeFields } from "@face/shared";
import { useEffect, useRef, useState } from "react";
import { HttpError } from "../../../services/http/client";
import { parseResume } from "../services/resume-api";

type ImportFailure = { message: string; rawText?: string; needsLogin?: boolean };

const describeFailure = (cause: unknown): ImportFailure => {
  if (cause instanceof HttpError) {
    const result = resumeParseFailure.safeParse(cause.body);
    if (result.success) return { message: result.data.message, rawText: result.data.partial?.rawText };
    if (cause.status === 401) return { message: "登录已失效，请重新登录后重试。", needsLogin: true };
    if (cause.status === 413) return { message: "文件超过后端上传大小限制，请压缩后重试。" };
  }
  return { message: "简历识别失败，请确认本机服务已启动后重试。" };
};

export const useResumeImport = (onReady: (fields: ResumeFields) => void) => {
  const [file, setFile] = useState<File>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ImportFailure>();
  const request = useRef<AbortController>();

  useEffect(() => () => request.current?.abort(), []);

  const choose = (next?: File) => {
    setFile(next);
    setError(undefined);
  };

  const submit = async () => {
    if (!file || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(undefined);
    try {
      const { fields } = await parseResume(file, controller.signal);
      if (!controller.signal.aborted) onReady(fields);
    } catch (cause) {
      if (!controller.signal.aborted) setError(describeFailure(cause));
    } finally {
      request.current = undefined;
      if (!controller.signal.aborted) setPending(false);
    }
  };

  return { file, pending, error, choose, submit };
};
