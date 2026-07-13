import { Body, Controller, Get, HttpCode, Post, Query, UnauthorizedException } from "@nestjs/common";
import { WhatsAppService } from "./whatsapp.service";

@Controller("webhooks/whatsapp")
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get()
  verificar(@Query("hub.mode") mode: string, @Query("hub.verify_token") token: string, @Query("hub.challenge") challenge: string) {
    if (mode !== "subscribe" || !this.whatsappService.verificarWebhookToken(token)) {
      throw new UnauthorizedException("Webhook WhatsApp nao autorizado.");
    }
    return challenge;
  }

  @Post()
  @HttpCode(200)
  receber(@Body() payload: Record<string, unknown>) {
    return this.whatsappService.receberWebhook(payload);
  }
}
