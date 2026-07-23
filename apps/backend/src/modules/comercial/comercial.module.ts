import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AutomacoesModule } from "../automacoes/automacoes.module";
import { ComercialController } from "./comercial.controller";
import { ComercialService } from "./comercial.service";

@Module({
  imports: [AuthModule, AutomacoesModule],
  controllers: [ComercialController],
  providers: [ComercialService],
  exports: [ComercialService]
})
export class ComercialModule {}
