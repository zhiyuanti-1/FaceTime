import { z } from "zod";

export const loginRequest = z.strictObject({
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(512),
}).readonly();

export const adminResponse = z.strictObject({
  id: z.uuid(),
  username: z.string(),
}).readonly();

export type LoginRequest = z.infer<typeof loginRequest>;
export type AdminResponse = z.infer<typeof adminResponse>;
