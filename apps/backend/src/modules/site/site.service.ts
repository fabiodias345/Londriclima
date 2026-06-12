import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { PasswordHashService } from "../auth/password-hash.service";
import { ConsultarEquipamentoDto } from "./dto/consultar-equipamento.dto";
import { CriarPreChamadoDto } from "./dto/criar-pre-chamado.dto";

const EMPRESA_PILOTO_CNPJ = "00000000000000";

@Injectable()
export class SiteService {
  private readonly passwordHash = new PasswordHashService();

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
      mensagem: "Pré-chamado registrado. A equipe AIRMOVEBR retornará pelo WhatsApp.",
      criado_em: resultado.criadaEm.toISOString()
    };
  }

  async consultarEquipamentoPublico(codigoPublico: string, dto: ConsultarEquipamentoDto) {
    const equipamento = await this.prisma.equipamento.findUnique({
      where: {
        codigoPublico
      },
      select: {
        id: true,
        codigoPublico: true,
        senhaPublicaHash: true,
        acessoPublicoAtivo: true,
        tipo: true,
        marca: true,
        modelo: true,
        capacidadeBtu: true,
        gasRefrigerante: true,
        numeroSerie: true,
        localInstalacao: true,
        atualizadoEm: true,
        cliente: {
          select: {
            nome: true
          }
        },
        ordensServico: {
          orderBy: {
            atualizadaEm: "desc"
          },
          take: 5,
          select: {
            id: true,
            status: true,
            titulo: true,
            agendadaPara: true,
            concluidaEm: true,
            atualizadaEm: true
          }
        }
      }
    });

    if (!equipamento || !equipamento.acessoPublicoAtivo || !equipamento.senhaPublicaHash) {
      throw new NotFoundException("Equipamento nao encontrado.");
    }

    const senhaValida = await this.passwordHash.verify(dto.senha, equipamento.senhaPublicaHash);

    if (!senhaValida) {
      throw new UnauthorizedException("Senha invalida.");
    }

    const ultimaOs = equipamento.ordensServico[0] ?? null;

    return {
      codigo_publico: equipamento.codigoPublico,
      cliente: {
        nome: equipamento.cliente.nome
      },
      equipamento: {
        tipo: equipamento.tipo,
        marca: equipamento.marca,
        modelo: equipamento.modelo,
        capacidade_btu: equipamento.capacidadeBtu,
        gas_refrigerante: equipamento.gasRefrigerante,
        numero_serie: equipamento.numeroSerie,
        local_instalacao: equipamento.localInstalacao
      },
      manutencao: {
        status: ultimaOs?.status ?? "sem_historico",
        ultima_atualizacao: ultimaOs?.atualizadaEm.toISOString() ?? equipamento.atualizadoEm.toISOString(),
        ultima_os: ultimaOs
          ? {
              titulo: ultimaOs.titulo,
              status: ultimaOs.status,
              agendada_para: ultimaOs.agendadaPara?.toISOString() ?? null,
              concluida_em: ultimaOs.concluidaEm?.toISOString() ?? null
            }
          : null
      },
      historico: equipamento.ordensServico.map((ordem) => ({
        titulo: ordem.titulo,
        status: ordem.status,
        agendada_para: ordem.agendadaPara?.toISOString() ?? null,
        concluida_em: ordem.concluidaEm?.toISOString() ?? null,
        atualizada_em: ordem.atualizadaEm.toISOString()
      }))
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
