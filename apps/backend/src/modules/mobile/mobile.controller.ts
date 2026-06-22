import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/auth-user";
import { MobileService } from "./mobile.service";

@Controller("mobile")
@UseGuards(JwtAuthGuard)
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get("os")
  listarOrdens(@CurrentUser() user: AuthenticatedUser) {
    return this.mobileService.listarOrdens(user);
  }

  @Get("os/:id")
  obterOrdem(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.mobileService.obterOrdem(user, id);
  }
}

