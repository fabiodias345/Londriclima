import { Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("pre-chamados")
  listarPreChamados(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarPreChamados(usuario);
  }

  @Get("frota/localizacoes")
  listarLocalizacoesFrota(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarLocalizacoesFrota(usuario);
  }

  @Patch("pre-chamados/:osId/aprovar")
  aprovarPreChamado(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.aprovarPreChamado(osId, usuario);
  }

  @Patch("pre-chamados/:osId/rejeitar")
  rejeitarPreChamado(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.rejeitarPreChamado(osId, usuario);
  }
}
