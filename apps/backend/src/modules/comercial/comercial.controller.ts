import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth-user";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ComercialService } from "./comercial.service";
import { CriarOrcamentoDto, SalvarItemCatalogoDto } from "./dto/comercial.dto";

@Controller("admin/comercial")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class ComercialController {
  constructor(private readonly comercialService: ComercialService) {}

  @Get("catalogo")
  listarCatalogo(@CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.listarCatalogo(usuario.empresa_id);
  }

  @Post("catalogo")
  criarItem(@Body() dto: SalvarItemCatalogoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.salvarItemCatalogo(dto, usuario.empresa_id);
  }

  @Patch("catalogo/:id")
  atualizarItem(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: SalvarItemCatalogoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.salvarItemCatalogo(dto, usuario.empresa_id, id);
  }

  @Get("orcamentos")
  listarOrcamentos(@CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.listarOrcamentos(usuario.empresa_id);
  }

  @Post("orcamentos")
  criarOrcamento(@Body() dto: CriarOrcamentoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.criarOrcamento(dto, usuario);
  }

  @Post("orcamentos/:id/enviar")
  enviarOrcamento(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.enviarOrcamento(id, usuario.empresa_id);
  }
}
