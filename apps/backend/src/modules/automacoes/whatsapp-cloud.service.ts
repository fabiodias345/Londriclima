import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

export type WhatsAppMessage = {
  to: string;
  text: string;
};

export type WhatsAppDeliveryResult = {
  messageId: string;
  recipient: string;
};

export interface WhatsAppSender {
  enviar(message: WhatsAppMessage): Promise<WhatsAppDeliveryResult>;
}

type WhatsAppCloudResponse = {
  messages?: Array<{ id?: string }>;
};

@Injectable()
export class WhatsAppCloudService implements WhatsAppSender {
  constructor(private readonly config: ConfigService) {}

  async enviar(message: WhatsAppMessage): Promise<WhatsAppDeliveryResult> {
    const token = this.obterConfig("LONDRI_WHATS_TOKEN", "WHATSAPP_ACCESS_TOKEN");
    const phoneId = this.obterConfig("LONDRI_PHONE_ID", "WHATSAPP_PHONE_NUMBER_ID");
    const version = this.config.get<string>("WHATSAPP_GRAPH_VERSION", "v20.0");
    const recipient = normalizarTelefoneWhatsapp(message.to);

    const response = await axios.post<WhatsAppCloudResponse>(
      `https://graph.facebook.com/${version}/${phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body: message.text
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const messageId = response.data.messages?.[0]?.id;

    if (!messageId) {
      throw new Error("WhatsApp Cloud API sem comprovante.");
    }

    return {
      messageId,
      recipient
    };
  }

  private obterConfig(chavePrincipal: string, chaveAlternativa: string) {
    const valor = this.config.get<string>(chavePrincipal) || this.config.get<string>(chaveAlternativa);

    if (!valor?.trim()) {
      throw new Error(`${chavePrincipal} nao configurado.`);
    }

    return valor.trim();
  }
}

export function normalizarTelefoneWhatsapp(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");

  if (digitos.length === 10 || digitos.length === 11) {
    return `55${digitos}`;
  }

  return digitos;
}
