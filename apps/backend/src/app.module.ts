import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { OrdensServicoModule } from "./modules/ordens-servico/ordens-servico.module";
import { SiteModule } from "./modules/site/site.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"]
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    OrdensServicoModule,
    SiteModule
  ]
})
export class AppModule {}
