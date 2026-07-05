import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AutomacaoStatus,
  AutomacaoTipo,
  OrdemServicoStatus,
  PmocRelatorioStatus,
  Prisma
} from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { AdminPmocPdfRendererService } from "./admin-pmoc-pdf-renderer.service";
import { AdminRelatorioTecnicoMapper } from "./admin-relatorio-tecnico-mapper";

@Injectable()
export class AdminPmocCoreService {
  private readonly pmocPdfRenderer = new AdminPmocPdfRendererService();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config?: ConfigService,
    private readonly mapper: AdminRelatorioTecnicoMapper = new AdminRelatorioTecnicoMapper()
  ) { }

  async obterPreviaPmocCliente(clienteId: string, usuario: AuthenticatedUser) {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id: clienteId,
        empresaId: usuario.empresa_id
      },
      select: {
        id: true,
        nome: true,
        tipo: true,
        documento: true,
        telefone: true,
        email: true,
        pmocAtivo: true,
        pmocArtNumero: true,
        atualizadoEm: true,
        engenheiroResponsavel: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            crea: true,
            email: true,
            telefone: true,
            atualizadoEm: true
          }
        },
        enderecos: {
          orderBy: {
            principal: "desc"
          },
          take: 1,
          select: {
            id: true,
            logradouro: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            uf: true,
            cep: true
          }
        },
        equipamentos: {
          orderBy: [
            {
              localInstalacao: "asc"
            },
            {
              marca: "asc"
            }
          ],
          select: {
            id: true,
            tipo: true,
            patrimonio: true,
            codigoBarras: true,
            marca: true,
            modelo: true,
            capacidadeBtu: true,
            gasRefrigerante: true,
            numeroSerie: true,
            localInstalacao: true,
            areaClimatizadaM2: true,
            ocupantesFixo: true,
            ocupantesVariavel: true,
            atualizadoEm: true,
            ordensServico: {
              where: {
                status: OrdemServicoStatus.concluida
              },
              orderBy: {
                concluidaEm: "desc"
              },
              select: this.mapper.ordemRelatorioTecnicoSelect()
            }
          }
        }
      }
    });

    if (!cliente) {
      throw new NotFoundException("Cliente nao encontrado.");
    }

    if (!cliente.pmocAtivo) {
      throw new BadRequestException("Cliente nao possui PMOC ativo.");
    }

    const maquinas = cliente.equipamentos.map((equipamento) => this.mapper.mapearMaquinaRelatorioTecnico(equipamento));
    const pendencias = this.obterPendenciasPreviaPmoc(cliente, maquinas);
    const anoPmoc = this.obterAnoPmoc(maquinas);
    const relatoriosPmoc = await this.prisma.pmocRelatorio.findMany({
      where: {
        empresaId: usuario.empresa_id,
        clienteId: cliente.id,
        criadoEm: {
          gte: new Date(Date.UTC(anoPmoc, 0, 1, 0, 0, 0, 0)),
          lt: new Date(Date.UTC(anoPmoc + 1, 0, 1, 0, 0, 0, 0))
        }
      },
      orderBy: {
        criadoEm: "desc"
      },
      select: {
        id: true,
        status: true,
        pdfHash: true,
        assinafyDocumentId: true,
        assinafyAssignmentId: true,
        assinafyStatus: true,
        criadoEm: true,
        emailAgendadoEm: true,
        assinadoEm: true
      }
    });
    const relatoriosPmocOrdenados = [...relatoriosPmoc].sort(
      (a, b) => b.criadoEm.getTime() - a.criadoEm.getTime()
    );
    const relatoriosEntregues = await this.obterEntregasEmailPmoc(
      usuario.empresa_id,
      anoPmoc,
      relatoriosPmocOrdenados.map((relatorio) => relatorio.id)
    );
    const relatoriosPmocComEntrega = relatoriosPmocOrdenados.map((relatorio) => ({
      ...relatorio,
      emailEntregue: relatoriosEntregues.has(relatorio.id)
    }));
    const assinaturaAtual = this.obterRelatorioPmocPreferido(relatoriosPmocComEntrega);

    return {
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        tipo: cliente.tipo,
        documento: cliente.documento,
        telefone: cliente.telefone,
        email: cliente.email,
        endereco: cliente.enderecos[0] ?? null,
        pmoc_ativo: cliente.pmocAtivo,
        pmoc_art_numero: cliente.pmocArtNumero,
        atualizado_em: cliente.atualizadoEm.toISOString()
      },
      engenheiro_responsavel: cliente.engenheiroResponsavel
        ? this.mapearEngenheiroResponsavel(cliente.engenheiroResponsavel)
        : null,
      periodo: this.mapper.obterPeriodoRelatorioTecnico(maquinas),
      total_maquinas: maquinas.length,
      total_os_concluidas: maquinas.reduce((total, maquina) => total + maquina.os_concluidas.length, 0),
      pronto_para_pdf: pendencias.length === 0,
      pendencias,
      assinatura_atual: assinaturaAtual
        ? {
          id: assinaturaAtual.id,
          status: assinaturaAtual.status,
          assinafy_document_id: assinaturaAtual.assinafyDocumentId,
          assinafy_assignment_id: assinaturaAtual.assinafyAssignmentId,
          assinafy_status: assinaturaAtual.assinafyStatus,
          email_agendado: Boolean(assinaturaAtual.emailAgendadoEm),
          email_entregue: assinaturaAtual.emailEntregue,
          assinado_em: assinaturaAtual.assinadoEm?.toISOString() ?? null,
          criado_em: assinaturaAtual.criadoEm.toISOString()
        }
        : null,
      pmoc_meses: this.mapearMesesPmoc(anoPmoc, relatoriosPmocComEntrega),
      maquinas
    };
  }

  async gerarPdfPmocCliente(clienteId: string, usuario: AuthenticatedUser) {
    const previa = await this.obterPreviaPmocCliente(clienteId, usuario);
    const buffer = this.pmocPdfRenderer.gerar(previa);

    return {
      filename: `${this.mapper.slugArquivo(`pmoc-${previa.cliente.nome}`)}.pdf`,
      contentType: "application/pdf",
      buffer
    };
  }

  async solicitarAssinaturaPmocEngenheiro(clienteId: string, usuario: AuthenticatedUser) {
    const previa = await this.obterPreviaPmocCliente(clienteId, usuario);

    if (!previa.engenheiro_responsavel) {
      throw new BadRequestException("Cliente PMOC precisa de engenheiro responsavel antes da assinatura.");
    }

    const pdf = await this.gerarPdfPmocCliente(clienteId, usuario);
    const pdfHash = createHash("sha256").update(pdf.buffer).digest("hex");
    const tokenAssinatura = randomBytes(24).toString("hex");
    const dataEnvio = new Date();

    const relatorio = await this.prisma.pmocRelatorio.create({
      data: {
        empresaId: usuario.empresa_id,
        clienteId: previa.cliente.id,
        engenheiroResponsavelId: previa.engenheiro_responsavel.id,
        criadoPorUsuarioId: usuario.id,
        status: PmocRelatorioStatus.aguardando_assinatura_engenheiro,
        tokenAssinatura,
        pdfHash
      }
    });
    const linkAssinatura = this.montarLinkAssinaturaPmoc(relatorio.tokenAssinatura);

    await this.prisma.automacaoAgendada.create({
      data: {
        empresaId: usuario.empresa_id,
        tipo: AutomacaoTipo.enviar_email,
        executarEm: dataEnvio,
        payload: {
          tipo: "pmoc_assinatura_engenheiro",
          relatorio_id: relatorio.id,
          cliente_nome: previa.cliente.nome,
          cliente_email: previa.cliente.email,
          data_envio: dataEnvio.toISOString(),
          engenheiro_email: previa.engenheiro_responsavel.email,
          engenheiro_nome: previa.engenheiro_responsavel.nome,
          link_assinatura: linkAssinatura,
          pdf_hash: relatorio.pdfHash,
          pdf_filename: pdf.filename,
          pdf_base64: pdf.buffer.toString("base64")
        } satisfies Prisma.JsonObject
      }
    });

    return {
      id: relatorio.id,
      cliente: previa.cliente,
      engenheiro_responsavel: previa.engenheiro_responsavel,
      status: relatorio.status,
      pdf_hash: relatorio.pdfHash,
      email_engenheiro_agendado: true,
      criado_em: relatorio.criadoEm.toISOString()
    };
  }

  private mapearEngenheiroResponsavel(engenheiro: {
    id: string;
    nome: string;
    cpf: string;
    crea: string;
    email: string;
    telefone: string | null;
    atualizadoEm: Date;
  }) {
    return {
      id: engenheiro.id,
      nome: engenheiro.nome,
      cpf: engenheiro.cpf,
      crea: engenheiro.crea,
      email: engenheiro.email,
      telefone: engenheiro.telefone,
      atualizado_em: engenheiro.atualizadoEm.toISOString()
    };
  }

  private obterPendenciasPreviaPmoc(
    cliente: { email: string | null; engenheiroResponsavel: unknown; equipamentos: unknown[] },
    maquinas: Array<{ pendencias: string[]; os_concluidas: unknown[] }>
  ) {
    const pendencias: string[] = [];

    if (!cliente.email) {
      pendencias.push("email_cliente_pendente");
    }

    if (!cliente.engenheiroResponsavel) {
      pendencias.push("engenheiro_responsavel_pendente");
    }

    if (!cliente.equipamentos.length) {
      pendencias.push("sem_maquinas");
    }

    if (!maquinas.some((maquina) => maquina.os_concluidas.length > 0)) {
      pendencias.push("sem_os_concluida");
    }

    for (const maquina of maquinas) {
      pendencias.push(...maquina.pendencias.map((pendencia) => `maquina_${pendencia}`));
    }

    return Array.from(new Set(pendencias));
  }

  private obterAnoPmoc(maquinas: Array<{ os_concluidas: Array<{ concluida_em: string | null }> }>) {
    const periodo = this.mapper.obterPeriodoRelatorioTecnico(maquinas);
    const dataBase = periodo.fim ? new Date(periodo.fim) : new Date();
    return dataBase.getUTCFullYear();
  }

  private mapearMesesPmoc(
    ano: number,
    relatorios: Array<{
      id: string;
      status: PmocRelatorioStatus;
      pdfHash: string;
      assinafyDocumentId: string | null;
      assinafyAssignmentId: string | null;
      assinafyStatus: string | null;
      criadoEm: Date;
      emailAgendadoEm: Date | null;
      assinadoEm: Date | null;
      emailEntregue: boolean;
    }>
  ) {
    const labels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const porMes = new Map<number, (typeof relatorios)[number]>();

    for (const relatorio of relatorios) {
      const mes = relatorio.criadoEm.getUTCMonth();
      const atual = porMes.get(mes);
      if (!atual || this.compararRelatoriosPmoc(relatorio, atual) < 0) {
        porMes.set(mes, relatorio);
      }
    }

    return labels.map((label, indice) => {
      const relatorio = porMes.get(indice);

      return {
        mes: label,
        ano,
        numero: indice + 1,
        status: relatorio?.emailEntregue ? "enviado" : "pendente",
        relatorio_id: relatorio?.id ?? null,
        relatorio_status: relatorio?.status ?? null,
        assinafy_status: relatorio?.assinafyStatus ?? null,
        email_entregue: relatorio?.emailEntregue ?? false,
        enviado_em: relatorio?.criadoEm.toISOString() ?? null,
        assinado_em: relatorio?.assinadoEm?.toISOString() ?? null,
        pdf_hash: relatorio?.pdfHash ?? null
      };
    });
  }

  private async obterEntregasEmailPmoc(empresaId: string, ano: number, relatorioIds: string[]) {
    if (!relatorioIds.length) {
      return new Set<string>();
    }

    const automacoes = await this.prisma.automacaoAgendada.findMany({
      where: {
        empresaId,
        tipo: AutomacaoTipo.enviar_email,
        status: AutomacaoStatus.concluida,
        criadoEm: {
          gte: new Date(Date.UTC(ano, 0, 1, 0, 0, 0, 0)),
          lt: new Date(Date.UTC(ano + 1, 0, 1, 0, 0, 0, 0))
        }
      },
      select: {
        payload: true
      }
    });
    const relatorioIdsAlvo = new Set(relatorioIds);
    const entregues = new Set<string>();

    for (const automacao of automacoes) {
      if (!automacao.payload || typeof automacao.payload !== "object" || Array.isArray(automacao.payload)) {
        continue;
      }

      const payload = automacao.payload as Record<string, unknown>;
      const entrega = payload.smtp_entrega;
      if (
        payload.tipo === "pmoc_relatorio_assinado" &&
        typeof payload.relatorio_id === "string" &&
        relatorioIdsAlvo.has(payload.relatorio_id) &&
        entrega &&
        typeof entrega === "object" &&
        !Array.isArray(entrega)
      ) {
        entregues.add(payload.relatorio_id);
      }
    }

    return entregues;
  }

  private obterRelatorioPmocPreferido<T extends { status: PmocRelatorioStatus; criadoEm: Date; emailEntregue?: boolean }>(relatorios: T[]) {
    const ultimoMes = relatorios.reduce<number | null>((maior, relatorio) => {
      const mes = Date.UTC(relatorio.criadoEm.getUTCFullYear(), relatorio.criadoEm.getUTCMonth(), 1);
      return maior === null || mes > maior ? mes : maior;
    }, null);

    if (ultimoMes === null) {
      return null;
    }

    return relatorios
      .filter((relatorio) => Date.UTC(relatorio.criadoEm.getUTCFullYear(), relatorio.criadoEm.getUTCMonth(), 1) === ultimoMes)
      .sort((a, b) => this.compararRelatoriosPmoc(a, b))[0] ?? null;
  }

  private compararRelatoriosPmoc<T extends { status: PmocRelatorioStatus; criadoEm: Date; emailEntregue?: boolean }>(a: T, b: T) {
    const prioridadeA = this.prioridadeRelatorioPmoc(a.status, a.emailEntregue);
    const prioridadeB = this.prioridadeRelatorioPmoc(b.status, b.emailEntregue);

    if (prioridadeA !== prioridadeB) {
      return prioridadeA - prioridadeB;
    }

    return b.criadoEm.getTime() - a.criadoEm.getTime();
  }

  private prioridadeRelatorioPmoc(status: PmocRelatorioStatus, emailEntregue = false) {
    if (status === PmocRelatorioStatus.assinado && emailEntregue) {
      return 0;
    }

    if (status === PmocRelatorioStatus.aguardando_assinatura_engenheiro) {
      return 1;
    }

    if (status === PmocRelatorioStatus.assinado) {
      return 2;
    }

    if (status === PmocRelatorioStatus.gerado) {
      return 3;
    }

    return 4;
  }

  private montarLinkAssinaturaPmoc(tokenAssinatura: string) {
    const baseUrl = this.config?.get<string>("APP_PUBLIC_URL", "http://127.0.0.1:5174") ?? "http://127.0.0.1:5174";
    return `${baseUrl.replace(/\/$/, "")}/landing/assinatura-pmoc?token=${tokenAssinatura}`;
  }
}
