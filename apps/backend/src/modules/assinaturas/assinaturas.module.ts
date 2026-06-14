import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { AuthModule } from "../auth/auth.module";
import { AssinafyService } from "./assinafy.service";
import { AssinaturasController } from "./assinaturas.controller";

@Module({
  imports: [AdminModule, AuthModule],
  controllers: [AssinaturasController],
  providers: [AssinafyService]
})
export class AssinaturasModule {}
