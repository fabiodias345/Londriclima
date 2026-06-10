import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PasswordHashService } from "./password-hash.service";
import { TokenService } from "./token.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PasswordHashService, TokenService],
  exports: [JwtAuthGuard, TokenService]
})
export class AuthModule {}
