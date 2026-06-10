import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CriarPreChamadoDto } from "./dto/criar-pre-chamado.dto";

const EMPRESA_PILOTO_CNPJ = "00000000000000";

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  async criarPreChamado(dto: CriarPreChamadoDto) {
    const empresa = await this.prisma.empresa.findUnique({
      where: {
        cnpj: EMPRESA_PILOTO_CNPJ
      },
      select: {
        id: true
      }
    });

    if (!empresa) {
      throw new NotFoundException("Empresa piloto não encontrada.");
    }

    const telefone = this.normalizarTelefone(dto.telefone);
    const local = this.parseLocal(dto.local);

    const clienteExistente = await this.prisma.cliente.findFirst({
      where: {
        empresaId: empresa.id,
        telefone
      },
      select: {
        id: true
      }
    });

    const resultado = await this.prisma.$transaction(async (tx) => {
      const cliente = clienteExistente
        ? await tx.cliente.update({
            where: {
              id: clienteExistente.id
            },
            data: {
              nome: dto.nome,
              telefone
            },
            select: {
              id: true
            }
          })
        : await tx.cliente.create({
            data: {
              empresaId: empresa.id,
              tipo: "pf",
              nome: dto.nome,
              telefone
            },
            select: {
              id: true
            }
          });

      const endereco = await tx.clienteEndereco.create({
        data: {
          empresaId: empresa.id,
          clienteId: cliente.id,
          nome: "Endereço informado no site",
          logradouro: local.logradouro,
          bairro: local.bairro,
          cidade: local.cidade,
          uf: "PR"
        },
        select: {
          id: true
        }
      });

      const ordemServico = await tx.ordemServico.create({
        data: {
          empresaId: empresa.id,
          clienteId: cliente.id,
          enderecoId: endereco.id,
          status: "pre_chamado",
          titulo: dto.servico,
          problemaRelatado: dto.detalhes?.trim() || "Solicitação criada pelo site."
        },
        select: {
          id: true,
          status: true,
          criadaEm: true
        }
      });

      await tx.ordemServicoEvento.create({
        data: {
          empresaId: empresa.id,
          ordemServicoId: ordemServico.id,
          acao: "criar_pre_chamado",
          statusNovo: "pre_chamado",
          registradoEm: ordemServico.criadaEm
        }
      });

      return ordemServico;
    });

    return {
      pre_chamado_id: resultado.id,
      status: resultado.status,
      mensagem: "Pré-chamado registrado. A equipe LondriClima retornará pelo WhatsApp.",
      criado_em: resultado.criadaEm.toISOString()
    };
  }

  private normalizarTelefone(telefone: string) {
    return telefone.replace(/\D/g, "");
  }

  private parseLocal(local: string) {
    const [bairro, cidade] = local.split(",").map((parte) => parte.trim());

    return {
      logradouro: local.trim(),
      bairro: bairro || null,
      cidade: cidade || "Londrina"
    };
  }
}
