import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrcamentoStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUser } from "../auth/auth-user";
import { SmtpEmailService } from "../automacoes/smtp-email.service";
import { WhatsAppCloudService } from "../automacoes/whatsapp-cloud.service";
import { ComercialAssinafyService } from "./comercial-assinafy.service";
import { ComercialOrcamentoPdfRenderer } from "./comercial-orcamento-pdf-renderer";
import { AtualizarStatusOrcamentoDto, CriarOrcamentoDto, EnviarOrcamentoEmailDto, SalvarItemCatalogoDto } from "./dto/comercial.dto";

const itemSelect = { id: true, tipo: true, grupo: true, subgrupo: true, codigo: true, nome: true, descricao: true, unidade: true, custo: true, valor: true, ativo: true } as const;

@Injectable()
export class ComercialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: WhatsAppCloudService,
    private readonly email: SmtpEmailService,
    private readonly pdf: ComercialOrcamentoPdfRenderer,
    private readonly assinafy: ComercialAssinafyService
  ) {}

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
    return this.prisma.orcamento.create({ data: { empresaId: usuario.empresa_id, clienteId: cliente.id, conversaId: dto.conversa_id || null, criadoPorUsuarioId: usuario.id, titulo: this.texto(dto.titulo), detalhes: this.textoOpcional(dto.detalhes), validoAte: dto.valido_ate ? this.data(dto.valido_ate) : null, subtotal, desconto, total: subtotal.minus(desconto), itens: { create: itens } }, include: { itens: true, cliente: { select: { nome: true, telefone: true } } } });
  }

  async atualizarStatus(id: string, dto: AtualizarStatusOrcamentoDto, empresaId: string) {
    if (dto.canal === "telefone" && !this.textoOpcional(dto.responsavel)) throw new BadRequestException("Informe o responsável pela aprovação telefônica.");
    const result = await this.prisma.orcamento.updateMany({ where: { id, empresaId, status: { in: [OrcamentoStatus.enviado, OrcamentoStatus.aguardando_aprovacao, OrcamentoStatus.em_negociacao] } }, data: { status: dto.status as OrcamentoStatus } });
    if (!result.count) throw new BadRequestException("O orçamento não está disponível para esta atualização.");
    return { atualizado: true, status: dto.status, canal: dto.canal || null, responsavel: this.textoOpcional(dto.responsavel) };
  }

  async obterOrcamento(id: string, empresaId: string) {
    const orcamento = await this.obterOrcamentoOperacional(id, empresaId);
    return { ...orcamento, acoes: { pdf: true, whatsapp: Boolean(orcamento.conversa?.telefone || orcamento.cliente.telefone), email: Boolean(orcamento.cliente.email), assinafy: Number(orcamento.total) > 2000 && Boolean(orcamento.cliente.email) && !orcamento.assinafyDocumentId } };
  }

  async gerarPdfOrcamento(id: string, empresaId: string) {
    const orcamento = await this.obterOrcamentoOperacional(id, empresaId);
    const buffer = this.gerarPdf(orcamento);
    await this.prisma.orcamento.update({ where: { id }, data: { pdfGeradoEm: new Date() } });
    return { buffer, contentType: "application/pdf", filename: `orcamento-${id.slice(0, 8)}.pdf` };
  }

  async enviarWhatsApp(id: string, empresaId: string) {
    const orcamento = await this.obterOrcamentoOperacional(id, empresaId);
    const telefone = orcamento.conversa?.telefone || orcamento.cliente.telefone;
    if (!telefone) throw new BadRequestException("Cliente sem telefone para enviar o orçamento.");
    const pdf = this.gerarPdf(orcamento);
    const filename = `orcamento-${id.slice(0, 8)}.pdf`;
    const documento = await this.sender.enviarDocumento(telefone, { filename, content: pdf, caption: `Orçamento ${orcamento.titulo}` });
    const texto = `Olá, ${orcamento.cliente.nome}.\n\nEnviamos seu orçamento em PDF. Deseja autorizar o serviço?`;
    const confirmacao = await this.sender.enviar({ to: telefone, text: texto, options: [{ id: `orcamento_aprovar:${id}`, title: "Autorizar" }, { id: `orcamento_negociar:${id}`, title: "Negociar" }] });
    const agora = new Date();
    await this.prisma.orcamento.update({ where: { id }, data: { status: OrcamentoStatus.aguardando_aprovacao, enviadoEm: agora, ultimoEnvioCanal: "whatsapp", ultimoEnvioEm: agora, pdfGeradoEm: agora } });
    if (orcamento.conversaId) await this.prisma.$transaction([this.prisma.whatsAppMensagem.create({ data: { conversaId: orcamento.conversaId, direcao: "saida", texto: `PDF enviado: Orçamento ${orcamento.titulo}`, mensagemId: documento.messageId, tipo: "document" } }), this.prisma.whatsAppMensagem.create({ data: { conversaId: orcamento.conversaId, direcao: "saida", texto, mensagemId: confirmacao.messageId, tipo: "interactive" } })]);
    return { enviado: true, canal: "whatsapp", status: OrcamentoStatus.aguardando_aprovacao };
  }

  async enviarEmail(id: string, dto: EnviarOrcamentoEmailDto, empresaId: string) {
    const orcamento = await this.obterOrcamentoOperacional(id, empresaId);
    const destinatario = (dto.destinatario || orcamento.cliente.email || "").trim();
    if (!destinatario) throw new BadRequestException("Cliente sem e-mail para enviar o orçamento.");
    const remetente = orcamento.empresa.email?.trim();
    if (!remetente) throw new BadRequestException("Empresa sem e-mail configurado para envio.");
    const pdf = this.gerarPdf(orcamento);
    await this.email.enviar({ from: remetente, to: destinatario, subject: `Orçamento ${orcamento.titulo} — AIRMOVEBR`, text: `Olá, ${orcamento.cliente.nome}.\n\nSegue em anexo o orçamento ${orcamento.titulo}.\nValidade: ${orcamento.validoAte ? this.dataTexto(orcamento.validoAte) : "a combinar"}.`, attachments: [{ filename: `orcamento-${id.slice(0, 8)}.pdf`, contentType: "application/pdf", contentBase64: pdf.toString("base64") }] });
    const agora = new Date();
    await this.prisma.orcamento.update({ where: { id }, data: { status: OrcamentoStatus.aguardando_aprovacao, enviadoEm: agora, ultimoEnvioCanal: "email", ultimoEnvioEm: agora, emailEnvio: destinatario, pdfGeradoEm: agora } });
    return { enviado: true, canal: "email", status: OrcamentoStatus.aguardando_aprovacao, destinatario };
  }

  async enviarAssinafy(id: string, empresaId: string) {
    const orcamento = await this.obterOrcamentoOperacional(id, empresaId);
    if (orcamento.assinafyDocumentId) throw new BadRequestException("Este orçamento já foi enviado para assinatura.");
    const pdf = this.gerarPdf(orcamento);
    const resultado = await this.assinafy.enviarOrcamento(orcamento, { filename: `orcamento-${id.slice(0, 8)}.pdf`, content: pdf, contentType: "application/pdf" });
    const salvo = await this.prisma.orcamento.update({ where: { id }, data: { status: OrcamentoStatus.aguardando_aprovacao, assinafyDocumentId: resultado.documentId, assinafyAssignmentId: resultado.assignmentId, assinafyStatus: resultado.status, assinafyUltimoEvento: resultado.evento as Prisma.InputJsonValue, assinafyIniciadoEm: new Date(), pdfGeradoEm: new Date() } });
    return { enviado: true, status: salvo.status, assinafy_document_id: resultado.documentId, assinafy_assignment_id: resultado.assignmentId, assinafy_status: resultado.status };
  }

  async enviarOrcamento(id: string, empresaId: string) { return this.enviarWhatsApp(id, empresaId); }

  async registrarAceiteWhatsApp(id: string, empresaId: string) {
    const atualizado = await this.prisma.orcamento.updateMany({ where: { id, empresaId, status: OrcamentoStatus.aguardando_aprovacao }, data: { status: OrcamentoStatus.aprovado } });
    if (!atualizado.count) {
      const orcamento = await this.prisma.orcamento.findFirst({ where: { id, empresaId }, select: { status: true } });
      if (!orcamento) throw new NotFoundException("Orçamento não encontrado.");
      throw new BadRequestException("O orçamento precisa estar enviado e aguardando aceite.");
    }
    return { aprovado: true };
  }

  private async obterOrcamentoOperacional(id: string, empresaId: string) {
    const orcamento = await this.prisma.orcamento.findFirst({ where: { id, empresaId }, include: { empresa: { select: { nome: true, razaoSocial: true, cnpj: true, telefone: true, email: true, logradouro: true, numero: true, bairro: true, cidade: true, uf: true, cep: true } }, cliente: { select: { nome: true, telefone: true, email: true, enderecos: { where: { principal: true }, take: 1, select: { logradouro: true, numero: true, bairro: true, cidade: true, uf: true, cep: true } } } }, conversa: { select: { telefone: true } }, itens: true } });
    if (!orcamento) throw new NotFoundException("Orçamento não encontrado.");
    return orcamento;
  }

  private gerarPdf(orcamento: Awaited<ReturnType<ComercialService["obterOrcamentoOperacional"]>>) {
    const { enderecos, ...cliente } = orcamento.cliente;
    return this.pdf.gerar({ ...orcamento, cliente: { ...cliente, ...enderecos[0] }, numero: `ORC-${orcamento.id.slice(0, 8).toUpperCase()}` });
  }

  private texto(valor: string) { const resultado = String(valor || "").trim(); if (!resultado) throw new BadRequestException("Preencha os campos obrigatórios."); return resultado; }
  private textoOpcional(valor?: string) { const resultado = String(valor || "").trim(); return resultado || null; }
  private data(valor: string) { const data = new Date(`${valor}T23:59:59`); if (Number.isNaN(data.getTime())) throw new BadRequestException("Data de validade inválida."); return data; }
  private dataTexto(valor: Date) { return valor.toLocaleDateString("pt-BR"); }
}
