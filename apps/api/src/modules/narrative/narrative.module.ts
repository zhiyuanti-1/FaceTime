import { Module } from "@nestjs/common";
import { NarrativeController } from "./narrative.controller.js";
import { NarrativeService } from "./narrative.service.js";

@Module({ controllers: [NarrativeController], providers: [NarrativeService] })
export class NarrativeModule {}
