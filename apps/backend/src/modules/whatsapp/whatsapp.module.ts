import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AutomacoesModule } from "../automacoes/automacoes.module";
import { WhatsAppAdminController } from "./whatsapp-admin.controller";
import { WhatsAppController } from "./whatsapp.controller";
import { WhatsAppService } from "./whatsapp.service";

@Module({
  imports: [AuthModule, AutomacoesModule],
  controllers: [WhatsAppController, WhatsAppAdminController],
  providers: [WhatsAppService]
})
export class WhatsAppModule {}
