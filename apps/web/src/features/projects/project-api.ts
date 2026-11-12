import {
  dashboardResponse, projectDeleteConfirmationResponse, projectDetailResponse, projectListResponse,
  type ProjectReplaceRequest, type ProjectSaveRequest,
} from "@face/shared";
import { z } from "zod";
import { HttpError, requestJson } from "../../services/http/client";

const projectPath = (id: string) => `/projects/${encodeURIComponent(id)}`;
const errorResponse = z.object({ error: z.object({ message: z.string() }) });

export const loadDashboard = (signal: AbortSignal) => requestJson("/dashboard", dashboardResponse, { signal });
export const listProjects = (signal: AbortSignal) => requestJson("/projects", projectListResponse, { signal });
export const getProject = (id: string, signal: AbortSignal) => requestJson(projectPath(id), projectDetailResponse, { signal });

export const createProject = (values: ProjectSaveRequest) => requestJson("/projects", projectDetailResponse, {
  method: "POST", body: JSON.stringify(values),
});
export const replaceProject = (id: string, values: ProjectReplaceRequest) => requestJson(projectPath(id), projectDetailResponse, {
  method: "PUT", body: JSON.stringify(values),
});
export const prepareProjectDelete = (id: string) => requestJson(`${projectPath(id)}/delete-confirmation`, projectDeleteConfirmationResponse, { method: "POST" });
export const deleteProject = (id: string, token: string) => requestJson(projectPath(id), z.undefined(), {
  method: "DELETE", headers: { "x-project-delete-token": token },
});

export function projectErrorMessage(cause: unknown, fallback: string) {
  if (!(cause instanceof HttpError)) return fallback;
  if (cause.status === 401) return "登录已失效，请在新标签页重新登录后再试。";
  const response = errorResponse.safeParse(cause.body);
  return response.success ? response.data.error.message : fallback;
}
