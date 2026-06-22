import { Injectable, NotFoundException } from "@nestjs/common";
import { OrdemServicoStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import type { AuthenticatedUser } from "../auth/auth-user";

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
      responsaveis: true
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
      status: ordem.status,
      data: ordem.agendadaPara?.toISOString() ?? null,
      equipamento: this.descreverEquipamento(ordem.equipamento),
      equipamentos: equipamentosBase.map((equipamento: any) => ({
        id: equipamento.id,
        nome: equipamento.localInstalacao || equipamento.modelo,
        local: equipamento.localInstalacao ?? "",
        modelo: this.descreverEquipamento(equipamento)
      }))
    };
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

