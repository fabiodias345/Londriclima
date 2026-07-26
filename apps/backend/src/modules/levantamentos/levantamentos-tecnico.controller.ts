import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { AuthenticatedUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MobileRoleGuard } from "../auth/mobile-role.guard";
import { FinalizarLaudoLevantamentoDto, SalvarLaudoLevantamentoDto } from "./dto/laudo-levantamento.dto";
import type { LaudoFotoUpload } from "./levantamentos-tecnico.service";
import { LevantamentosTecnicoService } from "./levantamentos-tecnico.service";

@Controller("mobile/levantamentos")
@UseGuards(JwtAuthGuard, MobileRoleGuard)
export class LevantamentosTecnicoController {
  constructor(private readonly service: LevantamentosTecnicoService) {}

  @Get() listar(@CurrentUser() usuario: AuthenticatedUser) { return this.service.listarMeus(usuario); }
  @Get(":id") obter(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) { return this.service.obterMeu(id, usuario); }
  @Post(":id/iniciar") iniciar(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) { return this.service.iniciar(id, usuario); }
  @Patch(":id/rascunho") salvar(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: SalvarLaudoLevantamentoDto, @CurrentUser() usuario: AuthenticatedUser) { return this.service.salvarRascunho(id, dto, usuario); }
  @Post(":id/fotos")
  @UseInterceptors(FileInterceptor("foto", { limits: { fileSize: 8 * 1024 * 1024 } }))
  foto(@Param("id", new ParseUUIDPipe()) id: string, @UploadedFile() foto: LaudoFotoUpload | undefined, @Body("limpeza") limpeza: string | undefined, @Body("legenda") legenda: string | undefined, @CurrentUser() usuario: AuthenticatedUser) { return this.service.adicionarFoto(id, foto, usuario, limpeza === "true", legenda); }
  @Post(":id/finalizar") finalizar(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: FinalizarLaudoLevantamentoDto, @CurrentUser() usuario: AuthenticatedUser) { return this.service.finalizar(id, dto, usuario); }
}
