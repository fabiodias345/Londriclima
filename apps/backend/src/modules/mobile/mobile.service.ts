import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ChecklistTipo, OrdemServicoStatus, Prisma, UsuarioRole } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import type { CriarAbastecimentoDto } from "../admin/dto/criar-abastecimento.dto";
import type { AuthenticatedUser } from "../auth/auth-user";
import { codigosObrigatoriosChecklist, montarChecklistMobile } from "./mobile-checklists";

const statusesCampo = [
  OrdemServicoStatus.aberta,
  OrdemServicoStatus.em_deslocamento,
  OrdemServicoStatus.em_atendimento
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
    if (user.role === UsuarioRole.admin) {
      return {
        empresaId: user.empresa_id,
        status: { in: statusesCampo }
      };
    }

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
          equipamentoId: true,
          codigo: true,
          tipo: true,
          valor: true,
          observacao: true
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
      checklist: montarChecklistMobile(ordem.checklistTipo ?? ChecklistTipo.mensal),
      status: ordem.status,
      data: ordem.agendadaPara?.toISOString() ?? null,
      equipamento: this.descreverEquipamento(ordem.equipamento),
      equipamentos: equipamentosBase.map((equipamento: any) => {
        const respostas = this.respostasEquipamento(ordem, equipamento.id);
        return {
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
          checklist_respostas: respostas.map((resposta: any) => ({
            codigo: resposta.codigo,
            tipo: resposta.tipo,
            valor: resposta.valor,
            observacao: resposta.observacao
          })),
          status_execucao: this.statusExecucaoEquipamento(ordem, equipamento.id)
        };
      })
    };
  }

  private statusExecucaoEquipamento(ordem: any, equipamentoId: string) {
    const respostasEquipamento = this.respostasEquipamento(ordem, equipamentoId);
    if (ordem.tipoServico === "corretiva") {
      return respostasEquipamento.some((resposta: any) => resposta.valor?.trim())
        ? "feito"
        : "pendente";
    }
    const tipo = ordem.checklistTipo ?? ChecklistTipo.mensal;
    const obrigatorios = codigosObrigatoriosChecklist(tipo);
    const respondidos = new Set(
      respostasEquipamento
        .filter((resposta: any) => resposta.valor?.trim())
        .map((resposta: any) => resposta.codigo)
    );

    if (obrigatorios.every((codigo) => respondidos.has(codigo))) {
      return "feito";
    }

    return respondidos.size > 0 ? "em_andamento" : "pendente";
  }

  private respostasEquipamento(ordem: any, equipamentoId: string) {
    return (ordem.checklistRespostas ?? []).filter(
      (resposta: any) => resposta.equipamentoId === equipamentoId
    );
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

