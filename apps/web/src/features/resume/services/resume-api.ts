import { resumeDetailResponse, resumeListResponse, resumeParseResponse, type ResumeSaveRequest } from "@face/shared";
import { z } from "zod";
import { requestJson } from "../../../services/http/client";

const resumePath = (id: string) => `/resumes/${encodeURIComponent(id)}`;

export const listResumes = (signal: AbortSignal) => requestJson("/resumes", resumeListResponse, { signal });

export const getResume = (id: string, signal: AbortSignal) =>
  requestJson(resumePath(id), resumeDetailResponse, { signal });

export const parseResume = (file: File, signal: AbortSignal) => {
  const body = new FormData();
  body.set("file", file);
  return requestJson("/resumes/parse", resumeParseResponse, { method: "POST", body, signal });
};

export const saveResume = (fields: ResumeSaveRequest, id?: string) =>
  requestJson(id ? resumePath(id) : "/resumes", resumeDetailResponse, {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(fields),
  });

export const deleteResume = (id: string) => requestJson(resumePath(id), z.undefined(), { method: "DELETE" });
