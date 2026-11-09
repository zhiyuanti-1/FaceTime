import { Module } from "@nestjs/common";
import { DiagnosisController } from "./diagnosis.controller.js";
import { DiagnosisService } from "./diagnosis.service.js";

@Module({ controllers: [DiagnosisController], providers: [DiagnosisService] })
export class DiagnosisModule {}
