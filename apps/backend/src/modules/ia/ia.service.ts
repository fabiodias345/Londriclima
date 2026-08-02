import { BadGatewayException, BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { AiDraft, AiDraftItem, AiWhatsappResult } from "./ia.types";

type CatalogItem = { id: string; tipo: string; nome: string; unidade: string; valor: number; descricao: string | null };

@Injectable()
export class IaService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async analisarAtendimentoWhatsapp(input: { mensagem: string; nomeContato?: string; dados: unknown; historico: unknown[] }): Promise<AiWhatsappResult | null> {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey || !input.mensagem.trim()) return null;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model: this.config.get<string>("OPENAI_MODEL", "gpt-5.6-luna"),
        input: [
          { role: "system", content: [{ type: "input_text", text: "VocÃª Ã© o atendente inteligente da Air Move ClimatizaÃ§Ã£o. Interprete a mensagem atual usando o histÃ³rico e o estado existente. Responda em portuguÃªs do Brasil, de forma natural e objetiva. Extraia somente dados presentes ou claramente informados. Nunca invente preÃ§os, descontos, disponibilidade, CEP, endereÃ§o, tÃ©cnico, agenda ou serviÃ§os. Sempre pergunte primeiro o CEP com perguntar_cep. Se o cliente disser que nÃ£o sabe ou nÃ£o tem o CEP, use perguntar_cidade; depois de cidade e UF, solicite o nome da rua e use buscar_cep_rua. Se houver cidade sem UF e a UF nÃ£o puder ser determinada, use perguntar_uf. Use transferir quando o cliente pedir atendente. Retorne somente o JSON do schema." }] },
          { role: "user", content: [{ type: "input_text", text: JSON.stringify({ mensagem_atual: input.mensagem, nome_contato: input.nomeContato || null, estado: input.dados, historico: input.historico.slice(-20) }) }] }
        ],
        text: { format: { type: "json_schema", name: "atendimento_whatsapp", strict: true, schema: {
          type: "object", additionalProperties: false,
          properties: {
            resposta: { type: "string" },
            intencao: { type: "string", enum: ["instalacao", "manutencao", "orcamento", "endereco", "outro"] },
            dados: { type: "object", additionalProperties: false, properties: {
              nome: { type: ["string", "null"] }, cidade: { type: ["string", "null"] }, uf: { type: ["string", "null"] },
              logradouro: { type: ["string", "null"] }, numero: { type: ["string", "null"] }, cep: { type: ["string", "null"] },
              servico: { type: ["string", "null"] }, detalhes: { type: ["string", "null"] }
            }, required: ["nome", "cidade", "uf", "logradouro", "numero", "cep", "servico", "detalhes"] },
            proxima_acao: { type: "string", enum: ["perguntar_cep", "perguntar_cidade", "perguntar_uf", "buscar_cep_rua", "confirmar_endereco", "continuar", "transferir"] },
            perguntas_pendentes: { type: "array", items: { type: "string" } }
          }, required: ["resposta", "intencao", "dados", "proxima_acao", "perguntas_pendentes"]
        } } }
      })
    });
    if (!response.ok) return null;
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const output = payload.output_text || payload.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join("");
    if (!output) return null;
    try {
      const result = JSON.parse(output) as AiWhatsappResult;
      if (!result.resposta?.trim() || !result.dados || !["perguntar_cep", "perguntar_cidade", "perguntar_uf", "buscar_cep_rua", "confirmar_endereco", "continuar", "transferir"].includes(result.proxima_acao)) return null;
      return { ...result, resposta: result.resposta.trim(), perguntas_pendentes: Array.isArray(result.perguntas_pendentes) ? result.perguntas_pendentes.map(String) : [] };
    } catch {
      return null;
    }
  }

  async humanizarResposta(input: { mensagem: string; resposta: string; nomeContato?: string; opcoes?: string[] }) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey || !input.resposta.trim()) return null;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.get<string>("OPENAI_MODEL", "gpt-5.6-luna"),
        input: [
          { role: "system", content: [{ type: "input_text", text: "Você é a assistente virtual da Air Move Climatização. Reescreva somente a resposta-base em português do Brasil, com tom humano, cordial e objetivo. Preserve exatamente a intenção, perguntas, alternativas e transferência para atendente. Não invente preços, descontos, prazos, disponibilidade, técnicos, agenda, documentos ou serviços. Não faça perguntas além das que já existem. Retorne apenas JSON no formato solicitado." }] },
          { role: "user", content: [{ type: "input_text", text: JSON.stringify({ mensagem: input.mensagem, nome: input.nomeContato || null, resposta_base: input.resposta, opcoes: input.opcoes || [] }) }] }
        ],
        text: { format: { type: "json_schema", name: "resposta_whatsapp", strict: true, schema: { type: "object", additionalProperties: false, properties: { texto: { type: "string" } }, required: ["texto"] } } }
      })
    });
    if (!response.ok) return null;
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const output = payload.output_text || payload.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join("");
    if (!output) return null;
    try {
      const texto = String((JSON.parse(output) as { texto?: unknown }).texto || "").trim();
      return texto || null;
    } catch {
      return null;
    }
  }

  async buscarOuIdentificarCliente(empresaId: string, query: string, conversaId?: string) {
    const termo = query.trim();
    if (!termo && conversaId) {
      const conversa = await this.prisma.whatsAppConversa.findFirst({ where: { id: conversaId, empresaId }, select: { cliente: { include: { enderecos: true } } } });
      return conversa?.cliente ? { cliente: conversa.cliente, candidatos: [conversa.cliente] } : { cliente: null, candidatos: [] };
    }
    if (!termo) throw new BadRequestException("Informe nome, telefone, e-mail ou documento do cliente.");
    const telefone = termo.replace(/\D/g, "");
    const clientes = await this.prisma.cliente.findMany({
      where: { empresaId, OR: [{ nome: { contains: termo, mode: "insensitive" } }, { email: { contains: termo, mode: "insensitive" } }, { documento: { contains: termo } }, ...(telefone ? [{ telefone: { contains: telefone } }] : [])] },
      include: { enderecos: { orderBy: { principal: "desc" } } }, take: 20, orderBy: { nome: "asc" }
    });
    return { cliente: clientes.length === 1 ? clientes[0] : null, candidatos: clientes };
  }

  async consultarCatalogo(empresaId: string, busca?: string) {
    const termo = busca?.trim();
    const items = await this.prisma.catalogoItem.findMany({
      where: { empresaId, ativo: true, ...(termo ? { OR: [{ nome: { contains: termo, mode: "insensitive" } }, { descricao: { contains: termo, mode: "insensitive" } }, { grupo: { contains: termo, mode: "insensitive" } }] } : {}) },
      select: { id: true, tipo: true, nome: true, unidade: true, valor: true, descricao: true }, orderBy: { nome: "asc" }, take: 100
    });
    return { items: items.map((item) => ({ ...item, valor: Number(item.valor) })) };
  }

  async calcularTotais(empresaId: string, itens: AiDraftItem[], desconto = 0) {
    if (!Array.isArray(itens) || !itens.length) throw new BadRequestException("Inclua ao menos um item no rascunho.");
    const ids = itens.map((item) => item.item_catalogo_id).filter((id): id is string => Boolean(id));
    const catalogo = await this.prisma.catalogoItem.findMany({ where: { empresaId, ativo: true, id: { in: ids } }, select: { id: true, tipo: true, nome: true, unidade: true, valor: true, descricao: true } });
    const porId = new Map(catalogo.map((item) => [item.id, item]));
    const itensCalculados = itens.map((item) => {
      const catalogoItem = item.item_catalogo_id ? porId.get(item.item_catalogo_id) : undefined;
      const quantidade = Number(item.quantidade);
      if (!Number.isFinite(quantidade) || quantidade <= 0) throw new BadRequestException("A quantidade dos itens deve ser maior que zero.");
      if (!catalogoItem) return { ...item, valor_unitario: null, valor_total: null, pendencia: "Associe o item a um item ativo do catálogo." };
      const valorUnitario = Number(catalogoItem.valor);
      return { item_catalogo_id: catalogoItem.id, tipo: catalogoItem.tipo, descricao: catalogoItem.nome, unidade: catalogoItem.unidade, quantidade, valor_unitario: valorUnitario, valor_total: quantidade * valorUnitario };
    });
    if (itensCalculados.some((item) => item.valor_total === null)) return { itens: itensCalculados, subtotal: null, desconto: 0, total: null, pendencias: ["Existem itens sem preço validado no catálogo."] };
    const subtotal = itensCalculados.reduce((total, item) => total + Number(item.valor_total), 0);
    const valorDesconto = Number(desconto || 0);
    if (!Number.isFinite(valorDesconto) || valorDesconto < 0 || valorDesconto > subtotal) throw new BadRequestException("O desconto deve estar entre zero e o subtotal.");
    return { itens: itensCalculados, subtotal, desconto: valorDesconto, total: subtotal - valorDesconto, pendencias: [] };
  }

  async montarRascunhoOrcamento(empresaId: string, conversaId: string, draft: { titulo?: string; itens: AiDraftItem[]; desconto?: number }) {
    const conversa = await this.prisma.whatsAppConversa.findFirst({ where: { id: conversaId, empresaId }, include: { cliente: true } });
    if (!conversa) throw new BadRequestException("Conversa não encontrada.");
    if (!conversa.clienteId) throw new BadRequestException("Associe um cliente antes de montar o orçamento.");
    const totais = await this.calcularTotais(empresaId, draft.itens, draft.desconto);
    return { conversa_id: conversaId, cliente: conversa.cliente, titulo: draft.titulo?.trim() || "Orçamento de serviço", ...totais, pode_confirmar: totais.total !== null };
  }

  async analisarConversa(conversaId: string, empresaId: string, contexto = ""): Promise<AiDraft> {
    const conversa = await this.prisma.whatsAppConversa.findFirst({ where: { id: conversaId, empresaId }, include: { mensagens: { orderBy: { criadoEm: "asc" } }, cliente: { include: { enderecos: true } } } });
    if (!conversa) throw new BadRequestException("Conversa não encontrada.");
    const catalogo = await this.consultarCatalogo(empresaId);
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) throw new BadGatewayException("OPENAI_API_KEY não configurada.");
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({
      model: this.config.get<string>("OPENAI_MODEL", "gpt-5.6-luna"),
      input: [{ role: "system", content: [{ type: "input_text", text: "Você é um copiloto comercial. Extraia somente dados presentes na conversa. Nunca invente preços, descontos ou totais. Para itens, escolha somente um id existente no catálogo; se não houver correspondência, use item_catalogo_id null e inclua uma pergunta pendente. Retorne apenas JSON." }] }, { role: "system", content: [{ type: "input_text", text: "Os preços serão sempre preenchidos manualmente pelo atendente. Nunca crie pergunta pendente sobre preço, catálogo ou valor. Concentre perguntas pendentes nos dados faltantes do cliente e endereço, como nome, documento, e-mail, rua, número, bairro, cidade, UF e CEP. Escreva cada pergunta pronta para enviar ao cliente, por exemplo: Por favor, me passe o número da sua casa para completar seu cadastro." }] }, { role: "user", content: [{ type: "input_text", text: JSON.stringify({ mensagens: conversa.mensagens, cliente: conversa.cliente, contexto, catalogo: catalogo.items }) }] }],
      text: { format: { type: "json_schema", name: "rascunho_atendimento", strict: true, schema: { type: "object", additionalProperties: false, properties: { cliente: { type: "object", additionalProperties: false, properties: { tipo: { type: ["string", "null"] }, nome: { type: ["string", "null"] }, documento: { type: ["string", "null"] }, email: { type: ["string", "null"] }, telefone: { type: ["string", "null"] } }, required: ["tipo", "nome", "documento", "email", "telefone"] }, atendimento: { type: "object", additionalProperties: false, properties: { servico: { type: ["string", "null"] }, equipamento: { type: ["string", "null"] }, capacidade_btu: { type: ["number", "null"] }, urgencia: { type: ["string", "null"] }, detalhes: { type: ["string", "null"] } }, required: ["servico", "equipamento", "capacidade_btu", "urgencia", "detalhes"] }, orcamento: { type: "object", additionalProperties: false, properties: { titulo: { type: ["string", "null"] }, itens: { type: "array", items: { type: "object", additionalProperties: false, properties: { item_catalogo_id: { type: ["string", "null"] }, tipo: { type: "string", enum: ["servico", "material", "peca", "equipamento"] }, descricao: { type: "string" }, unidade: { type: "string" }, quantidade: { type: "number" } }, required: ["item_catalogo_id", "tipo", "descricao", "unidade", "quantidade"] } }, desconto: { type: "number" } }, required: ["titulo", "itens", "desconto"] }, perguntas_pendentes: { type: "array", items: { type: "string" } }, confianca: { type: "number" } }, required: ["cliente", "atendimento", "orcamento", "perguntas_pendentes", "confianca"] } } }
    }) });
    if (!response.ok) throw new BadGatewayException("Não foi possível consultar a IA.");
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const output = payload.output_text || payload.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join("");
    if (!output) throw new BadGatewayException("A IA não retornou um rascunho.");
    let extraido: Omit<AiDraft, "orcamento"> & { orcamento: { titulo?: string; itens: AiDraftItem[]; desconto?: number } };
    try { extraido = JSON.parse(output); } catch { throw new BadGatewayException("A IA retornou um formato inválido."); }
    const totais = await this.calcularTotais(empresaId, extraido.orcamento.itens, extraido.orcamento.desconto);
    return { ...extraido, orcamento: { titulo: extraido.orcamento.titulo, itens: totais.itens as AiDraftItem[], desconto: totais.desconto, subtotal: totais.subtotal ?? 0, total: totais.total ?? 0 }, perguntas_pendentes: extraido.perguntas_pendentes };
  }
}
