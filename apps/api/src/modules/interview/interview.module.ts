import { Module } from "@nestjs/common";
import { InterviewController } from "./interview.controller.js";
import { InterviewService } from "./interview.service.js";

@Module({ controllers: [InterviewController], providers: [InterviewService] })
export class InterviewModule {}
