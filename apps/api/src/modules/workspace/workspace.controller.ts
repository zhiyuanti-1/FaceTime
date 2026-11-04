import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiJsonBody } from "../../infrastructure/api-docs.js";
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { preferencesSchema, deleteConfirmation } from "@face/shared";
import { input, type AccountRequest } from "../../infrastructure/http.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { PreferencesRepository } from "./preferences.repository.js";
import { WorkspaceService } from "./workspace.service.js";
import { DataService } from "./data.service.js";
@UseGuards(AuthGuard)
@ApiTags("工作台与个人中心")
@Controller("api/v1")
export class WorkspaceController {
  constructor(
    @Inject(PreferencesRepository)
    private readonly preferences: PreferencesRepository,
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(DataService) private readonly data: DataService,
  ) {}
  @ApiOperation({ summary: "查看工作台概览" })
  @Get("dashboard")
  dashboard(@Req() req: AccountRequest) {
    return this.workspace.overview(req.account);
  }
  @ApiOperation({ summary: "查看个人中心概览" })
  @Get("me")
  overview(@Req() req: AccountRequest) {
    return this.workspace.overview(req.account);
  }
  @ApiOperation({ summary: "读取练习偏好" })
  @Get("me/preferences")
  getPreferences(@Req() req: AccountRequest) {
    return this.preferences.get(req.account.id);
  }
  @ApiOperation({ summary: "保存练习偏好" })
  @Put("me/preferences")
  @ApiJsonBody(preferencesSchema)
  putPreferences(@Req() req: AccountRequest, @Body() body: unknown) {
    return this.preferences.put(req.account.id, input(preferencesSchema, body));
  }
  @ApiOperation({ summary: "查看诊断信息" })
  @Get("me/diagnostics")
  diagnostics() {
    return this.workspace.diagnostics();
  }
  @ApiOperation({ summary: "导出诊断信息" })
  @Get("me/diagnostics/export")
  async diagnosticExport(@Res({ passthrough: true }) res: Response) {
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="face-diagnostics.json"',
    );
    return this.workspace.diagnostics();
  }
  @ApiOperation({ summary: "导出账号数据" })
  @Get("me/data/export")
  async export(
    @Req() req: AccountRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="face-data.json"',
    );
    return this.data.export(req.account.id);
  }
  @ApiOperation({ summary: "清理音频文件" })
  @Post("me/audio/cleanup")
  @ApiJsonBody(deleteConfirmation)
  cleanup(@Req() req: AccountRequest, @Body() body: unknown) {
    input(deleteConfirmation, body);
    return this.data.cleanupAudio(req.account.id);
  }
  @ApiOperation({ summary: "删除账号业务数据" })
  @Delete("me/data")
  @ApiJsonBody(deleteConfirmation)
  removeAll(@Req() req: AccountRequest, @Body() body: unknown) {
    input(deleteConfirmation, body);
    return this.data.removeAll(req.account.id);
  }
}
