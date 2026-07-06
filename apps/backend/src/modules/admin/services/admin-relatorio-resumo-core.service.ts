import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AutomacaoStatus,
  AutomacaoTipo,
  OrdemServicoStatus,
  Prisma
} from "@prisma/client";
import { readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { AdminFrotaService } from "./admin-frota.service";
import type { AdminPmocCoreService } from "./admin-pmoc-core.service";
import {
  carregarFotosRelatorioTecnico,
  formatarLinhaCampoRelatorioPdf,
  montarCabecalhoRelatorioTecnico,
  montarCartaoRelatorioTecnico,
  montarLinhasAssinaturaRelatorioTecnico,
  montarLinhasChecklistRelatorioTecnico
} from "./admin-relatorio-pdf-componentes";
import { AdminRelatorioTecnicoMapper } from "./admin-relatorio-tecnico-mapper";

type PreviaPmocCliente = Awaited<ReturnType<AdminPmocCoreService["obterPreviaPmocCliente"]>>;
type PreviaRelatorioAvulsoCliente = Awaited<ReturnType<AdminRelatorioResumoCoreService["obterPreviaRelatorioAvulsoCliente"]>>;
type ImagemPaginaPdfTexto = Buffer | { buffer: Buffer; rotulo?: string };
type PaginaPdfTexto = { linhas: string[]; imagens?: ImagemPaginaPdfTexto[] };

@Injectable()
export class AdminRelatorioResumoCoreService {
  private readonly frotaService: AdminFrotaService;

  constructor(
    private readonly prisma: PrismaService,
    frotaService?: AdminFrotaService,
    private readonly mapper: AdminRelatorioTecnicoMapper = new AdminRelatorioTecnicoMapper()
  ) {
    this.frotaService = frotaService ?? new AdminFrotaService(prisma);
  }

  async obterRelatorioFrota(usuario: AuthenticatedUser, referencia = new Date()) {
    return this.frotaService.obterRelatorioFrota(usuario, referencia);
  }

  async listarRelatoriosAvulsos(usuario: AuthenticatedUser) {
    const [relatoriosApagados, relatoriosEnviados] = await Promise.all([
      this.prisma.automacaoAgendada.findMany({
        where: {
          empresaId: usuario.empresa_id,
          tipo: AutomacaoTipo.enviar_email,
          payload: {
            path: ["tipo"],
            equals: "relatorio_tecnico_avulso_apagado"
          }
        },
        select: {
          payload: true
        }
      }),
      this.prisma.automacaoAgendada.findMany({
        where: {
          empresaId: usuario.empresa_id,
          tipo: AutomacaoTipo.enviar_email,
          payload: {
            path: ["tipo"],
            equals: "relatorio_tecnico_avulso"
          }
        },
        orderBy: {
          criadoEm: "desc"
        },
        select: {
          criadoEm: true,
          payload: true
        }
      })
    ]);
    const osApagadasPorCliente = this.mapearOsRelatoriosAvulsosApagados(relatoriosApagados);
    const ultimoEnvioPorCliente = this.mapearUltimoEnvioRelatorioAvulso(relatoriosEnviados);
    const clientes = await this.prisma.cliente.findMany({
      where: {
        empresaId: usuario.empresa_id,
        pmocAtivo: false
      },
      orderBy: {
        atualizadoEm: "desc"
      },
      take: 50,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        atualizadoEm: true,
        equipamentos: {
          select: {
            id: true,
            ordensServico: {
              where: {
                status: OrdemServicoStatus.concluida
              },
              select: {
                id: true
              }
            }
          }
        },
        ordensServico: {
          where: {
            status: OrdemServicoStatus.concluida
          },
          select: {
            id: true,
            checklistRespostas: {
              select: {
                equipamentoId: true
              }
            }
          }
        }
      }
    });

    const items = clientes.map((cliente) => {
      const equipamentoIds = new Set(cliente.equipamentos.map((equipamento) => equipamento.id));
      const osConcluidas = Array.from(
        new Set([
          ...cliente.equipamentos.flatMap((equipamento) => equipamento.ordensServico.map((ordem) => ordem.id)),
          ...(cliente.ordensServico ?? [])
            .filter((ordem) =>
              ordem.checklistRespostas.some((resposta) => equipamentoIds.has(resposta.equipamentoId))
            )
            .map((ordem) => ordem.id)
        ])
      );
      const osApagadas = osApagadasPorCliente.get(cliente.id) ?? new Set<string>();
      const osVisiveis = osConcluidas.filter((ordemId) => !osApagadas.has(ordemId));
      const totalOsConcluidas = osVisiveis.length;

      return {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        atualizado_em: cliente.atualizadoEm.toISOString(),
        total_maquinas: cliente.equipamentos.length,
        total_os_concluidas: totalOsConcluidas,
        pronto_para_envio: Boolean(cliente.email) && totalOsConcluidas > 0,
        ultimo_envio: ultimoEnvioPorCliente.get(cliente.id) ?? null
      };
    }).filter((item) => item.total_os_concluidas > 0);

    return {
      total: items.length,
      pendentes: items.filter((item) => item.pronto_para_envio).length,
      items
    };
  }

  async obterPreviaRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    const cliente = await this.obterClienteRelatorioAvulso(clienteId, usuario);
    const osIgnoradas = await this.obterOsRelatoriosAvulsosApagados(usuario.empresa_id, clienteId);
    const ordensPorEquipamento = this.mapearOrdensPorEquipamentoChecklist(cliente.ordensServico ?? []);
    const maquinas = cliente.equipamentos
      .map((equipamento) =>
        this.mapper.mapearMaquinaRelatorioTecnico({
          ...equipamento,
          ordensServico: this.filtrarOrdensRelatorioAvulso(this.unirOrdensRelatorio(
            equipamento.ordensServico,
            ordensPorEquipamento.get(equipamento.id) ?? []
          ), osIgnoradas)
        })
      )
      .filter((maquina) => maquina.os_concluidas.length > 0);
    const pendencias = this.obterPendenciasRelatorioAvulso(cliente, maquinas);

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
        atualizado_em: cliente.atualizadoEm.toISOString()
      },
      periodo: this.mapper.obterPeriodoRelatorioTecnico(maquinas),
      total_maquinas: maquinas.length,
      total_os_concluidas: maquinas.reduce((total, maquina) => total + maquina.os_concluidas.length, 0),
      pronto_para_envio: pendencias.length === 0,
      pendencias,
      maquinas
    };
  }

  async gerarPdfRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    const previa = await this.obterPreviaRelatorioAvulsoCliente(clienteId, usuario);
    const buffer = this.gerarPdfBasicoRelatorioAvulso(previa);

    return {
      filename: `${this.mapper.slugArquivo(`relatorio-tecnico-${previa.cliente.nome}`)}.pdf`,
      contentType: "application/pdf",
      buffer
    };
  }

  async enviarRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    const previa = await this.obterPreviaRelatorioAvulsoCliente(clienteId, usuario);

    if (!previa.pronto_para_envio) {
      throw new BadRequestException("Relatorio avulso possui pendencias antes do envio.");
    }

    if (!previa.cliente.email) {
      throw new BadRequestException("Cliente sem e-mail para envio do relatorio.");
    }

    const pdf = await this.gerarPdfRelatorioAvulsoCliente(clienteId, usuario);
    const dataEnvio = new Date();
    const osIds = previa.maquinas.flatMap((maquina) => maquina.os_concluidas.map((ordem) => ordem.id));

    await this.prisma.automacaoAgendada.create({
      data: {
        empresaId: usuario.empresa_id,
        tipo: AutomacaoTipo.enviar_email,
        executarEm: dataEnvio,
        payload: {
          tipo: "relatorio_tecnico_avulso",
          cliente_id: previa.cliente.id,
          cliente_nome: previa.cliente.nome,
          cliente_email: previa.cliente.email,
          data_envio: dataEnvio.toISOString(),
          periodo_inicio: previa.periodo.inicio,
          periodo_fim: previa.periodo.fim,
          total_maquinas: previa.total_maquinas,
          total_os_concluidas: previa.total_os_concluidas,
          os_ids: osIds,
          pdf_filename: pdf.filename,
          pdf_base64: pdf.buffer.toString("base64")
        } satisfies Prisma.JsonObject
      }
    });

    return {
      cliente: previa.cliente,
      total_maquinas: previa.total_maquinas,
      total_os_concluidas: previa.total_os_concluidas,
      email_cliente_agendado: true,
      criado_em: dataEnvio.toISOString()
    };
  }

  async apagarRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    const previa = await this.obterPreviaRelatorioAvulsoCliente(clienteId, usuario);
    const osIds = previa.maquinas.flatMap((maquina) => maquina.os_concluidas.map((ordem) => ordem.id));

    const resultado = await this.prisma.automacaoAgendada.deleteMany({
      where: {
        empresaId: usuario.empresa_id,
        tipo: AutomacaoTipo.enviar_email,
        AND: [
          { payload: { path: ["tipo"], equals: "relatorio_tecnico_avulso" } },
          { payload: { path: ["cliente_id"], equals: clienteId } }
        ]
      }
    });

    await this.prisma.automacaoAgendada.create({
      data: {
        empresaId: usuario.empresa_id,
        tipo: AutomacaoTipo.enviar_email,
        status: AutomacaoStatus.concluida,
        executarEm: new Date(),
        payload: {
          tipo: "relatorio_tecnico_avulso_apagado",
          cliente_id: previa.cliente.id,
          cliente_nome: previa.cliente.nome,
          apagado_em: new Date().toISOString(),
          os_ids: osIds
        } satisfies Prisma.JsonObject
      }
    });

    return {
      cliente: {
        id: previa.cliente.id,
        nome: previa.cliente.nome
      },
      relatorios_apagados: Math.max(resultado.count, osIds.length)
    };
  }

  private mapearOsRelatoriosAvulsosApagados(relatorios: Array<{ payload: Prisma.JsonValue }>) {
    const porCliente = new Map<string, Set<string>>();

    for (const relatorio of relatorios) {
      if (!relatorio.payload || typeof relatorio.payload !== "object" || Array.isArray(relatorio.payload)) {
        continue;
      }

      const payload = relatorio.payload as Record<string, unknown>;
      const clienteId = typeof payload.cliente_id === "string" ? payload.cliente_id : "";
      const osIds = Array.isArray(payload.os_ids)
        ? payload.os_ids.filter((item): item is string => typeof item === "string")
        : [];

      if (!clienteId || !osIds.length) {
        continue;
      }

      const atual = porCliente.get(clienteId) ?? new Set<string>();
      osIds.forEach((osId) => atual.add(osId));
      porCliente.set(clienteId, atual);
    }

    return porCliente;
  }

  private async obterOsRelatoriosAvulsosApagados(empresaId: string, clienteId: string) {
    const automacaoAgendada = (this.prisma as {
      automacaoAgendada?: {
        findMany?: (args: unknown) => Promise<Array<{ payload: Prisma.JsonValue }>>;
      };
    }).automacaoAgendada;

    if (!automacaoAgendada?.findMany) {
      return new Set<string>();
    }

    const relatorios = await automacaoAgendada.findMany({
      where: {
        empresaId,
        tipo: AutomacaoTipo.enviar_email,
        payload: { path: ["tipo"], equals: "relatorio_tecnico_avulso_apagado" }
      },
      select: {
        payload: true
      }
    });
    const porCliente = this.mapearOsRelatoriosAvulsosApagados(relatorios);

    return porCliente.get(clienteId) ?? new Set<string>();
  }

  private mapearUltimoEnvioRelatorioAvulso(relatorios: Array<{ criadoEm: Date; payload: Prisma.JsonValue }>) {
    const porCliente = new Map<string, { enviado_em: string; email: string | null }>();

    for (const relatorio of relatorios) {
      if (!relatorio.payload || typeof relatorio.payload !== "object" || Array.isArray(relatorio.payload)) {
        continue;
      }

      const payload = relatorio.payload as Record<string, unknown>;
      if (payload.tipo !== "relatorio_tecnico_avulso") {
        continue;
      }

      const clienteId = typeof payload.cliente_id === "string" ? payload.cliente_id : "";

      if (!clienteId || porCliente.has(clienteId)) {
        continue;
      }

      porCliente.set(clienteId, {
        enviado_em: typeof payload.data_envio === "string" ? payload.data_envio : relatorio.criadoEm.toISOString(),
        email: typeof payload.cliente_email === "string" ? payload.cliente_email : null
      });
    }

    return porCliente;
  }

  async obterRelatorios(usuario: AuthenticatedUser, referencia = new Date()) {
    const relatorioFrota = await this.obterRelatorioFrota(usuario, referencia);
    const [ordens, clientes, veiculos, automacoesPendentes] = await Promise.all([
      this.prisma.ordemServico.findMany({
        where: {
          empresaId: usuario.empresa_id
        },
        select: {
          status: true,
          valorCobrado: true,
          criadaEm: true,
          agendadaPara: true,
          concluidaEm: true
        }
      }),
      this.prisma.cliente.count({
        where: {
          empresaId: usuario.empresa_id
        }
      }),
      this.prisma.veiculo.count({
        where: {
          empresaId: usuario.empresa_id,
          ativo: true
        }
      }),
      this.prisma.automacaoAgendada.count({
        where: {
          empresaId: usuario.empresa_id,
          status: AutomacaoStatus.pendente
        }
      })
    ]);

    const porStatus = ordens.reduce<Record<string, number>>((acc, ordem) => {
      acc[ordem.status] = (acc[ordem.status] ?? 0) + 1;
      return acc;
    }, {});
    const periodo = this.obterPeriodoRelatorio(referencia);
    const receitaPrevista = ordens.reduce(
      (total, ordem) =>
        this.estaNoPeriodo(this.obterDataReferenciaOrdem(ordem), periodo.ano)
          ? total + (ordem.valorCobrado?.toNumber() ?? 0)
          : total,
      0
    );
    const receitaArrecadada = ordens.reduce(
      (total, ordem) =>
        ordem.status === OrdemServicoStatus.concluida && ordem.concluidaEm && this.estaNoPeriodo(ordem.concluidaEm, periodo.ano)
          ? total + (ordem.valorCobrado?.toNumber() ?? 0)
          : total,
      0
    );
    const preChamados = this.contarOrdensPorPeriodo(ordens, OrdemServicoStatus.pre_chamado, periodo, (ordem) => ordem.criadaEm);
    const osAbertas = this.contarOrdensPorPeriodo(ordens, OrdemServicoStatus.aberta, periodo, (ordem) => ordem.agendadaPara ?? ordem.criadaEm);
    const emAtendimento = this.contarOrdensPorPeriodo(ordens, OrdemServicoStatus.em_atendimento, periodo, (ordem) => ordem.agendadaPara ?? ordem.criadaEm);
    const concluidas = this.contarOrdensPorPeriodo(ordens, OrdemServicoStatus.concluida, periodo, (ordem) => ordem.concluidaEm ?? ordem.criadaEm);

    return {
      total_os: ordens.length,
      clientes,
      veiculos_ativos: veiculos,
      automacoes_pendentes: automacoesPendentes,
      receita_prevista: receitaPrevista,
      receita_arrecadada: receitaArrecadada,
      por_status: porStatus,
      pre_chamados: preChamados,
      os_abertas: osAbertas,
      em_atendimento: emAtendimento,
      concluidas,
      manutencoes: concluidas,
      frota: {
        km_rodados: relatorioFrota.km_rodados,
        km_rodados_periodo: relatorioFrota.km_rodados_periodo,
        litros: relatorioFrota.litros,
        valor_total: relatorioFrota.valor_total
      }
    };
  }

  private obterPeriodoRelatorio(referencia: Date) {
    const inicioDia = new Date(referencia);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(inicioDia);
    fimDia.setDate(fimDia.getDate() + 1);

    const inicioMes = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
    const fimMes = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 1);

    const inicioAno = new Date(referencia.getFullYear(), 0, 1);
    const fimAno = new Date(referencia.getFullYear() + 1, 0, 1);

    return {
      dia: { inicio: inicioDia, fim: fimDia },
      mes: { inicio: inicioMes, fim: fimMes },
      ano: { inicio: inicioAno, fim: fimAno }
    };
  }

  private estaNoPeriodo(data: Date | null | undefined, periodo: { inicio: Date; fim: Date }) {
    return Boolean(data && data >= periodo.inicio && data < periodo.fim);
  }

  private contarOrdensPorPeriodo<T extends { status: OrdemServicoStatus }>(
    ordens: T[],
    status: OrdemServicoStatus,
    periodo: ReturnType<AdminRelatorioResumoCoreService["obterPeriodoRelatorio"]>,
    obterData: (ordem: T) => Date | null | undefined
  ) {
    return ordens.reduce(
      (acc, ordem) => {
        if (ordem.status !== status) {
          return acc;
        }

        const data = obterData(ordem);

        if (this.estaNoPeriodo(data, periodo.dia)) {
          acc.dia += 1;
        }

        if (this.estaNoPeriodo(data, periodo.mes)) {
          acc.mes += 1;
        }

        if (this.estaNoPeriodo(data, periodo.ano)) {
          acc.ano += 1;
        }

        return acc;
      },
      { dia: 0, mes: 0, ano: 0 }
    );
  }

  private obterDataReferenciaOrdem(ordem: {
    status: OrdemServicoStatus;
    criadaEm: Date;
    agendadaPara: Date | null;
    concluidaEm: Date | null;
  }) {
    if (ordem.status === OrdemServicoStatus.concluida) {
      return ordem.concluidaEm ?? ordem.criadaEm;
    }

    return ordem.agendadaPara ?? ordem.criadaEm;
  }

  private async obterClienteRelatorioAvulso(clienteId: string, usuario: AuthenticatedUser) {
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
        atualizadoEm: true,
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
        },
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
    });

    if (!cliente) {
      throw new NotFoundException("Cliente nao encontrado.");
    }

    if (cliente.pmocAtivo) {
      throw new BadRequestException("Cliente possui PMOC ativo. Use o fluxo PMOC.");
    }

    return cliente;
  }

  private mapearOrdensPorEquipamentoChecklist<T extends { checklistRespostas?: Array<{ equipamentoId?: string | null }> }>(
    ordens: T[]
  ) {
    const porEquipamento = new Map<string, T[]>();

    for (const ordem of ordens) {
      const equipamentos = new Set(
        (ordem.checklistRespostas ?? [])
          .map((resposta) => resposta.equipamentoId)
          .filter((equipamentoId): equipamentoId is string => Boolean(equipamentoId))
      );

      for (const equipamentoId of equipamentos) {
        const atuais = porEquipamento.get(equipamentoId) ?? [];
        atuais.push(ordem);
        porEquipamento.set(equipamentoId, atuais);
      }
    }

    return porEquipamento;
  }

  private unirOrdensRelatorio<T extends { id: string }>(ordensDiretas: T[], ordensPorChecklist: T[]) {
    const porId = new Map<string, T>();

    for (const ordem of [...ordensDiretas, ...ordensPorChecklist]) {
      porId.set(ordem.id, ordem);
    }

    return [...porId.values()].sort((a, b) => {
      const dataA = "concluidaEm" in a && a.concluidaEm instanceof Date ? a.concluidaEm.getTime() : 0;
      const dataB = "concluidaEm" in b && b.concluidaEm instanceof Date ? b.concluidaEm.getTime() : 0;
      return dataB - dataA;
    });
  }

  private filtrarOrdensRelatorioAvulso<T extends { id: string }>(ordens: T[], osIgnoradas: Set<string>) {
    return ordens.filter((ordem) => !osIgnoradas.has(ordem.id)).slice(0, 1);
  }

  private obterPendenciasRelatorioAvulso(
    cliente: { email: string | null },
    maquinas: Array<{ os_concluidas: unknown[] }>
  ) {
    const pendencias: string[] = [];

    if (!cliente.email) {
      pendencias.push("email_cliente_pendente");
    }

    if (!maquinas.length) {
      pendencias.push("sem_maquinas_com_os_concluida");
    }

    if (!maquinas.some((maquina) => maquina.os_concluidas.length > 0)) {
      pendencias.push("sem_os_concluida");
    }

    return Array.from(new Set(pendencias));
  }

  private gerarPdfBasicoRelatorioAvulso(previa: PreviaRelatorioAvulsoCliente) {
    const paginas: Array<string[] | PaginaPdfTexto> = [this.montarCapaRelatorioAvulso(previa)];

    if (!previa.maquinas.length) {
      paginas.push([
        "MAQUINA N:001",
        "",
        "Nenhuma maquina com manutencao concluida para este relatorio.",
        "Finalize a OS antes de emitir o relatorio tecnico."
      ]);
    }

    for (const [indice, maquina] of previa.maquinas.entries()) {
      paginas.push(...this.montarPaginasMaquinaRelatorioAvulso(maquina, indice));
    }

    return this.criarPdfTexto(paginas);
  }

  private montarCapaRelatorioAvulso(previa: PreviaRelatorioAvulsoCliente) {
    return [
      "Clima do Brasil - RELATÓRIO TÉCNICO AVULSO",
      "Documento não PMOC emitido automaticamente pela plataforma Clima do Brasil",
      "",
      `Data: ${this.formatarDataPmoc(new Date().toISOString())}`,
      "",
      ...montarCartaoRelatorioTecnico("RELATÓRIO DE MANUTENÇÃO", [
        ["Tipo de documento", "Documento não PMOC"],
        ["Status", "ORDEM DE SERVIÇO CONCLUÍDA"]
      ]),
      "",
      ...montarCartaoRelatorioTecnico("DADOS DA EMPRESA", [
        ["Campo", "Informação"],
        ["Razão Social", "Clima do Brasil"],
        ["Base operacional", "Londrina, PR"],
        ["Domínio", "climadobrasilengenharia.com.br"]
      ]),
      "",
      ...montarCartaoRelatorioTecnico("DADOS DO CLIENTE", [
        ["Campo", "Informação"],
        ["Cliente", previa.cliente.nome],
        ["Documento", previa.cliente.documento || "não informado"],
        ["E-mail", previa.cliente.email || "pendente"],
        ["Endereço", this.formatarEnderecoPmoc(previa.cliente.endereco)]
      ]),
      "",
      ...montarCartaoRelatorioTecnico("EQUIPE RESPONSÁVEL", [
        ["Campo", "Informação"],
        ["Período", `${this.formatarDataPmoc(previa.periodo.inicio)} a ${this.formatarDataPmoc(previa.periodo.fim)}`],
        ["Total de OS Concluídas", String(previa.total_os_concluidas)],
        ["Total de Máquinas", String(previa.total_maquinas)],
        ["Pendências", previa.pendencias.join(", ") || "Nenhuma"]
      ]),
      "",
      "DECLARAÇÃO DE CONCLUSÃO",
      "Este relatório consolida o serviço executado, evidências, GPS e assinatura do cliente."
    ];
  }

  private montarPaginasMaquinaRelatorioAvulso(
    maquina: PreviaRelatorioAvulsoCliente["maquinas"][number],
    indice: number
  ) {
    const ordens = maquina.os_concluidas.length ? maquina.os_concluidas : [null];

    return ordens.flatMap((ordem, ordemIndice) => {
      const inicio = ordem?.agendada_para ?? ordem?.concluida_em ?? null;
      const fim = ordem?.concluida_em ?? null;
      const servicoRealizado = montarLinhasChecklistRelatorioTecnico({
        problemaRelatado: ordem?.problema_relatado,
        servicoRealizado: ordem?.checklist?.servico_realizado,
        respostas: ordem?.checklist_respostas ?? []
      });
      const cabecalho = montarCabecalhoRelatorioTecnico(indice, ordemIndice, ordens.length);
      const linhasServico = [
        `OS: ${ordem?.titulo || "não informada"}`,
        formatarLinhaCampoRelatorioPdf("Status", "ORDEM DE SERVIÇO CONCLUÍDA"),
        formatarLinhaCampoRelatorioPdf(
          "Data e Horário",
          `${this.formatarDataPmoc(ordem?.concluida_em ?? null)} - ${this.formatarHoraPmoc(inicio)} -> ${this.formatarHoraPmoc(fim)} (${this.calcularDuracaoPmoc(inicio, fim)})`
        ),
        formatarLinhaCampoRelatorioPdf("Técnico", this.formatarResponsavelRelatorioAvulso(ordem)),
        formatarLinhaCampoRelatorioPdf("Problema relatado", ordem?.problema_relatado || "não informado"),
        ...servicoRealizado.map(([label, valor]) => formatarLinhaCampoRelatorioPdf(label, valor))
      ];
      const primeiroBlocoServico = linhasServico.slice(0, 14);
      const demaisBlocosServico = this.dividirLinhasRelatorioAvulso(linhasServico.slice(14), 18);
      const paginas: PaginaPdfTexto[] = [{
        linhas: [
          ...cabecalho,
          ...montarCartaoRelatorioTecnico("DADOS DO EQUIPAMENTO", [
            ["Campo", "Informação"],
            ...this.obterLinhasEquipamentoRelatorioAvulso(maquina)
          ]),
          "",
          ...montarCartaoRelatorioTecnico("SERVIÇO EXECUTADO", [["Campo", "Informação"]]),
          ...primeiroBlocoServico
        ]
      }];

      demaisBlocosServico.forEach((bloco) => {
        paginas.push({
          linhas: [
            ...cabecalho,
            ...montarCartaoRelatorioTecnico("SERVIÇO EXECUTADO - CONTINUAÇÃO", [["Campo", "Informação"]]),
            ...bloco
          ]
        });
      });

      paginas.push({
        linhas: [
          ...cabecalho,
          ...montarCartaoRelatorioTecnico("EVIDÊNCIAS E VALIDAÇÃO", [
            ["Campo", "Informação"],
            ["Fotos", this.formatarEvidenciasPmoc(ordem)],
            ...montarLinhasAssinaturaRelatorioTecnico(ordem)
          ]),
          "",
          "OBSERVAÇÕES",
          ...(ordem?.observacoes.length ? ordem.observacoes.map((observacao) => observacao.texto) : ["Sem observações visíveis."]),
          "",
          "DECLARAÇÃO DE CONCLUSÃO",
          "Declaro para os devidos fins que o serviço descrito neste relatório foi executado integralmente, sem pendências registradas na emissão."
        ],
        imagens: this.carregarImagensRelatorioAvulso(ordem)
      });

      const assinaturaCliente = this.carregarAssinaturaClienteRelatorio(ordem);
      if (assinaturaCliente) {
        paginas.push({
          linhas: [
            ...cabecalho,
            ...montarCartaoRelatorioTecnico("ASSINATURA DO CLIENTE", [
              ["Campo", "Informação"],
              ["Responsável", ordem?.assinatura?.nome_responsavel || "não informado"],
              ["Assinado em", this.formatarDataPmoc(ordem?.assinatura?.assinado_em ?? null)]
            ])
          ],
          imagens: [{
            buffer: assinaturaCliente,
            rotulo: `Assinatura do cliente - ${ordem?.assinatura?.nome_responsavel || "responsável"}`
          }]
        });
      }

      const executores = this.obterExecutoresOrdem(ordem);
      if (executores.length > 0) {
        this.dividirExecutoresRelatorio(executores).forEach((grupo, index) => {
          const tecnicosInfo = grupo.map((executor) => [
            "Identificação",
            executor.nome || "não informado"
          ]) as Array<[string, string]>;

          paginas.push({
            linhas: [
              ...cabecalho,
              ...montarCartaoRelatorioTecnico(
                index === 0 ? "RESPONSÁVEIS PELA EXECUÇÃO" : "RESPONSÁVEIS PELA EXECUÇÃO - CONTINUAÇÃO",
                tecnicosInfo
              ),
              "",
              "Identidade vinculada aos usuários autenticados responsáveis pela execução do serviço."
            ],
            imagens: this.carregarIdentidadeTecnicosRelatorio(grupo)
          });
        });
      }

      return paginas;
    });
  }

  private criarPdfTexto(paginasEntrada: Array<string[] | PaginaPdfTexto>) {
    const paginas = paginasEntrada.map((pagina) => Array.isArray(pagina) ? { linhas: pagina, imagens: [] } : pagina);
    const objetos = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    ];
    const pageObjectIds: number[] = [];

    for (const pagina of paginas) {
      const imagensPagina = this.normalizarImagensPaginaPdf(pagina.imagens ?? []).slice(0, 4);
      const imagensPdf: Array<{ id: number; orientacao: number; rotulo?: string }> = [];

      for (const imagem of imagensPagina) {
        const imagemPdf = this.normalizarImagemPdf(imagem.buffer);
        const imageObjectId = objetos.length + 1;
        imagensPdf.push({ id: imageObjectId, orientacao: imagemPdf.orientacao, rotulo: imagem.rotulo });
        objetos.push(this.criarObjetoImagemPdfNormalizada(imagemPdf));
      }

      const xObjects = imagensPdf.map((imagem, index) => `/Im${index + 1} ${imagem.id} 0 R`).join(" ");
      const recursosImagem = xObjects ? `/XObject << ${xObjects} >>` : "";
      const texto = this.montarConteudoTextoRelatorioAvulso(pagina.linhas, Boolean(imagensPdf.length));
      const comandosImagem = imagensPdf
        .map((imagem, index) => {
          const qtdImagens = imagensPdf.length;
          const { x, y, width, height } = this.obterPosicaoImagemRelatorioAvulso(qtdImagens, index);

          return [
            "q",
            "0.80 0.84 0.90 RG",
            "1.5 w",
            `${x} ${y} ${width} ${height} re S`,
            this.comandoTransformacaoImagemPdf(x, y, width, height, imagem.orientacao),
            `/Im${index + 1} Do`,
            "Q",
            imagem.rotulo ? this.comandoTextoPdf(imagem.rotulo, x, y - 12, 7.5, "F1", "0.12 0.16 0.22") : ""
          ].join("\n");
        })
        .join("\n");
      const conteudo = [texto, comandosImagem]
        .filter(Boolean)
        .join("\n");
      const pageObjectId = objetos.length + 1;
      const contentObjectId = objetos.length + 2;
      pageObjectIds.push(pageObjectId);
      objetos.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${recursosImagem} >> /Contents ${contentObjectId} 0 R >>`,
        `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\nstream\n${conteudo}\nendstream`
      );
    }

    objetos[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;
    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    for (let index = 0; index < objetos.length; index += 1) {
      offsets.push(Buffer.byteLength(pdf, "latin1"));
      pdf += `${index + 1} 0 obj\n${objetos[index]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, "latin1");
    pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join("");
    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, "latin1");
  }

  private dividirLinhasRelatorioAvulso(linhas: string[], tamanho: number) {
    const blocos: string[][] = [];

    for (let index = 0; index < linhas.length; index += tamanho) {
      blocos.push(linhas.slice(index, index + tamanho));
    }

    return blocos;
  }

  private montarConteudoTextoRelatorioAvulso(linhas: string[], reservarEspacoImagens: boolean) {
    const comandos: string[] = [
      "0.09 0.18 0.30 rg",
      "42 776 528 44 re f",
      "0.21 0.53 0.73 rg",
      "42 772 528 4 re f"
    ];
    const titulo = linhas[0] ?? "Clima do Brasil - RELATÓRIO DE MANUTENÇÃO";
    const subtitulo = linhas[1] ?? "";
    comandos.push(this.comandoTextoPdf(titulo, 54, 804, 15, "F2", "1 1 1"));
    comandos.push(this.comandoTextoPdf(subtitulo, 54, 787, 9, "F1", "0.88 0.93 0.98"));

    let y = 748;
    const limiteInferior = reservarEspacoImagens ? 200 : 58;

    for (const linhaOriginal of linhas.slice(2)) {
      const linha = this.normalizarTextoPdf(linhaOriginal).trimEnd();

      if (!linha.trim()) {
        y -= 8;
        continue;
      }

      if (y < limiteInferior) {
        break;
      }

      if (this.ehTituloSecaoRelatorioAvulso(linha)) {
        const altura = linha.startsWith("MAQUINA") ? 24 : 20;
        const fill = linha.startsWith("MAQUINA") ? "0.09 0.18 0.30" : "0.93 0.95 0.97";
        const color = linha.startsWith("MAQUINA") ? "1 1 1" : "0.09 0.18 0.30";
        comandos.push(`${fill} rg\n42 ${y - altura + 6} 528 ${altura} re f`);
        comandos.push(this.comandoTextoPdf(linha, 54, y - 8, linha.startsWith("MAQUINA") ? 11 : 10, "F2", color));
        y -= altura + 8;
        continue;
      }

      if (this.ehLinhaTabelaRelatorioAvulso(linha)) {
        const celulas = this.separarLinhaTabelaRelatorioAvulso(linha);
        const labelQuebrado = this.quebrarLinhaPdf(celulas.label, 30);
        const valorQuebrado = this.quebrarLinhaPdf(celulas.valor, 60);
        const totalLinhas = Math.max(labelQuebrado.length, valorQuebrado.length);
        const altura = Math.max(22, totalLinhas * 11 + 10);
        const cabecalho = /^Campo\s+Informacao$/i.test(this.normalizarComparacaoPdf(linha.trim()));
        const fill = cabecalho ? "0.94 0.95 0.96" : "1 1 1";
        comandos.push(`% ${this.normalizarTextoPdf(linha)}`);
        comandos.push(`${fill} rg\n42 ${y - altura + 6} 528 ${altura} re f`);
        comandos.push("0.82 0.85 0.88 RG\n0.6 w");
        comandos.push(`42 ${y - altura + 6} 528 ${altura} re S`);
        comandos.push(`232 ${y - altura + 6} m 232 ${y + 6} l S`);
        labelQuebrado.forEach((parte, index) => {
          comandos.push(this.comandoTextoPdf(parte, 54, y - 8 - index * 11, 8.5, cabecalho ? "F2" : "F1", "0.12 0.16 0.22"));
        });
        valorQuebrado.forEach((parte, index) => {
          comandos.push(this.comandoTextoPdf(parte, 244, y - 8 - index * 11, 8.5, cabecalho ? "F2" : "F1", "0.12 0.16 0.22"));
        });
        y -= altura;
        continue;
      }

      const linhasTexto = this.quebrarLinhaPdf(linha, 94);
      linhasTexto.forEach((parte, index) => {
        comandos.push(this.comandoTextoPdf(parte, 54, y - index * 12, 9, "F1", "0.12 0.16 0.22"));
      });
      y -= linhasTexto.length * 12 + 2;
    }

    comandos.push("0.55 0.60 0.66 rg\n42 34 528 1 re f");
    comandos.push(this.comandoTextoPdf("Documento gerado automaticamente pela plataforma Clima do Brasil.", 42, 20, 7.5, "F1", "0.38 0.42 0.48"));

    return comandos.join("\n");
  }

  private comandoTextoPdf(texto: string, x: number, y: number, tamanho: number, fonte: "F1" | "F2", cor: string) {
    return `BT\n${cor} rg\n/${fonte} ${tamanho} Tf\n${x} ${y} Td\n(${this.escaparTextoPdf(texto)}) Tj\nET`;
  }

  private ehTituloSecaoRelatorioAvulso(linha: string) {
    return /^(DADOS|EQUIPE|SERVICO|EVIDENCIAS|OBSERVACOES|DECLARACAO|MAQUINA)/.test(
      this.normalizarComparacaoPdf(linha)
    );
  }

  private ehLinhaTabelaRelatorioAvulso(linha: string) {
    return /\S\s{2,}\S/.test(linha) || /^[^:]{2,30}:\s+\S/.test(linha);
  }

  private separarLinhaTabelaRelatorioAvulso(linha: string) {
    const porEspacos = linha.match(/^(.{1,35}?)\s{2,}(.+)$/);
    if (porEspacos) {
      return { label: porEspacos[1].trim(), valor: porEspacos[2].trim() };
    }

    const porDoisPontos = linha.match(/^([^:]{2,30}):\s+(.+)$/);
    if (porDoisPontos) {
      return { label: porDoisPontos[1].trim(), valor: porDoisPontos[2].trim() };
    }

    return { label: linha, valor: "" };
  }

  private obterLinhasEquipamentoRelatorioAvulso(maquina: PreviaRelatorioAvulsoCliente["maquinas"][number]) {
    return [
      ["Identificador interno", maquina.patrimonio || maquina.codigo_barras || "não informado"],
      ["Marca / Modelo", `${maquina.marca || "não informada"} ${maquina.modelo || ""}`.trim()],
      ["Fluido refrigerante", maquina.gas_refrigerante || "pendente"],
      ["Capacidade", this.formatarCapacidadePmoc(maquina.capacidade_btu)],
      ["Ambiente instalado", maquina.local_instalacao || "não informado"],
      ["Nº de Série", maquina.numero_serie || "não informado"],
      ["Código interno", maquina.codigo_barras || "não informado"]
    ] as Array<[string, string]>;
  }

  private carregarImagensRelatorioAvulso(
    ordem: PreviaRelatorioAvulsoCliente["maquinas"][number]["os_concluidas"][number] | null
  ) {
    return carregarFotosRelatorioTecnico(ordem, (storageUrl) => this.carregarArquivoStorage(storageUrl));
  }

  private carregarAssinaturaClienteRelatorio(
    ordem: PreviaRelatorioAvulsoCliente["maquinas"][number]["os_concluidas"][number] | null
  ) {
    const storageUrl = ordem?.assinatura?.storage_url;
    return storageUrl ? this.carregarArquivoStorage(storageUrl) : null;
  }

  private obterExecutoresOrdem(
    ordem: PreviaRelatorioAvulsoCliente["maquinas"][number]["os_concluidas"][number] | null
  ) {
    const executores: Array<{
      nome?: string | null;
      foto_perfil_storage_url?: string | null;
      assinatura_storage_url?: string | null;
    }> = [];

    if (!ordem) {
      return executores;
    }

    if (ordem.tecnico_executor) {
      executores.push({
        nome: ordem.tecnico_executor.nome,
        foto_perfil_storage_url: ordem.tecnico_executor.foto_perfil_storage_url,
        assinatura_storage_url: ordem.tecnico_executor.assinatura_storage_url
      });
    } else if (ordem.tecnico) {
      executores.push({
        nome: ordem.tecnico.nome,
        foto_perfil_storage_url: ordem.tecnico.foto_perfil_storage_url,
        assinatura_storage_url: ordem.tecnico.assinatura_storage_url
      });
    }

    const membrosEquipe = (ordem.equipe?.membros ?? [])
      .map((membro) => ({
        nome: membro.usuario?.nome,
        foto_perfil_storage_url: membro.usuario?.fotoPerfilStorageUrl,
        assinatura_storage_url: membro.usuario?.assinaturaStorageUrl
      }))
      .filter((membro) => membro.nome);

    executores.push(...membrosEquipe);

    return executores.filter((executor, index, lista) => {
      const nome = this.normalizarNomeExecutorRelatorio(executor.nome);
      const urls = [executor.foto_perfil_storage_url, executor.assinatura_storage_url].filter(Boolean);

      return index === lista.findIndex((comparado) => {
        const mesmoNome = nome && nome === this.normalizarNomeExecutorRelatorio(comparado.nome);
        const urlsComparado = [comparado.foto_perfil_storage_url, comparado.assinatura_storage_url].filter(Boolean);
        const mesmaIdentidadeVisual = urls.some((url) => urlsComparado.includes(url));

        return Boolean(mesmoNome || mesmaIdentidadeVisual);
      });
    });
  }

  private dividirExecutoresRelatorio(
    executores: Array<{
      nome?: string | null;
      foto_perfil_storage_url?: string | null;
      assinatura_storage_url?: string | null;
    }>
  ) {
    const grupos: typeof executores[] = [];

    for (let index = 0; index < executores.length; index += 2) {
      grupos.push(executores.slice(index, index + 2));
    }

    return grupos;
  }

  private normalizarNomeExecutorRelatorio(nome?: string | null) {
    return this.normalizarComparacaoPdf(nome || "")
      .replace(/\([^)]*\)/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  private carregarIdentidadeTecnicosRelatorio(
    tecnicos: Array<{
      nome?: string | null;
      foto_perfil_storage_url?: string | null;
      assinatura_storage_url?: string | null;
    }>
  ) {
    const imagens: Array<{ buffer: Buffer; rotulo: string }> = [];
    const urlsProcessadas = new Set<string>();

    for (const tecnico of tecnicos) {
      for (const item of [
        { url: tecnico.foto_perfil_storage_url, rotulo: `Foto do técnico - ${tecnico.nome || "não informado"}` },
        { url: tecnico.assinatura_storage_url, rotulo: `Assinatura do técnico - ${tecnico.nome || "não informado"}` }
      ]) {
        if (!item.url || urlsProcessadas.has(item.url)) continue;
        const buffer = this.carregarArquivoStorage(item.url);
        if (buffer) {
          imagens.push({ buffer, rotulo: item.rotulo });
          urlsProcessadas.add(item.url);
        }
      }
    }

    return imagens;
  }

  private normalizarImagensPaginaPdf(imagens: ImagemPaginaPdfTexto[]) {
    return imagens.map((imagem) => Buffer.isBuffer(imagem) ? { buffer: imagem } : imagem);
  }

  private obterPosicaoImagemRelatorioAvulso(qtdImagens: number, index: number) {
    if (qtdImagens === 1) {
      return { width: 200, height: 150, x: 206, y: 100 };
    }

    if (qtdImagens === 2) {
      return { width: 160, height: 130, x: 42 + (index % 2) * 200, y: 100 + Math.floor(index / 2) * 150 };
    }

    if (qtdImagens === 3) {
      return { width: 140, height: 110, x: 42 + (index % 3) * 170, y: 100 + Math.floor(index / 3) * 130 };
    }

    return { width: 130, height: 100, x: 42 + (index % 2) * 200, y: 100 + Math.floor(index / 2) * 130 };
  }

  private carregarArquivoStorage(storageUrl: string) {
    if (!storageUrl.startsWith("/storage/")) {
      return null;
    }

    const partes = storageUrl.replace(/^\/storage\//, "").split("/").filter(Boolean);
    const caminho = resolve(this.resolveStorageRoot(), join(...partes));

    try {
      return readFileSync(caminho);
    } catch {
      return null;
    }
  }

  private resolveStorageRoot() {
    const cwd = process.cwd();

    if (basename(cwd) === "backend") {
      return resolve(cwd, "..", "..", "storage");
    }

    return resolve(cwd, "storage");
  }

  private criarObjetoImagemPdf(buffer: Buffer) {
    return this.criarObjetoImagemPdfNormalizada(this.normalizarImagemPdf(buffer));
  }

  private criarObjetoImagemPdfNormalizada(imagem: { dados: Buffer; width: number; height: number; filtro: string }) {
    return `<< /Type /XObject /Subtype /Image /Width ${imagem.width} /Height ${imagem.height} /ColorSpace /DeviceRGB /BitsPerComponent 8${imagem.filtro} /Length ${imagem.dados.length} >>\nstream\n${imagem.dados.toString("latin1")}\nendstream`;
  }

  private normalizarImagemPdf(buffer: Buffer) {
    if (this.ehJpeg(buffer)) {
      return {
        dados: buffer,
        ...this.obterDimensoesJpeg(buffer),
        orientacao: this.obterOrientacaoExifJpeg(buffer),
        filtro: " /Filter /DCTDecode"
      };
    }

    if (this.ehPng(buffer)) {
      const png = this.converterPngParaRgb(buffer);
      if (png) {
        return {
          dados: deflateSync(png.rgb),
          width: png.width,
          height: png.height,
          orientacao: 1,
          filtro: " /Filter /FlateDecode"
        };
      }
    }

    return {
      dados: Buffer.from([255, 255, 255]),
      width: 1,
      height: 1,
      orientacao: 1,
      filtro: ""
    };
  }

  private comandoTransformacaoImagemPdf(x: number, y: number, width: number, height: number, orientacao: number) {
    if (orientacao === 3) {
      return `${-width} 0 0 ${-height} ${x + width} ${y + height} cm`;
    }

    if (orientacao === 6) {
      return `0 ${-height} ${width} 0 ${x} ${y + height} cm`;
    }

    if (orientacao === 8) {
      return `0 ${height} ${-width} 0 ${x + width} ${y} cm`;
    }

    return `${width} 0 0 ${height} ${x} ${y} cm`;
  }

  private ehJpeg(buffer: Buffer) {
    return buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
  }

  private ehPng(buffer: Buffer) {
    return buffer.length > 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }

  private converterPngParaRgb(buffer: Buffer) {
    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    const idat: Buffer[] = [];

    while (offset < buffer.length - 8) {
      const length = buffer.readUInt32BE(offset);
      const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
      const data = buffer.subarray(offset + 8, offset + 8 + length);

      if (type === "IHDR") {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8];
        colorType = data[9];
      }

      if (type === "IDAT") {
        idat.push(data);
      }

      if (type === "IEND") {
        break;
      }

      offset += length + 12;
    }

    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
    if (!width || !height || bitDepth !== 8 || !channels || !idat.length) {
      return null;
    }

    const raw = inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    const linhas: Buffer[] = [];
    let rawOffset = 0;
    let anterior = Buffer.alloc(stride);

    for (let y = 0; y < height; y += 1) {
      const filtro = raw[rawOffset];
      rawOffset += 1;
      const atual = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
      rawOffset += stride;
      this.aplicarFiltroPng(atual, anterior, filtro, channels);
      linhas.push(atual);
      anterior = atual;
    }

    const rgb = Buffer.alloc(width * height * 3);
    let destino = 0;

    for (const linha of linhas) {
      for (let index = 0; index < linha.length; index += channels) {
        rgb[destino++] = linha[index];
        rgb[destino++] = linha[index + 1];
        rgb[destino++] = linha[index + 2];
      }
    }

    return { width, height, rgb };
  }

  private aplicarFiltroPng(linha: Buffer, anterior: Buffer, filtro: number, bytesPorPixel: number) {
    for (let index = 0; index < linha.length; index += 1) {
      const esquerda = index >= bytesPorPixel ? linha[index - bytesPorPixel] : 0;
      const acima = anterior[index] ?? 0;
      const acimaEsquerda = index >= bytesPorPixel ? anterior[index - bytesPorPixel] : 0;
      let ajuste = 0;

      if (filtro === 1) ajuste = esquerda;
      if (filtro === 2) ajuste = acima;
      if (filtro === 3) ajuste = Math.floor((esquerda + acima) / 2);
      if (filtro === 4) ajuste = this.paethPng(esquerda, acima, acimaEsquerda);

      linha[index] = (linha[index] + ajuste) & 0xff;
    }
  }

  private paethPng(esquerda: number, acima: number, acimaEsquerda: number) {
    const estimativa = esquerda + acima - acimaEsquerda;
    const distanciaEsquerda = Math.abs(estimativa - esquerda);
    const distanciaAcima = Math.abs(estimativa - acima);
    const distanciaAcimaEsquerda = Math.abs(estimativa - acimaEsquerda);

    if (distanciaEsquerda <= distanciaAcima && distanciaEsquerda <= distanciaAcimaEsquerda) return esquerda;
    if (distanciaAcima <= distanciaAcimaEsquerda) return acima;
    return acimaEsquerda;
  }

  private obterDimensoesJpeg(buffer: Buffer) {
    for (let offset = 2; offset < buffer.length - 9;) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);

      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7)
        };
      }

      offset += 2 + length;
    }

    return { width: 1, height: 1 };
  }

  private obterOrientacaoExifJpeg(buffer: Buffer) {
    for (let offset = 2; offset < buffer.length - 12;) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      const start = offset + 4;
      const end = start + length - 2;

      if (marker === 0xe1 && end <= buffer.length && buffer.subarray(start, start + 6).toString("ascii") === "Exif\0\0") {
        return this.lerOrientacaoExif(buffer.subarray(start + 6, end));
      }

      offset += 2 + length;
    }

    return 1;
  }

  private lerOrientacaoExif(tiff: Buffer) {
    if (tiff.length < 14) {
      return 1;
    }

    const littleEndian = tiff.subarray(0, 2).toString("ascii") === "II";
    const bigEndian = tiff.subarray(0, 2).toString("ascii") === "MM";

    if (!littleEndian && !bigEndian) {
      return 1;
    }

    const readUInt16 = (offset: number) => littleEndian ? tiff.readUInt16LE(offset) : tiff.readUInt16BE(offset);
    const readUInt32 = (offset: number) => littleEndian ? tiff.readUInt32LE(offset) : tiff.readUInt32BE(offset);
    const ifdOffset = readUInt32(4);

    if (ifdOffset + 2 > tiff.length) {
      return 1;
    }

    const total = readUInt16(ifdOffset);

    for (let index = 0; index < total; index += 1) {
      const entryOffset = ifdOffset + 2 + index * 12;
      if (entryOffset + 12 > tiff.length) break;

      const tag = readUInt16(entryOffset);
      if (tag === 0x0112) {
        const valor = readUInt16(entryOffset + 8);
        return [1, 3, 6, 8].includes(valor) ? valor : 1;
      }
    }

    return 1;
  }

  private formatarResponsavelRelatorioAvulso(
    ordem: PreviaRelatorioAvulsoCliente["maquinas"][number]["os_concluidas"][number] | null
  ) {
    if (!ordem) {
      return "não informado";
    }

    if (ordem.tecnico?.nome) {
      return ordem.tecnico.nome;
    }

    if (!ordem.equipe?.nome) {
      return "não informado";
    }

    const membros = (ordem.equipe.membros ?? [])
      .map((membro) => membro.usuario.nome)
      .filter(Boolean);

    return membros.length ? `${ordem.equipe.nome} - ${membros.join(" / ")}` : ordem.equipe.nome;
  }

  private formatarCapacidadePmoc(capacidadeBtu: number | null) {
    return capacidadeBtu ? `${new Intl.NumberFormat("pt-BR").format(capacidadeBtu)} BTU` : "não informada";
  }

  private formatarEvidenciasPmoc(ordem: PreviaPmocCliente["maquinas"][number]["os_concluidas"][number] | null) {
    if (!ordem?.evidencias.length) {
      return "Nenhuma evidencia registrada.";
    }

    const evidenciasComArquivo = ordem.evidencias.filter((evidencia) => Boolean(evidencia.storage_url));

    if (!evidenciasComArquivo.length) {
      return "Nenhuma evidencia registrada.";
    }

    return evidenciasComArquivo
      .map((evidencia) => {
        const rotulo = evidencia.tipo === "antes" ? "Antes" : evidencia.tipo === "depois" ? "Depois" : "Foto";
        return `${rotulo} --- ${this.obterNomeArquivoPmoc(evidencia.storage_url)}`;
      })
      .join(" - ");
  }

  private obterNomeArquivoPmoc(storageUrl?: string) {
    if (!storageUrl) {
      return "pendente";
    }

    return storageUrl.split(/[\\/]/).filter(Boolean).at(-1) || storageUrl;
  }

  private formatarEnderecoPmoc(endereco: PreviaPmocCliente["cliente"]["endereco"]) {
    if (!endereco) {
      return "não informado";
    }

    return [endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.uf].filter(Boolean).join(", ");
  }

  private formatarDataPmoc(valor: string | null) {
    return valor ? new Intl.DateTimeFormat("pt-BR").format(new Date(valor)) : "__/__/____";
  }

  private formatarHoraPmoc(valor: string | null) {
    return valor
      ? new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(valor))
      : "__:__";
  }

  private calcularDuracaoPmoc(inicio: string | null, fim: string | null) {
    if (!inicio || !fim) {
      return "0min";
    }

    const minutos = Math.max(0, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000));
    return `${minutos}min`;
  }

  private quebrarLinhaPdf(linha: string, limite: number) {
    const palavras = this.normalizarTextoPdf(linha).split(/\s+/);
    const linhas: string[] = [];
    let atual = "";

    for (const palavra of palavras) {
      const proxima = atual ? `${atual} ${palavra}` : palavra;

      if (proxima.length > limite && atual) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = proxima;
      }
    }

    return linhas.concat(atual || "");
  }

  private normalizarTextoPdf(valor: string) {
    return valor.replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
  }

  private normalizarComparacaoPdf(valor: string) {
    return this.normalizarTextoPdf(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  private escaparTextoPdf(valor: string) {
    return Array.from(this.normalizarTextoPdf(valor), (caractere) => {
      const codigo = caractere.charCodeAt(0);

      if (caractere === "\\") return "\\\\";
      if (caractere === "(") return "\\(";
      if (caractere === ")") return "\\)";
      if (codigo < 0x20) return " ";
      if (codigo >= 0x80) return `\\${codigo.toString(8).padStart(3, "0")}`;

      return caractere;
    }).join("");
  }
}
