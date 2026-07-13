import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth-user";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WhatsAppService } from "./whatsapp.service";

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

  @Post("conversas/:id/mensagens")
  responder(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: { texto?: string },
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.whatsappService.responderConversa(id, usuario.empresa_id, String(body.texto || "").trim());
  }
}
