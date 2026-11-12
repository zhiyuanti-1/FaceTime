import { z } from "zod";
import { resumeId } from "./resume-api.js";

const label = z.string().trim().min(1).refine((value) => [...value].length <= 200);
const timestamp = z.iso.datetime({ precision: 6 });
export const projectId = z.uuid();
export const projectDeleteToken = z.string().regex(/^[a-f0-9]{64}$/);

const projectInputs = z.strictObject({
  targetRole: label,
  targetCompany: label.nullish(),
  resumeId,
  jdText: z.string().refine((value) => value.trim().length > 0),
});
export const projectSaveRequest = projectInputs.readonly();
export const projectReplaceRequest = projectInputs.extend({ expectedUpdatedAt: timestamp }).readonly();

const projectMetadata = z.strictObject({
  id: projectId,
  targetRole: label,
  targetCompany: label.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export const projectSummaryResponse = projectMetadata.readonly();
export const projectListResponse = z.array(projectSummaryResponse).readonly();
export const projectDetailResponse = projectMetadata.extend({
  resumeId,
  jdText: projectInputs.shape.jdText,
}).readonly();
export const projectDeleteConfirmationResponse = z.strictObject({
  token: projectDeleteToken,
  expiresAt: z.iso.datetime(),
}).readonly();
export const dashboardResponse = z.strictObject({
  username: z.string().min(1),
  projectCount: z.int().nonnegative(),
  recentProjects: z.array(projectSummaryResponse).max(3).readonly(),
}).readonly();

export type ProjectSaveRequest = z.infer<typeof projectSaveRequest>;
export type ProjectReplaceRequest = z.infer<typeof projectReplaceRequest>;
