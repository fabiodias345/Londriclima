import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { exigirString, extrairLista, extrairPayload, isRecord } from "../assinaturas/assinafy.helpers";
import { OrcamentoAssinaturaResult, OrcamentoDocumento } from "./comercial-orcamento-integrations";

type AssinafySigner = { id?: unknown; email?: unknown; full_name?: unknown };

@Injectable()
export class ComercialAssinafyService {
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({
      baseURL: this.config.get<string>("ASSINAFY_BASE_URL") ?? "https://api.assinafy.com.br/v1",
      timeout: 30000
    });
  }

  async enviarOrcamento(orcamento: { id: string; titulo: string; total: unknown; cliente: { nome: string; email?: string | null } }, documento: OrcamentoDocumento): Promise<OrcamentoAssinaturaResult> {
    if (Number(orcamento.total) <= 2000) throw new BadRequestException("Assinafy exige orçamento acima de R$ 2.000,00.");
    const email = orcamento.cliente.email?.trim();
    if (!email) throw new BadRequestException("Cliente sem e-mail para assinatura.");
    const accountId = await this.obterAccountId();
    const signerId = await this.obterOuCriarSignerId(accountId, { nome: orcamento.cliente.nome, email });
    const form = new FormData();
    const bytes = documento.content.buffer.slice(documento.content.byteOffset, documento.content.byteOffset + documento.content.byteLength) as ArrayBuffer;
    form.append("file", new Blob([bytes], { type: documento.contentType }), documento.filename);
    form.append("title", `Orçamento ${orcamento.titulo}`);
    form.append("description", "Proposta comercial AIRMOVEBR.");
    const documentoResponse = await this.post(`/accounts/${accountId}/documents`, form, { maxBodyLength: Infinity });
    const documentoPayload = extrairPayload(documentoResponse.data);
    const documentId = exigirString(documentoPayload.id, "documento Assinafy");
    const assignmentResponse = await this.post(`/documents/${documentId}/assignments`, { signers: [{ id: signerId }] });
    const assignmentPayload = extrairPayload(assignmentResponse.data);
    const assignmentId = exigirString(assignmentPayload.id, "atribuição Assinafy");
    return { documentId, assignmentId, status: exigirString(assignmentPayload.status ?? "pending", "status Assinafy"), evento: assignmentPayload };
  }

  private async obterAccountId() {
    const response = await this.get("/accounts");
    const accounts = Array.isArray(response.data) ? response.data : isRecord(response.data) ? response.data.data : [];
    const account = Array.isArray(accounts) ? accounts.find((item) => isRecord(item) && typeof item.id === "string" && item.id.trim()) : null;
    return exigirString(isRecord(account) ? account.id : null, "conta Assinafy");
  }

  private async obterOuCriarSignerId(accountId: string, signer: { nome: string; email: string }) {
    const response = await this.get(`/accounts/${accountId}/signers`);
    const existente = extrairLista<AssinafySigner>(response.data).find((item) => item.email === signer.email);
    if (existente?.id) return exigirString(existente.id, "signatário Assinafy");
    const criado = await this.post(`/accounts/${accountId}/signers`, { full_name: signer.nome, email: signer.email });
    return exigirString(extrairPayload(criado.data).id, "signatário Assinafy");
  }

  private headers() { return { Authorization: `Bearer ${this.config.getOrThrow<string>("ASSINAFY_API_KEY")}` }; }

  private async get(url: string) {
    try { return await this.http.get(url, { headers: this.headers() }); } catch (error) { throw this.erro(error); }
  }

  private async post(url: string, data: unknown, options: Record<string, unknown> = {}) {
    try { return await this.http.post(url, data, { headers: this.headers(), ...options }); } catch (error) { throw this.erro(error); }
  }

  private erro(error: unknown) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      const message = isRecord(data) && typeof data.message === "string" ? data.message : error.message;
      return new BadRequestException(`Assinafy: ${message}`);
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
