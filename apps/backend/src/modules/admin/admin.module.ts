import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAgendaService } from "./services/admin-agenda.service";
import { AdminFrotaService } from "./services/admin-frota.service";
import { AdminRecorrenciaService } from "./services/admin-recorrencia.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAgendaService, AdminRecorrenciaService, AdminFrotaService],
  exports: [AdminService]
})
export class AdminModule {}
