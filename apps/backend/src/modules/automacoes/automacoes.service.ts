import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AutomacaoStatus, AutomacaoTipo, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { EmailSender, SmtpEmailService } from "./smtp-email.service";

type AutomacaoEmailPayload = {
  tipo?: unknown;
  relatorio_id?: unknown;
  cliente_id?: unknown;
  cliente_nome?: unknown;
  cliente_email?: unknown;
  engenheiro_email?: unknown;
  engenheiro_nome?: unknown;
  engenheiro_crea?: unknown;
  link_assinatura?: unknown;
  pdf_hash?: unknown;
};

type PayloadAssinaturaEngenheiro = {
  tipo: "pmoc_assinatura_engenheiro";
  relatorio_id: string;
  cliente_nome: string;
  engenheiro_email: string;
  engenheiro_nome: string;
  link_assinatura: string;
  pdf_hash: string;
};

type PayloadRelatorioAssinado = {
  tipo: "pmoc_relatorio_assinado";
  relatorio_id: string;
  cliente_id: string;
  cliente_email: string;
  engenheiro_crea: string;
  pdf_hash: string;
};

@Injectable()
export class AutomacoesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomacoesService.name);
  private timer?: NodeJS.Timeout;
  private processando = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SmtpEmailService)
    private readonly emailSender: EmailSender,
    private readonly config: ConfigService
  ) {}

  onModuleInit() {
    if (!this.workerAtivo()) {
      return;
    }

    const intervaloMs = Number(this.config.get<number | string>("AUTOMACOES_WORKER_INTERVAL_MS", 30000));
    this.timer = setInterval(() => {
      void this.processarPendentes().catch((error: unknown) => {
        this.logger.error(this.obterMensagemErro(error));
      });
    }, intervaloMs);
    void this.processarPendentes().catch((error: unknown) => {
      this.logger.error(this.obterMensagemErro(error));
    });
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async processarPendentes(agora = new Date()) {
    if (this.processando) {
      return { processadas: 0, concluidas: 0, falhas: 0 };
    }

    this.processando = true;

    try {
      const limite = Number(this.config.get<number | string>("AUTOMACOES_WORKER_BATCH_SIZE", 10));
      const automacoes = await this.prisma.automacaoAgendada.findMany({
        where: {
          tipo: AutomacaoTipo.enviar_email,
          status: AutomacaoStatus.pendente,
          executarEm: {
            lte: agora
          }
        },
        orderBy: {
          executarEm: "asc"
        },
        take: limite,
        select: {
          id: true,
          tipo: true,
          payload: true,
          tentativas: true
        }
      });
      let concluidas = 0;
      let falhas = 0;

      for (const automacao of automacoes) {
        const reservada = await this.prisma.automacaoAgendada.updateMany({
          where: {
            id: automacao.id,
            status: AutomacaoStatus.pendente
          },
          data: {
            status: AutomacaoStatus.processando
          }
        });

        if (reservada.count === 0) {
          continue;
        }

        try {
          await this.processarEmail(automacao.payload);
          await this.prisma.automacaoAgendada.update({
            where: {
              id: automacao.id
            },
            data: {
              status: AutomacaoStatus.concluida,
              erroUltimaTentativa: null
            }
          });
          concluidas += 1;
        } catch (error) {
          await this.prisma.automacaoAgendada.update({
            where: {
              id: automacao.id
            },
            data: {
              status: AutomacaoStatus.falhou,
              tentativas: {
                increment: 1
              },
              erroUltimaTentativa: this.obterMensagemErro(error)
            }
          });
          falhas += 1;
        }
      }

      return {
        processadas: automacoes.length,
        concluidas,
        falhas
      };
    } finally {
      this.processando = false;
    }
  }

  private async processarEmail(payload: Prisma.JsonValue) {
    const email = this.montarEmail(payload);
    await this.emailSender.enviar(email);
  }

  private montarEmail(payload: Prisma.JsonValue) {
    const dados = this.validarPayload(payload);
    const from = this.config.get<string>("SMTP_FROM", "AIRMOVEBR <noreply@airmovebr.com.br>");

    if (dados.tipo === "pmoc_assinatura_engenheiro") {
      return {
        from,
        to: dados.engenheiro_email,
        subject: `Assinatura PMOC pendente - ${dados.cliente_nome}`,
        text: [
          `${dados.engenheiro_nome}, existe um relatorio PMOC aguardando sua assinatura.`,
          "",
          `Cliente: ${dados.cliente_nome}`,
          `Relatorio: ${dados.relatorio_id}`,
          `Hash PDF: ${dados.pdf_hash}`,
          "",
          "Acesse o link abaixo para conferir e assinar:",
          dados.link_assinatura
        ].join("\n")
      };
    }

    return {
      from,
      to: dados.cliente_email,
      subject: "Relatorio PMOC assinado - AIRMOVEBR",
      text: [
        "O relatorio PMOC foi assinado pelo engenheiro responsavel.",
        "",
        `Relatorio: ${dados.relatorio_id}`,
        `Cliente: ${dados.cliente_id}`,
        `CREA: ${dados.engenheiro_crea}`,
        `Hash PDF: ${dados.pdf_hash}`
      ].join("\n")
    };
  }

  private validarPayload(payload: Prisma.JsonValue): PayloadAssinaturaEngenheiro | PayloadRelatorioAssinado {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Payload de e-mail invalido.");
    }

    const dados = payload as AutomacaoEmailPayload;

    if (dados.tipo === "pmoc_assinatura_engenheiro") {
      return {
        tipo: dados.tipo,
        relatorio_id: this.exigirString(dados.relatorio_id, "relatorio_id"),
        cliente_nome: this.exigirString(dados.cliente_nome, "cliente_nome"),
        engenheiro_email: this.exigirString(dados.engenheiro_email, "engenheiro_email"),
        engenheiro_nome: this.exigirString(dados.engenheiro_nome, "engenheiro_nome"),
        link_assinatura: this.exigirString(dados.link_assinatura, "link_assinatura"),
        pdf_hash: this.exigirString(dados.pdf_hash, "pdf_hash")
      };
    }

    if (dados.tipo === "pmoc_relatorio_assinado") {
      return {
        tipo: dados.tipo,
        relatorio_id: this.exigirString(dados.relatorio_id, "relatorio_id"),
        cliente_id: this.exigirString(dados.cliente_id, "cliente_id"),
        cliente_email: this.exigirString(dados.cliente_email, "cliente_email"),
        engenheiro_crea: this.exigirString(dados.engenheiro_crea, "engenheiro_crea"),
        pdf_hash: this.exigirString(dados.pdf_hash, "pdf_hash")
      };
    }

    throw new Error("Tipo de e-mail nao suportado.");
  }

  private exigirString(valor: unknown, campo: string) {
    if (typeof valor !== "string" || !valor.trim()) {
      throw new Error(`Payload de e-mail sem ${campo}.`);
    }

    return valor.trim();
  }

  private obterMensagemErro(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private workerAtivo() {
    const configurado = this.config.get<string | boolean | undefined>("AUTOMACOES_WORKER_ENABLED");

    if (configurado !== undefined && configurado !== "") {
      return configurado === true || String(configurado).toLowerCase() === "true";
    }

    return Boolean(this.config.get<string>("SMTP_HOST"));
  }
}
