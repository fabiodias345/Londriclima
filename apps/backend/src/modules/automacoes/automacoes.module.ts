import { Module } from "@nestjs/common";
import { AutomacoesService } from "./automacoes.service";
import { SmtpEmailService } from "./smtp-email.service";
import { WhatsAppCloudService } from "./whatsapp-cloud.service";

@Module({
  providers: [AutomacoesService, SmtpEmailService, WhatsAppCloudService],
  exports: [SmtpEmailService, WhatsAppCloudService]
})
export class AutomacoesModule {}
