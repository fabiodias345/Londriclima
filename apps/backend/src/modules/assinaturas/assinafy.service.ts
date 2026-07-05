import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AutomacaoTipo, PmocRelatorioStatus, Prisma } from "@prisma/client";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PrismaService } from "../../database/prisma.service";
import { AdminService } from "../admin/admin.service";
import { AuthenticatedUser } from "../auth/auth-user";
import {
  AssinafySigner,
  escolherStatusAssinafy,
  exigirString,
  extrairAccounts,
  extrairLista,
  extrairMensagemErroAssinafy,
  extrairPayload,
  isRecord,
  statusConcluidoAssinafy,
  statusFinalizadoAssinafy,
  statusRecusadoAssinafy,
  stringOuNulo
} from "./assinafy.helpers";

type AssinafyHttpClient = Pick<AxiosInstance, "post" | "get">;

type AssinafyWebhookPayload = {
  document_id?: unknown;
  assignment_id?: unknown;
  status?: unknown;
};

@Injectable()
export class AssinafyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssinafyService.name);
  private readonly http: AssinafyHttpClient;
  private syncTimer?: NodeJS.Timeout;
  private sincronizando = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
    @Optional()
    http?: AssinafyHttpClient
  ) {
    this.http =
      http ??
      axios.create({
        baseURL: this.config.get<string>("ASSINAFY_BASE_URL") ?? "https://api.assinafy.com.br/v1",
        timeout: 30000
      });
  }

  onModuleInit() {
    if (!this.syncAtivo()) {
      return;
    }

    const intervaloMs = Number(this.config.get<number | string>("ASSINAFY_SYNC_INTERVAL_MS", 30000));
    this.syncTimer = setInterval(() => {
      void this.sincronizarPendentesAssinafy().catch((error: unknown) => {
        this.logger.error(this.obterMensagemErro(error));
      });
    }, intervaloMs);
    void this.sincronizarPendentesAssinafy().catch((error: unknown) => {
      this.logger.error(this.obterMensagemErro(error));
    });
  }

  onModuleDestroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }

  async enviarPmocParaAssinatura(clienteId: string, usuario: AuthenticatedUser) {
    const previa = await this.adminService.obterPreviaPmocCliente(clienteId, usuario);

    if (!previa.engenheiro_responsavel) {
      throw new BadRequestException("Cliente PMOC precisa de engenheiro responsavel para Assinafy.");
    }

    const engenheiroResponsavel = previa.engenheiro_responsavel;
    const signer = {
      nome: exigirString(engenheiroResponsavel.nome, "nome do engenheiro").trim(),
      email: exigirString(engenheiroResponsavel.email, "e-mail do engenheiro").trim()
    };
    const accountId = await this.obterAccountId();
    const signerId = await this.obterOuCriarSignerId(accountId, signer);

    const pdf = await this.adminService.gerarPdfPmocCliente(clienteId, usuario);
    const form = new FormData();
    form.append("file", new Blob([pdf.buffer as unknown as BlobPart], { type: pdf.contentType }), pdf.filename);
    form.append("title", `PMOC - ${previa.cliente.nome}`);
    form.append("description", "Relatorio PMOC gerado pela Clima do Brasil.");

    const documento = await this.postAssinafy(
      `/accounts/${accountId}/documents`,
      form,
      {
        ...this.assinafyRequestConfig(),
        maxBodyLength: Infinity
      }
    );
    const documentPayload = extrairPayload(documento.data);
    const documentId = exigirString(documentPayload.id, "documento Assinafy");

    const assignment = await this.postAssinafy(
      `/documents/${documentId}/assignments`,
      {
        signers: [{ id: signerId }]
      },
      this.assinafyRequestConfig()
    );
    const assignmentPayload = extrairPayload(assignment.data);
    const assignmentId = exigirString(assignmentPayload.id, "signatario Assinafy");
    const assinafyStatus = exigirString(assignmentPayload.status ?? "pending", "status Assinafy");

    const agora = new Date();
    const relatorio = await this.prisma.$transaction(async (tx) => {
      await tx.pmocRelatorio.updateMany({
        where: {
          empresaId: usuario.empresa_id,
          clienteId: previa.cliente.id,
          status: PmocRelatorioStatus.aguardando_assinatura_engenheiro
        },
        data: {
          status: PmocRelatorioStatus.cancelado,
          assinafyStatus: "superseded",
          historicoFinalizadoEm: agora
        }
      });

      return tx.pmocRelatorio.create({
        data: {
          empresaId: usuario.empresa_id,
          clienteId: previa.cliente.id,
          engenheiroResponsavelId: engenheiroResponsavel.id,
          criadoPorUsuarioId: usuario.id,
          status: PmocRelatorioStatus.aguardando_assinatura_engenheiro,
          tokenAssinatura: randomBytes(24).toString("hex"),
          pdfHash: createHash("sha256").update(pdf.buffer).digest("hex"),
          assinafyDocumentId: documentId,
          assinafyAssignmentId: assignmentId,
          assinafyStatus,
          assinafyUltimoEvento: assignmentPayload as Prisma.JsonObject
        },
        select: {
          id: true,
          status: true,
          assinafyDocumentId: true,
          assinafyAssignmentId: true,
          assinafyStatus: true
        }
      });
    });

    return {
      id: relatorio.id,
      status: relatorio.status,
      assinafy_document_id: relatorio.assinafyDocumentId,
      assinafy_assignment_id: relatorio.assinafyAssignmentId,
      assinafy_status: relatorio.assinafyStatus
    };
  }

  async processarWebhook(payload: AssinafyWebhookPayload) {
    const documentId = exigirString(payload.document_id, "document_id");
    const status = exigirString(payload.status, "status");

    const relatorio = await this.prisma.pmocRelatorio.findFirst({
      where: {
        assinafyDocumentId: documentId
      },
      select: {
        id: true,
        empresaId: true,
        clienteId: true,
        status: true,
        assinafyStatus: true,
        pdfStorageUrl: true,
        cliente: {
          select: {
            nome: true,
            email: true
          }
        },
        engenheiroResponsavel: {
          select: {
            nome: true,
            cpf: true,
            crea: true
          }
        },
        emailAgendadoEm: true
      }
    });

    if (!relatorio) {
      throw new NotFoundException("Relatorio Assinafy nao encontrado.");
    }

    if (relatorio.status === PmocRelatorioStatus.cancelado) {
      return {
        id: relatorio.id,
        status: relatorio.status,
        assinafy_status: relatorio.assinafyStatus,
        pdf_storage_url: relatorio.pdfStorageUrl
      };
    }

    const data: Prisma.PmocRelatorioUpdateInput = {
      assinafyStatus: status,
      assinafyAssignmentId: stringOuNulo(payload.assignment_id),
      assinafyUltimoEvento: payload as Prisma.JsonObject
    };

    if (statusRecusadoAssinafy(status)) {
      const agora = new Date();
      data.status = PmocRelatorioStatus.cancelado;
      data.historicoFinalizadoEm = agora;

      const atualizado = await this.prisma.$transaction(async (tx) => {
        const salvo = await tx.pmocRelatorio.update({
          where: {
            id: relatorio.id
          },
          data,
          select: {
            id: true,
            status: true,
            assinafyStatus: true,
            pdfStorageUrl: true
          }
        });

        if (relatorio.status !== PmocRelatorioStatus.cancelado) {
          await tx.automacaoAgendada.create({
            data: {
              empresaId: relatorio.empresaId,
              tipo: AutomacaoTipo.enviar_email,
              executarEm: agora,
              payload: {
                tipo: "pmoc_assinatura_negada",
                relatorio_id: relatorio.id,
                cliente_nome: relatorio.cliente.nome,
                cliente_email: relatorio.cliente.email ?? "nao informado",
                data_evento: agora.toISOString(),
                engenheiro_nome: relatorio.engenheiroResponsavel.nome,
                assinafy_status: status
              } satisfies Prisma.JsonObject
            }
          });
        }

        return salvo;
      });

      return {
        id: atualizado.id,
        status: atualizado.status,
        assinafy_status: atualizado.assinafyStatus,
        pdf_storage_url: atualizado.pdfStorageUrl
      };
    }

    if (!statusConcluidoAssinafy(status)) {
      const atualizado = await this.prisma.pmocRelatorio.update({
        where: {
          id: relatorio.id
        },
        data,
        select: {
          id: true,
          status: true,
          assinafyStatus: true,
          pdfStorageUrl: true
        }
      });

      return {
        id: atualizado.id,
        status: atualizado.status,
        assinafy_status: atualizado.assinafyStatus,
        pdf_storage_url: atualizado.pdfStorageUrl
      };
    }

    if (!relatorio.cliente.email) {
      throw new BadRequestException("Cliente sem e-mail para envio final.");
    }

    const agora = new Date();
    const pdf = await this.baixarPdfAssinado(documentId);
    const pdfHash = createHash("sha256").update(pdf).digest("hex");
    const pdfFilename = `pmoc-${relatorio.id}-assinado-assinafy.pdf`;
    const storageUrl = await this.salvarPdfAssinado(relatorio.id, pdf);
    const payloadEmail: Prisma.JsonObject = {
      tipo: "pmoc_relatorio_assinado",
      relatorio_id: relatorio.id,
      cliente_id: relatorio.clienteId,
      cliente_nome: relatorio.cliente.nome,
      cliente_email: relatorio.cliente.email,
      data_envio: agora.toISOString(),
      engenheiro_nome: relatorio.engenheiroResponsavel.nome,
      engenheiro_cpf: relatorio.engenheiroResponsavel.cpf,
      engenheiro_crea: relatorio.engenheiroResponsavel.crea,
      pdf_hash: pdfHash,
      pdf_filename: pdfFilename,
      pdf_base64: pdf.toString("base64")
    };

    data.status = PmocRelatorioStatus.assinado;
    data.pdfHash = pdfHash;
    data.pdfStorageUrl = storageUrl;
    data.assinadoEm = agora;
    data.emailCliente = relatorio.cliente.email;
    data.historicoFinalizadoEm = agora;
    data.emailAgendadoEm = relatorio.emailAgendadoEm ?? agora;

    const atualizado = await this.prisma.$transaction(async (tx) => {
      const salvo = await tx.pmocRelatorio.update({
        where: {
          id: relatorio.id
        },
        data,
        select: {
          id: true,
          status: true,
          assinafyStatus: true,
          pdfStorageUrl: true
        }
      });

      const automacaoFinalExistente = await tx.automacaoAgendada.findFirst({
        where: {
          empresaId: relatorio.empresaId,
          tipo: AutomacaoTipo.enviar_email,
          AND: [
            {
              payload: {
                path: ["tipo"],
                equals: "pmoc_relatorio_assinado"
              }
            },
            {
              payload: {
                path: ["relatorio_id"],
                equals: relatorio.id
              }
            }
          ]
        },
        select: {
          id: true
        }
      });

      if (!automacaoFinalExistente) {
        await tx.automacaoAgendada.create({
          data: {
            empresaId: relatorio.empresaId,
            tipo: AutomacaoTipo.enviar_email,
            executarEm: agora,
            payload: payloadEmail
          }
        });
      }

      return salvo;
    });

    return {
      id: atualizado.id,
      status: atualizado.status,
      assinafy_status: atualizado.assinafyStatus,
      pdf_storage_url: atualizado.pdfStorageUrl
    };
  }

  async sincronizarPendentesAssinafy() {
    if (this.sincronizando) {
      return { verificados: 0, sincronizados: 0, falhas: 0 };
    }

    this.sincronizando = true;

    try {
      const limite = Number(this.config.get<number | string>("ASSINAFY_SYNC_BATCH_SIZE", 10));
      const relatorios = await this.prisma.pmocRelatorio.findMany({
        where: {
          status: PmocRelatorioStatus.aguardando_assinatura_engenheiro,
          assinafyDocumentId: {
            not: null
          }
        },
        orderBy: {
          criadoEm: "asc"
        },
        take: limite,
        select: {
          assinafyDocumentId: true,
          assinafyAssignmentId: true
        }
      });
      let sincronizados = 0;
      let falhas = 0;

      for (const relatorio of relatorios) {
        if (!relatorio.assinafyDocumentId) {
          continue;
        }

        try {
          const response = await this.getAssinafy(`/documents/${relatorio.assinafyDocumentId}`, this.assinafyRequestConfig());
          const documentPayload = extrairPayload(response.data);
          const assignment = isRecord(documentPayload.assignment) ? documentPayload.assignment : {};
          const status = escolherStatusAssinafy(documentPayload.status, assignment.status);
          const assignmentId = stringOuNulo(assignment.id) ?? relatorio.assinafyAssignmentId;

          await this.processarWebhook({
            document_id: relatorio.assinafyDocumentId,
            assignment_id: assignmentId,
            status
          });

          if (statusFinalizadoAssinafy(status)) {
            sincronizados += 1;
          }
        } catch (error) {
          falhas += 1;
          this.logger.error(this.obterMensagemErro(error));
        }
      }

      return { verificados: relatorios.length, sincronizados, falhas };
    } finally {
      this.sincronizando = false;
    }
  }

  private async baixarPdfAssinado(documentId: string) {
    const response = await this.getAssinafy(`/documents/${documentId}/download/certificated`, {
      responseType: "arraybuffer",
      ...this.assinafyRequestConfig()
    });
    return Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data);
  }

  private async salvarPdfAssinado(relatorioId: string, pdf: Buffer) {
    const relativePath = join("pmoc", "assinaturas", `${relatorioId}.pdf`);
    const storageRoot = this.config.get<string>("STORAGE_DIR") ?? "storage";
    const absolutePath = join(storageRoot, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, pdf);
    return `/storage/${relativePath.replace(/\\/g, "/")}`;
  }

  private assinafyRequestConfig() {
    return {
      headers: {
        Authorization: `Bearer ${this.config.getOrThrow<string>("ASSINAFY_API_KEY")}`
      }
    };
  }

  private async obterAccountId() {
    const response = await this.getAssinafy("/accounts", this.assinafyRequestConfig());
    const accounts = extrairAccounts(response.data);
    const accountId = accounts.find((account) => typeof account.id === "string" && account.id.trim())?.id;
    return exigirString(accountId, "conta Assinafy");
  }

  private async obterOuCriarSignerId(accountId: string, signer: { nome: string; email: string }) {
    const existente = await this.buscarSignerPorEmail(accountId, signer.email);
    if (existente) {
      const nomeExistente = stringOuNulo(existente.full_name);
      if (!nomeExistente || this.normalizarIdentidade(nomeExistente) !== this.normalizarIdentidade(signer.nome)) {
        throw new BadRequestException(
          `Signatario Assinafy com o e-mail ${signer.email} esta cadastrado com outro nome.`
        );
      }
      return exigirString(existente.id, "signatario Assinafy");
    }

    const criado = await this.postAssinafy(
      `/accounts/${accountId}/signers`,
      {
        full_name: signer.nome,
        email: signer.email
      },
      this.assinafyRequestConfig()
    );
    const signerPayload = extrairPayload(criado.data);
    return exigirString(signerPayload.id, "signatario Assinafy");
  }

  private async buscarSignerPorEmail(accountId: string, email: string) {
    const response = await this.getAssinafy(`/accounts/${accountId}/signers`, this.assinafyRequestConfig());
    const signers = extrairLista<AssinafySigner>(response.data);
    const alvo = email.trim().toLowerCase();
    const signer = signers.find((item) => typeof item.email === "string" && item.email.trim().toLowerCase() === alvo);
    return signer ?? null;
  }

  private normalizarIdentidade(value: string) {
    return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
  }

  private async postAssinafy(url: string, data: unknown, config?: AxiosRequestConfig) {
    try {
      return await this.http.post(url, data, config);
    } catch (error) {
      this.tratarErroAssinafy(error);
    }
  }

  private async getAssinafy(url: string, config?: AxiosRequestConfig) {
    try {
      return await this.http.get(url, config);
    } catch (error) {
      this.tratarErroAssinafy(error);
    }
  }

  private tratarErroAssinafy(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      const message = extrairMensagemErroAssinafy(responseData) ?? error.message;
      throw new BadRequestException(`Assinafy: ${message}`);
    }
    throw error;
  }

  private syncAtivo() {
    const configurado = this.config.get<string | boolean | undefined>("ASSINAFY_SYNC_ENABLED");
    return configurado === true || configurado === "true";
  }

  private obterMensagemErro(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
