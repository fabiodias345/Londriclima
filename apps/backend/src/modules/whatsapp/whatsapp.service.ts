import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { Optional } from "@nestjs/common";
import { AdminService } from "../admin/admin.service";
import { SalvarClienteDto } from "../admin/dto/salvar-cliente.dto";
import { SalvarOsAgendaDto } from "../admin/dto/salvar-os-agenda.dto";
import { AuthenticatedUser } from "../auth/auth-user";
import { PrismaService } from "../../database/prisma.service";
import { WhatsAppCloudService } from "../automacoes/whatsapp-cloud.service";
import { BoltRules, dadosBoltIniciais, normalizarDadosBolt } from "./bolt/bolt.rules";
import { BoltData } from "./bolt/bolt.types";

type JsonRecord = Record<string, unknown>;
type WhatsAppEvent = { tipo: string; conversaId: string; empresaId: string };
type EventListener = (event: WhatsAppEvent) => void;

@Injectable()
export class WhatsAppService {
  private readonly listeners = new Set<EventListener>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sender: WhatsAppCloudService,
    private readonly bolt: BoltRules,
    @Optional() private readonly adminService?: AdminService
  ) {}

  subscribe(listener: EventListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  verificarWebhookToken(token: string | undefined) {
    const esperado = this.config.get<string>("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
    return Boolean(esperado?.trim() && token === esperado.trim());
  }

  async receberWebhook(payload: JsonRecord) {
    const mensagens = this.extrairMensagens(payload);
    for (const mensagem of mensagens) await this.processarMensagem(mensagem);
    for (const status of this.extrairStatus(payload)) {
      await this.prisma.whatsAppMensagem.updateMany({ where: { mensagemId: status.id }, data: { statusEntrega: status.status, statusEntregaEm: status.em } });
    }
    return { recebido: true, mensagens: mensagens.length };
  }

  async listarConversas(empresaId: string) {
    const items = await this.prisma.whatsAppConversa.findMany({
      where: { empresaId }, orderBy: { ultimaMensagemEm: "desc" }, take: 100,
      include: { mensagens: { orderBy: { criadoEm: "desc" }, take: 1 }, atribuidoUsuario: { select: { id: true, nome: true } }, cliente: { select: { id: true, nome: true } }, ordemServico: { select: { id: true, titulo: true } } }
    });
    return { items, total: items.length, pendentes: items.filter((item) => item.status === "humano" && !item.atribuidoUsuarioId).length };
  }

  async obterConversa(id: string, empresaId: string) {
    return this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId }, include: { mensagens: { orderBy: { criadoEm: "asc" } }, atribuidoUsuario: { select: { id: true, nome: true } }, cliente: true, ordemServico: { select: { id: true, titulo: true, status: true } } } });
  }

  async assumirConversa(id: string, empresaId: string, usuarioId: string) {
    const resultado = await this.prisma.whatsAppConversa.updateMany({ where: { id, empresaId, status: "humano", atribuidoUsuarioId: null }, data: { atribuidoUsuarioId: usuarioId, ultimaLeituraEm: new Date(), dados: this.atualizarStatus(await this.dadosDaConversa(id, empresaId), "HUMAN_ATTENDING") as Prisma.InputJsonValue } });
    if (!resultado.count) throw new ConflictException("Conversa ja assumida ou indisponivel.");
    this.emitir({ tipo: "conversa_assumida", conversaId: id, empresaId });
    return { assumida: true };
  }

  async liberarConversa(id: string, empresaId: string, usuarioId: string) {
    const resultado = await this.prisma.whatsAppConversa.updateMany({ where: { id, empresaId, atribuidoUsuarioId: usuarioId, status: "humano" }, data: { atribuidoUsuarioId: null, dados: this.atualizarStatus(await this.dadosDaConversa(id, empresaId), "HUMAN_QUEUE") as Prisma.InputJsonValue } });
    if (!resultado.count) throw new ConflictException("Conversa nao pertence ao atendente.");
    this.emitir({ tipo: "conversa_liberada", conversaId: id, empresaId });
    return { liberada: true };
  }

  async marcarLeitura(id: string, empresaId: string) {
    await this.prisma.whatsAppConversa.updateMany({ where: { id, empresaId }, data: { ultimaLeituraEm: new Date() } });
    return { lida: true };
  }

  async encerrarConversa(id: string, empresaId: string, motivo: string) {
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId } });
    await this.prisma.whatsAppConversa.update({ where: { id: conversa.id }, data: { status: "encerrada", encerramentoMotivo: motivo.trim() || "concluido", ultimaLeituraEm: new Date(), dados: this.atualizarStatus(conversa.dados, "CLOSED") as Prisma.InputJsonValue } });
    this.emitir({ tipo: "conversa_encerrada", conversaId: id, empresaId });
    return { encerrada: true };
  }

  async reabrirConversa(id: string, empresaId: string) {
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId } });
    await this.prisma.whatsAppConversa.update({ where: { id: conversa.id }, data: { status: "bot", atribuidoUsuarioId: null, encerramentoMotivo: null, dados: dadosBoltIniciais() as Prisma.InputJsonValue } });
    this.emitir({ tipo: "conversa_reaberta", conversaId: id, empresaId });
    return { reaberta: true };
  }

  async responderConversa(id: string, empresaId: string, texto: string) {
    if (!texto.trim()) throw new BadRequestException("Mensagem vazia.");
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId } });
    const entrega = await this.sender.enviar({ to: conversa.telefone, text: texto.trim() });
    await this.prisma.$transaction([
      this.prisma.whatsAppConversa.update({ where: { id }, data: { status: "humano", ultimaMensagemEm: new Date(), ultimaLeituraEm: new Date() } }),
      this.prisma.whatsAppMensagem.create({ data: { conversaId: id, direcao: "saida", texto: texto.trim(), mensagemId: entrega.messageId } })
    ]);
    this.emitir({ tipo: "mensagem_enviada", conversaId: id, empresaId });
    return { enviado: true, messageId: entrega.messageId };
  }

  async criarClienteDaConversa(id: string, empresaId: string, dto: SalvarClienteDto, usuario: AuthenticatedUser) {
    if (!this.adminService) throw new BadRequestException("Admin de clientes nao configurado.");
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId } });
    if (conversa.clienteId) return this.obterConversa(id, empresaId);
    const cliente = await this.adminService.criarCliente({ ...dto, telefone: dto.telefone || conversa.telefone }, usuario);
    await this.prisma.whatsAppConversa.update({ where: { id }, data: { clienteId: cliente.id } });
    this.emitir({ tipo: "cliente_vinculado", conversaId: id, empresaId });
    return this.obterConversa(id, empresaId);
  }

  async criarOrdemDaConversa(id: string, empresaId: string, dto: SalvarOsAgendaDto, usuario: AuthenticatedUser) {
    if (!this.adminService) throw new BadRequestException("Admin de agenda nao configurado.");
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId } });
    if (!conversa.clienteId) throw new BadRequestException("Crie ou vincule o cliente antes da O.S.");
    if (conversa.ordemServicoId) throw new ConflictException("Esta conversa ja possui O.S. vinculada.");
    const dados = normalizarDadosBolt(conversa.dados);
    const ordem = await this.adminService.criarOrdemAgenda({ ...dto, cliente_id: conversa.clienteId, titulo: dto.titulo || `Atendimento WhatsApp - ${dados.servico || "servico"}`, detalhes: dto.detalhes || dados.detalhes || undefined }, usuario);
    await this.prisma.whatsAppConversa.update({ where: { id }, data: { ordemServicoId: ordem.os_id } });
    await this.notificarTecnicoNovaOs(ordem.os_id, empresaId);
    this.emitir({ tipo: "os_vinculada", conversaId: id, empresaId });
    return this.obterConversa(id, empresaId);
  }

  private async notificarTecnicoNovaOs(osId: string, empresaId: string) {
    const template = this.config.get<string>("WHATSAPP_TEMPLATE_OS_NOVA");
    if (!template || !this.sender.enviarTemplate) return;
    const ordem = await this.prisma.ordemServico.findFirst({ where: { id: osId, empresaId }, select: { titulo: true, tecnico: { select: { nome: true, telefone: true } } } });
    if (!ordem?.tecnico?.telefone) return;
    await this.sender.enviarTemplate(ordem.tecnico.telefone, { name: template, language: this.config.get<string>("WHATSAPP_TEMPLATE_LANGUAGE", "pt_BR"), parameters: [ordem.tecnico.nome, ordem.titulo] });
  }

  private async processarMensagem(mensagem: IncomingMessage) {
    const empresa = await this.obterEmpresa();
    if (!empresa) return;
    const conversa = await this.prisma.whatsAppConversa.upsert({
      where: { empresaId_telefone: { empresaId: empresa.id, telefone: mensagem.telefone } },
      create: { empresaId: empresa.id, telefone: mensagem.telefone, nomeContato: mensagem.nome, dados: dadosBoltIniciais() as Prisma.InputJsonValue, ultimaMensagemEm: new Date() },
      update: { nomeContato: mensagem.nome, ultimaMensagemEm: new Date() }
    });
    if (mensagem.id && await this.prisma.whatsAppMensagem.findUnique({ where: { mensagemId: mensagem.id } })) return;
    await this.prisma.whatsAppMensagem.create({ data: { conversaId: conversa.id, direcao: "entrada", texto: mensagem.texto, mensagemId: mensagem.id, tipo: mensagem.tipo } });
    this.emitir({ tipo: "mensagem_recebida", conversaId: conversa.id, empresaId: empresa.id });
    if (conversa.status === "humano" || conversa.status === "encerrada") return;
    const resposta = this.bolt.processar({ texto: mensagem.texto, nomeContato: mensagem.nome }, conversa.dados);
    try {
      if (!resposta.texto) return;
      const entrega = await this.sender.enviar({ to: mensagem.telefone, text: resposta.texto });
      await this.prisma.$transaction([
        this.prisma.whatsAppMensagem.create({ data: { conversaId: conversa.id, direcao: "saida", texto: resposta.texto, mensagemId: entrega.messageId } }),
        this.prisma.whatsAppConversa.update({ where: { id: conversa.id }, data: { ...(resposta.assumir ? { status: "humano" as const } : {}), dados: resposta.dados as Prisma.InputJsonValue, ultimaMensagemEm: new Date() } })
      ]);
      this.emitir({ tipo: resposta.assumir ? "transferida_humano" : "resposta_bot", conversaId: conversa.id, empresaId: empresa.id });
    } catch {
      // A entrada fica salva para reprocessamento manual quando a API externa falhar.
    }
  }

  private async dadosDaConversa(id: string, empresaId: string) {
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId }, select: { dados: true } });
    return conversa.dados;
  }

  private atualizarStatus(dados: unknown, status: BoltData["status"]) { return { ...normalizarDadosBolt(dados), status }; }
  private emitir(evento: WhatsAppEvent) { for (const listener of this.listeners) listener(evento); }
  private async obterEmpresa() { const id = this.config.get<string>("LONDRI_WHATS_EMPRESA_ID"); return id ? this.prisma.empresa.findUnique({ where: { id } }) : this.prisma.empresa.findFirst({ where: { ativa: true }, orderBy: { criadoEm: "asc" } }); }

  private extrairStatus(payload: JsonRecord): Array<{ id: string; status: string; em: Date }> {
    const resultado: Array<{ id: string; status: string; em: Date }> = [];
    for (const entry of Array.isArray(payload.entry) ? payload.entry : []) {
      const changes = this.record(entry).changes;
      if (!Array.isArray(changes)) continue;
      for (const change of changes) {
        const statuses = this.record(this.record(this.record(change).value).statuses);
        if (!Array.isArray(statuses)) continue;
        for (const item of statuses) {
          const status = this.record(item);
          if (typeof status.id !== "string" || typeof status.status !== "string") continue;
          const timestamp = typeof status.timestamp === "string" ? Number(status.timestamp) * 1000 : Date.now();
          resultado.push({ id: status.id, status: status.status, em: new Date(timestamp) });
        }
      }
    }
    return resultado;
  }

  private extrairMensagens(payload: JsonRecord): IncomingMessage[] {
    const resultado: IncomingMessage[] = [];
    for (const entry of Array.isArray(payload.entry) ? payload.entry : []) {
      const changes = this.record(entry).changes;
      if (!Array.isArray(changes)) continue;
      for (const change of changes) {
        const value = this.record(this.record(change).value);
        const contact = this.record(Array.isArray(value.contacts) ? value.contacts[0] : undefined);
        for (const item of Array.isArray(value.messages) ? value.messages : []) {
          const mensagem = this.record(item);
          const texto = this.record(mensagem.text).body;
          if (typeof mensagem.from !== "string" || typeof texto !== "string") continue;
          resultado.push({ id: typeof mensagem.id === "string" ? mensagem.id : undefined, telefone: mensagem.from, nome: typeof this.record(contact.profile).name === "string" ? String(this.record(contact.profile).name) : undefined, texto, tipo: typeof mensagem.type === "string" ? mensagem.type : "text" });
        }
      }
    }
    return resultado;
  }

  private record(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
}

type IncomingMessage = { id?: string; telefone: string; nome?: string; texto: string; tipo: string };
