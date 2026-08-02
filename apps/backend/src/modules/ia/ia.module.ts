import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { IaController } from "./ia.controller";
import { IaService } from "./ia.service";

@Module({ imports: [AuthModule], controllers: [IaController], providers: [IaService], exports: [IaService] })
export class IaModule {}
