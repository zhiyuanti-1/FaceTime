import { Inject, Injectable } from "@nestjs/common";
import type { ResumeSaveRequest } from "../dto/resume.dto.js";
import { ResumeRepository } from "../repository/resume.repository.js";

@Injectable()
export class ResumeService {
  constructor(
    @Inject(ResumeRepository) private readonly repository: ResumeRepository,
  ) {}

  list(ownerId: string) {
    return this.repository.listSummariesByOwner(ownerId);
  }
  find(ownerId: string, id: string) {
    return this.repository.findByOwnerWithDetails(ownerId, id);
  }
  create(ownerId: string, data: ResumeSaveRequest) {
    return this.repository.insertWithDetails(ownerId, data);
  }
  replace(ownerId: string, id: string, data: ResumeSaveRequest) {
    return this.repository.replaceOwnedResumeWithDetails(ownerId, id, data);
  }
  remove(ownerId: string, id: string) {
    return this.repository.deleteOwnedResumeWithDetails(ownerId, id);
  }
}
