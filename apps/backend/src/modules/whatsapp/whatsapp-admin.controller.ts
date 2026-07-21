import { Body, Controller, Get, MessageEvent, Param, ParseUUIDPipe, Patch, Post, Sse, UseGuards } from "@nestjs/common";
import { Observable } from "rxjs";
import { AuthenticatedUser } from "../auth/auth-user";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WhatsAppService } from "./whatsapp.service";
import { SalvarClienteDto } from "../admin/dto/salvar-cliente.dto";
import { SalvarOsAgendaDto } from "../admin/dto/salvar-os-agenda.dto";

@Controller("admin/whatsapp")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class WhatsAppAdminController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get("conversas")
  listar(@CurrentUser() usuario: AuthenticatedUser) {
    return this.whatsappService.listarConversas(usuario.empresa_id);
  }

  @Get("conversas/:id")
  obter(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.whatsappService.obterConversa(id, usuario.empresa_id);
  }

  @Patch("conversas/:id/assumir")
  assumir(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.whatsappService.assumirConversa(id, usuario.empresa_id, usuario.id);
  }

  @Patch("conversas/:id/liberar")
  liberar(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.whatsappService.liberarConversa(id, usuario.empresa_id, usuario.id);
  }

  @Patch("conversas/:id/ler")
  ler(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.whatsappService.marcarLeitura(id, usuario.empresa_id);
  }

  @Post("conversas/:id/encerrar")
  encerrar(@Param("id", new ParseUUIDPipe()) id: string, @Body() body: { motivo?: string }, @CurrentUser() usuario: AuthenticatedUser) {
    return this.whatsappService.encerrarConversa(id, usuario.empresa_id, String(body.motivo || "concluido"));
  }

  @Post("conversas/:id/reabrir")
  reabrir(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.whatsappService.reabrirConversa(id, usuario.empresa_id);
  }

  @Post("conversas/:id/cliente")
  criarCliente(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: SalvarClienteDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.whatsappService.criarClienteDaConversa(id, usuario.empresa_id, dto, usuario);
  }

  @Post("conversas/:id/os")
  criarOs(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: SalvarOsAgendaDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.whatsappService.criarOrdemDaConversa(id, usuario.empresa_id, dto, usuario);
  }

  @Sse("eventos")
  eventos(@CurrentUser() usuario: AuthenticatedUser): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const unsubscribe = this.whatsappService.subscribe((evento) => {
        if (evento.empresaId === usuario.empresa_id) subscriber.next({ data: evento });
      });
      return unsubscribe;
    });
  }

  @Post("conversas/:id/mensagens")
  responder(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: { texto?: string },
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.whatsappService.responderConversa(id, usuario.empresa_id, usuario.id, String(body.texto || "").trim());
  }
}
