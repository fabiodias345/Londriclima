import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

export type WhatsAppInteractiveOption = {
  id: string;
  title: string;
  description?: string;
};

export type WhatsAppMessage = {
  to: string;
  text: string;
  options?: WhatsAppInteractiveOption[];
};

export type WhatsAppTemplate = {
  name: string;
  language?: string;
  parameters?: string[];
};

export type WhatsAppDeliveryResult = {
  messageId: string;
  recipient: string;
};

export interface WhatsAppSender {
  enviarTemplate?(to: string, template: WhatsAppTemplate): Promise<WhatsAppDeliveryResult>;
  enviar(message: WhatsAppMessage): Promise<WhatsAppDeliveryResult>;
}

type WhatsAppCloudResponse = {
  messages?: Array<{ id?: string }>;
};

@Injectable()
export class WhatsAppCloudService implements WhatsAppSender {
  constructor(private readonly config: ConfigService) {}

  async enviarTemplate(to: string, template: WhatsAppTemplate): Promise<WhatsAppDeliveryResult> {
    const components = template.parameters?.length ? [{ type: "body", parameters: template.parameters.map((text) => ({ type: "text", text })) }] : undefined;
    const recipient = normalizarTelefoneWhatsapp(to);
    const response = await this.enviarPayload({ to: recipient, type: "template", template: { name: template.name, language: { code: template.language || "pt_BR" }, ...(components ? { components } : {}) } });
    const messageId = response.messages?.[0]?.id;
    if (!messageId) throw new Error("WhatsApp Cloud API sem comprovante.");
    return { messageId, recipient };
  }

  async enviar(message: WhatsAppMessage): Promise<WhatsAppDeliveryResult> {
    const token = this.obterConfig("LONDRI_WHATS_TOKEN", "WHATSAPP_ACCESS_TOKEN");
    const phoneId = this.obterConfig("LONDRI_PHONE_ID", "WHATSAPP_PHONE_NUMBER_ID");
    const version = this.config.get<string>("WHATSAPP_GRAPH_VERSION", "v20.0");
    const recipient = normalizarTelefoneWhatsapp(message.to);
    const payload = message.options?.length ? this.interactivePayload(message.text, message.options) : { type: "text", text: { preview_url: false, body: message.text } };
    const response = await axios.post<WhatsAppCloudResponse>(
      `https://graph.facebook.com/${version}/${phoneId}/messages`,
      { messaging_product: "whatsapp", recipient_type: "individual", to: recipient, ...payload },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    const messageId = response.data.messages?.[0]?.id;
    if (!messageId) throw new Error("WhatsApp Cloud API sem comprovante.");
    return { messageId, recipient };
  }

  private interactivePayload(body: string, options: WhatsAppInteractiveOption[]) {
    if (options.length <= 3) {
      return { type: "interactive", interactive: { type: "button", body: { text: body }, action: { buttons: options.map((option) => ({ type: "reply", reply: { id: option.id, title: option.title.slice(0, 20) } })) } } };
    }
    return { type: "interactive", interactive: { type: "list", body: { text: body }, action: { button: "Escolher opcao", sections: [{ title: "Opcoes de atendimento", rows: options.slice(0, 10).map((option) => ({ id: option.id, title: option.title.slice(0, 24), ...(option.description ? { description: option.description.slice(0, 72) } : {}) })) }] } } };
  }

  private async enviarPayload(payload: Record<string, unknown>): Promise<WhatsAppCloudResponse> {
    const token = this.obterConfig("LONDRI_WHATS_TOKEN", "WHATSAPP_ACCESS_TOKEN");
    const phoneId = this.obterConfig("LONDRI_PHONE_ID", "WHATSAPP_PHONE_NUMBER_ID");
    const version = this.config.get<string>("WHATSAPP_GRAPH_VERSION", "v20.0");
    const response = await axios.post<WhatsAppCloudResponse>(`https://graph.facebook.com/${version}/${phoneId}/messages`, { messaging_product: "whatsapp", recipient_type: "individual", ...payload }, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    return response.data;
  }

  private obterConfig(chavePrincipal: string, chaveAlternativa: string) {
    const valor = this.config.get<string>(chavePrincipal) || this.config.get<string>(chaveAlternativa);
    if (!valor?.trim()) throw new Error(`${chavePrincipal} nao configurado.`);
    return valor.trim();
  }
}

export function normalizarTelefoneWhatsapp(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}