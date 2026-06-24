import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException
} from "@nestjs/common";
import {
  AutomacaoTipo,
  ChecklistTipo,
  EvidenciaTipo,
  OrdemServicoEventoAcao,
  OrdemServicoStatus,
  OrdemServicoTipoServico,
  Prisma
} from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUser } from "../auth/auth-user";
import { AtualizarStatusOsDto } from "./dto/atualizar-status-os.dto";
import { FinalizarOsDto } from "./dto/finalizar-os.dto";
import { IdentificarEquipamentoDto } from "./dto/identificar-equipamento.dto";
import { RegistrarChecklistDto } from "./dto/registrar-checklist.dto";
import { RegistrarObservacoesDto } from "./dto/registrar-observacoes.dto";
import type { EvidenciaUploadFile } from "./ordens-servico.controller";

type TransicaoStatus = {
  statusNovo: OrdemServicoStatus;
  statusPermitidos: OrdemServicoStatus[];
};

const TRANSICOES_STATUS: Partial<Record<OrdemServicoEventoAcao, TransicaoStatus>> = {
  [OrdemServicoEventoAcao.iniciar_rota]: {
    statusNovo: OrdemServicoStatus.em_deslocamento,
    statusPermitidos: [OrdemServicoStatus.aberta]
  },
  [OrdemServicoEventoAcao.iniciar_atendimento]: {
    statusNovo: OrdemServicoStatus.em_atendimento,
    statusPermitidos: [OrdemServicoStatus.aberta]
  },
  [OrdemServicoEventoAcao.cheguei_cliente]: {
    statusNovo: OrdemServicoStatus.em_atendimento,
    statusPermitidos: [OrdemServicoStatus.em_deslocamento]
  },
  [OrdemServicoEventoAcao.cancelar]: {
    statusNovo: OrdemServicoStatus.cancelada,
    statusPermitidos: [
      OrdemServicoStatus.aberta,
      OrdemServicoStatus.em_deslocamento,
      OrdemServicoStatus.em_atendimento
    ]
  }
};

const LIMITE_FOTO_BYTES = 3 * 1024 * 1024;
const LIMITE_FOTO_MB = 3;

const EXTENSAO_POR_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/webp": "webp"
};

const AUTOMACOES_FINALIZACAO = [
  AutomacaoTipo.gerar_pdf,
  AutomacaoTipo.enviar_whatsapp,
  AutomacaoTipo.recorrencia_180_dias
];

type RegistrarEvidenciaInput = {
  tipo: EvidenciaTipo;
  descricao?: string;
  foto?: EvidenciaUploadFile;
  usuario: AuthenticatedUser;
};

type RegistrarFotoChecklistInput = {
  equipamentoId?: string;
  codigo?: string;
  foto?: EvidenciaUploadFile;
};

@Injectable()
export class OrdensServicoService {
  constructor(private readonly prisma: PrismaService) {}

  async atualizarStatus(osId: string, dto: AtualizarStatusOsDto, usuario: AuthenticatedUser) {
    const transicao = TRANSICOES_STATUS[dto.acao];

    if (!transicao) {
      throw new BadRequestException("Ação inválida para este endpoint.");
    }

    const registradoEm = new Date(dto.registrado_em);

    const resultado = await this.prisma.$transaction(async (tx) => {
      const ordemServico = await tx.ordemServico.findUnique({
        where: { id: osId },
        select: {
          id: true,
          empresaId: true,
          status: true
        }
      });

      if (!ordemServico) {
        throw new NotFoundException("OS não encontrada.");
      }

      this.garantirAcessoEmpresa(ordemServico.empresaId, usuario);

      if (ordemServico.status === OrdemServicoStatus.concluida) {
        throw new UnprocessableEntityException("OS concluída é imutável.");
      }

      if (!transicao.statusPermitidos.includes(ordemServico.status)) {
        throw new ConflictException("Transição de status inválida para esta OS.");
      }

      const [ordemAtualizada, evento] = await Promise.all([
        tx.ordemServico.update({
          where: { id: osId },
          data: {
            status: transicao.statusNovo
          },
          select: {
            id: true,
            status: true
          }
        }),
        tx.ordemServicoEvento.create({
          data: {
            empresaId: ordemServico.empresaId,
            ordemServicoId: osId,
            usuarioId: usuario.id,
            acao: dto.acao,
            statusAnterior: ordemServico.status,
            statusNovo: transicao.statusNovo,
            latitude: new Prisma.Decimal(dto.latitude),
            longitude: new Prisma.Decimal(dto.longitude),
            registradoEm
          },
          select: {
            acao: true,
            latitude: true,
            longitude: true,
            registradoEm: true
          }
        })
      ]);

      return {
        ordemAtualizada,
        evento
      };
    });

    return {
      os_id: resultado.ordemAtualizada.id,
      status: resultado.ordemAtualizada.status,
      evento: {
        acao: resultado.evento.acao,
        latitude: dto.latitude,
        longitude: dto.longitude,
        registrado_em: resultado.evento.registradoEm.toISOString()
      }
    };
  }

  async identificarEquipamento(
    osId: string,
    dto: IdentificarEquipamentoDto,
    usuario: AuthenticatedUser
  ) {
    const equipamento = await this.prisma.$transaction(async (tx) => {
      const ordemServico = await tx.ordemServico.findUnique({
        where: { id: osId },
        select: {
          id: true,
          empresaId: true,
          clienteId: true,
          equipamentoId: true,
          status: true
        }
      });

      if (!ordemServico) {
        throw new NotFoundException("OS não encontrada.");
      }

      this.garantirAcessoEmpresa(ordemServico.empresaId, usuario);

      if (ordemServico.status !== OrdemServicoStatus.em_atendimento) {
        throw new UnprocessableEntityException("OS não está com status em_atendimento.");
      }

      const dadosPendentesJustificados = dto.dados_impossiveis?.length
        ? dto.dados_impossiveis.map((dado) => ({
            campo: dado.campo,
            observacao: dado.observacao
          })) as Prisma.InputJsonValue
        : Prisma.JsonNull;

      const data = {
        codigoBarras: dto.codigo_qr.trim(),
        patrimonio: dto.codigo_qr.trim(),
        tipo: dto.tipo.trim(),
        marca: dto.marca,
        modelo: dto.modelo,
        capacidadeBtu: dto.capacidade_btu,
        gasRefrigerante: dto.gas_refrigerante?.trim() || undefined,
        numeroSerie: dto.numero_serie,
        localInstalacao: dto.local_instalacao,
        dadosPendentesJustificados
      };

      const equipamentoAlvoId = dto.equipamento_id ?? ordemServico.equipamentoId;

      if (equipamentoAlvoId) {
        const equipamentoAtual = await tx.equipamento.findUnique({
          where: { id: equipamentoAlvoId },
          select: {
            empresaId: true,
            clienteId: true,
            gasRefrigerante: true
          }
        });

        if (!equipamentoAtual || equipamentoAtual.empresaId !== ordemServico.empresaId || equipamentoAtual.clienteId !== ordemServico.clienteId) {
          throw new NotFoundException("Equipamento nao encontrado para esta OS.");
        }

        if (!equipamentoAtual?.gasRefrigerante && !dto.gas_refrigerante?.trim()) {
          throw new BadRequestException("Gas refrigerante e obrigatorio na primeira identificacao do equipamento.");
        }

        const equipamentoAtualizado = await tx.equipamento.update({
          where: { id: equipamentoAlvoId },
          data,
          select: {
            id: true,
            codigoBarras: true,
            tipo: true,
            marca: true,
            modelo: true,
            capacidadeBtu: true,
            gasRefrigerante: true,
            numeroSerie: true,
            localInstalacao: true,
            dadosPendentesJustificados: true,
            atualizadoEm: true
          }
        });

        return equipamentoAtualizado;
      }

      const novoEquipamento = await tx.equipamento.create({
        data: {
          ...data,
          gasRefrigerante: dto.gas_refrigerante?.trim() || this.exigirGasRefrigerante(),
          empresaId: ordemServico.empresaId,
          clienteId: ordemServico.clienteId
        },
        select: {
          id: true,
          codigoBarras: true,
          tipo: true,
          marca: true,
          modelo: true,
          capacidadeBtu: true,
          gasRefrigerante: true,
          numeroSerie: true,
          localInstalacao: true,
          dadosPendentesJustificados: true,
          atualizadoEm: true
        }
      });

      return novoEquipamento;
    });

    return {
      os_id: osId,
      equipamento: {
        id: equipamento.id,
        codigo_qr: equipamento.codigoBarras,
        tipo: equipamento.tipo,
        marca: equipamento.marca,
        modelo: equipamento.modelo,
        capacidade_btu: equipamento.capacidadeBtu,
        gas_refrigerante: equipamento.gasRefrigerante,
        numero_serie: equipamento.numeroSerie,
        local_instalacao: equipamento.localInstalacao,
        dados_impossiveis: equipamento.dadosPendentesJustificados
      },
      atualizado_em: equipamento.atualizadoEm.toISOString()
    };
  }

  private exigirGasRefrigerante(): never {
    throw new BadRequestException("Gas refrigerante e obrigatorio na primeira identificacao do equipamento.");
  }

  async registrarEvidencia(osId: string, input: RegistrarEvidenciaInput) {
    if (!input.descricao?.trim()) {
      throw new BadRequestException(
        input.tipo === EvidenciaTipo.antes
          ? "descricao_antes é obrigatória."
          : "descricao_depois é obrigatória."
      );
    }

    if (!input.foto) {
      throw new BadRequestException(
        input.tipo === EvidenciaTipo.antes
          ? "foto_antes é obrigatória."
          : "foto_depois é obrigatória."
      );
    }

    const extensao = EXTENSAO_POR_MIME_TYPE[input.foto.mimetype];

    if (!extensao) {
      throw new BadRequestException("Formato de arquivo não suportado. Use WebP ou JPEG.");
    }

    if (input.foto.size > LIMITE_FOTO_BYTES) {
      throw new BadRequestException(`Arquivo excede o limite de ${LIMITE_FOTO_MB} MB.`);
    }

    const ordemServico = await this.prisma.ordemServico.findUnique({
      where: { id: osId },
      select: {
        id: true,
        empresaId: true,
        status: true,
        evidencias: {
          select: {
            tipo: true
          }
        }
      }
    });

    if (!ordemServico) {
      throw new NotFoundException("OS não encontrada.");
    }

    this.garantirAcessoEmpresa(ordemServico.empresaId, input.usuario);

    if (ordemServico.status !== OrdemServicoStatus.em_atendimento) {
      throw new UnprocessableEntityException("OS não está com status em_atendimento.");
    }

    const evidenciaJaRegistrada = ordemServico.evidencias.some(
      (evidencia) => evidencia.tipo === input.tipo
    );

    if (evidenciaJaRegistrada) {
      throw new ConflictException(
        input.tipo === EvidenciaTipo.antes
          ? "Evidência inicial já registrada para esta OS."
          : "Evidência final já registrada para esta OS."
      );
    }

    const evidenciaInicialRegistrada = ordemServico.evidencias.some(
      (evidencia) => evidencia.tipo === EvidenciaTipo.antes
    );

    if (input.tipo === EvidenciaTipo.depois && !evidenciaInicialRegistrada) {
      throw new UnprocessableEntityException(
        "Evidência inicial ainda não registrada. Siga o fluxo obrigatório."
      );
    }

    const storageUrl = await this.salvarFotoEvidencia(osId, input.tipo, extensao, input.foto);
    const evidencia = await this.prisma.ordemServicoEvidencia.create({
      data: {
        empresaId: ordemServico.empresaId,
        ordemServicoId: osId,
        tipo: input.tipo,
        descricao: input.descricao.trim(),
        storageUrl,
        mimeType: input.foto.mimetype,
        tamanhoBytes: input.foto.size
      },
      select: {
        id: true,
        ordemServicoId: true,
        tipo: true,
        descricao: true,
        storageUrl: true,
        criadoEm: true
      }
    });

    return {
      id: evidencia.id,
      os_id: evidencia.ordemServicoId,
      tipo: evidencia.tipo,
      descricao: evidencia.descricao,
      storage_url: evidencia.storageUrl,
      criado_em: evidencia.criadoEm.toISOString()
    };
  }

  private async salvarFotoEvidencia(
    osId: string,
    tipo: EvidenciaTipo,
    extensao: string,
    foto: EvidenciaUploadFile
  ) {
    const storageRoot = this.resolveStorageRoot();
    const relativeDir = join("os", osId, "evidencias");
    const relativePath = join(relativeDir, `${tipo}.${extensao}`);
    const absoluteDir = join(storageRoot, relativeDir);
    const absolutePath = join(storageRoot, relativePath);

    await mkdir(absoluteDir, { recursive: true });
    await writeFile(absolutePath, foto.buffer);

    return `/storage/${relativePath.replace(/\\/g, "/")}`;
  }

  private async salvarFotoChecklist(
    osId: string,
    equipamentoId: string,
    codigo: string,
    extensao: string,
    foto: EvidenciaUploadFile
  ) {
    const storageRoot = this.resolveStorageRoot();
    const codigoSeguro = codigo.replace(/[^a-zA-Z0-9_-]/g, "_");
    const relativeDir = join("os", osId, "checklist", equipamentoId);
    const relativePath = join(relativeDir, `${codigoSeguro}.${extensao}`);
    const absoluteDir = join(storageRoot, relativeDir);
    const absolutePath = join(storageRoot, relativePath);

    await mkdir(absoluteDir, { recursive: true });
    await writeFile(absolutePath, foto.buffer);

    return `/storage/${relativePath.replace(/\\/g, "/")}`;
  }

  private resolveStorageRoot() {
    const cwd = process.cwd();

    if (basename(cwd) === "backend") {
      return resolve(cwd, "..", "..", "storage");
    }

    return resolve(cwd, "storage");
  }

  async registrarFotoChecklist(
    osId: string,
    input: RegistrarFotoChecklistInput,
    usuario: AuthenticatedUser
  ) {
    const equipamentoId = input.equipamentoId?.trim();
    const codigo = input.codigo?.trim();

    if (!equipamentoId) {
      throw new BadRequestException("equipamento_id e obrigatorio.");
    }

    if (!codigo) {
      throw new BadRequestException("codigo do item de checklist e obrigatorio.");
    }

    if (!input.foto) {
      throw new BadRequestException("foto do checklist e obrigatoria.");
    }

    const extensao = EXTENSAO_POR_MIME_TYPE[input.foto.mimetype];
    if (!extensao) {
      throw new BadRequestException("Formato de arquivo nao suportado. Use WebP ou JPEG.");
    }

    if (input.foto.size > LIMITE_FOTO_BYTES) {
      throw new BadRequestException(`Foto excede o limite de ${LIMITE_FOTO_MB} MB.`);
    }

    const ordemServico = await this.prisma.ordemServico.findUnique({
      where: { id: osId },
      select: {
        id: true,
        empresaId: true,
        clienteId: true,
        status: true
      }
    });

    if (!ordemServico) {
      throw new NotFoundException("OS nao encontrada.");
    }

    this.garantirAcessoEmpresa(ordemServico.empresaId, usuario);

    if (ordemServico.status !== OrdemServicoStatus.em_atendimento) {
      throw new UnprocessableEntityException("OS nao esta com status em_atendimento.");
    }

    const equipamento = await this.prisma.equipamento.findFirst({
      where: {
        id: equipamentoId,
        empresaId: ordemServico.empresaId,
        clienteId: ordemServico.clienteId
      },
      select: {
        id: true
      }
    });

    if (!equipamento) {
      throw new NotFoundException("Equipamento nao encontrado para esta OS.");
    }

    const storageUrl = await this.salvarFotoChecklist(osId, equipamentoId, codigo, extensao, input.foto);

    return {
      os_id: osId,
      equipamento_id: equipamentoId,
      codigo,
      storage_url: storageUrl
    };
  }

  async registrarChecklist(
    osId: string,
    dto: RegistrarChecklistDto,
    usuario: AuthenticatedUser
  ) {
    const checklist = await this.prisma.$transaction(async (tx) => {
      const ordemServico = await tx.ordemServico.findUnique({
        where: { id: osId },
        select: {
          id: true,
          empresaId: true,
          clienteId: true,
          status: true,
          checklistTipo: true,
          evidencias: {
            select: {
              tipo: true
            }
          },
          checklist: {
            select: {
              id: true
            }
          }
        }
      });

      if (!ordemServico) {
        throw new NotFoundException("OS não encontrada.");
      }

      this.garantirAcessoEmpresa(ordemServico.empresaId, usuario);

      if (ordemServico.status !== OrdemServicoStatus.em_atendimento) {
        throw new UnprocessableEntityException("OS não está com status em_atendimento.");
      }

      const evidenciaInicialRegistrada = ordemServico.evidencias.some(
        (evidencia) => evidencia.tipo === EvidenciaTipo.antes
      );

      if (!evidenciaInicialRegistrada) {
        throw new UnprocessableEntityException(
          "Evidência inicial ainda não registrada. Siga o fluxo obrigatório."
        );
      }

      const respostas = dto.respostas ?? [];
      if (respostas.length && !dto.equipamento_id) {
        throw new BadRequestException("equipamento_id e obrigatorio para salvar respostas do checklist.");
      }

      const equipamentoId = dto.equipamento_id;
      if (equipamentoId) {
        const equipamento = await tx.equipamento.findFirst({
          where: {
            id: equipamentoId,
            empresaId: ordemServico.empresaId,
            clienteId: ordemServico.clienteId
          },
          select: {
            id: true
          }
        });

        if (!equipamento) {
          throw new NotFoundException("Equipamento nao encontrado para esta OS.");
        }
      }

      const pecas = dto.pecas ?? [];
      const custoTotalPecas = pecas.reduce(
        (total, peca) => total + peca.quantidade * peca.custo_unitario,
        0
      );
      const procedimentos = dto.procedimentos ?? respostas.map((resposta) => resposta.codigo);
      const data = {
        servicoRealizado: dto.servico_realizado,
        procedimentos,
        custoTotalPecas: new Prisma.Decimal(custoTotalPecas)
      };
      const pecasCreate = pecas.map((peca) => ({
        empresaId: ordemServico.empresaId,
        descricaoPeca: peca.descricao_peca,
        quantidade: peca.quantidade,
        custoUnitario: new Prisma.Decimal(peca.custo_unitario)
      }));
      const salvarRespostas = async (checklistId: string) => {
        if (!equipamentoId || !respostas.length) {
          return;
        }

        await tx.ordemServicoChecklistResposta.deleteMany({
          where: {
            ordemServicoId: osId,
            equipamentoId
          }
        });

        await tx.ordemServicoChecklistResposta.createMany({
          data: respostas.map((resposta) => ({
            empresaId: ordemServico.empresaId,
            ordemServicoId: osId,
            checklistId,
            equipamentoId,
            checklistTipo: dto.checklist_tipo ?? ordemServico.checklistTipo ?? ChecklistTipo.mensal,
            codigo: resposta.codigo,
            tipo: resposta.tipo,
            valor: resposta.valor,
            observacao: resposta.observacao?.trim() || null
          }))
        });
      };

      if (ordemServico.checklist) {
        await tx.ordemServicoPeca.deleteMany({
          where: {
            checklistId: ordemServico.checklist.id
          }
        });

        const checklistAtualizado = await tx.ordemServicoChecklist.update({
          where: {
            id: ordemServico.checklist.id
          },
          data: {
            ...data,
            pecas: {
              create: pecasCreate
            }
          },
          include: {
            pecas: true
          }
        });

        await salvarRespostas(checklistAtualizado.id);
        return checklistAtualizado;
      }

      const checklistCriado = await tx.ordemServicoChecklist.create({
        data: {
          ...data,
          empresaId: ordemServico.empresaId,
          ordemServicoId: osId,
          pecas: {
            create: pecasCreate
          }
        },
        include: {
          pecas: true
        }
      });

      await salvarRespostas(checklistCriado.id);
      return checklistCriado;
    });

    return {
      os_id: osId,
      equipamento_id: dto.equipamento_id,
      servico_realizado: checklist.servicoRealizado,
      procedimentos: checklist.procedimentos,
      respostas_salvas: dto.respostas?.length ?? 0,
      pecas: checklist.pecas.map((peca) => ({
        id: peca.id,
        descricao_peca: peca.descricaoPeca,
        quantidade: peca.quantidade,
        custo_unitario: peca.custoUnitario.toNumber(),
        subtotal: peca.custoUnitario.toNumber() * peca.quantidade
      })),
      custo_total_pecas: checklist.custoTotalPecas.toNumber(),
      atualizado_em: checklist.atualizadoEm.toISOString()
    };
  }

  async registrarObservacoes(
    osId: string,
    dto: RegistrarObservacoesDto,
    usuario: AuthenticatedUser
  ) {
    const observacoes = dto.observacoes?.trim() ?? "";

    const ordemServico = await this.prisma.ordemServico.findUnique({
      where: { id: osId },
      select: {
        id: true,
        empresaId: true,
        status: true
      }
    });

    if (!ordemServico) {
      throw new NotFoundException("OS não encontrada.");
    }

    this.garantirAcessoEmpresa(ordemServico.empresaId, usuario);

    if (ordemServico.status === OrdemServicoStatus.concluida) {
      throw new UnprocessableEntityException("OS concluída é imutável.");
    }

    if (ordemServico.status !== OrdemServicoStatus.em_atendimento) {
      throw new UnprocessableEntityException("OS não está com status em_atendimento.");
    }

    if (observacoes) {
      await this.prisma.ordemServicoObservacao.create({
        data: {
          empresaId: ordemServico.empresaId,
          ordemServicoId: osId,
          texto: observacoes
        }
      });
    }

    return {
      os_id: osId,
      observacoes,
      atualizado_em: new Date().toISOString()
    };
  }

  async finalizarOs(osId: string, dto: FinalizarOsDto, usuario: AuthenticatedUser) {
    const finalizadoEm = new Date(dto.finalizado_em);
    const assinaturaBuffer = this.criarBufferAssinatura(dto.assinatura_cliente_base64);
    let assinaturaUrl = "";
    let automacoesFinalizacao: Prisma.AutomacaoAgendadaCreateManyInput[] = [];

    await this.prisma.$transaction(async (tx) => {
      const ordemServico = await tx.ordemServico.findUnique({
        where: { id: osId },
        select: {
          id: true,
          empresaId: true,
          status: true,
          titulo: true,
          tipoServico: true,
          agendadaPara: true,
          equipamento: {
            select: {
              id: true,
              marca: true,
              modelo: true,
              gasRefrigerante: true
            }
          },
          cliente: {
            select: {
              id: true,
              nome: true,
              email: true,
              pmocAtivo: true,
              equipamentos: {
                select: {
                  id: true
                }
              }
            }
          },
          evidencias: {
            select: {
              tipo: true,
              descricao: true,
              storageUrl: true,
              criadoEm: true
            }
          },
          checklist: {
            select: {
              servicoRealizado: true
            }
          },
          assinatura: {
            select: {
              id: true
            }
          },
          checklistRespostas: {
            select: {
              equipamentoId: true,
              codigo: true,
              tipo: true,
              valor: true,
              observacao: true
            }
          }
        }
      });

      if (!ordemServico) {
        throw new NotFoundException("OS não encontrada.");
      }

      this.garantirAcessoEmpresa(ordemServico.empresaId, usuario);

      if (ordemServico.status === OrdemServicoStatus.concluida) {
        throw new ConflictException("OS já está concluída.");
      }

      if (ordemServico.status !== OrdemServicoStatus.em_atendimento) {
        throw new UnprocessableEntityException("OS não está com status em_atendimento.");
      }

      if (ordemServico.equipamento && (!ordemServico.equipamento.marca || !ordemServico.equipamento.modelo)) {
        throw new UnprocessableEntityException("Identificação do equipamento ainda não registrada.");
      }

      if (ordemServico.equipamento && !ordemServico.equipamento.gasRefrigerante) {
        throw new UnprocessableEntityException("Gas refrigerante do equipamento ainda nao registrado.");
      }

      const possuiEvidenciaInicial = ordemServico.evidencias.some(
        (evidencia) => evidencia.tipo === EvidenciaTipo.antes
      );
      if (!possuiEvidenciaInicial) {
        throw new UnprocessableEntityException("Evidência inicial ainda não registrada.");
      }

      if (!ordemServico.checklist?.servicoRealizado) {
        throw new UnprocessableEntityException("Checklist ainda não registrado.");
      }

      if (!ordemServico.equipamento) {
        const equipamentos = ordemServico.cliente?.equipamentos ?? [];
        const equipamentosFeitos = new Set(
          ordemServico.checklistRespostas.map((resposta) => resposta.equipamentoId)
        );
        const pendentes = equipamentos.filter((equipamento) => !equipamentosFeitos.has(equipamento.id));

        if (pendentes.length > 0) {
          throw new UnprocessableEntityException("Finalize todos os equipamentos antes de concluir a OS.");
        }
      }

      if (ordemServico.assinatura) {
        throw new ConflictException("Assinatura já registrada para esta OS.");
      }

      assinaturaUrl = await this.salvarAssinatura(osId, assinaturaBuffer);

      await tx.ordemServicoAssinatura.create({
        data: {
          empresaId: ordemServico.empresaId,
          ordemServicoId: osId,
          nomeResponsavel: dto.nome_responsavel_assinatura,
          storageUrl: assinaturaUrl,
          latitude: new Prisma.Decimal(dto.latitude),
          longitude: new Prisma.Decimal(dto.longitude),
          assinadoEm: finalizadoEm
        }
      });

      await tx.ordemServicoEvento.create({
        data: {
          empresaId: ordemServico.empresaId,
          ordemServicoId: osId,
          usuarioId: usuario.id,
          acao: OrdemServicoEventoAcao.finalizar,
          statusAnterior: ordemServico.status,
          statusNovo: OrdemServicoStatus.concluida,
          latitude: new Prisma.Decimal(dto.latitude),
          longitude: new Prisma.Decimal(dto.longitude),
          registradoEm: finalizadoEm
        }
      });

      await tx.ordemServico.update({
        where: { id: osId },
        data: {
          status: OrdemServicoStatus.concluida,
          concluidaEm: finalizadoEm
        }
      });

      automacoesFinalizacao = this.montarAutomacoesFinalizacao(
        ordemServico,
        osId,
        finalizadoEm,
        assinaturaUrl,
        dto.nome_responsavel_assinatura
      );

      await tx.automacaoAgendada.createMany({
        data: automacoesFinalizacao
      });
    });

    return {
      os_id: osId,
      status: OrdemServicoStatus.concluida,
      finalizado_em: finalizadoEm.toISOString(),
      assinatura_url: assinaturaUrl,
      automacoes_agendadas: automacoesFinalizacao.map((automacao) => automacao.tipo)
    };
  }

  private montarAutomacoesFinalizacao(
    ordemServico: {
      empresaId: string;
      titulo?: string;
      tipoServico?: OrdemServicoTipoServico;
      agendadaPara?: Date | null;
      cliente?: {
        id: string;
        nome: string;
        email: string | null;
        pmocAtivo: boolean;
        equipamentos?: Array<{ id: string }>;
      } | null;
      equipamento?: { id?: string | null; marca?: string | null; modelo?: string | null; gasRefrigerante?: string | null } | null;
      evidencias?: Array<{ tipo: EvidenciaTipo; descricao: string | null; storageUrl: string; criadoEm: Date }>;
      checklistRespostas?: Array<{
        codigo: string;
        tipo: string;
        valor: string;
        observacao: string | null;
      }>;
    },
    osId: string,
    finalizadoEm: Date,
    assinaturaUrl: string,
    nomeResponsavelAssinatura: string
  ): Prisma.AutomacaoAgendadaCreateManyInput[] {
    const base = AUTOMACOES_FINALIZACAO.map((tipo) => ({
      empresaId: ordemServico.empresaId,
      ordemServicoId: osId,
      tipo,
      executarEm:
        tipo === AutomacaoTipo.recorrencia_180_dias
          ? this.somarDias(finalizadoEm, 180)
          : finalizadoEm
    }));

    const cliente = ordemServico.cliente;
    const deveEnviarRelatorioAvulso = cliente?.email && !cliente.pmocAtivo;

    if (!deveEnviarRelatorioAvulso) {
      return base;
    }

    const totalMaquinas = ordemServico.equipamento?.id ? 1 : cliente.equipamentos?.length || 1;
    const pdf = this.gerarPdfRelatorioAtendimento({
      osId,
      clienteNome: cliente.nome,
      titulo: ordemServico.titulo || "Atendimento tecnico",
      tipoServico: ordemServico.tipoServico || OrdemServicoTipoServico.preventiva,
      agendadaPara: ordemServico.agendadaPara ?? null,
      finalizadoEm,
      assinaturaUrl,
      nomeResponsavelAssinatura,
      equipamento: ordemServico.equipamento ?? null,
      evidencias: ordemServico.evidencias ?? [],
      checklistRespostas: ordemServico.checklistRespostas ?? []
    });

    return [
      ...base,
      {
        empresaId: ordemServico.empresaId,
        ordemServicoId: osId,
        tipo: AutomacaoTipo.enviar_email,
        executarEm: finalizadoEm,
        payload: {
          tipo: "relatorio_tecnico_avulso",
          cliente_id: cliente.id,
          cliente_nome: cliente.nome,
          cliente_email: cliente.email,
          data_envio: finalizadoEm.toISOString(),
          periodo_inicio: ordemServico.agendadaPara?.toISOString() ?? finalizadoEm.toISOString(),
          periodo_fim: finalizadoEm.toISOString(),
          total_maquinas: totalMaquinas,
          total_os_concluidas: 1,
          os_ids: [osId],
          pdf_filename: `${this.slugArquivo(`relatorio-tecnico-${cliente.nome}-${osId}`)}.pdf`,
          pdf_base64: pdf.toString("base64")
        } satisfies Prisma.JsonObject
      }
    ];
  }

  private gerarPdfRelatorioAtendimento(input: {
    osId: string;
    clienteNome: string;
    titulo: string;
    tipoServico: OrdemServicoTipoServico;
    agendadaPara: Date | null;
    finalizadoEm: Date;
    assinaturaUrl: string;
    nomeResponsavelAssinatura: string;
    equipamento: { marca?: string | null; modelo?: string | null; gasRefrigerante?: string | null } | null;
    evidencias: Array<{ tipo: EvidenciaTipo; descricao: string | null; storageUrl: string; criadoEm: Date }>;
    checklistRespostas: Array<{ codigo: string; tipo: string; valor: string; observacao: string | null }>;
  }) {
    const checklistLinhas = this.formatarChecklistRelatorioAtendimento(input.checklistRespostas);
    const evidenciaLinhas = this.formatarEvidenciasRelatorioAtendimento(input.evidencias);

    return this.criarPdfTexto([
      [
        "AIRMOVEBR - RELATORIO TECNICO DE ATENDIMENTO",
        "Relatorio de atendimento sem PMOC",
        "",
        `Cliente: ${input.clienteNome}`,
        `OS: ${input.osId}`,
        `Servico: ${input.titulo}`,
        `Tipo de servico: ${this.formatarTipoServicoRelatorio(input.tipoServico)}`,
        `Agendado para: ${this.formatarDataHoraRelatorio(input.agendadaPara)}`,
        `Finalizado em: ${this.formatarDataHoraRelatorio(input.finalizadoEm)}`,
        `Equipamento: ${[input.equipamento?.marca, input.equipamento?.modelo].filter(Boolean).join(" ") || "todos do cliente"}`,
        `Gas refrigerante: ${input.equipamento?.gasRefrigerante || "nao informado"}`,
        "",
        "SERVICO REALIZADO",
        ...checklistLinhas,
        "",
        "FOTOS E EVIDENCIAS",
        ...evidenciaLinhas,
        "",
        "ASSINATURA",
        `Assinado por: ${input.nomeResponsavelAssinatura}`,
        `Assinatura registrada: ${input.assinaturaUrl}`,
        "",
        "Obrigado por escolher a AIRMOVEBR."
      ]
    ]);
  }

  private formatarChecklistRelatorioAtendimento(
    respostas: Array<{ codigo: string; valor: string; observacao: string | null }>
  ) {
    if (!respostas.length) {
      return ["Sem respostas de checklist registradas."];
    }

    return respostas.map((resposta) => {
      const label = this.obterLabelChecklistRelatorio(resposta.codigo);
      const observacao = resposta.observacao?.trim() ? ` (${resposta.observacao.trim()})` : "";
      return `${label}: ${resposta.valor || "nao informado"}${observacao}`;
    });
  }

  private obterLabelChecklistRelatorio(codigo: string) {
    return {
      C1: "Problema encontrado",
      C2: "Acao realizada",
      C3: "Foto do atendimento",
      C4: "Pecas utilizadas",
      C5: "Observacao final",
      M4: "Foto inicial"
    }[codigo] || codigo;
  }

  private formatarEvidenciasRelatorioAtendimento(
    evidencias: Array<{ tipo: EvidenciaTipo; descricao: string | null; storageUrl: string; criadoEm: Date }>
  ) {
    if (!evidencias.length) {
      return ["Sem fotos registradas."];
    }

    return evidencias.map((evidencia) => {
      const tipo = evidencia.tipo === EvidenciaTipo.antes ? "Foto inicial" : "Foto final";
      return `${tipo}: ${evidencia.descricao || "sem descricao"} - arquivo: ${evidencia.storageUrl} - ${this.formatarDataHoraRelatorio(evidencia.criadoEm)}`;
    });
  }

  private formatarTipoServicoRelatorio(tipo: OrdemServicoTipoServico) {
    return tipo === OrdemServicoTipoServico.corretiva ? "Corretiva" : "Preventiva";
  }

  private formatarDataHoraRelatorio(data: Date | null) {
    if (!data) {
      return "nao informado";
    }

    const dia = String(data.getUTCDate()).padStart(2, "0");
    const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
    const ano = data.getUTCFullYear();
    const hora = String(data.getUTCHours()).padStart(2, "0");
    const minuto = String(data.getUTCMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  }

  private criarPdfTexto(paginas: string[][]) {
    const objetos = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
    const pageObjectIds: number[] = [];

    for (const linhas of paginas) {
      const texto = linhas
        .flatMap((linha) => this.quebrarLinhaPdf(linha, 96))
        .slice(0, 46)
        .map((linha) => `(${this.escaparTextoPdf(linha)}) Tj T*`)
        .join("\n");
      const conteudo = `BT\n/F1 10 Tf\n42 790 Td\n13 TL\n${texto}\nET`;
      const pageObjectId = objetos.length + 1;
      const contentObjectId = objetos.length + 2;
      pageObjectIds.push(pageObjectId);
      objetos.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
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

  private quebrarLinhaPdf(texto: string, limite: number) {
    const linhas: string[] = [];
    let restante = texto;

    while (restante.length > limite) {
      linhas.push(restante.slice(0, limite));
      restante = restante.slice(limite);
    }

    linhas.push(restante);
    return linhas;
  }

  private escaparTextoPdf(texto: string) {
    return texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  private slugArquivo(valor: string) {
    const slug = valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || "relatorio-tecnico";
  }

  private criarBufferAssinatura(assinaturaBase64: string) {
    const match = assinaturaBase64.match(/^data:image\/png;base64,(?<base64>.+)$/);
    const base64 = match?.groups?.base64 ?? assinaturaBase64;

    try {
      return Buffer.from(base64, "base64");
    } catch {
      throw new BadRequestException("assinatura_cliente_base64 inválida.");
    }
  }

  private async salvarAssinatura(osId: string, assinatura: Buffer) {
    const storageRoot = this.resolveStorageRoot();
    const relativePath = join("os", osId, "assinatura.png");
    const absolutePath = join(storageRoot, relativePath);

    await mkdir(join(storageRoot, "os", osId), { recursive: true });
    await writeFile(absolutePath, assinatura);

    return `/storage/${relativePath.replace(/\\/g, "/")}`;
  }

  private somarDias(data: Date, dias: number) {
    return new Date(data.getTime() + dias * 24 * 60 * 60 * 1000);
  }

  private garantirAcessoEmpresa(empresaId: string, usuario: AuthenticatedUser) {
    if (empresaId !== usuario.empresa_id) {
      throw new NotFoundException("OS não encontrada.");
    }
  }
}
