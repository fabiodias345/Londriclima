import { BadRequestException, ConflictException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrdemServicoOrigem, OrdemServicoStatus, OrdemServicoTipoServico, OrcamentoStatus, Prisma } from "@prisma/client";
import { Optional } from "@nestjs/common";
import { AdminService } from "../admin/admin.service";
import { SalvarClienteDto } from "../admin/dto/salvar-cliente.dto";
import { SalvarOsAgendaDto } from "../admin/dto/salvar-os-agenda.dto";
import { AuthenticatedUser } from "../auth/auth-user";
import { PrismaService } from "../../database/prisma.service";
import { WhatsAppCloudService } from "../automacoes/whatsapp-cloud.service";
import { BoltRules, dadosBoltIniciais, normalizarDadosBolt } from "./bolt/bolt.rules";
import { BoltData, BoltResult } from "./bolt/bolt.types";
import { AgendarLevantamentoDto, CriarLevantamentoDto } from "../levantamentos/dto/levantamentos.dto";
import { LevantamentosNotificacaoService } from "../levantamentos/levantamentos-notificacao.service";
import { LevantamentosService } from "../levantamentos/levantamentos.service";
import { IaService } from "../ia/ia.service";
import { AiWhatsappResult } from "../ia/ia.types";

type JsonRecord = Record<string, unknown>;
type WhatsAppEvent = { tipo: string; conversaId: string; empresaId: string };
type EventListener = (event: WhatsAppEvent) => void;

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly listeners = new Set<EventListener>();
  private readonly mensagensEmProcessamento = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sender: WhatsAppCloudService,
    private readonly bolt: BoltRules,
    @Optional() private readonly adminService?: AdminService,
    private readonly levantamentos?: LevantamentosService,
    private readonly notificacoesLevantamento?: LevantamentosNotificacaoService,
    @Optional() private readonly ia?: IaService
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
      include: { mensagens: { orderBy: { criadoEm: "desc" }, take: 1 }, atribuidoUsuario: { select: { id: true, nome: true } }, cliente: { select: { id: true, nome: true } }, orcamentos: { orderBy: { criadoEm: "desc" }, take: 1, include: { itens: true } }, ordemServico: { select: { id: true, titulo: true } } }
    });
    return { items, total: items.length, pendentes: items.filter((item) => item.status === "humano" && !item.atribuidoUsuarioId).length };
  }

  async obterConversa(id: string, empresaId: string) {
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId }, include: { mensagens: { orderBy: { criadoEm: "asc" } }, atribuidoUsuario: { select: { id: true, nome: true } }, cliente: true, orcamentos: { orderBy: { criadoEm: "desc" }, take: 1, include: { itens: true } }, ordemServico: { select: { id: true, titulo: true, status: true, agendadaPara: true, equipeId: true, tecnicoId: true, origem: true, orcamentoId: true } }, levantamentoTecnico: { include: { equipe: { select: { id: true, nome: true } }, tecnico: { select: { id: true, nome: true, telefone: true } }, itensTecnicos: true, fotos: true, autorizacao: true } } } });
    const dados = normalizarDadosBolt(conversa.dados);
    const clientesCandidatos = conversa.clienteId ? [] : await this.listarClientesCandidatos(conversa.empresaId, conversa.telefone);
    return { ...conversa, levantamento: conversa.levantamentoTecnico, clientes_candidatos: clientesCandidatos, atendimento: { dados, previaOs: this.criarPreviaOs(dados) } };
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

  async apagarConversa(id: string, empresaId: string) {
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId } });
    await this.prisma.whatsAppConversa.delete({ where: { id: conversa.id } });
    this.emitir({ tipo: "conversa_apagada", conversaId: id, empresaId });
    return { apagada: true };
  }

  async responderConversa(id: string, empresaId: string, usuarioId: string, texto: string) {
    if (!texto.trim()) throw new BadRequestException("Mensagem vazia.");
    let conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId } });
    if (conversa.status !== "humano") throw new ConflictException("Esta conversa nao esta disponivel para atendimento.");
    if (!conversa.atribuidoUsuarioId) {
      const resultado = await this.prisma.whatsAppConversa.updateMany({ where: { id, empresaId, status: "humano", atribuidoUsuarioId: null }, data: { atribuidoUsuarioId: usuarioId, ultimaLeituraEm: new Date(), dados: this.atualizarStatus(conversa.dados, "HUMAN_ATTENDING") as Prisma.InputJsonValue } });
      if (!resultado.count) throw new ConflictException("Conversa ja assumida por outro atendente.");
      conversa = { ...conversa, atribuidoUsuarioId: usuarioId };
      this.emitir({ tipo: "conversa_assumida", conversaId: id, empresaId });
    }
    if (conversa.atribuidoUsuarioId !== usuarioId) throw new ConflictException("Conversa ja assumida por outro atendente.");
    const entrega = await this.sender.enviar({ to: conversa.telefone, text: texto.trim() });
    await this.prisma.$transaction([
      this.prisma.whatsAppConversa.update({ where: { id }, data: { status: "humano", ultimaMensagemEm: new Date(), ultimaLeituraEm: new Date() } }),
      this.prisma.whatsAppMensagem.create({ data: { conversaId: id, direcao: "saida", texto: texto.trim(), mensagemId: entrega.messageId } })
    ]);
    this.emitir({ tipo: "mensagem_enviada", conversaId: id, empresaId });
    return { enviado: true, messageId: entrega.messageId, assumida: true };
  }

  async criarClienteDaConversa(id: string, empresaId: string, dto: SalvarClienteDto, usuario: AuthenticatedUser) {
    if (!this.adminService) throw new BadRequestException("Admin de clientes nao configurado.");
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId } });
    let clienteId = conversa.clienteId;
    if (!clienteId) {
      const dados = normalizarDadosBolt(conversa.dados);
      const cliente = await this.adminService.criarCliente({
        ...dto,
        nome: dto.nome || dados.nome || conversa.nomeContato || "Cliente",
        email: dto.email || dados.email || undefined,
        telefone: dto.telefone || conversa.telefone,
        logradouro: dto.logradouro || dados.logradouro || undefined,
        numero: dto.numero || dados.numero || undefined,
        bairro: dto.bairro || dados.bairro || undefined,
        cidade: dto.cidade || dados.cidade || undefined,
        uf: dto.uf || dados.uf || undefined,
        cep: dto.cep || dados.cep || undefined
      }, usuario);
      clienteId = cliente.id;
      await this.prisma.whatsAppConversa.update({ where: { id }, data: { clienteId } });
      this.emitir({ tipo: "cliente_vinculado", conversaId: id, empresaId });
    }
    return this.obterConversa(id, empresaId);
  }

  async vincularClienteDaConversa(id: string, clienteId: string, empresaId: string) {
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId }, select: { id: true } });
    const cliente = await this.prisma.cliente.findFirst({ where: { id: clienteId, empresaId }, select: { id: true } });
    if (!cliente) throw new BadRequestException("Cliente nao encontrado para esta empresa.");
    await this.prisma.whatsAppConversa.update({ where: { id: conversa.id }, data: { clienteId: cliente.id } });
    this.emitir({ tipo: "cliente_vinculado", conversaId: id, empresaId });
    return this.obterConversa(id, empresaId);
  }
  async criarOrdemDaConversa(id: string, empresaId: string, dto: SalvarOsAgendaDto, usuario: AuthenticatedUser, enviarConfirmacao = true) {
    if (!this.adminService) throw new BadRequestException("Admin de agenda nao configurado.");
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId } });
    if (!conversa.clienteId) throw new BadRequestException("Crie ou vincule o cliente antes da O.S.");
    const previaOs = this.criarPreviaOs(normalizarDadosBolt(conversa.dados));
    let orcamentoId: string | undefined;
    if (dto.origem === OrdemServicoOrigem.orcamento_aprovado) {
      const orcamento = await this.prisma.orcamento.findFirst({
        where: { empresaId, conversaId: conversa.id, status: OrcamentoStatus.aprovado },
        orderBy: { atualizadoEm: "desc" },
        select: { id: true }
      });
      if (!orcamento) throw new BadRequestException("Registre o aceite do orçamento ou escolha contrato/serviço gratuito.");
      orcamentoId = orcamento.id;
    }
    const dadosOs = { ...dto, orcamento_id: orcamentoId, cliente_id: conversa.clienteId, titulo: dto.titulo || previaOs.titulo, detalhes: dto.detalhes || previaOs.detalhes, tipo_servico: dto.tipo_servico || previaOs.tipoServico };
    await this.validarHorarioDisponivel(conversa.ordemServicoId, empresaId, dadosOs);
    const ordem = conversa.ordemServicoId
      ? await this.adminService.reprogramarOrdemAgenda(conversa.ordemServicoId, dadosOs, usuario)
      : await this.adminService.criarOrdemAgenda(dadosOs, usuario);
    if (!conversa.ordemServicoId) await this.prisma.whatsAppConversa.update({ where: { id }, data: { ordemServicoId: ordem.os_id } });
    const confirmacaoAgendamentoEnviada = enviarConfirmacao && dto.agendada_para ? await this.enviarConfirmacaoAgendamento(conversa, dto.agendada_para, empresaId, ordem.os_id) : undefined;
    if (dto.agendada_para) await this.notificarTecnicoNovaOs(ordem.os_id, empresaId);
    this.emitir({ tipo: "os_vinculada", conversaId: id, empresaId });
    return { ...(await this.obterConversa(id, empresaId)), confirmacaoAgendamentoEnviada };
  }

  async criarLevantamentoDaConversa(id: string, empresaId: string, dto: CriarLevantamentoDto) {
    if (!this.levantamentos) throw new BadRequestException("Levantamentos tecnicos nao configurados.");
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId }, select: { id: true, clienteId: true, dados: true } });
    if (!conversa.clienteId) throw new BadRequestException("Crie ou vincule o cliente antes de agendar o levantamento.");
    const dados = normalizarDadosBolt(conversa.dados);
    if (!dados.servico?.startsWith("manutencao") && dados.servico !== "instalacao") throw new BadRequestException("Levantamento tecnico disponivel para manutencao ou instalacao.");
    const levantamento = await this.levantamentos.criar(empresaId, conversa.clienteId, conversa.id, { ...dto, cliente_id: conversa.clienteId, conversa_id: conversa.id, problema: dto.problema || dados.detalhes || "Problema informado pelo cliente" });
    this.emitir({ tipo: "levantamento_criado", conversaId: id, empresaId });
    return { levantamento };
  }

  async agendarLevantamentoDaConversa(id: string, empresaId: string, dto: AgendarLevantamentoDto, usuario: AuthenticatedUser) {
    if (!this.levantamentos) throw new BadRequestException("Levantamentos tecnicos nao configurados.");
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId }, include: { levantamentoTecnico: { select: { id: true, status: true } } } });
    if (!conversa.levantamentoTecnico) throw new BadRequestException("Crie o levantamento antes de agendar.");
    const eraAgendado = conversa.levantamentoTecnico.status === "agendado";
    const levantamento = await this.levantamentos.agendar(conversa.levantamentoTecnico.id, empresaId, dto);
    const dados = normalizarDadosBolt(conversa.dados);
    await this.criarOrdemDaConversa(id, empresaId, {
      cliente_id: conversa.clienteId ?? undefined,
      equipe_id: dto.equipe_id,
      tecnico_id: dto.tecnico_id,
      agendada_para: dto.agendada_para,
      origem: OrdemServicoOrigem.servico_gratuito,
      tipo_servico: dados.servico === "instalacao" ? "instalacao" : "corretiva",
      titulo: "Levantamento técnico",
      detalhes: levantamento.problema
    }, usuario, false);
    await this.prisma.whatsAppConversa.update({ where: { id }, data: { status: "aguardando_equipe", atribuidoUsuarioId: null, ultimaLeituraEm: new Date() } });
    this.emitir({ tipo: "conversa_aguardando_equipe", conversaId: id, empresaId });
    if (eraAgendado) await this.notificacoesLevantamento?.enviarAlteracao(levantamento.id, empresaId);
    else await this.notificacoesLevantamento?.enviarConfirmacao(levantamento.id, empresaId);
    this.emitir({ tipo: "levantamento_agendado", conversaId: id, empresaId });
    return { levantamento };
  }

  private async validarHorarioDisponivel(osId: string | null, empresaId: string, dto: SalvarOsAgendaDto) {
    if (!dto.agendada_para || (!dto.equipe_id && !dto.tecnico_id)) return;
    const horario = new Date(dto.agendada_para);
    if (Number.isNaN(horario.getTime())) throw new BadRequestException("Horario de agendamento invalido.");
    const conflito = await this.prisma.ordemServico.findFirst({
      where: { empresaId, ...(osId ? { NOT: { id: osId } } : {}), status: { in: [OrdemServicoStatus.aberta, OrdemServicoStatus.em_deslocamento, OrdemServicoStatus.em_atendimento] }, agendadaPara: horario, OR: [...(dto.equipe_id ? [{ equipeId: dto.equipe_id }] : []), ...(dto.tecnico_id ? [{ tecnicoId: dto.tecnico_id }] : [])] },
      select: { id: true }
    });
    if (conflito) throw new ConflictException("Este horario ja esta ocupado para a equipe ou tecnico selecionado.");
  }

  private async listarClientesCandidatos(empresaId: string, telefone: string) {
    const sufixo = this.normalizarTelefone(telefone).slice(-10);
    if (!sufixo) return [];
    const clientes = await this.prisma.cliente.findMany({
      where: { empresaId, telefone: { endsWith: sufixo } },
      select: { id: true, nome: true, telefone: true, email: true, enderecos: { orderBy: { principal: "desc" }, take: 1, select: { logradouro: true, numero: true, bairro: true, cidade: true, uf: true, cep: true } } }
    });
    return clientes.filter((cliente) => this.normalizarTelefone(cliente.telefone).slice(-10) === sufixo).map((cliente) => ({ ...cliente, endereco: cliente.enderecos[0] ?? null, enderecos: undefined }));
  }

  private normalizarTelefone(telefone: string | null | undefined) { return String(telefone || "").replace(/\D/g, ""); }
  private async enviarConfirmacaoAgendamento(conversa: { id: string; telefone: string; nomeContato: string | null; dados: unknown }, agendadaPara: string, empresaId: string, osId: string) {
    const [data, horario] = agendadaPara.split("T");
    const dataFormatada = new Date(`${data}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long" });
    const ordem = await this.prisma.ordemServico.findUnique({ where: { id: osId }, select: { tecnico: { select: { nome: true } } } });
    const numeroOs = `OS-${osId.slice(0, 8).toUpperCase()}`;
    const texto = `Olá, ${conversa.nomeContato || "cliente"}! Sua Ordem de Serviço ${numeroOs} foi formalizada.

O atendimento está agendado para ${dataFormatada}, às ${horario.slice(0, 5)}. Técnico responsável: ${ordem?.tecnico?.nome || "a definir"}.

Pedimos que haja um adulto responsável no local para acompanhar o atendimento e autorizar o acesso ao equipamento.

Se ocorrer qualquer imprevisto ou precisar alterar o horário, por favor nos avise com antecedência para que possamos reorganizar nossa agenda.

Agradecemos pela preferência. Até breve!`;
    try {
      const entrega = await this.sender.enviar({ to: conversa.telefone, text: texto });
      await this.prisma.$transaction([
        this.prisma.whatsAppConversa.update({ where: { id: conversa.id }, data: { status: "encerrada", atribuidoUsuarioId: null, encerramentoMotivo: "agendamento_confirmado", ultimaMensagemEm: new Date(), ultimaLeituraEm: new Date(), dados: this.atualizarStatus(conversa.dados, "CLOSED") as Prisma.InputJsonValue } }),
        this.prisma.whatsAppMensagem.create({ data: { conversaId: conversa.id, direcao: "saida", texto, mensagemId: entrega.messageId } })
      ]);
      this.emitir({ tipo: "agendamento_confirmado", conversaId: conversa.id, empresaId });
      return true;
    } catch {
      return false;
    }
  }
  private async notificarTecnicoNovaOs(osId: string, empresaId: string) {
    const template = this.config.get<string>("WHATSAPP_TEMPLATE_OS_NOVA");
    const ordem = await this.prisma.ordemServico.findFirst({ where: { id: osId, empresaId }, select: { titulo: true, tecnico: { select: { nome: true, telefone: true } } } });
    if (!ordem?.tecnico?.telefone) return;
    if (!template || !this.sender.enviarTemplate) return;
    await this.sender.enviarTemplate(ordem.tecnico.telefone, { name: template, language: this.config.get<string>("WHATSAPP_TEMPLATE_LANGUAGE", "pt_BR"), parameters: [ordem.tecnico.nome, ordem.titulo] });
  }

  private async processarMensagem(mensagem: IncomingMessage) {
    if (!mensagem.id) return this.processarMensagemInterna(mensagem);
    if (this.mensagensEmProcessamento.has(mensagem.id)) return;
    this.mensagensEmProcessamento.add(mensagem.id);
    try {
      return await this.processarMensagemInterna(mensagem);
    } finally {
      this.mensagensEmProcessamento.delete(mensagem.id);
    }
  }

  private async processarMensagemInterna(mensagem: IncomingMessage) {
    const empresa = await this.obterEmpresa();
    if (!empresa) return;
    let conversa = await this.prisma.whatsAppConversa.upsert({
      where: { empresaId_telefone: { empresaId: empresa.id, telefone: mensagem.telefone } },
      create: { empresaId: empresa.id, telefone: mensagem.telefone, nomeContato: mensagem.nome, dados: dadosBoltIniciais() as Prisma.InputJsonValue, ultimaMensagemEm: new Date() },
      update: { nomeContato: mensagem.nome, ultimaMensagemEm: new Date() }
    });
    if (mensagem.id && await this.prisma.whatsAppMensagem.findUnique({ where: { mensagemId: mensagem.id } })) return;
    try {
      await this.prisma.whatsAppMensagem.create({ data: { conversaId: conversa.id, direcao: "entrada", texto: mensagem.texto, mensagemId: mensagem.id, tipo: mensagem.tipo } });
    } catch (error) {
      if (mensagem.id && await this.prisma.whatsAppMensagem.findUnique({ where: { mensagemId: mensagem.id } })) return;
      throw error;
    }
    this.emitir({ tipo: "mensagem_recebida", conversaId: conversa.id, empresaId: empresa.id });
    if (conversa.status === "encerrada") {
      conversa = await this.prisma.whatsAppConversa.update({
        where: { id: conversa.id },
        data: { status: "bot", atribuidoUsuarioId: null, encerramentoMotivo: null, dados: dadosBoltIniciais() as Prisma.InputJsonValue, ultimaMensagemEm: new Date() }
      });
      this.emitir({ tipo: "conversa_reaberta", conversaId: conversa.id, empresaId: empresa.id });
    }
    if (await this.processarRespostaOrcamento(conversa, mensagem.texto)) return;
    if (conversa.status === "humano") return;
    const respostaIa = await this.processarComIa(conversa, mensagem);
    let resposta = respostaIa || this.bolt.processar({ texto: mensagem.texto, nomeContato: mensagem.nome }, conversa.dados);
    if (!respostaIa) {
      resposta = await this.responderComCep(resposta, mensagem.texto, conversa.dados);
      resposta = await this.humanizarResposta(mensagem, resposta);
    }
    try {
      if (!resposta.texto) return;
      const entrega = await this.sender.enviar({ to: mensagem.telefone, text: resposta.texto, options: resposta.opcoes, optionsLabel: resposta.rotuloOpcoes });
      await this.prisma.$transaction([
        this.prisma.whatsAppMensagem.create({ data: { conversaId: conversa.id, direcao: "saida", texto: resposta.texto, mensagemId: entrega.messageId } }),
        this.prisma.whatsAppConversa.update({ where: { id: conversa.id }, data: { ...(resposta.assumir ? { status: "humano" as const } : {}), dados: resposta.dados as Prisma.InputJsonValue, ultimaMensagemEm: new Date() } })
      ]);
      this.emitir({ tipo: resposta.assumir ? "transferida_humano" : "resposta_bot", conversaId: conversa.id, empresaId: empresa.id });
    } catch {
      // A entrada fica salva para reprocessamento manual quando a API externa falhar.
    }
  }

  private async processarComIa(conversa: { id: string; dados: unknown; nomeContato?: string | null }, mensagem: IncomingMessage): Promise<BoltResult | null> {
    if (!this.ia) return null;
    try {
      const cepInformado = mensagem.texto.replace(/\D/g, "");
      if (/^\d{8}$/.test(cepInformado)) {
        const dados = normalizarDadosBolt(conversa.dados);
        return this.buscarCepInformado({ ...dados, cep: cepInformado });
      }
      const estadoAtual = normalizarDadosBolt(conversa.dados);
      const pistaBolt = this.bolt.processar({ texto: mensagem.texto, nomeContato: mensagem.nome }, estadoAtual);
      const dadosContexto = this.enriquecerEstadoComBolt(estadoAtual, pistaBolt.dados);
      const historico = await this.prisma.whatsAppMensagem.findMany({ where: { conversaId: conversa.id }, orderBy: { criadoEm: "asc" }, take: 20, select: { direcao: true, texto: true, tipo: true } });
      const resultado = await this.ia.analisarAtendimentoWhatsapp({ mensagem: mensagem.texto, nomeContato: mensagem.nome, dados: dadosContexto, historico });
      if (!resultado) return null;
      return this.aplicarResultadoIa(dadosContexto, resultado);
    } catch (error) {
      this.logger.warn(`Fallback BOLT no atendimento IA: ${error instanceof Error ? error.message : "erro desconhecido"}`);
      return null;
    }
  }

  private async aplicarResultadoIa(dadosEntrada: unknown, resultado: AiWhatsappResult): Promise<BoltResult> {
    const dados = this.mesclarDadosIa(dadosEntrada, resultado);
    if (this.respostaPedeDadoTecnico(resultado.resposta)) return this.protegerFluxoSemDadosTecnicos(dados);
    if (resultado.proxima_acao === "perguntar_cep" && !dados.servico) return { texto: "Olá! 😊 Como posso ajudar você hoje? Posso auxiliar com instalação, manutenção, limpeza ou orçamento de ar-condicionado.", assumir: false, dados: { ...dados, etapa_atual: "aguardando_servico" } };
    if (resultado.proxima_acao === "buscar_cep" || (dados.cep && !dados.cidade)) return this.buscarCepInformado(dados);
    if (resultado.proxima_acao === "perguntar_cep") return { texto: resultado.resposta || "Você sabe informar o CEP do endereço?", assumir: false, dados: { ...dados, etapa_atual: "aguardando_cep" } };
    if (resultado.proxima_acao === "buscar_cep_rua") {
      const cidade = resultado.dados.cidade || dados.cidade;
      const uf = resultado.dados.uf || dados.uf;
      const logradouro = resultado.dados.logradouro || dados.logradouro;
      if (!cidade) return { texto: "Para localizar o CEP, qual é a cidade?", assumir: false, dados: { ...dados, etapa_atual: "aguardando_cidade" } };
      if (!uf) return { texto: "Qual é o estado (UF) dessa cidade?", assumir: false, dados: { ...dados, etapa_atual: "aguardando_uf" } };
      if (!logradouro) return { texto: "Qual é o nome da rua?", assumir: false, dados: { ...dados, etapa_atual: "aguardando_logradouro" } };
      return this.buscarCepPorEndereco(dados, uf, cidade, logradouro);
    }
    if (resultado.proxima_acao === "perguntar_cidade") return { texto: resultado.resposta || "Qual é a cidade do endereço?", assumir: false, dados: { ...dados, etapa_atual: "aguardando_cidade" } };
    if (resultado.proxima_acao === "perguntar_uf") return { texto: resultado.resposta || "Qual é o estado (UF) do endereço?", assumir: false, dados: { ...dados, etapa_atual: "aguardando_uf" } };
    if (resultado.proxima_acao === "transferir") return { texto: resultado.resposta, assumir: true, dados: { ...dados, status: "HUMAN_QUEUE", etapa_atual: null } };
    if (resultado.proxima_acao === "continuar" && !resultado.resposta.includes("?")) return { texto: this.proximaPerguntaAtendimento(dados), assumir: false, dados: { ...dados, status: "BOT_QUALIFYING", etapa_atual: dados.etapa_atual } };
    return { texto: resultado.resposta, assumir: false, dados: { ...dados, status: "BOT_QUALIFYING", etapa_atual: resultado.proxima_acao === "confirmar_endereco" ? "aguardando_confirmacao_endereco" : null } };
  }

  private proximaPerguntaAtendimento(dados: BoltData) {
    if (!dados.servico) return "Como posso ajudar você hoje?";
    if (!dados.detalhes) {
      if (dados.servico === "limpeza_filtro") return "Quantos aparelhos precisam de limpeza?";
      if (dados.servico === "manutencao" || dados.servico === "manutencao_corretiva") return "Pode me contar o que está acontecendo com o aparelho?";
      return "Pode me contar um pouco mais sobre o que você precisa?";
    }
    if (!dados.cep) return "Para cadastrar o atendimento, qual é o CEP do local?";
    if (!dados.cidade) return "Não sabe o CEP? Sem problema. Em qual cidade será o atendimento?";
    if (!dados.logradouro) return "Qual é o nome da rua do atendimento?";
    if (!dados.numero) return "Qual é o número do imóvel?";
    return "Perfeito, já tenho as informações principais. Vou encaminhar seu atendimento para nossa equipe, tudo bem?";
  }

  private respostaPedeDadoTecnico(texto: string) {
    return /\b(modelo|marca|btus?|foto|etiqueta|n[uú]mero de s[eé]rie)\b/i.test(texto);
  }

  private protegerFluxoSemDadosTecnicos(dados: BoltData): BoltResult {
    if (!dados.cep) return { texto: "Para continuar, você sabe informar o CEP do endereço?", assumir: false, dados: { ...dados, etapa_atual: "aguardando_cep" } };
    if (!dados.cidade) return { texto: "Qual é a cidade do endereço?", assumir: false, dados: { ...dados, etapa_atual: "aguardando_cidade" } };
    if (!dados.logradouro) return { texto: "Qual é o nome da rua?", assumir: false, dados: { ...dados, etapa_atual: "aguardando_logradouro" } };
    if (!dados.numero) return { texto: "Qual é o número do imóvel?", assumir: false, dados: { ...dados, etapa_atual: "aguardando_numero" } };
    return { texto: "Perfeito. Não precisamos de modelo, BTUs ou fotos agora; o técnico fará essa identificação durante a visita. Vou encaminhar o atendimento para nossa equipe.", assumir: true, dados: { ...dados, status: "HUMAN_QUEUE", etapa_atual: null } };
  }

  private mesclarDadosIa(dadosEntrada: unknown, resultado: AiWhatsappResult): BoltData {
    const base = normalizarDadosBolt(dadosEntrada);
    const dados = resultado.dados;
    const servicos = ["instalacao", "desinstalacao", "manutencao", "manutencao_corretiva", "manutencao_preventiva", "limpeza_filtro", "aluguel", "pmoc", "venda_equipamento", "nao_identificado"] as const;
    const aliases: Record<string, BoltData["servico"]> = { limpeza: "limpeza_filtro", limpeza_de_ar: "limpeza_filtro", corretiva: "manutencao_corretiva", preventiva: "manutencao_preventiva" };
    const servicoNormalizado = dados.servico ? aliases[dados.servico] || dados.servico : null;
    const servico = servicoNormalizado && servicos.includes(servicoNormalizado as typeof servicos[number]) ? servicoNormalizado as BoltData["servico"] : base.servico;
    const merged: BoltData = {
      ...base,
      nome: dados.nome || base.nome,
      cidade: dados.cidade || base.cidade,
      uf: dados.uf?.toUpperCase() || base.uf,
      logradouro: dados.logradouro || base.logradouro,
      numero: dados.numero || base.numero,
      cep: dados.cep?.replace(/\D/g, "") || base.cep,
      servico,
      detalhes: dados.detalhes || base.detalhes,
      cidade_bairro: [dados.cidade || base.cidade, base.bairro].filter(Boolean).join(" - ") || base.cidade_bairro,
      ultima_interacao: new Date().toISOString()
    };
    merged.memoria = { ...base.memoria, nome_status: merged.nome ? "informado" : base.memoria.nome_status, cep_status: merged.cep ? "informado" : base.memoria.cep_status };
    return merged;
  }

  private enriquecerEstadoComBolt(base: BoltData, pista: BoltData): BoltData {
    return {
      ...base,
      nome: base.nome || pista.nome,
      servico: base.servico || pista.servico,
      detalhes: base.detalhes || pista.detalhes,
      email: base.email || pista.email,
      cep: base.cep || pista.cep,
      logradouro: base.logradouro || pista.logradouro,
      numero: base.numero || pista.numero,
      cidade: base.cidade || pista.cidade,
      uf: base.uf || pista.uf,
      bairro: base.bairro || pista.bairro,
      cidade_bairro: base.cidade_bairro || pista.cidade_bairro,
      campos_extra: { ...pista.campos_extra, ...base.campos_extra },
      memoria: { ...pista.memoria, ...base.memoria }
    };
  }

  private async buscarCepPorEndereco(dados: BoltData, uf: string, cidade: string, logradouro: string): Promise<BoltResult> {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(cidade)}/${encodeURIComponent(logradouro)}/json/`);
      const resultados = await response.json() as Array<{ cep?: string; logradouro?: string; bairro?: string; localidade?: string; uf?: string }>;
      if (!response.ok || !Array.isArray(resultados) || !resultados.length) return { texto: "Não encontrei essa rua nessa cidade. Informe também o bairro ou um ponto de referência.", assumir: false, dados: { ...dados, etapa_atual: "aguardando_logradouro" } };
      if (resultados.length > 1) {
        const opcoes = resultados.slice(0, 3).map((item) => ({ id: `cep_${item.cep?.replace(/\D/g, "") || "opcao"}`, title: `${item.logradouro || logradouro} - ${item.bairro || "bairro não informado"}`.slice(0, 20) }));
        return { texto: "Encontrei mais de um endereço possível. Qual deles é o correto?", assumir: false, dados: { ...dados, etapa_atual: "aguardando_confirmacao_endereco", campos_extra: { ...dados.campos_extra, opcoes_cep: JSON.stringify(resultados.slice(0, 3)) } }, opcoes };
      }
      const item = resultados[0];
      const cep = item.cep?.replace(/\D/g, "") || null;
      const atualizado: BoltData = { ...dados, cep, logradouro: item.logradouro?.trim() || logradouro, bairro: item.bairro?.trim() || dados.bairro, cidade: item.localidade?.trim() || cidade, uf: item.uf?.trim().toUpperCase() || uf, cidade_bairro: [item.localidade || cidade, item.bairro].filter(Boolean).join(" - "), etapa_atual: "aguardando_confirmacao_endereco", memoria: { ...dados.memoria, cep_status: cep ? "informado" : dados.memoria.cep_status } };
      return { texto: `Encontrei: ${atualizado.logradouro}, ${atualizado.bairro || ""}, ${atualizado.cidade}/${atualizado.uf}. Está correto?`, assumir: false, dados: atualizado, opcoes: [{ id: "cep_confirmar", title: "Confirmar" }, { id: "cep_corrigir", title: "Corrigir" }] };
    } catch (error) {
      this.logger.warn(`Falha na busca de CEP por rua: ${error instanceof Error ? error.message : "erro desconhecido"}`);
      return { texto: "Não consegui consultar o CEP agora. Informe o CEP se souber ou fale com um atendente.", assumir: false, dados: { ...dados, etapa_atual: "aguardando_cep" } };
    }
  }

  private async buscarCepInformado(dados: BoltData): Promise<BoltResult> {
    const endereco = dados.cep ? await this.consultarCep(dados.cep) : null;
    if (!endereco) return { texto: "Não consegui localizar esse CEP. Pode conferir os oito números ou me informar a cidade e o nome da rua?", assumir: false, dados: { ...dados, etapa_atual: "aguardando_cep" } };
    const atualizado: BoltData = { ...dados, cep: endereco.cep, logradouro: endereco.logradouro, bairro: endereco.bairro, cidade: endereco.cidade, uf: endereco.uf, cidade_bairro: [endereco.cidade, endereco.bairro].filter(Boolean).join(" - "), etapa_atual: "aguardando_confirmacao_endereco", memoria: { ...dados.memoria, cep_status: "informado" } };
    return { texto: `Encontrei o endereço: ${atualizado.logradouro || "rua não informada"}, ${atualizado.bairro || ""}, ${atualizado.cidade}/${atualizado.uf}. Está correto?`, assumir: false, dados: atualizado, opcoes: [{ id: "cep_confirmar", title: "Confirmar" }, { id: "cep_corrigir", title: "Corrigir" }] };
  }

  private async humanizarResposta(mensagem: IncomingMessage, resposta: BoltResult) {
    if (!this.ia || !resposta.texto) return resposta;
    try {
      const texto = await this.ia.humanizarResposta({ mensagem: mensagem.texto, nomeContato: mensagem.nome, resposta: resposta.texto, opcoes: resposta.opcoes?.map((opcao) => opcao.title) || [] });
      return texto ? { ...resposta, texto } : resposta;
    } catch {
      return resposta;
    }
  }

  private async processarRespostaOrcamento(conversa: { id: string; empresaId: string; telefone: string; nomeContato?: string | null }, texto: string) {
    const resposta = texto.match(/^orcamento_(aprovar|negociar):([0-9a-f-]{36})$/i);
    if (!resposta) return false;
    const aprovado = resposta[1].toLowerCase() === "aprovar";
    const resultado = await this.prisma.orcamento.updateMany({
      where: { id: resposta[2], empresaId: conversa.empresaId, conversaId: conversa.id, status: OrcamentoStatus.enviado },
      data: { status: aprovado ? OrcamentoStatus.aprovado : OrcamentoStatus.recusado }
    });
    if (!resultado.count) return false;
    const atendente = aprovado ? await this.prisma.whatsAppConversa.findUnique({ where: { id: conversa.id }, select: { cliente: { select: { nome: true } }, atribuidoUsuario: { select: { nome: true, telefone: true } } } }) : null;
    const orcamento = aprovado ? await this.prisma.orcamento.findFirst({ where: { id: resposta[2], empresaId: conversa.empresaId, status: OrcamentoStatus.aprovado }, select: { id: true, titulo: true, detalhes: true, agendadaPara: true, equipeId: true, tecnicoId: true, criadoPorUsuarioId: true } }) : null;
    let ordemCriada = false;
    let ordemCriadaId: string | null = null;
    if (orcamento?.criadoPorUsuarioId && this.adminService) {
      try {
        const resultadoOrdem = await this.criarOrdemDaConversa(conversa.id, conversa.empresaId, { titulo: orcamento.titulo, detalhes: orcamento.detalhes || undefined, origem: OrdemServicoOrigem.orcamento_aprovado, equipe_id: orcamento.equipeId || undefined, tecnico_id: orcamento.tecnicoId || undefined, agendada_para: orcamento.agendadaPara?.toISOString() }, { id: orcamento.criadoPorUsuarioId, empresa_id: conversa.empresaId, email: "", role: "admin" });
        ordemCriada = true;
        ordemCriadaId = resultadoOrdem.ordemServico?.id || null;
      } catch {
        // Se a agenda mudou, o atendente assume a conversa e resolve o conflito manualmente.
      }
    }
    const numeroOs = ordemCriadaId ? `OS-${ordemCriadaId.slice(0, 8).toUpperCase()}` : null;
    const textoResposta = aprovado
      ? numeroOs ? `Obrigado pela confiança, ${conversa.nomeContato || "cliente"}! Sua Ordem de Serviço ${numeroOs} foi formalizada. Enviaremos a confirmação com o técnico responsável e o horário do atendimento.` : `Obrigado pela confiança, ${conversa.nomeContato || "cliente"}! Recebemos sua autorização e já estamos formalizando a sua Ordem de Serviço. Em breve enviaremos o número da O.S. e o nome do técnico responsável pelo atendimento.`
      : "Sem problema. Um atendente entrará em contato para negociar o orçamento com você.";
    if (!ordemCriada) {
      const entrega = await this.sender.enviar({ to: conversa.telefone, text: textoResposta });
      await this.prisma.$transaction([
        this.prisma.whatsAppMensagem.create({ data: { conversaId: conversa.id, direcao: "saida", texto: textoResposta, mensagemId: entrega.messageId } }),
        this.prisma.whatsAppConversa.update({ where: { id: conversa.id }, data: { status: "humano", atribuidoUsuarioId: null, ultimaMensagemEm: new Date() } })
      ]);
    }
    if (atendente?.atribuidoUsuario?.telefone) {
      try {
        await this.sender.enviar({ to: atendente.atribuidoUsuario.telefone, text: ordemCriada ? `O cliente ${atendente.cliente?.nome || "do atendimento"} autorizou o orçamento e a ${numeroOs} foi criada automaticamente.` : `O cliente ${atendente.cliente?.nome || "do atendimento"} autorizou o orçamento. Acesse o painel e formalize a O.S.` });
      } catch {
        // A confirmação do cliente não deve falhar por indisponibilidade da notificação interna.
      }
    }
    this.emitir({ tipo: aprovado ? "orcamento_aprovado" : "orcamento_em_negociacao", conversaId: conversa.id, empresaId: conversa.empresaId });
    return true;
  }
  private async responderComCep(resposta: BoltResult, texto: string, dadosEntrada: unknown) {
    const dados = normalizarDadosBolt(dadosEntrada);
    if (resposta.dados.status !== "BOT_QUALIFYING" || resposta.dados.etapa_atual !== "aguardando_cep") return resposta;
    const cep = texto.replace(/\D/g, "");
    if (cep.length !== 8) return resposta;
    const endereco = await this.consultarCep(cep);
    if (!endereco) return { ...resposta, texto: "Não localizei esse CEP. Confira os oito números e envie novamente.", dados: { ...resposta.dados, tentativas_fallback: resposta.dados.tentativas_fallback + 1 } };
    const cidadeBairro = [endereco.cidade, endereco.bairro].filter(Boolean).join(" - ");
    const dadosComEndereco: BoltData = {
      ...dados,
      cep: endereco.cep,
      logradouro: endereco.logradouro,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      uf: endereco.uf,
      cidade_bairro: cidadeBairro,
      etapa_atual: "aguardando_confirmacao_endereco",
      tentativas_fallback: 0,
      ultima_interacao: new Date().toISOString()
    };
    dadosComEndereco.memoria = { ...dadosComEndereco.memoria, cep_status: "informado" };
    const enderecoTexto = [endereco.logradouro, endereco.bairro, `${endereco.cidade}/${endereco.uf}`].filter(Boolean).join(", ");
    return {
      texto: `Encontrei: ${enderecoTexto}. Está correto?`,
      assumir: false,
      dados: dadosComEndereco,
      opcoes: [{ id: "cep_confirmar", title: "🟢 Confirmar" }, { id: "cep_corrigir", title: "🟠 Corrigir CEP" }]
    };
  }

  private async consultarCep(cep: string) {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json() as { erro?: boolean; cep?: string; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (!response.ok || data.erro || !data.localidade || !data.uf) return null;
      return { cep: data.cep?.replace(/\D/g, "") || cep, logradouro: data.logradouro?.trim() || null, bairro: data.bairro?.trim() || null, cidade: data.localidade.trim(), uf: data.uf.trim().toUpperCase() };
    } catch {
      return null;
    }
  }
  private async dadosDaConversa(id: string, empresaId: string) {
    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId }, select: { dados: true } });
    return conversa.dados;
  }

  private atualizarStatus(dados: unknown, status: BoltData["status"]) { return { ...normalizarDadosBolt(dados), status }; }
  private criarPreviaOs(dados: BoltData): { titulo: string; detalhes: string; tipoServico: OrdemServicoTipoServico } {
    const local = dados.cidade_bairro ? `Local: ${dados.cidade_bairro}` : "";
    const extras = Object.entries(dados.campos_extra).filter(([, value]) => value != null && String(value).trim()).map(([campo, value]) => `${campo.replaceAll("_", " ")}: ${value}`);
    const tipoServico: OrdemServicoTipoServico = dados.servico === "instalacao" ? "instalacao" : dados.servico === "manutencao_preventiva" || dados.servico === "pmoc" ? "preventiva" : "corretiva";
    return { titulo: `Atendimento WhatsApp - ${dados.servico || "servico"}`, detalhes: [dados.detalhes, local, ...extras].filter(Boolean).join("\n"), tipoServico };
  }
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
          const textoDireto = this.record(mensagem.text).body;
          const interativo = this.record(mensagem.interactive);
          const respostaBotao = this.record(interativo.button_reply);
          const respostaLista = this.record(interativo.list_reply);
          const texto = typeof textoDireto === "string" ? textoDireto : typeof respostaBotao.id === "string" ? respostaBotao.id : typeof respostaLista.id === "string" ? respostaLista.id : undefined;
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
