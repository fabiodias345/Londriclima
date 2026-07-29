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

  @Post("clientes/buscar")
  buscarClientes(@Body() body: { termo?: string }, @CurrentUser() usuario: AuthenticatedUser) {
    return this.iaService.buscarClientes(usuario.empresa_id, String(body.termo || ""));
  }

  @Post("catalogo/consultar")
  consultarCatalogo(@Body() body: { termo?: string }, @CurrentUser() usuario: AuthenticatedUser) {
    return this.iaService.consultarCatalogo(usuario.empresa_id, body.termo);
  }

  @Post("rascunho/validar")
  validarRascunho(@Body() body: { itens?: Array<{ item_catalogo_id?: string; tipo?: string; descricao?: string; unidade?: string; quantidade?: number; valor_unitario?: number }>; desconto?: number; total_informado?: number }, @CurrentUser() usuario: AuthenticatedUser) {
    return this.iaService.validarRascunho(usuario.empresa_id, body);
  }

  @Post("conversas/:conversaId/analisar")
  analisar(
    @Param("conversaId", new ParseUUIDPipe()) conversaId: string,
    @Body() body: { contexto?: string },
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.iaService.analisarConversa(conversaId, usuario.empresa_id, String(body.contexto || ""));
  }
}
