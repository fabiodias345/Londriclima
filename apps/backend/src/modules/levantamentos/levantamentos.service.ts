import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { LevantamentoStatus, OrdemServicoStatus, UsuarioRole } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AgendarLevantamentoDto, CriarLevantamentoDto } from "./dto/levantamentos.dto";

const STATUS_OS_OCUPADA = [OrdemServicoStatus.aberta, OrdemServicoStatus.em_deslocamento, OrdemServicoStatus.em_atendimento];

@Injectable()
export class LevantamentosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(empresaId: string, clienteId: string, conversaId: string | undefined, dto: CriarLevantamentoDto) {
    const problema = dto.problema.trim();
    if (!problema) throw new BadRequestException("Descreva o problema informado pelo cliente.");
    const cliente = await this.prisma.cliente.findFirst({ where: { id: clienteId, empresaId }, select: { id: true } });
    if (!cliente) throw new NotFoundException("Cliente nao encontrado.");
    if (conversaId) {
      const existente = await this.prisma.levantamentoTecnico.findFirst({ where: { empresaId, conversaId } });
      if (existente && existente.status !== LevantamentoStatus.cancelado) return this.mapear(existente);
      if (existente) {
        const reaberto = await this.prisma.levantamentoTecnico.update({
          where: { id: existente.id },
          data: { clienteId, problema, agendadaPara: null, equipeId: null, tecnicoId: null, status: LevantamentoStatus.pendente_agendamento, tecnicoAvisadoEm: null, lembreteTecnicoEm: null, notificacaoErro: null }
        });
        return this.mapear(reaberto);
      }
    }
    const levantamento = await this.prisma.levantamentoTecnico.create({ data: { empresaId, clienteId, conversaId, problema } });
    return this.mapear(levantamento);
  }

  async listar(empresaId: string) {
    const items = await this.prisma.levantamentoTecnico.findMany({
      where: { empresaId }, orderBy: [{ agendadaPara: "asc" }, { criadoEm: "desc" }], include: this.detalheInclude()
    });
    return { total: items.length, items: items.map((item) => this.mapear(item)) };
  }

  async obter(id: string, empresaId: string) {
    const levantamento = await this.prisma.levantamentoTecnico.findFirst({ where: { id, empresaId }, include: this.detalheInclude() });
    if (!levantamento) throw new NotFoundException("Levantamento nao encontrado.");
    return this.mapear(levantamento);
  }

  async agendar(id: string, empresaId: string, dto: AgendarLevantamentoDto) {
    if (!dto.equipe_id && !dto.tecnico_id) throw new BadRequestException("Selecione uma equipe ou um tecnico antes de agendar.");
    const horario = new Date(dto.agendada_para);
    if (Number.isNaN(horario.getTime())) throw new BadRequestException("Horario de agendamento invalido.");
    const levantamento = await this.prisma.levantamentoTecnico.findFirst({ where: { id, empresaId } });
    if (!levantamento) throw new NotFoundException("Levantamento nao encontrado.");
    await this.validarDestino(empresaId, dto);
    await this.validarHorarioDisponivel(id, empresaId, horario, dto);
    const atualizado = await this.prisma.levantamentoTecnico.update({
      where: { id },
      data: { equipeId: dto.equipe_id || null, tecnicoId: dto.tecnico_id || null, agendadaPara: horario, status: LevantamentoStatus.agendado, notificacaoErro: null, lembreteTecnicoEm: null },
      include: this.detalheInclude()
    });
    return this.mapear(atualizado);
  }

  async cancelar(id: string, empresaId: string) {
    const levantamento = await this.prisma.levantamentoTecnico.findFirst({ where: { id, empresaId } });
    if (!levantamento) throw new NotFoundException("Levantamento nao encontrado.");
    return this.mapear(await this.prisma.levantamentoTecnico.update({ where: { id }, data: { status: LevantamentoStatus.cancelado }, include: this.detalheInclude() }));
  }

  private async validarDestino(empresaId: string, dto: AgendarLevantamentoDto) {
    const [equipe, tecnico] = await Promise.all([
      dto.equipe_id ? this.prisma.equipe.findFirst({ where: { id: dto.equipe_id, empresaId, ativa: true }, select: { id: true } }) : Promise.resolve(undefined),
      dto.tecnico_id ? this.prisma.usuario.findFirst({ where: { id: dto.tecnico_id, empresaId, ativo: true, role: { in: [UsuarioRole.tecnico, UsuarioRole.auxiliar] } }, select: { id: true } }) : Promise.resolve(undefined)
    ]);
    if (dto.equipe_id && !equipe) throw new NotFoundException("Equipe nao encontrada.");
    if (dto.tecnico_id && !tecnico) throw new NotFoundException("Tecnico nao encontrado.");
  }

  private async validarHorarioDisponivel(id: string, empresaId: string, horario: Date, dto: AgendarLevantamentoDto) {
    const destino = { OR: [...(dto.equipe_id ? [{ equipeId: dto.equipe_id }] : []), ...(dto.tecnico_id ? [{ tecnicoId: dto.tecnico_id }] : [])] };
    const [ordem, levantamento] = await Promise.all([
      this.prisma.ordemServico.findFirst({ where: { empresaId, status: { in: STATUS_OS_OCUPADA }, agendadaPara: horario, ...destino }, select: { id: true } }),
      this.prisma.levantamentoTecnico.findFirst({ where: { empresaId, id: { not: id }, status: { in: [LevantamentoStatus.agendado, LevantamentoStatus.em_levantamento] }, agendadaPara: horario, ...destino }, select: { id: true } })
    ]);
    if (ordem || levantamento) throw new ConflictException("Este horario ja esta ocupado para a equipe ou tecnico selecionado.");
  }

  private detalheInclude() {
    return {
      cliente: { select: { id: true, nome: true, telefone: true, email: true, enderecos: { orderBy: { principal: "desc" as const }, take: 1, select: { logradouro: true, numero: true, bairro: true, cidade: true, uf: true, cep: true } } } },
      equipe: { select: { id: true, nome: true } },
      tecnico: { select: { id: true, nome: true, telefone: true } }
    };
  }

  private mapear(item: any) {
    return {
      id: item.id, empresa_id: item.empresaId, cliente_id: item.clienteId, conversa_id: item.conversaId, problema: item.problema, status: item.status,
      equipe_id: item.equipeId, tecnico_id: item.tecnicoId, agendada_para: item.agendadaPara?.toISOString() ?? null,
      tecnico_avisado_em: item.tecnicoAvisadoEm?.toISOString() ?? null, lembrete_tecnico_em: item.lembreteTecnicoEm?.toISOString() ?? null, notificacao_erro: item.notificacaoErro ?? null,
      criado_em: item.criadoEm.toISOString(), atualizado_em: item.atualizadoEm.toISOString(), cliente: item.cliente, equipe: item.equipe, tecnico: item.tecnico
    };
  }
}
