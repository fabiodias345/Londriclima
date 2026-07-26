import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { LevantamentoDecisao, LevantamentoStatus, LimpezaRecomendada } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import type { AuthenticatedUser } from "../auth/auth-user";
import type { FinalizarLaudoLevantamentoDto, SalvarLaudoLevantamentoDto } from "./dto/laudo-levantamento.dto";

@Injectable()
export class LevantamentosTecnicoService {
  constructor(private readonly prisma: PrismaService) {}

  async listarMeus(usuario: AuthenticatedUser) {
    this.garantirPapelTecnico(usuario);
    const items = await this.prisma.levantamentoTecnico.findMany({
      where: this.acesso(usuario),
      orderBy: [{ agendadaPara: "asc" }, { criadoEm: "desc" }],
      include: this.include()
    });
    return { total: items.length, items: items.map((item) => this.mapear(item)) };
  }

  async obterMeu(id: string, usuario: AuthenticatedUser) {
    this.garantirPapelTecnico(usuario);
    const item = await this.prisma.levantamentoTecnico.findFirst({ where: { id, ...this.acesso(usuario) }, include: this.include() });
    if (!item) throw new NotFoundException("Levantamento nao encontrado.");
    return this.mapear(item);
  }

  async iniciar(id: string, usuario: AuthenticatedUser) {
    const item = await this.buscar(id, usuario);
    if (item.status !== LevantamentoStatus.agendado) throw new ConflictException("Somente levantamento agendado pode ser iniciado.");
    return this.mapear(await this.prisma.levantamentoTecnico.update({ where: { id }, data: { status: LevantamentoStatus.em_levantamento }, include: this.include() }));
  }

  async salvarRascunho(id: string, dto: SalvarLaudoLevantamentoDto, usuario: AuthenticatedUser) {
    await this.buscar(id, usuario);
    const data = this.dados(dto);
    const atualizado = await this.prisma.levantamentoTecnico.update({
      where: { id },
      data: { ...data, laudoRascunhoEm: new Date(), itensTecnicos: dto.itens ? { deleteMany: {}, create: dto.itens.map((item) => ({ descricao: item.descricao.trim(), quantidade: item.quantidade ?? 1, observacoes: item.observacoes })) } : undefined },
      include: this.include()
    });
    return this.mapear(atualizado);
  }

  async finalizar(id: string, dto: FinalizarLaudoLevantamentoDto, usuario: AuthenticatedUser) {
    const item = await this.buscar(id, usuario);
    if (!dto.diagnostico?.trim()) throw new ConflictException("Diagnostico obrigatorio para finalizar o laudo.");
    if (item.laudoFinalizadoEm) throw new ConflictException("Laudo finalizado e imutavel.");
    if (dto.limpeza_recomendada && dto.limpeza_recomendada !== LimpezaRecomendada.nao_recomendada) {
      const foto = await this.prisma.levantamentoFoto.findFirst({ where: { levantamentoId: id, limpeza: true }, select: { id: true } });
      if (!foto) throw new ConflictException("Foto obrigatoria para limpeza recomendada.");
    }
    const status = dto.decisao === LevantamentoDecisao.precisa_orcamento ? LevantamentoStatus.diagnostico_concluido : LevantamentoStatus.em_levantamento;
    const atualizado = await this.prisma.levantamentoTecnico.update({
      where: { id },
      data: { ...this.dados(dto), decisao: dto.decisao, status, laudoFinalizadoEm: new Date(), laudoFinalizadoPorId: usuario.id },
      include: this.include()
    });
    return this.mapear(atualizado);
  }

  private async buscar(id: string, usuario: AuthenticatedUser) {
    this.garantirPapelTecnico(usuario);
    const item = await this.prisma.levantamentoTecnico.findFirst({ where: { id, ...this.acesso(usuario) }, include: { ...this.include(), fotos: true } });
    if (!item) throw new NotFoundException("Levantamento nao encontrado.");
    if (item.laudoFinalizadoEm) throw new ConflictException("Laudo finalizado e imutavel.");
    return item;
  }

  private garantirPapelTecnico(usuario: AuthenticatedUser) {
    if (!["tecnico", "auxiliar"].includes(usuario.role)) throw new ForbiddenException("Acesso restrito ao laudo tecnico.");
  }

  private acesso(usuario: AuthenticatedUser) {
    return { empresaId: usuario.empresa_id, OR: [{ tecnicoId: usuario.id }, { equipe: { membros: { some: { usuarioId: usuario.id, ativo: true } } } }] };
  }

  private dados(dto: SalvarLaudoLevantamentoDto) {
    return { diagnostico: dto.diagnostico?.trim(), causaProvavel: dto.causa_provavel?.trim(), servicosRecomendados: dto.servicos_recomendados?.trim(), limpezaRecomendada: dto.limpeza_recomendada, observacoes: dto.observacoes?.trim() };
  }

  private include() {
    return { cliente: { select: { id: true, nome: true } }, equipe: { select: { id: true, nome: true } }, tecnico: { select: { id: true, nome: true } }, itensTecnicos: true, fotos: true, autorizacao: true };
  }

  private mapear(item: any) {
    return { id: item.id, empresa_id: item.empresaId, cliente_id: item.clienteId, problema: item.problema, status: item.status, diagnostico: item.diagnostico ?? null, causa_provavel: item.causaProvavel ?? null, servicos_recomendados: item.servicosRecomendados ?? null, limpeza_recomendada: item.limpezaRecomendada, decisao: item.decisao ?? null, laudo_rascunho_em: item.laudoRascunhoEm?.toISOString() ?? null, laudo_finalizado_em: item.laudoFinalizadoEm?.toISOString() ?? null, itens: item.itensTecnicos ?? [], fotos: item.fotos ?? [], autorizacao: item.autorizacao ?? null };
  }
}
