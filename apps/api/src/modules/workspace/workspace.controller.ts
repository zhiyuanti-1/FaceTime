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
@Controller("api/v1")
export class WorkspaceController {
  constructor(
    @Inject(PreferencesRepository)
    private readonly preferences: PreferencesRepository,
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(DataService) private readonly data: DataService,
  ) {}
  @Get("dashboard") dashboard(@Req() req: AccountRequest) {
    return this.workspace.overview(req.account);
  }
  @Get("me") overview(@Req() req: AccountRequest) {
    return this.workspace.overview(req.account);
  }
  @Get("me/preferences") getPreferences(@Req() req: AccountRequest) {
    return this.preferences.get(req.account.id);
  }
  @Put("me/preferences") putPreferences(
    @Req() req: AccountRequest,
    @Body() body: unknown,
  ) {
    return this.preferences.put(req.account.id, input(preferencesSchema, body));
  }
  @Get("me/diagnostics") diagnostics() {
    return this.workspace.diagnostics();
  }
  @Get("me/diagnostics/export") async diagnosticExport(
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="face-diagnostics.json"',
    );
    return this.workspace.diagnostics();
  }
  @Get("me/data/export") async export(
    @Req() req: AccountRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="face-data.json"',
    );
    return this.data.export(req.account.id);
  }
  @Post("me/audio/cleanup") cleanup(
    @Req() req: AccountRequest,
    @Body() body: unknown,
  ) {
    input(deleteConfirmation, body);
    return this.data.cleanupAudio(req.account.id);
  }
  @Delete("me/data") removeAll(
    @Req() req: AccountRequest,
    @Body() body: unknown,
  ) {
    input(deleteConfirmation, body);
    return this.data.removeAll(req.account.id);
  }
}
