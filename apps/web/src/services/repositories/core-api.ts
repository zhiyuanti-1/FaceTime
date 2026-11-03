import { z } from "zod";
import {
  userSchema,
  resumeSchema,
  resumeListSchema,
  topicsSchema,
  practiceSchema,
  historySchema,
  settingsSchema,
  type CreatePractice,
} from "@face/shared";
import { request } from "../http/client";
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
    return request("/resumes", resumeSchema, { method: "POST", body: form });
  },
  recognize: (id: string) =>
    request(`/resumes/${encodeURIComponent(id)}/recognize`, resumeSchema, {
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
  settings: () => request("/settings", settingsSchema),
};
