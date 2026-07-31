import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/auth-user";
import { IaService } from "./ia.service";

@Controller("admin/ia")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @Get("clientes")
  clientes(@Query("q") query: string, @Query("conversa_id") conversaId: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.iaService.buscarOuIdentificarCliente(usuario.empresa_id, String(query || ""), conversaId);
  }

  @Get("catalogo")
  catalogo(@Query("q") query: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.iaService.consultarCatalogo(usuario.empresa_id, query);
  }

  @Post("calcular-totais")
  calcularTotais(@Body() body: { itens?: any[]; desconto?: number }, @CurrentUser() usuario: AuthenticatedUser) {
    return this.iaService.calcularTotais(usuario.empresa_id, body.itens || [], body.desconto);
  }

  @Post("conversas/:conversaId/analisar")
  analisar(@Param("conversaId", new ParseUUIDPipe()) conversaId: string, @Body() body: { contexto?: string }, @CurrentUser() usuario: AuthenticatedUser) {
    return this.iaService.analisarConversa(conversaId, usuario.empresa_id, String(body.contexto || ""));
  }

  @Post("conversas/:conversaId/rascunho")
  rascunho(@Param("conversaId", new ParseUUIDPipe()) conversaId: string, @Body() body: { titulo?: string; itens?: any[]; desconto?: number }, @CurrentUser() usuario: AuthenticatedUser) {
    return this.iaService.montarRascunhoOrcamento(usuario.empresa_id, conversaId, { titulo: body.titulo, itens: body.itens || [], desconto: body.desconto });
  }
}
