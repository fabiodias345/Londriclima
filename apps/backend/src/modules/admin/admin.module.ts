import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAgendaService } from "./services/admin-agenda.service";
import { AdminClientesService } from "./services/admin-clientes.service";
import { AdminEquipamentosService } from "./services/admin-equipamentos.service";
import { AdminEngenheirosService } from "./services/admin-engenheiros.service";
import { AdminEquipesService } from "./services/admin-equipes.service";
import { AdminFrotaService } from "./services/admin-frota.service";
import { AdminPreChamadosService } from "./services/admin-pre-chamados.service";
import { AdminRecorrenciaService } from "./services/admin-recorrencia.service";
import { AdminTecnicosService } from "./services/admin-tecnicos.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminAgendaService,
    AdminRecorrenciaService,
    AdminFrotaService,
    AdminClientesService,
    AdminEquipamentosService,
    AdminTecnicosService,
    AdminEquipesService,
    AdminEngenheirosService,
    AdminPreChamadosService
  ],
  exports: [AdminService]
})
export class AdminModule {}
