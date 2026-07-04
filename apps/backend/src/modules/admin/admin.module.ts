import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AutomacoesModule } from "../automacoes/automacoes.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAgendaService } from "./services/admin-agenda.service";
import { AdminClientesService } from "./services/admin-clientes.service";
import { AdminEquipamentosService } from "./services/admin-equipamentos.service";
import { AdminEngenheirosService } from "./services/admin-engenheiros.service";
import { AdminEquipesService } from "./services/admin-equipes.service";
import { AdminFrotaService } from "./services/admin-frota.service";
import { AdminPmocPdfService } from "./services/admin-pmoc-pdf.service";
import { AdminPmocService } from "./services/admin-pmoc.service";
import { AdminPreChamadosService } from "./services/admin-pre-chamados.service";
import { AdminRecorrenciaSchedulerService } from "./services/admin-recorrencia-scheduler.service";
import { AdminRecorrenciaService } from "./services/admin-recorrencia.service";
import { AdminRelatorioTecnicoCoreService } from "./services/admin-relatorio-tecnico-core.service";
import { AdminRelatoriosService } from "./services/admin-relatorios.service";
import { AdminTecnicosService } from "./services/admin-tecnicos.service";
import { AdminConvitesTecnicoService } from "./services/admin-convites-tecnico.service";

@Module({
  imports: [AuthModule, AutomacoesModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminAgendaService,
    AdminRecorrenciaService,
    AdminRecorrenciaSchedulerService,
    AdminFrotaService,
    AdminClientesService,
    AdminEquipamentosService,
    AdminTecnicosService,
    AdminConvitesTecnicoService,
    AdminEquipesService,
    AdminEngenheirosService,
    AdminPreChamadosService,
    AdminRelatorioTecnicoCoreService,
    AdminRelatoriosService,
    AdminPmocService,
    AdminPmocPdfService
  ],
  exports: [AdminService]
})
export class AdminModule {}
