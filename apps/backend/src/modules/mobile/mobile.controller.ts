import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CriarAbastecimentoDto } from "../admin/dto/criar-abastecimento.dto";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MobileRoleGuard } from "../auth/mobile-role.guard";
import type { AuthenticatedUser } from "../auth/auth-user";
import { MobileService } from "./mobile.service";

@Controller("mobile")
@UseGuards(JwtAuthGuard, MobileRoleGuard)
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

  @Get("frota/veiculos")
  listarVeiculos(@CurrentUser() user: AuthenticatedUser) {
    return this.mobileService.listarVeiculos(user);
  }

  @Post("frota/abastecimentos")
  registrarAbastecimento(@CurrentUser() user: AuthenticatedUser, @Body() dto: CriarAbastecimentoDto) {
    return this.mobileService.registrarAbastecimento(user, dto);
  }
}

