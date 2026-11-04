import { z } from "zod";
import {
  userSchema,
  dashboardSchema,
  preferencesSchema,
  diagnosticsSchema,
  dataExportSchema,
  reportSchema,
  turnScoreSchema,
  resumeFields,
  resumeAnalysisSchema,
  type Preferences,
  type ResumeFields,
  resumeSchema,
  resumeListSchema,
  topicsSchema,
  practiceSchema,
  historySchema,
  settingsSchema,
  type CreatePractice,
} from "@face/shared";
import { request, requestFile } from "../http/client";
const ok = z.object({ ok: z.literal(true) });
const importResult = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), structured: resumeFields }),
  z.object({
    ok: z.literal(false),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
]);
const importableResume = resumeSchema.extend({
  draft: importResult.nullable(),
});
const structure = z.object({ structured: resumeFields.nullable() });
const confirmation = { confirmation: "DELETE" };
const json = (method: string, body: object = {}) => ({
  method,
  body: JSON.stringify(body),
});
const resumePath = (id: string) => `/resumes/${encodeURIComponent(id)}`;
const practicePath = (id: string) => `/practices/${encodeURIComponent(id)}`;
const turnPath = (id: string, turnId: string) =>
  `${practicePath(id)}/turns/${encodeURIComponent(turnId)}`;
export const coreApi = {
  me: () => request("/auth/me", userSchema),
  login: (username: string, password: string) =>
    request("/auth/login", userSchema, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    request("/auth/logout", z.object({ ok: z.boolean() }), { method: "POST" }),
  resumes: () => request("/resumes", resumeListSchema),
  resume: (id: string) =>
    request(`/resumes/${encodeURIComponent(id)}`, resumeSchema),
  upload: (file: File) => {
    const form = new FormData();
    form.set("file", file);
    return request("/resumes", importableResume, {
      method: "POST",
      body: form,
    });
  },
  recognize: (id: string) =>
    request(`${resumePath(id)}/recognize`, importableResume, {
      method: "POST",
    }),
  confirm: (id: string, text: string) =>
    request(`/resumes/${encodeURIComponent(id)}/text`, resumeSchema, {
      method: "PUT",
      body: JSON.stringify({ text }),
    }),
  topics: () => request("/topics", topicsSchema),
  createPractice: (body: CreatePractice) =>
    request("/practices", practiceSchema, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  practice: (id: string) =>
    request(`/practices/${encodeURIComponent(id)}`, practiceSchema),
  history: () => request("/practices", historySchema),
  answer: (id: string, turnId: string, text: string) =>
    request(
      `/practices/${encodeURIComponent(id)}/answers/${encodeURIComponent(turnId)}`,
      practiceSchema,
      { method: "PUT", body: JSON.stringify({ text }) },
    ),
  dashboard: () => request("/dashboard", dashboardSchema),
  overview: () => request("/me", dashboardSchema),
  preferences: () => request("/me/preferences", preferencesSchema),
  savePreferences: (value: Preferences) =>
    request("/me/preferences", preferencesSchema, json("PUT", value)),
  diagnostics: () => request("/me/diagnostics", diagnosticsSchema),
  exportDiagnostics: () => request("/me/diagnostics/export", diagnosticsSchema),
  exportData: () => request("/me/data/export", dataExportSchema),
  cleanupAudio: () =>
    request(
      "/me/audio/cleanup",
      ok.extend({ removed: z.number() }),
      json("POST", confirmation),
    ),
  deleteData: () => request("/me/data", ok, json("DELETE", confirmation)),
  paste: (text: string) =>
    request("/resumes/paste", resumeSchema, json("POST", { text })),
  previewResumeFile: (id: string, signal: AbortSignal) =>
    requestFile(`${resumePath(id)}/file`, signal),
  fileUrl: (id: string) => `/api/v1${resumePath(id)}/file`,
  deleteResume: (id: string) =>
    request(resumePath(id), ok, json("DELETE", confirmation)),
  analyze: (id: string) =>
    request(`${resumePath(id)}/analyze`, resumeAnalysisSchema, json("POST")),
  structure: (id: string) => request(`${resumePath(id)}/structured`, structure),
  importStructure: (id: string) =>
    request(`${resumePath(id)}/structured/draft`, structure, {
      method: "POST",
    }),
  saveStructure: (id: string, value: ResumeFields) =>
    request(`${resumePath(id)}/structured`, structure, json("PUT", value)),
  clearStructure: (id: string) =>
    request(`${resumePath(id)}/structured`, structure, { method: "DELETE" }),
  preview: ({ weights, count, mode }: CreatePractice) =>
    request(
      "/practices/preview",
      z.object({
        count: z.number(),
        knowledgeCount: z.number(),
        probeCount: z.number(),
        quotas: z.array(z.object({ id: z.string(), count: z.number() })),
      }),
      json("POST", { weights, count, mode }),
    ),
  progress: (id: string, index: number) =>
    request(
      `${practicePath(id)}/progress`,
      practiceSchema,
      json("PUT", { index }),
    ),
  skip: (id: string, turnId: string) =>
    request(`${turnPath(id, turnId)}/skip`, practiceSchema, json("POST")),
  score: (id: string, turnId: string) =>
    request(`${turnPath(id, turnId)}/score`, turnScoreSchema, json("POST")),
  report: (id: string) => request(`${practicePath(id)}/report`, reportSchema),
  generateReport: (id: string) =>
    request(`${practicePath(id)}/report`, reportSchema, json("POST")),
  settings: () => request("/settings", settingsSchema),
};
