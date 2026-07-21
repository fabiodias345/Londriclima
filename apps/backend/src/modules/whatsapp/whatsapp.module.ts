import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminModule } from "../admin/admin.module";
import { AutomacoesModule } from "../automacoes/automacoes.module";
import { WhatsAppAdminController } from "./whatsapp-admin.controller";
import { WhatsAppController } from "./whatsapp.controller";
import { WhatsAppService } from "./whatsapp.service";
import { BoltModule } from "./bolt/bolt.module";

@Module({
  imports: [AuthModule, AutomacoesModule, BoltModule, AdminModule],
  controllers: [WhatsAppController, WhatsAppAdminController],
  providers: [WhatsAppService]
})
export class WhatsAppModule {}
