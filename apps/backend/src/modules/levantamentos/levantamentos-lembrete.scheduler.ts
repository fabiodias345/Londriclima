import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LevantamentosNotificacaoService } from "./levantamentos-notificacao.service";

@Injectable()
export class LevantamentosLembreteScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LevantamentosLembreteScheduler.name);
  private timer?: NodeJS.Timeout;
  private processando = false;

  constructor(private readonly notificacoes: LevantamentosNotificacaoService, private readonly config: ConfigService) {}

  onModuleInit() {
    if (!this.ativo()) return;
    this.timer = setInterval(() => void this.processar(), 5 * 60 * 1000);
    void this.processar();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async processar() {
    if (this.processando) return;
    this.processando = true;
    try {
      const resultado = await this.notificacoes.enviarLembretesPendentes();
      if (resultado.enviados || resultado.falhas) this.logger.log(`Lembretes de levantamento: ${resultado.enviados} enviados, ${resultado.falhas} falhas.`);
    } catch (error) {
      this.logger.error("Falha ao enviar lembretes de levantamento.", error instanceof Error ? error.stack : String(error));
    } finally {
      this.processando = false;
    }
  }

  private ativo() {
    const configurado = this.config.get<string | boolean | undefined>("LEVANTAMENTOS_LEMBRETE_SCHEDULER_ENABLED");
    if (configurado !== undefined && configurado !== "") return configurado === true || String(configurado).toLowerCase() === "true";
    return this.config.get<string>("NODE_ENV") !== "test";
  }
}
