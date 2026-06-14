import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AssinafyService } from "./assinafy.service";

@Controller("assinaturas")
export class AssinaturasController {
  constructor(private readonly assinafyService: AssinafyService) {}

  @Post("pmoc/clientes/:clienteId/assinafy")
  @UseGuards(JwtAuthGuard)
  enviarPmocParaAssinatura(
    @Param("clienteId", new ParseUUIDPipe()) clienteId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.assinafyService.enviarPmocParaAssinatura(clienteId, usuario);
  }

  @Post("webhook/assinafy")
  processarWebhook(@Body() payload: unknown) {
    return this.assinafyService.processarWebhook(payload as Record<string, unknown>);
  }
}
