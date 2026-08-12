import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth-user";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ComercialService } from "./comercial.service";
import { AgendarVisitaOrcamentoDto, AtualizarStatusOrcamentoDto, ConfirmarOrcamentoDto, CriarOrcamentoDto, EnviarOrcamentoEmailDto, SalvarItemCatalogoDto } from "./dto/comercial.dto";

type HeaderResponse = { setHeader(name: string, value: string): void };

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

  @Delete("catalogo/:id")
  apagarItem(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.apagarItemCatalogo(id, usuario.empresa_id);
  }

  @Get("orcamentos")
  listarOrcamentos(@CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.listarOrcamentos(usuario.empresa_id);
  }

  @Post("orcamentos")
  criarOrcamento(@Body() dto: CriarOrcamentoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.criarOrcamento(dto, usuario);
  }

  @Delete("orcamentos/:id")
  apagarOrcamento(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.apagarOrcamento(id, usuario.empresa_id);
  }

  @Get("orcamentos/:id")
  obterOrcamento(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.obterOrcamento(id, usuario.empresa_id);
  }

  @Get("orcamentos/:id/pdf")
  async gerarPdf(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser, @Res({ passthrough: true }) response: HeaderResponse) {
    const pdf = await this.comercialService.gerarPdfOrcamento(id, usuario.empresa_id);
    response.setHeader("Content-Type", pdf.contentType);
    response.setHeader("Content-Disposition", `inline; filename="${pdf.filename}"`);
    return new StreamableFile(pdf.buffer);
  }

  @Post("orcamentos/:id/confirmar")
  confirmar(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: ConfirmarOrcamentoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.confirmarOrcamento(id, dto, usuario);
  }

  @Post("orcamentos/:id/visita")
  agendarVisita(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: AgendarVisitaOrcamentoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.agendarVisita(id, dto, usuario);
  }

  @Post("orcamentos/:id/gerar-os")
  converterEmOrdem(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.converterEmOrdem(id, usuario);
  }
  @Post("orcamentos/:id/enviar-whatsapp")
  enviarWhatsApp(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.enviarWhatsApp(id, usuario.empresa_id);
  }

  @Post("orcamentos/:id/enviar-email")
  enviarEmail(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: EnviarOrcamentoEmailDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.enviarEmail(id, dto, usuario.empresa_id);
  }

  @Post("orcamentos/:id/assinafy")
  enviarAssinafy(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.enviarAssinafy(id, usuario.empresa_id);
  }

  @Patch("orcamentos/:id/status")
  atualizarStatus(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: AtualizarStatusOrcamentoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.atualizarStatus(id, dto, usuario.empresa_id);
  }

  @Post("orcamentos/:id/aceite-whatsapp")
  registrarAceiteWhatsApp(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.registrarAceiteWhatsApp(id, usuario.empresa_id);
  }
  @Post("orcamentos/:id/enviar")
  enviarOrcamento(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.comercialService.enviarOrcamento(id, usuario.empresa_id);
  }
}
