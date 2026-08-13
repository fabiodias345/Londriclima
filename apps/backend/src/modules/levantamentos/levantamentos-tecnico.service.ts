import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { LevantamentoDecisao, LevantamentoStatus, LimpezaRecomendada } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import type { AuthenticatedUser } from "../auth/auth-user";
import type { FinalizarLaudoLevantamentoDto, SalvarLaudoLevantamentoDto } from "./dto/laudo-levantamento.dto";

export type LaudoFotoUpload = { originalname: string; mimetype: string; size: number; buffer: Buffer };
const EXTENSOES_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

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
    const atualizado = await this.prisma.$transaction(async (tx) => {
      await tx.levantamentoTecnico.update({
        where: { id },
        data: { ...this.dados(dto), decisao: dto.decisao, status, laudoFinalizadoEm: new Date(), laudoFinalizadoPorId: usuario.id }
      });
      if (item.ordemServico && status === LevantamentoStatus.diagnostico_concluido) {
        await tx.ordemServico.update({ where: { id: item.ordemServico.id }, data: { status: "concluida", concluidaEm: new Date() } });
      }
      return tx.levantamentoTecnico.findUniqueOrThrow({ where: { id }, include: this.include() });
    });
    if (item.conversaId) await this.prisma.whatsAppConversa.update({ where: { id: item.conversaId }, data: { status: "humano", atribuidoUsuarioId: null, ultimaLeituraEm: new Date() } });
    return this.mapear(atualizado);
  }

  async adicionarFoto(id: string, foto: LaudoFotoUpload | undefined, usuario: AuthenticatedUser, limpeza = false, legenda?: string) {
    await this.buscar(id, usuario);
    if (!foto) throw new BadRequestException("Foto obrigatoria.");
    const extensao = EXTENSOES_FOTO[foto.mimetype];
    if (!extensao) throw new BadRequestException("Formato de arquivo nao suportado. Use PNG, WebP ou JPEG.");
    if (foto.size > 8 * 1024 * 1024) throw new BadRequestException("Arquivo excede o limite de 8 MB.");
    const storageRoot = this.resolveStorageRoot();
    const relativeDir = join("levantamentos", id, "fotos");
    const relativePath = join(relativeDir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`);
    await mkdir(join(storageRoot, relativeDir), { recursive: true });
    await writeFile(join(storageRoot, relativePath), foto.buffer);
    const criado = await this.prisma.levantamentoFoto.create({ data: { levantamentoId: id, criadoPorId: usuario.id, url: `/storage/${relativePath.replace(/\\/g, "/")}`, legenda: legenda?.trim() || undefined, mimeType: foto.mimetype, tamanhoBytes: foto.size, limpeza } });
    return this.mapearFoto(criado);
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

  private resolveStorageRoot() {
    const cwd = process.cwd();
    return basename(cwd) === "backend" ? resolve(cwd, "..", "..", "storage") : resolve(cwd, "storage");
  }

  private include() {
    return { cliente: { select: { id: true, nome: true } }, equipe: { select: { id: true, nome: true } }, tecnico: { select: { id: true, nome: true } }, itensTecnicos: true, fotos: true, autorizacao: true, ordemServico: { select: { id: true, status: true } } };
  }

  private mapear(item: any) {
    return { id: item.id, empresa_id: item.empresaId, cliente_id: item.clienteId, problema: item.problema, status: item.status, diagnostico: item.diagnostico ?? null, causa_provavel: item.causaProvavel ?? null, servicos_recomendados: item.servicosRecomendados ?? null, limpeza_recomendada: item.limpezaRecomendada, decisao: item.decisao ?? null, laudo_rascunho_em: item.laudoRascunhoEm?.toISOString() ?? null, laudo_finalizado_em: item.laudoFinalizadoEm?.toISOString() ?? null, itens: (item.itensTecnicos ?? []).map((i: any) => ({ id: i.id, descricao: i.descricao, quantidade: i.quantidade?.toString?.() ?? i.quantidade, observacoes: i.observacoes ?? null })), fotos: (item.fotos ?? []).map((foto: any) => this.mapearFoto(foto)), autorizacao: item.autorizacao ? { id: item.autorizacao.id, status: item.autorizacao.status, valor: item.autorizacao.valor?.toString?.() ?? item.autorizacao.valor, expira_em: item.autorizacao.expiraEm?.toISOString?.() ?? item.autorizacao.expiraEm, autorizada_em: item.autorizacao.autorizadaEm?.toISOString?.() ?? item.autorizacao.autorizadaEm } : null };
  }

  private mapearFoto(foto: any) {
    return { id: foto.id, url: foto.url, legenda: foto.legenda ?? null, mime_type: foto.mimeType, tamanho_bytes: foto.tamanhoBytes, limpeza: foto.limpeza, criado_em: foto.criadoEm?.toISOString?.() ?? foto.criadoEm };
  }
}
