import {
  projectDeleteConfirmationResponse,
  projectDeleteToken,
  projectId,
  projectReplaceRequest,
  projectSaveRequest,
} from "@face/shared";
import {
  Body, Controller, Delete, Get, Header, Headers, HttpCode, Inject, Param, Post, Put, Req, UseGuards,
} from "@nestjs/common";
import { ApiError, input, type AccountRequest } from "../../infrastructure/http.js";
import { AuthGuard, readSessionCookie } from "../auth/auth.guard.js";
import { ProjectsService } from "./projects.service.js";

function sessionId(request: AccountRequest) {
  const token = readSessionCookie(request.cookies);
  if (!token) throw new ApiError("E_UNAUTHORIZED", "请登录本机管理员账号", 401);
  return token;
}

@Controller("projects")
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projects: ProjectsService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  list(@Req() request: AccountRequest) {
    return this.projects.list(request.account.id);
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  find(@Req() request: AccountRequest, @Param("id") id: unknown) {
    return this.projects.find(request.account.id, input(projectId, id));
  }

  @Post()
  @Header("Cache-Control", "no-store")
  create(@Req() request: AccountRequest, @Body() body: unknown) {
    return this.projects.create(request.account.id, input(projectSaveRequest, body));
  }

  @Put(":id")
  @Header("Cache-Control", "no-store")
  replace(@Req() request: AccountRequest, @Param("id") id: unknown, @Body() body: unknown) {
    return this.projects.replace(request.account.id, input(projectId, id), input(projectReplaceRequest, body));
  }

  @Post(":id/delete-confirmation")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  async prepareDelete(@Req() request: AccountRequest, @Param("id") id: unknown) {
    const confirmation = await this.projects.prepareDelete(request.account.id, input(projectId, id), sessionId(request));
    return projectDeleteConfirmationResponse.parse(confirmation);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Req() request: AccountRequest, @Param("id") id: unknown, @Headers("x-project-delete-token") token: unknown) {
    const parsedId = input(projectId, id);
    if (token === undefined) throw new ApiError("E_PROJECT_DELETE_CONFIRMATION", "请先完成第一次删除确认", 409);
    return this.projects.remove(request.account.id, parsedId, sessionId(request), input(projectDeleteToken, token));
  }
}
