import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminModule } from "../admin/admin.module";
import { AutomacoesModule } from "../automacoes/automacoes.module";
import { LevantamentosModule } from "../levantamentos/levantamentos.module";
import { ComercialController } from "./comercial.controller";
import { ComercialService } from "./comercial.service";
import { ComercialOrcamentoPdfRenderer } from "./comercial-orcamento-pdf-renderer";
import { ComercialAssinafyService } from "./comercial-assinafy.service";

@Module({
  imports: [AuthModule, AutomacoesModule, LevantamentosModule, AdminModule],
  controllers: [ComercialController],
  providers: [ComercialService, ComercialOrcamentoPdfRenderer, ComercialAssinafyService],
  exports: [ComercialService]
})
export class ComercialModule {}
