import { BadRequestException, Inject, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AutomacaoTipo, PmocRelatorioStatus, Prisma } from "@prisma/client";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PrismaService } from "../../database/prisma.service";
import { AdminService } from "../admin/admin.service";
import { AuthenticatedUser } from "../auth/auth-user";
import { GoogleDriveStorageService } from "../storage/google-drive-storage.service";

type AssinafyHttpClient = Pick<AxiosInstance, "post" | "get">;

type AssinafyWebhookPayload = {
  document_id?: unknown;
  assignment_id?: unknown;
  status?: unknown;
};

type AssinafyAccount = {
  id?: unknown;
};

type AssinafySigner = {
  id?: unknown;
  email?: unknown;
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
    http?: AssinafyHttpClient,
    @Optional()
    @Inject(GoogleDriveStorageService)
    private readonly driveStorage?: Pick<GoogleDriveStorageService, "salvarPdfAssinadoPmoc">
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

    const pdf = await this.adminService.gerarPdfPmocCliente(clienteId, usuario);
    const form = new FormData();
    form.append("file", new Blob([pdf.buffer as unknown as BlobPart], { type: pdf.contentType }), pdf.filename);
    form.append("title", `PMOC - ${previa.cliente.nome}`);
    form.append("description", "Relatorio PMOC gerado pela AIRMOVEBR.");

    const accountId = await this.obterAccountId();
    const documento = await this.postAssinafy(
      `/accounts/${accountId}/documents`,
      form,
      {
        ...this.assinafyRequestConfig(),
        maxBodyLength: Infinity
      }
    );
    const documentPayload = this.extrairPayload(documento.data);
    const documentId = this.exigirString(documentPayload.id, "documento Assinafy");

    const signerId = await this.obterOuCriarSignerId(accountId, {
      nome: previa.engenheiro_responsavel.nome,
      email: previa.engenheiro_responsavel.email
    });

    const assignment = await this.postAssinafy(
      `/documents/${documentId}/assignments`,
      {
        signers: [{ id: signerId }]
      },
      this.assinafyRequestConfig()
    );
    const assignmentPayload = this.extrairPayload(assignment.data);
    const assignmentId = this.exigirString(assignmentPayload.id, "signatario Assinafy");
    const assinafyStatus = this.exigirString(assignmentPayload.status ?? "pending", "status Assinafy");

    const relatorio = await this.prisma.pmocRelatorio.create({
      data: {
        empresaId: usuario.empresa_id,
        clienteId: previa.cliente.id,
        engenheiroResponsavelId: previa.engenheiro_responsavel.id,
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

    return {
      id: relatorio.id,
      status: relatorio.status,
      assinafy_document_id: relatorio.assinafyDocumentId,
      assinafy_assignment_id: relatorio.assinafyAssignmentId,
      assinafy_status: relatorio.assinafyStatus
    };
  }

  async processarWebhook(payload: AssinafyWebhookPayload) {
    const documentId = this.exigirString(payload.document_id, "document_id");
    const status = this.exigirString(payload.status, "status");

    const relatorio = await this.prisma.pmocRelatorio.findFirst({
      where: {
        assinafyDocumentId: documentId
      },
      select: {
        id: true,
        empresaId: true,
        clienteId: true,
        status: true,
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

    const data: Prisma.PmocRelatorioUpdateInput = {
      assinafyStatus: status,
      assinafyAssignmentId: this.stringOuNulo(payload.assignment_id),
      assinafyUltimoEvento: payload as Prisma.JsonObject
    };

    if (this.statusRecusado(status)) {
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

    if (!this.statusConcluido(status)) {
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
    const driveUrl = await this.salvarPdfAssinadoDrive({
      relatorioId: relatorio.id,
      clienteNome: relatorio.cliente.nome,
      filename: pdfFilename,
      pdf
    });
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
    (data as Prisma.PmocRelatorioUpdateInput & { pdfDriveUrl?: string | null }).pdfDriveUrl = driveUrl;
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
          pdfStorageUrl: true,
          ...({ pdfDriveUrl: true } as Record<string, boolean>)
        }
      });

      if (!relatorio.emailAgendadoEm) {
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
      pdf_storage_url: atualizado.pdfStorageUrl,
      pdf_drive_url: driveUrl
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
          const documentPayload = this.extrairPayload(response.data);
          const assignment = this.isRecord(documentPayload.assignment) ? documentPayload.assignment : {};
          const status = this.escolherStatusAssinafy(documentPayload.status, assignment.status);
          const assignmentId = this.stringOuNulo(assignment.id) ?? relatorio.assinafyAssignmentId;

          await this.processarWebhook({
            document_id: relatorio.assinafyDocumentId,
            assignment_id: assignmentId,
            status
          });

          if (this.statusFinalizado(status)) {
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

  private async salvarPdfAssinadoDrive(input: {
    relatorioId: string;
    clienteNome: string;
    filename: string;
    pdf: Buffer;
  }) {
    try {
      return await (this.driveStorage?.salvarPdfAssinadoPmoc(input) ?? null);
    } catch (error) {
      this.logger.error(`Falha ao arquivar PMOC assinado no Drive: ${this.obterMensagemErro(error)}`);
      return null;
    }
  }

  private statusConcluido(status: string) {
    return ["completed", "signed", "assinado", "concluido", "certificated"].includes(status.toLowerCase());
  }

  private statusRecusado(status: string) {
    return ["refused", "rejected", "declined", "denied", "canceled", "cancelled", "cancelado", "recusado", "negado", "reprovado"].includes(
      status.toLowerCase()
    );
  }

  private statusFinalizado(status: string) {
    return this.statusConcluido(status) || this.statusRecusado(status);
  }

  private escolherStatusAssinafy(documentStatus: unknown, assignmentStatus: unknown) {
    const documentStatusString = this.stringOuNulo(documentStatus) ?? "pending";
    const assignmentStatusString = this.stringOuNulo(assignmentStatus);

    if (assignmentStatusString && this.statusFinalizado(assignmentStatusString)) {
      return assignmentStatusString;
    }

    return documentStatusString;
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
    const accounts = this.extrairAccounts(response.data);
    const accountId = accounts.find((account) => typeof account.id === "string" && account.id.trim())?.id;
    return this.exigirString(accountId, "conta Assinafy");
  }

  private async obterOuCriarSignerId(accountId: string, signer: { nome: string; email: string }) {
    const existente = await this.buscarSignerPorEmail(accountId, signer.email);
    if (existente) {
      return existente;
    }

    const criado = await this.postAssinafy(
      `/accounts/${accountId}/signers`,
      {
        full_name: signer.nome,
        email: signer.email
      },
      this.assinafyRequestConfig()
    );
    const signerPayload = this.extrairPayload(criado.data);
    return this.exigirString(signerPayload.id, "signatario Assinafy");
  }

  private async buscarSignerPorEmail(accountId: string, email: string) {
    const response = await this.getAssinafy(`/accounts/${accountId}/signers`, this.assinafyRequestConfig());
    const signers = this.extrairLista<AssinafySigner>(response.data);
    const alvo = email.trim().toLowerCase();
    const signer = signers.find((item) => typeof item.email === "string" && item.email.trim().toLowerCase() === alvo);
    return typeof signer?.id === "string" && signer.id.trim() ? signer.id : null;
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
      const message = this.extrairMensagemErroAssinafy(responseData) ?? error.message;
      throw new BadRequestException(`Assinafy: ${message}`);
    }
    throw error;
  }

  private extrairMensagemErroAssinafy(data: unknown) {
    if (this.isRecord(data) && typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
    return null;
  }

  private extrairAccounts(data: unknown): AssinafyAccount[] {
    return this.extrairLista<AssinafyAccount>(data);
  }

  private extrairLista<T>(data: unknown): T[] {
    if (Array.isArray(data)) {
      return data as T[];
    }
    if (this.isRecord(data) && Array.isArray(data.data)) {
      return data.data as T[];
    }
    if (this.isRecord(data) && this.isRecord(data.data)) {
      return [data.data as T];
    }
    return [];
  }

  private extrairPayload(data: unknown): Record<string, unknown> {
    if (this.isRecord(data) && this.isRecord(data.data)) {
      return data.data;
    }
    return this.isRecord(data) ? data : {};
  }

  private exigirString(value: unknown, campo: string) {
    if (typeof value !== "string" || !value.trim()) {
      throw new BadRequestException(`${campo} ausente.`);
    }
    return value;
  }

  private stringOuNulo(value: unknown) {
    return typeof value === "string" && value.trim() ? value : null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private syncAtivo() {
    const configurado = this.config.get<string | boolean | undefined>("ASSINAFY_SYNC_ENABLED");
    return configurado === true || configurado === "true";
  }

  private obterMensagemErro(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
