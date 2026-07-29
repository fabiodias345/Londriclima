import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/auth-user";
import { IaService } from "./ia.service";

@Controller("admin/ia")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @Post("conversas/:conversaId/analisar")
  analisar(
    @Param("conversaId", new ParseUUIDPipe()) conversaId: string,
    @Body() body: { contexto?: string },
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.iaService.analisarConversa(conversaId, usuario.empresa_id, String(body.contexto || ""));
  }
}
