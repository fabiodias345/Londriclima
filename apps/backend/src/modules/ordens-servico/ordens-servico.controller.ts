import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthenticatedUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AtualizarStatusOsDto } from "./dto/atualizar-status-os.dto";
import { FinalizarOsDto } from "./dto/finalizar-os.dto";
import { IdentificarEquipamentoDto } from "./dto/identificar-equipamento.dto";
import { RegistrarChecklistDto } from "./dto/registrar-checklist.dto";
import { RegistrarObservacoesDto } from "./dto/registrar-observacoes.dto";
import { OrdensServicoService } from "./ordens-servico.service";

const LIMITE_FOTO_BYTES = 800 * 1024;

export type EvidenciaUploadFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Controller("os")
@UseGuards(JwtAuthGuard)
export class OrdensServicoController {
  constructor(private readonly ordensServicoService: OrdensServicoService) {}

  @Patch(":osId/status")
  atualizarStatus(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @Body() dto: AtualizarStatusOsDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.ordensServicoService.atualizarStatus(osId, dto, usuario);
  }

  @Put(":osId/identificacao-equipamento")
  identificarEquipamento(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @Body() dto: IdentificarEquipamentoDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.ordensServicoService.identificarEquipamento(osId, dto, usuario);
  }

  @Post(":osId/evidencia-inicial")
  @UseInterceptors(FileInterceptor("foto_antes", { limits: { fileSize: LIMITE_FOTO_BYTES } }))
  registrarEvidenciaInicial(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @Body("descricao_antes") descricao: string | undefined,
    @UploadedFile() foto: EvidenciaUploadFile | undefined,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.ordensServicoService.registrarEvidencia(osId, {
      tipo: "antes",
      descricao,
      foto,
      usuario
    });
  }

  @Post(":osId/evidencia-final")
  @UseInterceptors(FileInterceptor("foto_depois", { limits: { fileSize: LIMITE_FOTO_BYTES } }))
  registrarEvidenciaFinal(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @Body("descricao_depois") descricao: string | undefined,
    @UploadedFile() foto: EvidenciaUploadFile | undefined,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.ordensServicoService.registrarEvidencia(osId, {
      tipo: "depois",
      descricao,
      foto,
      usuario
    });
  }

  @Post(":osId/checklist")
  registrarChecklist(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @Body() dto: RegistrarChecklistDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.ordensServicoService.registrarChecklist(osId, dto, usuario);
  }

  @Post(":osId/checklist/fotos")
  @UseInterceptors(FileInterceptor("foto", { limits: { fileSize: LIMITE_FOTO_BYTES } }))
  registrarFotoChecklist(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @Body("equipamento_id") equipamentoId: string | undefined,
    @Body("codigo") codigo: string | undefined,
    @UploadedFile() foto: EvidenciaUploadFile | undefined,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.ordensServicoService.registrarFotoChecklist(
      osId,
      {
        equipamentoId,
        codigo,
        foto
      },
      usuario
    );
  }

  @Patch(":osId/observacoes")
  registrarObservacoes(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @Body() dto: RegistrarObservacoesDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.ordensServicoService.registrarObservacoes(osId, dto, usuario);
  }

  @Post(":osId/finalizar")
  finalizarOs(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @Body() dto: FinalizarOsDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.ordensServicoService.finalizarOs(osId, dto, usuario);
  }
}
