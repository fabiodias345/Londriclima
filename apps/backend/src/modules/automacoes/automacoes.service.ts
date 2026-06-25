import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AutomacaoStatus, AutomacaoTipo, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { validarPayloadAutomacaoEmail } from "./automacoes-email-payload";
import { EmailDeliveryResult, EmailSender, SmtpEmailService } from "./smtp-email.service";

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
          const entrega = await this.processarEmail(automacao.payload);
          this.validarEntregaSmtp(entrega);
          await this.prisma.automacaoAgendada.update({
            where: {
              id: automacao.id
            },
            data: {
              status: AutomacaoStatus.concluida,
              erroUltimaTentativa: null,
              payload: this.anexarEntregaSmtp(automacao.payload, entrega, agora) as Prisma.InputJsonValue
            }
          });
          concluidas += 1;
        } catch (error) {
          await this.prisma.automacaoAgendada.update({
            where: {
              id: automacao.id
            },
            data: this.montarFalhaAutomacao(automacao.tentativas, this.obterMensagemErro(error), agora)
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
    return this.emailSender.enviar(email);
  }

  private validarEntregaSmtp(entrega: EmailDeliveryResult | undefined) {
    if (!entrega?.recipient?.trim() || !entrega.response?.trim()) {
      throw new Error("Entrega SMTP sem comprovante.");
    }
  }

  private montarFalhaAutomacao(tentativasAtuais: number, mensagem: string, agora: Date) {
    const proximaTentativa = tentativasAtuais + 1;
    const maxTentativas = Number(this.config.get<number | string>("AUTOMACOES_MAX_TENTATIVAS", 3));
    const data: Prisma.AutomacaoAgendadaUpdateInput = {
      status: AutomacaoStatus.falhou,
      tentativas: {
        increment: 1
      },
      erroUltimaTentativa: mensagem
    };

    if (proximaTentativa < maxTentativas) {
      data.status = AutomacaoStatus.pendente;
      data.executarEm = new Date(agora.getTime() + this.retryDelayMs());
    }

    return data;
  }

  private retryDelayMs() {
    return Number(this.config.get<number | string>("AUTOMACOES_RETRY_DELAY_MS", 5 * 60 * 1000));
  }

  private anexarEntregaSmtp(payload: Prisma.JsonValue, entrega: EmailDeliveryResult, enviadoEm: Date): Prisma.JsonValue {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return payload;
    }

    return {
      ...payload,
      smtp_entrega: {
        destinatario: entrega.recipient,
        resposta: entrega.response,
        enviado_em: enviadoEm.toISOString()
      }
    };
  }

  private montarEmail(payload: Prisma.JsonValue) {
    const dados = validarPayloadAutomacaoEmail(payload);
    const from = this.config.get<string>("SMTP_FROM", "AIRMOVEBR <noreply@airmovebr.com.br>");

    if (dados.tipo === "pmoc_assinatura_engenheiro") {
      return {
        from,
        to: dados.engenheiro_email,
        subject: `Assinatura PMOC pendente - ${dados.cliente_nome}`,
        text: [
          `${dados.engenheiro_nome}, existe um PMOC aguardando sua assinatura.`,
          "",
          `Cliente: ${dados.cliente_nome}`,
          `E-mail: ${dados.cliente_email}`,
          `Data: ${this.formatarDataEmail(dados.data_envio)}`,
          `Relatorio: ${dados.relatorio_id}`,
          "",
          "PDF original em anexo.",
          "Assine o PDF no portal Gov.br e envie o arquivo assinado pelo link abaixo:",
          dados.link_assinatura
        ].join("\n"),
        attachments: [
          {
            filename: dados.pdf_filename,
            contentType: "application/pdf",
            contentBase64: dados.pdf_base64
          }
        ]
      };
    }

    if (dados.tipo === "pmoc_assinatura_negada") {
      return {
        from,
        to: this.obterEmailAlertaPmoc(),
        subject: `Assinatura PMOC negada - ${dados.cliente_nome}`,
        text: [
          "A assinatura do PMOC foi negada no Assinafy.",
          "",
          `Cliente: ${dados.cliente_nome}`,
          `E-mail: ${dados.cliente_email}`,
          `Engenheiro: ${dados.engenheiro_nome}`,
          `Status Assinafy: ${dados.assinafy_status}`,
          `Data: ${this.formatarDataEmail(dados.data_evento)}`,
          `Relatorio: ${dados.relatorio_id}`,
          "",
          "Acesse o painel administrativo para revisar o PMOC e reenviar a assinatura se necessario."
        ].join("\n")
      };
    }

    if (dados.tipo === "relatorio_tecnico_avulso") {
      const internalCopyEmail = this.obterEmailCopiaRelatorio();

      return {
        from,
        to: dados.cliente_email,
        ...(internalCopyEmail ? { bcc: internalCopyEmail } : {}),
        subject: `Relatório técnico - ${dados.cliente_nome}`,
        text: [
          `Prezado(a) ${dados.cliente_nome},`,
          "",
          "Encaminhamos em anexo o relatório técnico referente ao atendimento realizado pela AIRMOVEBR.",
          "",
          `Atendimento finalizado em: ${this.formatarDataEmail(dados.periodo_fim ?? dados.data_envio)}`,
          `Máquinas atendidas: ${dados.total_maquinas}`,
          `O.S. concluídas: ${dados.total_os_concluidas}`,
          "",
          "Permanecemos à disposição.",
          "",
          "Cordialmente,",
          "",
          "AIRMOVEBR"
        ].join("\n"),
        attachments: [
          {
            filename: dados.pdf_filename,
            contentType: "application/pdf",
            contentBase64: dados.pdf_base64
          }
        ]
      };
    }

    const internalCopyEmail = this.config.get<string>("PMOC_INTERNAL_COPY_EMAIL");

    return {
      from,
      to: dados.cliente_email,
      ...(internalCopyEmail?.trim() ? { bcc: internalCopyEmail.trim() } : {}),
      subject: `Relatorio Tecnico PMOC - ${this.formatarMesAnoAssunto(dados.data_envio)} - ${dados.cliente_nome}`,
      text: [
        `Prezado(a) Senhor(a) ${this.obterSobrenomeCliente(dados.cliente_nome)},`,
        "",
        `Cumprimentando-o(a) cordialmente, encaminhamos em anexo o relatorio final do PMOC referente ao periodo de ${this.formatarPeriodoTexto(dados.data_envio)}.`,
        "",
        "O documento ja se encontra devidamente validado e assinado pelo engenheiro responsavel pela inspecao. Seguem abaixo as informacoes de registro do profissional:",
        "",
        `Responsavel Tecnico: ${dados.engenheiro_nome}`,
        `CPF: ${this.formatarCpfEmail(dados.engenheiro_cpf)}`,
        `Conselho Regional: ${dados.engenheiro_crea}`,
        "",
        "Agradecemos a confianca em nossos servicos e renovamos nossos protestos de estima. Permanecemos a inteira disposicao.",
        "",
        "Cordialmente,",
        "",
        "AIRMOVEBR"
      ].join("\n"),
      attachments: [
        {
          filename: dados.pdf_filename,
          contentType: "application/pdf",
          contentBase64: dados.pdf_base64
        }
      ]
    };
  }

  private obterEmailAlertaPmoc() {
    const configurado =
      this.config.get<string>("PMOC_SIGNATURE_ALERT_EMAIL") ||
      this.config.get<string>("PMOC_INTERNAL_COPY_EMAIL") ||
      this.config.get<string>("SMTP_USER") ||
      this.extrairEmailFrom(this.config.get<string>("SMTP_FROM"));

    if (!configurado?.trim()) {
      throw new Error("E-mail de alerta PMOC nao configurado.");
    }

    return configurado.trim();
  }

  private obterEmailCopiaRelatorio() {
    return (
      this.config.get<string>("REPORT_INTERNAL_COPY_EMAIL") ||
      this.config.get<string>("PMOC_INTERNAL_COPY_EMAIL") ||
      this.config.get<string>("PMOC_SIGNATURE_ALERT_EMAIL")
    )?.trim();
  }

  private extrairEmailFrom(valor?: string) {
    if (!valor) {
      return undefined;
    }

    return valor.match(/<([^>]+)>/)?.[1] ?? valor;
  }

  private formatarPeriodoRelatorioAvulso(inicio: string | null, fim: string | null) {
    if (!inicio && !fim) {
      return "nao informado";
    }

    return `${this.formatarDataEmail(inicio ?? fim ?? "")} ate ${this.formatarDataEmail(fim ?? inicio ?? "")}`;
  }

  private formatarDataEmail(valor: string) {
    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return valor;
    }

    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    })
      .format(data)
      .replace(",", "");
  }

  private formatarMesAnoAssunto(valor: string) {
    const data = this.parseDataEmail(valor);
    const mes = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      month: "long"
    }).format(data);
    const ano = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric"
    }).format(data);

    return `${this.capitalizar(mes)}/${ano}`;
  }

  private formatarPeriodoTexto(valor: string) {
    const data = this.parseDataEmail(valor);
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      month: "long",
      year: "numeric"
    }).format(data);
  }

  private parseDataEmail(valor: string) {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? new Date() : data;
  }

  private obterSobrenomeCliente(nome: string) {
    const partes = nome.trim().split(/\s+/);
    return partes.at(-1) || nome;
  }

  private formatarCpfEmail(valor: string) {
    const digitos = valor.replace(/\D/g, "");

    if (digitos.length !== 11) {
      return valor;
    }

    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  }

  private capitalizar(valor: string) {
    return valor ? `${valor.charAt(0).toUpperCase()}${valor.slice(1)}` : valor;
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
