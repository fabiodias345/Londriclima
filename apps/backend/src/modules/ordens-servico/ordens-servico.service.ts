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

const EXTENSAO_POR_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/webp": "webp"
};

const AUTOMACOES_FINALIZACAO = [
  AutomacaoTipo.gerar_pdf,
  AutomacaoTipo.enviar_email,
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

        if (!ordemServico.equipamentoId) {
          await tx.ordemServico.update({
            where: { id: osId },
            data: { equipamentoId: equipamentoAtualizado.id }
          });
        }

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

      await tx.ordemServico.update({
        where: { id: osId },
        data: {
          equipamentoId: novoEquipamento.id
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

    if (input.foto.size > 800 * 1024) {
      throw new BadRequestException("Arquivo excede o limite de 800 KB.");
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

    if (input.foto.size > 800 * 1024) {
      throw new BadRequestException("Foto excede o limite de 800 KB.");
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

    await this.prisma.$transaction(async (tx) => {
      const ordemServico = await tx.ordemServico.findUnique({
        where: { id: osId },
        select: {
          id: true,
          empresaId: true,
          status: true,
          equipamento: {
            select: {
              marca: true,
              modelo: true,
              gasRefrigerante: true
            }
          },
          evidencias: {
            select: {
              tipo: true
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

      if (!ordemServico.equipamento?.marca || !ordemServico.equipamento.modelo) {
        throw new UnprocessableEntityException("Identificação do equipamento ainda não registrada.");
      }

      if (ordemServico.equipamento && !ordemServico.equipamento.gasRefrigerante) {
        throw new UnprocessableEntityException("Gas refrigerante do equipamento ainda nao registrado.");
      }

      const possuiEvidenciaInicial = ordemServico.evidencias.some(
        (evidencia) => evidencia.tipo === EvidenciaTipo.antes
      );
      const possuiEvidenciaFinal = ordemServico.evidencias.some(
        (evidencia) => evidencia.tipo === EvidenciaTipo.depois
      );

      if (!possuiEvidenciaInicial) {
        throw new UnprocessableEntityException("Evidência inicial ainda não registrada.");
      }

      if (!ordemServico.checklist?.servicoRealizado) {
        throw new UnprocessableEntityException("Checklist ainda não registrado.");
      }

      if (!possuiEvidenciaFinal) {
        throw new UnprocessableEntityException("Evidência final ainda não registrada.");
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

      await tx.automacaoAgendada.createMany({
        data: AUTOMACOES_FINALIZACAO.map((tipo) => ({
          empresaId: ordemServico.empresaId,
          ordemServicoId: osId,
          tipo,
          executarEm:
            tipo === AutomacaoTipo.recorrencia_180_dias
              ? this.somarDias(finalizadoEm, 180)
              : finalizadoEm
        }))
      });
    });

    return {
      os_id: osId,
      status: OrdemServicoStatus.concluida,
      finalizado_em: finalizadoEm.toISOString(),
      assinatura_url: assinaturaUrl,
      automacoes_agendadas: AUTOMACOES_FINALIZACAO
    };
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
