import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AssinaturasModule } from "./modules/assinaturas/assinaturas.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AutomacoesModule } from "./modules/automacoes/automacoes.module";
import { HealthModule } from "./modules/health/health.module";
import { MobileModule } from "./modules/mobile/mobile.module";
import { OrdensServicoModule } from "./modules/ordens-servico/ordens-servico.module";
import { SiteModule } from "./modules/site/site.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"]
    }),
    DatabaseModule,
    AdminModule,
    AssinaturasModule,
    AuthModule,
    AutomacoesModule,
    HealthModule,
    MobileModule,
    OrdensServicoModule,
    SiteModule
  ]
})
export class AppModule {}
