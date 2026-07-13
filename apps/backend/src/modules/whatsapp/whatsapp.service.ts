import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { WhatsAppCloudService } from "../automacoes/whatsapp-cloud.service";

type JsonRecord = Record<string, unknown>;

@Injectable()
export class WhatsAppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sender: WhatsAppCloudService
  ) {}

  verificarWebhookToken(token: string | undefined) {
    const esperado = this.config.get<string>("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
    return Boolean(esperado?.trim() && token === esperado.trim());
  }

  async receberWebhook(payload: JsonRecord) {
    const mensagens = this.extrairMensagens(payload);

    for (const mensagem of mensagens) {
      await this.processarMensagem(mensagem);
    }

    return { recebido: true, mensagens: mensagens.length };
  }

  async listarConversas(empresaId: string) {
    const items = await this.prisma.whatsAppConversa.findMany({
      where: { empresaId },
      orderBy: { ultimaMensagemEm: "desc" },
      take: 100,
      include: {
        mensagens: { orderBy: { criadoEm: "desc" }, take: 1 },
        atribuidoUsuario: { select: { id: true, nome: true } }
      }
    });

    return { items, total: items.length };
  }

  async obterConversa(id: string, empresaId: string) {
    return this.prisma.whatsAppConversa.findFirstOrThrow({
      where: { id, empresaId },
      include: {
        mensagens: { orderBy: { criadoEm: "asc" } },
        atribuidoUsuario: { select: { id: true, nome: true } }
      }
    });
  }

  async assumirConversa(id: string, empresaId: string, usuarioId: string) {
    return this.prisma.whatsAppConversa.updateMany({
      where: { id, empresaId },
      data: { status: "humano", atribuidoUsuarioId: usuarioId }
    });
  }

  async responderConversa(id: string, empresaId: string, texto: string) {
    if (!texto.trim()) {
      throw new BadRequestException("Mensagem vazia.");
    }

    const conversa = await this.prisma.whatsAppConversa.findFirstOrThrow({ where: { id, empresaId } });
    const entrega = await this.sender.enviar({ to: conversa.telefone, text: texto });
    await this.prisma.whatsAppConversa.update({
      where: { id: conversa.id },
      data: { status: "humano", ultimaMensagemEm: new Date() }
    });
    return this.prisma.whatsAppMensagem.create({
      data: { conversaId: conversa.id, direcao: "saida", texto: texto.trim(), mensagemId: entrega.messageId }
    });
  }

  private async processarMensagem(mensagem: IncomingMessage) {
    const empresa = await this.obterEmpresa();

    if (!empresa) {
      return;
    }

    const conversa = await this.prisma.whatsAppConversa.upsert({
      where: { empresaId_telefone: { empresaId: empresa.id, telefone: mensagem.telefone } },
      create: {
        empresaId: empresa.id,
        telefone: mensagem.telefone,
        nomeContato: mensagem.nome,
        ultimaMensagemEm: new Date()
      },
      update: { nomeContato: mensagem.nome, ultimaMensagemEm: new Date() }
    });

    if (mensagem.id) {
      const existente = await this.prisma.whatsAppMensagem.findUnique({ where: { mensagemId: mensagem.id } });
      if (existente) {
        return;
      }
    }

    await this.prisma.whatsAppMensagem.create({
      data: {
        conversaId: conversa.id,
        direcao: "entrada",
        texto: mensagem.texto,
        mensagemId: mensagem.id,
        tipo: mensagem.tipo
      }
    });

    if (conversa.status === "humano" || conversa.status === "encerrada") {
      return;
    }

    const resposta = this.responderBot(mensagem.texto);
    if (!resposta) {
      return;
    }

    try {
      const entrega = await this.sender.enviar({ to: mensagem.telefone, text: resposta.texto });
      await this.prisma.whatsAppMensagem.create({
        data: { conversaId: conversa.id, direcao: "saida", texto: resposta.texto, mensagemId: entrega.messageId }
      });
      if (resposta.assumir) {
        await this.prisma.whatsAppConversa.update({ where: { id: conversa.id }, data: { status: "humano" } });
      }
    } catch {
      // A mensagem recebida permanece salva mesmo quando o envio de resposta falhar.
    }
  }

  private responderBot(texto: string) {
    const normalizado = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    if (/(humano|atendente|pessoa|equipe)/.test(normalizado)) {
      return { assumir: true, texto: "Certo. Vou encaminhar sua conversa para um atendente da AIRMOVEBR." };
    }

    if (/^(oi|ola|bom dia|boa tarde|boa noite|menu|inicio)/.test(normalizado)) {
      return { assumir: false, texto: "Olá! Sou o assistente da AIRMOVEBR. Informe uma opção:\n1 - Manutenção\n2 - Instalação\n3 - PMOC\n4 - Locação\n5 - Falar com atendente" };
    }

    return { assumir: false, texto: "Entendi. Para agilizar, informe seu nome, o serviço desejado e explique brevemente o que precisa. Se preferir, digite atendente." };
  }

  private async obterEmpresa() {
    const empresaId = this.config.get<string>("LONDRI_WHATS_EMPRESA_ID");
    if (empresaId) {
      return this.prisma.empresa.findUnique({ where: { id: empresaId } });
    }

    return this.prisma.empresa.findFirst({ where: { ativa: true }, orderBy: { criadoEm: "asc" } });
  }

  private extrairMensagens(payload: JsonRecord): IncomingMessage[] {
    const resultado: IncomingMessage[] = [];
    const entries = Array.isArray(payload.entry) ? payload.entry : [];

    for (const entry of entries) {
      const changes = this.record(entry).changes;
      if (!Array.isArray(changes)) continue;
      for (const change of changes) {
        const value = this.record(this.record(change).value);
        const contacts = Array.isArray(value.contacts) ? value.contacts : [];
        const contact = this.record(contacts[0]);
        const messages = Array.isArray(value.messages) ? value.messages : [];
        for (const item of messages) {
          const mensagem = this.record(item);
          const text = this.record(mensagem.text).body;
          if (typeof mensagem.from !== "string" || typeof text !== "string") continue;
          resultado.push({
            id: typeof mensagem.id === "string" ? mensagem.id : undefined,
            telefone: mensagem.from,
            nome: typeof this.record(contact.profile).name === "string" ? String(this.record(contact.profile).name) : undefined,
            texto: text,
            tipo: typeof mensagem.type === "string" ? mensagem.type : "text"
          });
        }
      }
    }

    return resultado;
  }

  private record(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
  }
}

type IncomingMessage = {
  id?: string;
  telefone: string;
  nome?: string;
  texto: string;
  tipo: string;
};
