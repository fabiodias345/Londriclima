import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AdminRoleGuard } from "./admin-role.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { MobileRoleGuard } from "./mobile-role.guard";
import { PasswordHashService } from "./password-hash.service";
import { TokenService } from "./token.service";
import { FuncionarioStorageService } from "./funcionario-storage.service";
import { FuncionarioTermoService } from "./funcionario-termo.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AdminRoleGuard, JwtAuthGuard, MobileRoleGuard, PasswordHashService, TokenService, FuncionarioStorageService, FuncionarioTermoService],
  exports: [AdminRoleGuard, JwtAuthGuard, MobileRoleGuard, PasswordHashService, TokenService, FuncionarioStorageService]
})
export class AuthModule {}
