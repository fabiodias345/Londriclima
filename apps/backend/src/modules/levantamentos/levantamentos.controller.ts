import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { AuthenticatedUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AgendarLevantamentoDto, CancelarLevantamentoDto, CriarLevantamentoDto } from "./dto/levantamentos.dto";
import { LevantamentosService } from "./levantamentos.service";
import { LevantamentosNotificacaoService } from "./levantamentos-notificacao.service";

@Controller("admin/levantamentos")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class LevantamentosController {
  constructor(private readonly levantamentos: LevantamentosService, private readonly notificacoes: LevantamentosNotificacaoService) {}

  @Get() listar(@CurrentUser() usuario: AuthenticatedUser) { return this.levantamentos.listar(usuario.empresa_id); }
  @Get(":id") obter(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) { return this.levantamentos.obter(id, usuario.empresa_id); }
  @Post() criar(@Body() dto: CriarLevantamentoDto, @CurrentUser() usuario: AuthenticatedUser) { return this.levantamentos.criar(usuario.empresa_id, dto.cliente_id, dto.conversa_id, dto); }
  @Patch(":id/agendar") agendar(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: AgendarLevantamentoDto, @CurrentUser() usuario: AuthenticatedUser) { return this.levantamentos.agendar(id, usuario.empresa_id, dto); }
  @Post(":id/cancelar") async cancelar(@Param("id", new ParseUUIDPipe()) id: string, @Body() _dto: CancelarLevantamentoDto, @CurrentUser() usuario: AuthenticatedUser) {
    const levantamento = await this.levantamentos.cancelar(id, usuario.empresa_id);
    await this.notificacoes.enviarCancelamento(id, usuario.empresa_id);
    return levantamento;
  }
  @Post(":id/notificacao/reenviar") reenviarAviso(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) { return this.notificacoes.reenviar(id, usuario.empresa_id).then((enviado) => ({ enviado })); }
}
