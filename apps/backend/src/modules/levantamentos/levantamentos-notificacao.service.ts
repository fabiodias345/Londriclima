import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { WhatsAppCloudService, WhatsAppSender } from "../automacoes/whatsapp-cloud.service";

type TipoNotificacao = "agendado" | "alterado" | "cancelado" | "lembrete";

type LevantamentoNotificavel = {
  id: string;
  status: string;
  problema: string;
  agendadaPara: Date | null;
  tecnicoAvisadoEm: Date | null;
  lembreteTecnicoEm: Date | null;
  tecnico: { nome: string; telefone: string | null } | null;
  cliente: { nome: string; enderecos?: Array<{ logradouro?: string | null; numero?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null }> };
};

type LevantamentoDelegate = {
  findFirst(args: unknown): Promise<LevantamentoNotificavel | null>;
  findMany(args: unknown): Promise<LevantamentoNotificavel[]>;
  update(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<{ count: number }>;
};

@Injectable()
export class LevantamentosNotificacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(WhatsAppCloudService) private readonly sender: WhatsAppSender
  ) {}

  async enviarConfirmacao(levantamentoId: string, empresaId: string) {
    const levantamento = await this.obter(levantamentoId, empresaId);
    if (!levantamento || levantamento.tecnicoAvisadoEm) return false;
    return this.enviar(levantamento, "agendado");
  }

  async enviarAlteracao(levantamentoId: string, empresaId: string) {
    const levantamento = await this.obter(levantamentoId, empresaId);
    return levantamento ? this.enviar(levantamento, "alterado") : false;
  }

  async enviarCancelamento(levantamentoId: string, empresaId: string) {
    const levantamento = await this.obter(levantamentoId, empresaId);
    return levantamento ? this.enviar(levantamento, "cancelado") : false;
  }

  async reenviar(levantamentoId: string, empresaId: string) {
    const levantamento = await this.obter(levantamentoId, empresaId);
    if (!levantamento) return false;
    return this.enviar(levantamento, levantamento.status === "cancelado" ? "cancelado" : "agendado");
  }

  async enviarLembretesPendentes(agora = new Date()) {
    const inicio = new Date(agora.getTime() + 55 * 60 * 1000);
    const fim = new Date(agora.getTime() + 65 * 60 * 1000);
    const levantamentos = await this.delegate().findMany({
      where: { status: "agendado", agendadaPara: { gt: inicio, lte: fim }, lembreteTecnicoEm: null },
      include: this.includeNotificacao()
    });

    let enviados = 0;
    let falhas = 0;
    for (const levantamento of levantamentos) {
      const reserva = await this.delegate().updateMany({
        where: { id: levantamento.id, lembreteTecnicoEm: null },
        data: { lembreteTecnicoEm: agora }
      });
      if (!reserva.count) continue;

      if (await this.enviar(levantamento, "lembrete")) enviados += 1;
      else falhas += 1;
    }
    return { enviados, falhas };
  }

  private async enviar(levantamento: LevantamentoNotificavel, tipo: TipoNotificacao) {
    const erro = this.validarEnvio(levantamento, tipo);
    if (erro) {
      await this.persistirErro(levantamento.id, erro, tipo);
      return false;
    }

    try {
      await this.sender.enviarTemplate!(levantamento.tecnico!.telefone!, {
        name: this.template(tipo),
        language: this.config.get<string>("WHATSAPP_TEMPLATE_LANGUAGE", "pt_BR"),
        parameters: this.parametros(levantamento)
      });
      await this.delegate().update({
        where: { id: levantamento.id },
        data: { notificacaoErro: null, ...(tipo === "lembrete" ? { lembreteTecnicoEm: new Date() } : { tecnicoAvisadoEm: new Date() }) }
      });
      return true;
    } catch (error) {
      await this.persistirErro(levantamento.id, this.mensagemErro(error), tipo);
      return false;
    }
  }

  private async obter(id: string, empresaId: string) {
    return this.delegate().findFirst({ where: { id, empresaId }, include: this.includeNotificacao() });
  }

  private includeNotificacao() {
    return { tecnico: { select: { nome: true, telefone: true } }, cliente: { select: { nome: true, enderecos: { take: 1, orderBy: { criadoEm: "asc" }, select: { logradouro: true, numero: true, bairro: true, cidade: true, uf: true } } } } };
  }

  private validarEnvio(levantamento: LevantamentoNotificavel, tipo: TipoNotificacao) {
    if (!this.sender.enviarTemplate) return "Envio de template WhatsApp indisponivel.";
    if (!levantamento.tecnico?.telefone) return "Tecnico sem telefone para notificacao.";
    if (!levantamento.agendadaPara && tipo !== "cancelado") return "Levantamento sem data de agendamento.";
    if (!this.template(tipo)) return `Template WhatsApp de levantamento ${tipo} nao configurado.`;
    return null;
  }

  private template(tipo: TipoNotificacao) {
    const chaves: Record<TipoNotificacao, string> = {
      agendado: "WHATSAPP_TEMPLATE_LEVANTAMENTO_AGENDADO",
      alterado: "WHATSAPP_TEMPLATE_LEVANTAMENTO_ALTERADO",
      cancelado: "WHATSAPP_TEMPLATE_LEVANTAMENTO_CANCELADO",
      lembrete: "WHATSAPP_TEMPLATE_LEVANTAMENTO_LEMBRETE"
    };
    return this.config.get<string>(chaves[tipo])?.trim() || "";
  }

  private parametros(levantamento: LevantamentoNotificavel) {
    return [levantamento.tecnico!.nome, levantamento.cliente.nome, this.endereco(levantamento), this.formatarData(levantamento.agendadaPara), levantamento.problema];
  }

  private endereco(levantamento: LevantamentoNotificavel) {
    const endereco = levantamento.cliente.enderecos?.[0];
    if (!endereco) return "Endereco do cliente nao informado";
    return [endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.uf].filter(Boolean).join(", ");
  }

  private formatarData(data: Date | null) {
    return data ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(data) : "A confirmar";
  }

  private async persistirErro(id: string, erro: string, tipo: TipoNotificacao) {
    await this.delegate().update({ where: { id }, data: { notificacaoErro: erro, ...(tipo === "lembrete" ? { lembreteTecnicoEm: null } : {}) } });
  }

  private mensagemErro(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private delegate() {
    return (this.prisma as unknown as { levantamentoTecnico: LevantamentoDelegate }).levantamentoTecnico;
  }
}
