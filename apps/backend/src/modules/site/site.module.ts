import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminModule } from "../admin/admin.module";
import { SiteController } from "./site.controller";
import { SiteService } from "./site.service";

@Module({
  imports: [AuthModule, AdminModule],
  controllers: [SiteController],
  providers: [SiteService]
})
export class SiteModule {}
