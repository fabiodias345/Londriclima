import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { AtendimentoAiInput, AtendimentoAiResult } from "./ia.types";

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    resumo: { type: "string" },
    cliente: { type: "object", additionalProperties: false, properties: {
      nome: { type: ["string", "null"] }, telefone: { type: ["string", "null"] }, email: { type: ["string", "null"] }
    }, required: ["nome", "telefone", "email"] },
    servico: { type: "object", additionalProperties: false, properties: {
      descricao: { type: ["string", "null"] }, equipamento: { type: ["string", "null"] }, urgencia: { type: ["string", "null"], enum: ["baixa", "normal", "alta", null] }
    }, required: ["descricao", "equipamento", "urgencia"] },
    endereco: { type: "object", additionalProperties: false, properties: {
      texto: { type: ["string", "null"] }, cep: { type: ["string", "null"] }
    }, required: ["texto", "cep"] },
    perguntasPendentes: { type: "array", items: { type: "string" } },
    sugestaoResposta: { type: ["string", "null"] }
  },
  required: ["resumo", "cliente", "servico", "endereco", "perguntasPendentes", "sugestaoResposta"]
};

@Injectable()
export class IaService {
  constructor(private readonly config: ConfigService) {}

  async analisarAtendimento(input: AtendimentoAiInput): Promise<AtendimentoAiResult> {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) throw new ServiceUnavailableException("OPENAI_API_KEY nao configurada no backend.");

    const response = await axios.post<{ output_text?: string }>(
      this.config.get<string>("OPENAI_BASE_URL", "https://api.openai.com/v1") + "/responses",
      {
        model: this.config.get<string>("OPENAI_MODEL", "gpt-5.6-luna"),
        input: [
          { role: "system", content: "Analise o atendimento em portugues. Extraia somente dados presentes nas mensagens. Nunca invente precos, totais ou dados do cliente. Sugira perguntas para dados ausentes e trate a resposta como rascunho para revisao humana." },
          { role: "user", content: JSON.stringify(input) }
        ],
        text: { format: { type: "json_schema", name: "atendimento_ai", strict: true, schema: RESULT_SCHEMA } }
      },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 30000 }
    ).catch((error: unknown) => {
      const message = axios.isAxiosError(error) ? error.response?.data?.error?.message : undefined;
      throw new ServiceUnavailableException(message || "Falha ao consultar a IA.");
    });

    const texto = response.data.output_text;
    if (!texto) throw new ServiceUnavailableException("A IA retornou uma resposta vazia.");
    try {
      return JSON.parse(texto) as AtendimentoAiResult;
    } catch {
      throw new ServiceUnavailableException("A IA retornou uma resposta invalida.");
    }
  }
}
