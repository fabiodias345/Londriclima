import { Module } from "@nestjs/common";
import { AutomacoesService } from "./automacoes.service";
import { SmtpEmailService } from "./smtp-email.service";

@Module({
  providers: [AutomacoesService, SmtpEmailService],
  exports: [SmtpEmailService]
})
export class AutomacoesModule {}
