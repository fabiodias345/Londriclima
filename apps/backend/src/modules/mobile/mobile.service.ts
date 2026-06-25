import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ChecklistTipo, OrdemServicoStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import type { CriarAbastecimentoDto } from "../admin/dto/criar-abastecimento.dto";
import type { AuthenticatedUser } from "../auth/auth-user";

const statusesCampo = [
  OrdemServicoStatus.aberta,
  OrdemServicoStatus.em_deslocamento,
  OrdemServicoStatus.em_atendimento
];

type ChecklistItemTipo = "checkbox" | "select" | "select_obs" | "numerico" | "texto" | "foto" | "finalizacao";
type ChecklistItem = {
  codigo: string;
  item: string;
  tipo: ChecklistItemTipo;
  opcoes?: string[];
  unidade?: string;
  obrigatorio?: boolean;
};

const checklistMensal: ChecklistItem[] = [
  { codigo: "M1", item: "EPIs utilizados", tipo: "checkbox" },
  { codigo: "M2", item: "Desligar pelo controle remoto", tipo: "checkbox" },
  { codigo: "M3", item: "Disjuntores desligados e ambiente protegido", tipo: "checkbox" },
  { codigo: "M4", item: "Foto inicial", tipo: "foto" },
  { codigo: "M5", item: "Retirar filtro", tipo: "checkbox" },
  { codigo: "M6", item: "Condicoes do filtro", tipo: "select", opcoes: ["limpo", "sujo", "danificado"] },
  { codigo: "M7", item: "Limpar filtro", tipo: "checkbox" },
  { codigo: "M8", item: "Aguardar secagem", tipo: "checkbox" },
  { codigo: "M9", item: "Inspecao interna", tipo: "select_obs", opcoes: ["Interna limpa", "Interna suja"] },
  { codigo: "M10", item: "Bandeja do condensado", tipo: "select_obs", opcoes: ["Bandeja limpa", "Bandeja suja"] },
  { codigo: "M11", item: "Reinstalar filtros", tipo: "checkbox" },
  { codigo: "M12", item: "Fechar tampa", tipo: "checkbox" },
  { codigo: "M13", item: "Ligar disjuntor", tipo: "checkbox" },
  { codigo: "M14", item: "Funcao Dry se existir por 10 minutos", tipo: "select", opcoes: ["realizado", "nao existe"] },
  { codigo: "M15", item: "Temperatura de entrada do ar", tipo: "numerico", unidade: "°C" },
  { codigo: "M17", item: "Temperatura de insuflamento", tipo: "numerico", unidade: "°C" },
  { codigo: "M18", item: "Foto da evaporadora limpa", tipo: "foto" },
  { codigo: "M16", item: "Finalizacao", tipo: "finalizacao" }
];

const checklistTrimestralExtra: ChecklistItem[] = [
  { codigo: "T1", item: "Aplicar higienizante", tipo: "checkbox" },
  { codigo: "T2", item: "Limpar serpentina evaporadora", tipo: "checkbox" },
  { codigo: "T3", item: "Dreno limpo", tipo: "checkbox" },
  { codigo: "T4", item: "Gabinete limpo", tipo: "checkbox" },
  { codigo: "T5", item: "Ruido", tipo: "checkbox" },
  { codigo: "T6", item: "Fluxo de ar pelas aletas normal", tipo: "checkbox" }
];

const checklistSemestralExtra: ChecklistItem[] = [
  { codigo: "S1", item: "Acesso a condensadora", tipo: "checkbox" },
  { codigo: "S2", item: "Limpar serpentina condensadora", tipo: "checkbox" },
  { codigo: "S3", item: "Foto da condensadora limpa", tipo: "foto" },
  { codigo: "S4", item: "Oxidacao, danos ou entupimentos", tipo: "checkbox" },
  { codigo: "S5", item: "Efetuado limpeza geral", tipo: "checkbox" },
  { codigo: "S6", item: "Pressao do fluido refrigerante", tipo: "numerico", unidade: "bar/psi" },
  { codigo: "S7", item: "Tipo de fluido refrigerante", tipo: "texto" },
  { codigo: "S8", item: "Efetuado inspecao eletrica conexoes", tipo: "checkbox" },
  { codigo: "S9", item: "Corrente", tipo: "numerico", unidade: "A" },
  { codigo: "S10", item: "Protecoes eletricas funcionando", tipo: "checkbox" },
  { codigo: "S11", item: "Reinstalar componentes", tipo: "checkbox" },
  { codigo: "S12", item: "Religado e verificado", tipo: "checkbox" },
  { codigo: "S13", item: "Observacao", tipo: "texto", obrigatorio: false }
];

const checklistAnualExtra: ChecklistItem[] = [
  { codigo: "A1", item: "Quantidade de intervencoes no ano", tipo: "numerico" },
  { codigo: "A2", item: "Avaliacao de desempenho geral", tipo: "texto" },
  { codigo: "A3", item: "Fixacoes mecanicas evaporadora/condensadora", tipo: "select_obs" },
  { codigo: "A4", item: "Isolamento termico das tubulacoes", tipo: "select_obs" },
  { codigo: "A5", item: "Conexoes de cobre: vazamentos, oxidacao", tipo: "select_obs" },
  { codigo: "A6", item: "Capacidade atende ao ambiente?", tipo: "select_obs", opcoes: ["sim", "nao"] },
  { codigo: "A7", item: "Relatorio consolidado anual", tipo: "texto" }
];

@Injectable()
export class MobileService {
  constructor(private readonly prisma: PrismaService) {}

  async listarOrdens(user: AuthenticatedUser) {
    const ordens = await this.prisma.ordemServico.findMany({
      where: this.filtroOrdensDoUsuario(user),
      orderBy: [{ agendadaPara: "asc" }, { criadaEm: "desc" }],
      include: this.includeMobile()
    });

    return { items: ordens.map((ordem) => this.toMobileOrder(ordem)) };
  }

  async obterOrdem(user: AuthenticatedUser, id: string) {
    const ordem = await this.prisma.ordemServico.findFirst({
      where: { id, ...this.filtroOrdensDoUsuario(user) },
      include: this.includeMobile()
    });

    if (!ordem) {
      throw new NotFoundException("OS mobile nao encontrada.");
    }

    return this.toMobileOrder(ordem);
  }

  async listarVeiculos(user: AuthenticatedUser) {
    const veiculos = await this.prisma.veiculo.findMany({
      where: {
        empresaId: user.empresa_id,
        ativo: true
      },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        placa: true
      }
    });

    return {
      total: veiculos.length,
      items: veiculos.map((veiculo) => ({
        id: veiculo.id,
        nome: veiculo.nome,
        placa: veiculo.placa
      }))
    };
  }

  async registrarAbastecimento(user: AuthenticatedUser, dto: CriarAbastecimentoDto) {
    const veiculo = await this.prisma.veiculo.findFirst({
      where: {
        id: dto.veiculo_id,
        empresaId: user.empresa_id,
        ativo: true
      },
      select: {
        id: true,
        nome: true,
        empresaId: true
      }
    });

    if (!veiculo) {
      throw new NotFoundException("Veiculo nao encontrado.");
    }

    const ultimoAbastecimento = await this.prisma.veiculoAbastecimento.findFirst({
      where: { veiculoId: veiculo.id },
      orderBy: { odometroKm: "desc" },
      select: { odometroKm: true }
    });

    if (ultimoAbastecimento && dto.odometro_km < ultimoAbastecimento.odometroKm.toNumber()) {
      throw new ConflictException("Odometro nao pode ser menor que o ultimo abastecimento.");
    }

    const abastecimento = await this.prisma.veiculoAbastecimento.create({
      data: {
        empresaId: veiculo.empresaId,
        veiculoId: veiculo.id,
        usuarioId: user.id,
        odometroKm: new Prisma.Decimal(dto.odometro_km),
        litros: new Prisma.Decimal(dto.litros),
        valorTotal: new Prisma.Decimal(dto.valor_total),
        precoPorLitro: new Prisma.Decimal(dto.valor_total / dto.litros),
        abastecidoEm: new Date()
      },
      select: {
        id: true,
        odometroKm: true,
        litros: true,
        valorTotal: true,
        precoPorLitro: true,
        abastecidoEm: true
      }
    });

    return {
      id: abastecimento.id,
      veiculo_id: veiculo.id,
      veiculo_nome: veiculo.nome,
      odometro_km: abastecimento.odometroKm.toNumber(),
      litros: abastecimento.litros.toNumber(),
      valor_total: abastecimento.valorTotal.toNumber(),
      preco_por_litro: abastecimento.precoPorLitro.toNumber(),
      abastecido_em: abastecimento.abastecidoEm.toISOString()
    };
  }

  private filtroOrdensDoUsuario(user: AuthenticatedUser) {
    return {
      empresaId: user.empresa_id,
      status: { in: statusesCampo },
      OR: [
        { tecnicoId: user.id },
        { responsaveis: { some: { usuarioId: user.id } } },
        { equipe: { membros: { some: { usuarioId: user.id, ativo: true } } } },
        {
          responsaveis: {
            some: {
              equipe: { membros: { some: { usuarioId: user.id, ativo: true } } }
            }
          }
        }
      ]
    };
  }

  private includeMobile() {
    return {
      cliente: { include: { equipamentos: true } },
      endereco: true,
      equipamento: true,
      responsaveis: true,
      checklistRespostas: {
        select: {
          equipamentoId: true
        }
      }
    };
  }

  private toMobileOrder(ordem: any) {
    const equipamentosBase = ordem.equipamento
      ? [ordem.equipamento]
      : ordem.cliente?.equipamentos ?? [];

    return {
      id: ordem.id,
      cliente: ordem.cliente?.nome ?? "",
      endereco: this.formatarEndereco(ordem.endereco),
      tipo: ordem.titulo,
      tipo_servico: ordem.tipoServico ?? "preventiva",
      checklist_tipo: ordem.checklistTipo ?? ChecklistTipo.mensal,
      checklist: this.montarChecklist(ordem.checklistTipo ?? ChecklistTipo.mensal),
      status: ordem.status,
      data: ordem.agendadaPara?.toISOString() ?? null,
      equipamento: this.descreverEquipamento(ordem.equipamento),
      equipamentos: equipamentosBase.map((equipamento: any) => ({
        id: equipamento.id,
        codigo_qr: equipamento.codigoBarras ?? equipamento.patrimonio ?? "",
        tipo: equipamento.tipo ?? "",
        marca: equipamento.marca ?? "",
        nome: equipamento.localInstalacao || equipamento.modelo,
        local: equipamento.localInstalacao ?? "",
        modelo: equipamento.modelo ?? "",
        capacidade_btu: equipamento.capacidadeBtu ?? null,
        gas_refrigerante: equipamento.gasRefrigerante ?? "",
        numero_serie: equipamento.numeroSerie ?? "",
        dados_impossiveis: equipamento.dadosPendentesJustificados ?? [],
        descricao: this.descreverEquipamento(equipamento),
        status_execucao: this.statusExecucaoEquipamento(ordem, equipamento.id)
      }))
    };
  }

  private statusExecucaoEquipamento(ordem: any, equipamentoId: string) {
    const respostas = ordem.checklistRespostas ?? [];
    return respostas.some((resposta: any) => resposta.equipamentoId === equipamentoId)
      ? "feito"
      : "pendente";
  }

  private montarChecklist(tipo: ChecklistTipo) {
    const finalizacao = checklistMensal.find((item) => item.tipo === "finalizacao")!;
    const mensalSemFinalizacao = checklistMensal.filter((item) => item.tipo !== "finalizacao");

    if (tipo === ChecklistTipo.anual) {
      return [...mensalSemFinalizacao, ...checklistTrimestralExtra, ...checklistSemestralExtra, ...checklistAnualExtra, finalizacao];
    }

    if (tipo === ChecklistTipo.semestral) {
      return [...mensalSemFinalizacao, ...checklistTrimestralExtra, ...checklistSemestralExtra, finalizacao];
    }

    if (tipo === ChecklistTipo.trimestral) {
      return [...mensalSemFinalizacao, ...checklistTrimestralExtra, finalizacao];
    }

    return checklistMensal;
  }

  private formatarEndereco(endereco: any) {
    if (!endereco) {
      return "";
    }

    return [endereco.logradouro, endereco.numero, endereco.cidade, endereco.uf].filter(Boolean).join(", ");
  }

  private descreverEquipamento(equipamento: any) {
    if (!equipamento) {
      return "";
    }

    const capacidade = equipamento.capacidadeBtu ? `${equipamento.capacidadeBtu} BTUs` : null;
    return [equipamento.modelo, capacidade].filter(Boolean).join(" ");
  }
}

