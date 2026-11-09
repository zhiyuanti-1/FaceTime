import { adminResponse, type LoginRequest } from "@face/shared";
import { z } from "zod";
import { requestJson } from "../../../services/http/client";

export const login = (credentials: LoginRequest) =>
  requestJson("/auth/login", adminResponse, { method: "POST", body: JSON.stringify(credentials) });

export const logout = () => requestJson("/auth/logout", z.undefined(), { method: "POST" });
