import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrcamentoStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUser } from "../auth/auth-user";
import { WhatsAppCloudService } from "../automacoes/whatsapp-cloud.service";
import { CriarOrcamentoDto, SalvarItemCatalogoDto } from "./dto/comercial.dto";
import { ComercialOrcamentoPdfRenderer } from "./comercial-orcamento-pdf-renderer";

const itemSelect = { id: true, tipo: true, grupo: true, subgrupo: true, codigo: true, nome: true, descricao: true, unidade: true, custo: true, valor: true, ativo: true } as const;

@Injectable()
export class ComercialService {
  constructor(private readonly prisma: PrismaService, private readonly sender: WhatsAppCloudService, private readonly pdf: ComercialOrcamentoPdfRenderer) {}

  async listarCatalogo(empresaId: string) {
    const items = await this.prisma.catalogoItem.findMany({ where: { empresaId, ativo: true }, select: itemSelect, orderBy: [{ tipo: "asc" }, { grupo: "asc" }, { nome: "asc" }] });
    return { items };
  }

  async salvarItemCatalogo(dto: SalvarItemCatalogoDto, empresaId: string, id?: string) {
    const data = { tipo: dto.tipo, grupo: this.texto(dto.grupo), subgrupo: this.textoOpcional(dto.subgrupo), codigo: this.textoOpcional(dto.codigo), nome: this.texto(dto.nome), descricao: this.textoOpcional(dto.descricao), unidade: this.texto(dto.unidade), custo: new Prisma.Decimal(dto.custo), valor: new Prisma.Decimal(dto.valor) };
    if (id) {
      const result = await this.prisma.catalogoItem.updateMany({ where: { id, empresaId }, data });
      if (!result.count) throw new NotFoundException("Item de catálogo não encontrado.");
      return this.prisma.catalogoItem.findUniqueOrThrow({ where: { id }, select: itemSelect });
    }
    return this.prisma.catalogoItem.create({ data: { empresaId, ...data }, select: itemSelect });
  }

  async listarOrcamentos(empresaId: string) {
    const items = await this.prisma.orcamento.findMany({ where: { empresaId }, include: { cliente: { select: { nome: true } }, conversa: { select: { telefone: true, nomeContato: true } }, _count: { select: { itens: true } } }, orderBy: { criadoEm: "desc" }, take: 100 });
    return { items };
  }

  async criarOrcamento(dto: CriarOrcamentoDto, usuario: AuthenticatedUser) {
    if (!dto.itens.length) throw new BadRequestException("Inclua ao menos um item no orçamento.");
    const cliente = await this.prisma.cliente.findFirst({ where: { id: dto.cliente_id, empresaId: usuario.empresa_id }, select: { id: true } });
    if (!cliente) throw new NotFoundException("Cliente não encontrado.");
    if (dto.conversa_id) {
      const conversa = await this.prisma.whatsAppConversa.findFirst({ where: { id: dto.conversa_id, empresaId: usuario.empresa_id, clienteId: cliente.id }, select: { id: true } });
      if (!conversa) throw new BadRequestException("A conversa não pertence a este cliente.");
    }
    const itens = dto.itens.map((item) => {
      const quantidade = new Prisma.Decimal(item.quantidade);
      const valorUnitario = new Prisma.Decimal(item.valor_unitario);
      return { itemCatalogoId: item.item_catalogo_id || null, tipo: item.tipo, descricao: this.texto(item.descricao), unidade: this.texto(item.unidade), quantidade, valorUnitario, valorTotal: quantidade.mul(valorUnitario) };
    });
    const subtotal = itens.reduce((total, item) => total.plus(item.valorTotal), new Prisma.Decimal(0));
    const desconto = new Prisma.Decimal(dto.desconto || 0);
    if (desconto.greaterThan(subtotal)) throw new BadRequestException("O desconto não pode ser maior que o subtotal.");
    const orcamento = await this.prisma.orcamento.create({ data: { empresaId: usuario.empresa_id, clienteId: cliente.id, conversaId: dto.conversa_id || null, criadoPorUsuarioId: usuario.id, titulo: this.texto(dto.titulo), detalhes: this.textoOpcional(dto.detalhes), validoAte: dto.valido_ate ? this.data(dto.valido_ate) : null, subtotal, desconto, total: subtotal.minus(desconto), itens: { create: itens } }, include: { itens: true, cliente: { select: { nome: true, telefone: true } } } });
    return orcamento;
  }

  async enviarOrcamento(id: string, empresaId: string) {
    const orcamento = await this.prisma.orcamento.findFirst({
      where: { id, empresaId },
      include: {
        empresa: { select: { nome: true, razaoSocial: true, cnpj: true, telefone: true, email: true, logradouro: true, numero: true, bairro: true, cidade: true, uf: true, cep: true } },
        cliente: { select: { nome: true, telefone: true, enderecos: { where: { principal: true }, take: 1, select: { logradouro: true, numero: true, bairro: true, cidade: true, uf: true, cep: true } } } },
        conversa: { select: { telefone: true } },
        itens: true
      }
    });
    if (!orcamento) throw new NotFoundException("Orçamento não encontrado.");
    const telefone = orcamento.conversa?.telefone || orcamento.cliente.telefone;
    if (!telefone) throw new BadRequestException("Cliente sem telefone para enviar o orçamento.");
    const { enderecos, ...cliente } = orcamento.cliente;
    const pdf = this.pdf.gerar({ ...orcamento, cliente: { ...cliente, ...enderecos[0] }, numero: `ORC-${orcamento.id.slice(0, 8).toUpperCase()}` });
    const documento = await this.sender.enviarDocumento(telefone, { filename: `orcamento-${orcamento.id.slice(0, 8)}.pdf`, content: pdf, caption: `Orçamento ${orcamento.titulo}` });
    const texto = `Olá, ${orcamento.cliente.nome}.\n\nEnviamos seu orçamento em PDF. Agradecemos por escolher a AIRMOVEBR.\n\nDeseja autorizar o serviço?`;
    const confirmacao = await this.sender.enviar({ to: telefone, text: texto, options: [{ id: `orcamento_aprovar:${orcamento.id}`, title: "🟢 Autorizar" }, { id: `orcamento_negociar:${orcamento.id}`, title: "🟠 Negociar" }] });
    await this.prisma.orcamento.update({ where: { id }, data: { status: OrcamentoStatus.enviado, enviadoEm: new Date() } });
    if (orcamento.conversaId) {
      await this.prisma.$transaction([
        this.prisma.whatsAppMensagem.create({ data: { conversaId: orcamento.conversaId, direcao: "saida", texto: `PDF enviado: Orçamento ${orcamento.titulo}`, mensagemId: documento.messageId, tipo: "document" } }),
        this.prisma.whatsAppMensagem.create({ data: { conversaId: orcamento.conversaId, direcao: "saida", texto, mensagemId: confirmacao.messageId, tipo: "interactive" } })
      ]);
    }
    return { enviado: true };
  }
  async registrarAceiteWhatsApp(id: string, empresaId: string) {
    const atualizado = await this.prisma.orcamento.updateMany({
      where: { id, empresaId, status: OrcamentoStatus.enviado },
      data: { status: OrcamentoStatus.aprovado }
    });
    if (!atualizado.count) {
      const orcamento = await this.prisma.orcamento.findFirst({ where: { id, empresaId }, select: { status: true } });
      if (!orcamento) throw new NotFoundException("Orçamento não encontrado.");
      throw new BadRequestException("O orçamento precisa estar enviado e aguardando aceite.");
    }
    return { aprovado: true };
  }
  private texto(valor: string) { const resultado = String(valor || "").trim(); if (!resultado) throw new BadRequestException("Preencha os campos obrigatórios."); return resultado; }
  private textoOpcional(valor?: string) { const resultado = String(valor || "").trim(); return resultado || null; }
  private data(valor: string) { const data = new Date(`${valor}T23:59:59`); if (Number.isNaN(data.getTime())) throw new BadRequestException("Data de validade inválida."); return data; }
  private moeda(valor: Prisma.Decimal) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor)); }
}
