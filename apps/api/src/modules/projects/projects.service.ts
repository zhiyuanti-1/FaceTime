import { randomBytes } from "node:crypto";
import { type ProjectReplaceRequest, type ProjectSaveRequest } from "@face/shared";
import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../../infrastructure/http.js";
import { ProjectsRepository } from "./projects.repository.js";

const deleteConfirmationLifetimeMs = 5 * 60 * 1000;

type DeleteConfirmation = {
  ownerId: string;
  projectId: string;
  sessionId: string;
  updatedAt: string;
  expiresAt: number;
};

@Injectable()
export class ProjectsService {
  private readonly deleteConfirmations = new Map<string, DeleteConfirmation>();

  constructor(@Inject(ProjectsRepository) private readonly projects: ProjectsRepository) {}

  list(ownerId: string) {
    return this.projects.listByOwner(ownerId);
  }

  summarize(ownerId: string) {
    return this.projects.summarizeByOwner(ownerId);
  }

  find(ownerId: string, id: string) {
    return this.projects.findOwnedDetail(ownerId, id);
  }

  create(ownerId: string, data: ProjectSaveRequest) {
    return this.projects.insertOwnedProject(ownerId, data);
  }

  replace(ownerId: string, id: string, data: ProjectReplaceRequest) {
    return this.projects.replaceOwnedProject(ownerId, id, data);
  }

  async prepareDelete(ownerId: string, id: string, sessionId: string) {
    const updatedAt = await this.projects.findOwnedVersion(ownerId, id);
    const now = Date.now();
    for (const [token, confirmation] of this.deleteConfirmations) {
      if (confirmation.expiresAt <= now ||
          (confirmation.sessionId === sessionId && confirmation.projectId === id)) {
        this.deleteConfirmations.delete(token);
      }
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = now + deleteConfirmationLifetimeMs;
    this.deleteConfirmations.set(token, { ownerId, projectId: id, sessionId, updatedAt, expiresAt });
    return { token, expiresAt: new Date(expiresAt).toISOString() };
  }

  async remove(ownerId: string, id: string, sessionId: string, token: string) {
    const confirmation = this.deleteConfirmations.get(token);
    if (!confirmation || confirmation.expiresAt <= Date.now() ||
        confirmation.sessionId !== sessionId || confirmation.ownerId !== ownerId ||
        confirmation.projectId !== id) {
      throw new ApiError("E_PROJECT_DELETE_CONFIRMATION", "请重新完成两次删除确认", 409);
    }

    // 在等待数据库前消费凭证，避免并发请求重复使用。
    this.deleteConfirmations.delete(token);
    await this.projects.deleteOwnedProjectVersion(ownerId, id, confirmation.updatedAt);
  }
}
