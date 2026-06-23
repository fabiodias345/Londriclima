import { Injectable, NotFoundException } from "@nestjs/common";
import { ChecklistTipo, OrdemServicoStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
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
};

const checklistMensal: ChecklistItem[] = [
  { codigo: "M1", item: "Desligar pelo controle remoto", tipo: "checkbox" },
  { codigo: "M2", item: "Desligar disjuntor", tipo: "checkbox" },
  { codigo: "M3", item: "Abrir tampa frontal", tipo: "checkbox" },
  { codigo: "M4", item: "Foto apos abrir tampa frontal", tipo: "foto" },
  { codigo: "M5", item: "Retirar filtros", tipo: "checkbox" },
  { codigo: "M6", item: "Condicao dos filtros", tipo: "select", opcoes: ["ok", "danificado", "substituido"] },
  { codigo: "M7", item: "Limpar filtros", tipo: "checkbox" },
  { codigo: "M8", item: "Aguardar secagem", tipo: "checkbox" },
  { codigo: "M9", item: "Inspecao interior: mofo, sujidade, odor", tipo: "select_obs" },
  { codigo: "M10", item: "Bandeja de condensado", tipo: "select_obs" },
  { codigo: "M11", item: "Reinstalar filtros", tipo: "checkbox" },
  { codigo: "M12", item: "Fechar tampa frontal", tipo: "checkbox" },
  { codigo: "M13", item: "Ligar disjuntor e religar", tipo: "checkbox" },
  { codigo: "M14", item: "Verificar operacao normal", tipo: "select_obs" },
  { codigo: "M16", item: "Finalizacao", tipo: "finalizacao" }
];

const checklistTrimestralExtra: ChecklistItem[] = [
  { codigo: "T1", item: "Desligar pelo controle remoto", tipo: "checkbox" },
  { codigo: "T2", item: "Desligar disjuntor", tipo: "checkbox" },
  { codigo: "T3", item: "Abrir tampa frontal", tipo: "checkbox" },
  { codigo: "T5", item: "Condicao dos filtros", tipo: "select", opcoes: ["ok", "danificado", "substituido"] },
  { codigo: "T6", item: "Limpar e secar filtros", tipo: "checkbox" },
  { codigo: "T8", item: "Aplicar higienizante", tipo: "checkbox" },
  { codigo: "T9", item: "Limpar serpentina", tipo: "checkbox" },
  { codigo: "T10", item: "Mofo, oxidacao, danos nas aletas", tipo: "select_obs" },
  { codigo: "T11", item: "Bandeja de condensado", tipo: "select_obs" },
  { codigo: "T12", item: "Dreno de escoamento", tipo: "select_obs" },
  { codigo: "T13", item: "Gabinete e vedacoes", tipo: "select_obs" },
  { codigo: "T14", item: "Ruidos e vibracoes", tipo: "select_obs" },
  { codigo: "T15", item: "Fluxo de ar pelas aletas", tipo: "select_obs" },
  { codigo: "T16", item: "Reinstalar filtros", tipo: "checkbox" },
  { codigo: "T17", item: "Fechar tampa", tipo: "checkbox" },
  { codigo: "T18", item: "Ligar e religar", tipo: "checkbox" },
  { codigo: "T19", item: "Verificar operacao", tipo: "select_obs" },
  { codigo: "T21", item: "Finalizacao", tipo: "finalizacao" }
];

const checklistSemestralExtra: ChecklistItem[] = [
  { codigo: "S1", item: "Acesso a condensadora", tipo: "checkbox" },
  { codigo: "S3", item: "Limpar serpentina condensadora", tipo: "checkbox" },
  { codigo: "S4", item: "Oxidacao, entupimento, danos condensadora", tipo: "select_obs" },
  { codigo: "S5", item: "Limpeza ventilador e helice", tipo: "select_obs" },
  { codigo: "S6", item: "Pressao do fluido refrigerante", tipo: "numerico", unidade: "bar/psi" },
  { codigo: "S7", item: "Tipo de fluido refrigerante", tipo: "texto" },
  { codigo: "S8", item: "Inspecao eletrica: conexoes, bornes, cabos", tipo: "select_obs" },
  { codigo: "S9", item: "Corrente eletrica de operacao", tipo: "numerico", unidade: "A" },
  { codigo: "S10", item: "Estado das protecoes eletricas", tipo: "select_obs" },
  { codigo: "S11", item: "Reinstalar componentes", tipo: "checkbox" },
  { codigo: "S12", item: "Religar e verificar operacao completa", tipo: "select_obs" },
  { codigo: "S14", item: "Finalizacao", tipo: "finalizacao" }
];

const checklistAnualExtra: ChecklistItem[] = [
  { codigo: "A1", item: "Quantidade de intervencoes no ano", tipo: "numerico" },
  { codigo: "A2", item: "Avaliacao de desempenho geral", tipo: "texto" },
  { codigo: "A3", item: "Fixacoes mecanicas evaporadora/condensadora", tipo: "select_obs" },
  { codigo: "A4", item: "Isolamento termico das tubulacoes", tipo: "select_obs" },
  { codigo: "A5", item: "Conexoes de cobre: vazamentos, oxidacao", tipo: "select_obs" },
  { codigo: "A6", item: "Capacidade atende ao ambiente?", tipo: "select_obs", opcoes: ["sim", "nao"] },
  { codigo: "A7", item: "Relatorio consolidado anual", tipo: "texto" },
  { codigo: "A9", item: "Finalizacao", tipo: "finalizacao" }
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
    const equipamentosBase = ordem.cliente?.equipamentos?.length
      ? ordem.cliente.equipamentos
      : ordem.equipamento
        ? [ordem.equipamento]
        : [];

    return {
      id: ordem.id,
      cliente: ordem.cliente?.nome ?? "",
      endereco: this.formatarEndereco(ordem.endereco),
      tipo: ordem.titulo,
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
    if (tipo === ChecklistTipo.anual) {
      return [...checklistMensal, ...checklistTrimestralExtra, ...checklistSemestralExtra, ...checklistAnualExtra];
    }

    if (tipo === ChecklistTipo.semestral) {
      return [...checklistMensal, ...checklistTrimestralExtra, ...checklistSemestralExtra];
    }

    if (tipo === ChecklistTipo.trimestral) {
      return [...checklistMensal, ...checklistTrimestralExtra];
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

