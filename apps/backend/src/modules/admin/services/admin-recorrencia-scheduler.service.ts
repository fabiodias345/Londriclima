import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { AdminRecorrenciaService } from "./admin-recorrencia.service";

@Injectable()
export class AdminRecorrenciaSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminRecorrenciaSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private processando = false;

  constructor(private readonly recorrencias: AdminRecorrenciaService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.processar().catch((error: unknown) => {
        this.logger.error("Falha ao gerar OS recorrentes vencidas.", error instanceof Error ? error.stack : String(error));
      });
    }, 10 * 60 * 1000);

    void this.processar().catch((error: unknown) => {
      this.logger.error("Falha ao gerar OS recorrentes vencidas.", error instanceof Error ? error.stack : String(error));
    });
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async processar() {
    if (this.processando) {
      return;
    }

    this.processando = true;

    try {
      const resultado = await this.recorrencias.gerarOrdensRecorrentesVencidas();

      if (resultado.geradas || resultado.falhas) {
        this.logger.log(`Recorrencias processadas: ${resultado.geradas} geradas, ${resultado.falhas} falhas.`);
      }
    } finally {
      this.processando = false;
    }
  }
}
