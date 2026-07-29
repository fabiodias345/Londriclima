import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";

export type AiDraft = {
  cliente: {
    tipo?: "pf" | "pj";
    nome?: string;
    documento?: string;
    email?: string;
    telefone?: string;
    endereco?: { logradouro?: string; numero?: string; bairro?: string; cidade?: string; uf?: string; cep?: string };
  };
  atendimento: { servico?: string; equipamento?: string; capacidade_btu?: number; urgencia?: string; detalhes?: string };
  orcamento: { titulo?: string; itens: Array<{ tipo: "servico" | "material" | "peca" | "equipamento"; descricao: string; unidade: string; quantidade: number; valor_unitario: number }>; desconto: number; total_informado?: number };
  perguntas_pendentes: string[];
  confianca: number;
};

@Injectable()
export class IaService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async analisarConversa(conversaId: string, empresaId: string, contexto: string): Promise<AiDraft> {
    const conversa = await this.prisma.whatsAppConversa.findFirst({
      where: { id: conversaId, empresaId },
      include: { mensagens: { orderBy: { criadoEm: "asc" } }, cliente: { include: { enderecos: true } } }
    });
    if (!conversa) throw new BadGatewayException("Conversa não encontrada.");

    const catalogo = await this.prisma.catalogoItem.findMany({
      where: { empresaId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, tipo: true, nome: true, unidade: true, valor: true, descricao: true }
    });
    const input = JSON.stringify({
      conversa: conversa.mensagens.map((mensagem) => ({ direcao: mensagem.direcao, texto: mensagem.texto, criado_em: mensagem.criadoEm })),
      cliente_atual: conversa.cliente,
      contexto_atendente: contexto.trim(),
      catalogo: catalogo.map((item) => ({ ...item, valor: Number(item.valor) }))
    });

    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) throw new BadGatewayException("OPENAI_API_KEY não configurada.");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.get<string>("OPENAI_MODEL", "gpt-5.6-luna"),
        input: [
          { role: "system", content: [{ type: "input_text", text: "Você é um copiloto comercial. Extraia apenas informações presentes na conversa ou no contexto. Nunca invente preço. Se o valor não estiver informado, deixe o item sem preço e inclua pergunta pendente. Retorne somente JSON válido no formato solicitado." }] },
          { role: "user", content: [{ type: "input_text", text: input }] }
        ],
        text: { format: { type: "json_schema", name: "rascunho_atendimento", strict: true, schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            cliente: { type: "object", additionalProperties: false, properties: { tipo: { type: ["string", "null"] }, nome: { type: ["string", "null"] }, documento: { type: ["string", "null"] }, email: { type: ["string", "null"] }, telefone: { type: ["string", "null"] }, endereco: { type: ["object", "null"], additionalProperties: false, properties: { logradouro: { type: ["string", "null"] }, numero: { type: ["string", "null"] }, bairro: { type: ["string", "null"] }, cidade: { type: ["string", "null"] }, uf: { type: ["string", "null"] }, cep: { type: ["string", "null"] } }, required: ["logradouro", "numero", "bairro", "cidade", "uf", "cep"] } }, required: ["tipo", "nome", "documento", "email", "telefone", "endereco"] },
            atendimento: { type: "object", additionalProperties: false, properties: { servico: { type: ["string", "null"] }, equipamento: { type: ["string", "null"] }, capacidade_btu: { type: ["number", "null"] }, urgencia: { type: ["string", "null"] }, detalhes: { type: ["string", "null"] } }, required: ["servico", "equipamento", "capacidade_btu", "urgencia", "detalhes"] },
            orcamento: { type: "object", additionalProperties: false, properties: { titulo: { type: ["string", "null"] }, itens: { type: "array", items: { type: "object", additionalProperties: false, properties: { tipo: { type: "string", enum: ["servico", "material", "peca", "equipamento"] }, descricao: { type: "string" }, unidade: { type: "string" }, quantidade: { type: "number" }, valor_unitario: { type: "number" } }, required: ["tipo", "descricao", "unidade", "quantidade", "valor_unitario"] } }, desconto: { type: "number" }, total_informado: { type: ["number", "null"] } }, required: ["titulo", "itens", "desconto", "total_informado"] },
            perguntas_pendentes: { type: "array", items: { type: "string" } },
            confianca: { type: "number" }
          },
          required: ["cliente", "atendimento", "orcamento", "perguntas_pendentes", "confianca"]
        } } }
      })
    });
    if (!response.ok) throw new BadGatewayException("Não foi possível consultar a IA.");
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const text = payload.output_text || payload.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join("");
    if (!text) throw new BadGatewayException("A IA não retornou um rascunho.");
    try { return JSON.parse(text) as AiDraft; } catch { throw new BadGatewayException("A IA retornou um formato inválido."); }
  }
}
