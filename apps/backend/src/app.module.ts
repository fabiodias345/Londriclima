import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ComercialModule } from "./modules/comercial/comercial.module";
import { DatabaseModule } from "./database/database.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AssinaturasModule } from "./modules/assinaturas/assinaturas.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AutomacoesModule } from "./modules/automacoes/automacoes.module";
import { HealthModule } from "./modules/health/health.module";
import { MobileModule } from "./modules/mobile/mobile.module";
import { IaModule } from "./modules/ia/ia.module";
import { OrdensServicoModule } from "./modules/ordens-servico/ordens-servico.module";
import { SiteModule } from "./modules/site/site.module";
import { WhatsAppModule } from "./modules/whatsapp/whatsapp.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.production", "../.env.production", "../../.env.production", "whats.env", "../../whats.env", ".env", "../.env", ".env.local"]
    }),
    DatabaseModule,
    ComercialModule,
    AdminModule,
    AssinaturasModule,
    AuthModule,
    AutomacoesModule,
    HealthModule,
    MobileModule,
    IaModule,
    OrdensServicoModule,
    SiteModule,
    WhatsAppModule
  ]
})
export class AppModule {}
