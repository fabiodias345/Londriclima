import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { CriarAbastecimentoDto } from "../dto/criar-abastecimento.dto";

@Injectable()
export class AdminFrotaService {
  constructor(private readonly prisma: PrismaService) {}

  async listarLocalizacoesFrota(usuario: AuthenticatedUser) {
    const veiculos = await this.prisma.veiculo.findMany({
      where: {
        empresaId: usuario.empresa_id,
        ativo: true
      },
      orderBy: {
        nome: "asc"
      },
      select: {
        id: true,
        nome: true,
        placa: true,
        rastreadorImei: true,
        localizacoes: {
          orderBy: {
            registradoEm: "desc"
          },
          take: 1,
          select: {
            latitude: true,
            longitude: true,
            velocidadeKmh: true,
            ignicao: true,
            registradoEm: true
          }
        }
      }
    });
    return {
      total: veiculos.length,
      items: veiculos.map((veiculo) => {
        const localizacao = veiculo.localizacoes[0];

        return {
          id: veiculo.id,
          nome: veiculo.nome,
          placa: veiculo.placa,
          rastreador_imei: veiculo.rastreadorImei,
          localizacao: localizacao
            ? {
                latitude: localizacao.latitude.toNumber(),
                longitude: localizacao.longitude.toNumber(),
                velocidade_kmh: localizacao.velocidadeKmh?.toNumber() ?? null,
                ignicao: localizacao.ignicao,
                registrado_em: localizacao.registradoEm.toISOString()
              }
            : null
        };
      })
    };
  }

  async listarAbastecimentos(usuario: AuthenticatedUser) {
    const abastecimentos = await this.prisma.veiculoAbastecimento.findMany({
      where: {
        empresaId: usuario.empresa_id
      },
      orderBy: {
        abastecidoEm: "desc"
      },
      take: 50,
      select: {
        id: true,
        odometroKm: true,
        litros: true,
        valorTotal: true,
        precoPorLitro: true,
        abastecidoEm: true,
        posto: true,
        observacao: true,
        veiculo: {
          select: {
            id: true,
            nome: true,
            placa: true
          }
        },
        usuario: {
          select: {
            nome: true
          }
        }
      }
    });

    return {
      total: abastecimentos.length,
      items: abastecimentos.map((abastecimento) => ({
        id: abastecimento.id,
        veiculo: abastecimento.veiculo,
        usuario: abastecimento.usuario,
        odometro_km: abastecimento.odometroKm.toNumber(),
        litros: abastecimento.litros.toNumber(),
        valor_total: abastecimento.valorTotal.toNumber(),
        preco_por_litro: abastecimento.precoPorLitro.toNumber(),
        abastecido_em: abastecimento.abastecidoEm.toISOString(),
        posto: abastecimento.posto,
        observacao: abastecimento.observacao
      }))
    };
  }

  async criarAbastecimento(dto: CriarAbastecimentoDto, usuario: AuthenticatedUser) {
    const veiculo = await this.prisma.veiculo.findFirst({
      where: {
        id: dto.veiculo_id,
        empresaId: usuario.empresa_id,
        ativo: true
      },
      select: {
        id: true,
        empresaId: true,
        nome: true
      }
    });

    if (!veiculo) {
      throw new NotFoundException("Veiculo nao encontrado.");
    }

    const ultimoAbastecimento = await this.prisma.veiculoAbastecimento.findFirst({
      where: {
        veiculoId: veiculo.id
      },
      orderBy: {
        odometroKm: "desc"
      },
      select: {
        odometroKm: true
      }
    });

    if (ultimoAbastecimento && dto.odometro_km < ultimoAbastecimento.odometroKm.toNumber()) {
      throw new ConflictException("Odometro nao pode ser menor que o ultimo abastecimento.");
    }

    const precoPorLitro = dto.valor_total / dto.litros;
    const abastecimento = await this.prisma.veiculoAbastecimento.create({
      data: {
        empresaId: veiculo.empresaId,
        veiculoId: veiculo.id,
        usuarioId: usuario.id,
        odometroKm: new Prisma.Decimal(dto.odometro_km),
        litros: new Prisma.Decimal(dto.litros),
        valorTotal: new Prisma.Decimal(dto.valor_total),
        precoPorLitro: new Prisma.Decimal(precoPorLitro),
        abastecidoEm: new Date(dto.abastecido_em),
        posto: dto.posto?.trim() || null,
        observacao: dto.observacao?.trim() || null
      },
      select: {
        id: true,
        odometroKm: true,
        litros: true,
        valorTotal: true,
        precoPorLitro: true,
        abastecidoEm: true,
        posto: true,
        observacao: true
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
      abastecido_em: abastecimento.abastecidoEm.toISOString(),
      posto: abastecimento.posto,
      observacao: abastecimento.observacao
    };
  }

  async obterRelatorioFrota(usuario: AuthenticatedUser, referencia = new Date()) {
    const veiculos = await this.prisma.veiculo.findMany({
      where: {
        empresaId: usuario.empresa_id,
        ativo: true
      },
      orderBy: {
        nome: "asc"
      },
      select: {
        id: true,
        nome: true,
        placa: true,
        abastecimentos: {
          orderBy: {
            odometroKm: "asc"
          },
          select: {
            odometroKm: true,
            litros: true,
            valorTotal: true,
            abastecidoEm: true
          }
        }
      }
    });

    const periodo = this.obterPeriodoRelatorio(referencia);
    const kmRodadosPeriodo = { dia: 0, mes: 0, ano: 0 };
    const items = veiculos.map((veiculo) => {
      const abastecimentos = veiculo.abastecimentos;
      const primeiro = abastecimentos[0];
      const ultimo = abastecimentos[abastecimentos.length - 1];
      const kmRodados =
        primeiro && ultimo ? Math.max(0, ultimo.odometroKm.toNumber() - primeiro.odometroKm.toNumber()) : 0;
      const litros = abastecimentos.reduce((total, item) => total + item.litros.toNumber(), 0);
      const valorTotal = abastecimentos.reduce((total, item) => total + item.valorTotal.toNumber(), 0);
      const kmPorLitro = kmRodados > 0 && litros > 0 ? kmRodados / litros : null;
      const custoPorKm = kmRodados > 0 ? valorTotal / kmRodados : null;

      for (let index = 1; index < abastecimentos.length; index += 1) {
        const anterior = abastecimentos[index - 1];
        const atual = abastecimentos[index];
        const kmPeriodo = Math.max(0, atual.odometroKm.toNumber() - anterior.odometroKm.toNumber());

        if (this.estaNoPeriodo(atual.abastecidoEm, periodo.dia)) {
          kmRodadosPeriodo.dia += kmPeriodo;
        }

        if (this.estaNoPeriodo(atual.abastecidoEm, periodo.mes)) {
          kmRodadosPeriodo.mes += kmPeriodo;
        }

        if (this.estaNoPeriodo(atual.abastecidoEm, periodo.ano)) {
          kmRodadosPeriodo.ano += kmPeriodo;
        }
      }

      return {
        veiculo_id: veiculo.id,
        nome: veiculo.nome,
        placa: veiculo.placa,
        abastecimentos: abastecimentos.length,
        km_rodados: kmRodados,
        litros,
        valor_total: valorTotal,
        km_por_litro: kmPorLitro,
        custo_por_km: custoPorKm,
        ultimo_abastecimento: ultimo?.abastecidoEm.toISOString() ?? null
      };
    });

    return {
      total_veiculos: items.length,
      km_rodados: items.reduce((total, item) => total + item.km_rodados, 0),
      km_rodados_periodo: kmRodadosPeriodo,
      litros: items.reduce((total, item) => total + item.litros, 0),
      valor_total: items.reduce((total, item) => total + item.valor_total, 0),
      items
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
}
