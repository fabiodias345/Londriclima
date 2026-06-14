import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as net from "node:net";
import * as tls from "node:tls";

export type EmailMessage = {
  from: string;
  to: string;
  bcc?: string | string[];
  subject: string;
  text: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    contentBase64: string;
  }>;
};

export interface EmailSender {
  enviar(message: EmailMessage): Promise<EmailDeliveryResult>;
}

type SmtpSocket = net.Socket | tls.TLSSocket;

export type EmailDeliveryResult = {
  recipient: string;
  response: string;
};

@Injectable()
export class SmtpEmailService implements EmailSender {
  constructor(private readonly config: ConfigService) {}

  async enviar(message: EmailMessage) {
    const host = this.config.get<string>("SMTP_HOST");

    if (!host) {
      throw new Error("SMTP_HOST nao configurado.");
    }

    const port = Number(this.config.get<number | string>("SMTP_PORT", 587));
    const secure = this.lerBoolean("SMTP_SECURE", port === 465);
    const startTls = this.lerBoolean("SMTP_STARTTLS", !secure);
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");
    const domain = this.config.get<string>("SMTP_HELO_DOMAIN", "airmovebr.local");
    let socket = await this.conectar(host, port, secure);

    try {
      await this.lerResposta(socket, [220]);
      await this.enviarComando(socket, `EHLO ${domain}`, [250]);

      if (!secure && startTls) {
        await this.enviarComando(socket, "STARTTLS", [220]);
        socket = tls.connect({ socket, servername: host });
        await this.esperarConexaoSegura(socket);
        await this.enviarComando(socket, `EHLO ${domain}`, [250]);
      }

      if (user && pass) {
        await this.enviarComando(socket, "AUTH LOGIN", [334]);
        await this.enviarComando(socket, Buffer.from(user).toString("base64"), [334]);
        await this.enviarComando(socket, Buffer.from(pass).toString("base64"), [235]);
      }

      await this.enviarComando(socket, `MAIL FROM:<${this.extrairEndereco(message.from)}>`, [250]);
      for (const recipient of this.listarDestinatarios(message)) {
        await this.enviarComando(socket, `RCPT TO:<${this.extrairEndereco(recipient)}>`, [250, 251]);
      }
      await this.enviarComando(socket, "DATA", [354]);
      socket.write(`${this.montarMensagem(message)}\r\n.\r\n`);
      const response = await this.lerResposta(socket, [250]);
      await this.enviarComando(socket, "QUIT", [221]);
      return {
        recipient: this.listarDestinatarios(message).map((recipient) => this.extrairEndereco(recipient)).join(","),
        response: response.trim()
      };
    } finally {
      socket.destroy();
    }
  }

  private montarMensagem(message: EmailMessage) {
    if (message.attachments?.length) {
      return this.montarMensagemComAnexos(message);
    }

    const headers = [
      `From: ${message.from}`,
      `To: ${message.to}`,
      `Subject: ${this.codificarCabecalho(message.subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit"
    ];
    const body = message.text.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");

    return `${headers.join("\r\n")}\r\n\r\n${body}`;
  }

  private montarMensagemComAnexos(message: EmailMessage) {
    const attachments = message.attachments ?? [];
    const boundary = `airmovebr-${Date.now().toString(36)}`;
    const headers = [
      `From: ${message.from}`,
      `To: ${message.to}`,
      `Subject: ${this.codificarCabecalho(message.subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`
    ];
    const partes = [
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      message.text.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..")
    ];

    for (const attachment of attachments) {
      partes.push(
        `--${boundary}`,
        `Content-Type: ${attachment.contentType}; name="${this.escaparParametroMime(attachment.filename)}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${this.escaparParametroMime(attachment.filename)}"`,
        "",
        this.quebrarBase64(attachment.contentBase64)
      );
    }

    partes.push(`--${boundary}--`);

    return `${headers.join("\r\n")}\r\n\r\n${partes.join("\r\n")}`;
  }

  private conectar(host: string, port: number, secure: boolean) {
    return new Promise<SmtpSocket>((resolve, reject) => {
      const socket = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
      const eventoConexao = secure ? "secureConnect" : "connect";
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error("Timeout conectando ao SMTP."));
      }, 15000);

      socket.once(eventoConexao, () => {
        clearTimeout(timeout);
        resolve(socket);
      });
      socket.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private esperarConexaoSegura(socket: SmtpSocket) {
    return new Promise<void>((resolve, reject) => {
      if (socket instanceof tls.TLSSocket && socket.authorized !== false) {
        resolve();
        return;
      }

      socket.once("secureConnect", () => resolve());
      socket.once("error", reject);
    });
  }

  private enviarComando(socket: SmtpSocket, comando: string, codigosEsperados: number[]) {
    socket.write(`${comando}\r\n`);
    return this.lerResposta(socket, codigosEsperados);
  }

  private lerResposta(socket: SmtpSocket, codigosEsperados: number[]) {
    return new Promise<string>((resolve, reject) => {
      let buffer = "";
      const timeout = setTimeout(() => {
        limpar();
        reject(new Error("Timeout aguardando resposta SMTP."));
      }, 15000);
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString("utf8");

        if (!/\r?\n\d{3} /.test(`\n${buffer}`)) {
          return;
        }

        const codigo = Number(buffer.match(/(\d{3}) [^\r\n]*\r?\n?$/)?.[1]);
        limpar();

        if (!codigosEsperados.includes(codigo)) {
          reject(new Error(`SMTP respondeu ${codigo || "sem codigo"}: ${buffer.trim()}`));
          return;
        }

        resolve(buffer);
      };
      const onError = (error: Error) => {
        limpar();
        reject(error);
      };
      const limpar = () => {
        clearTimeout(timeout);
        socket.off("data", onData);
        socket.off("error", onError);
      };

      socket.on("data", onData);
      socket.once("error", onError);
    });
  }

  private extrairEndereco(valor: string) {
    return valor.match(/<(?<email>[^>]+)>/)?.groups?.email ?? valor;
  }

  private listarDestinatarios(message: EmailMessage) {
    const bcc = Array.isArray(message.bcc) ? message.bcc : message.bcc ? [message.bcc] : [];
    return [message.to, ...bcc].filter((recipient) => recipient.trim());
  }

  private codificarCabecalho(valor: string) {
    return /^[\x00-\x7F]*$/.test(valor) ? valor : `=?UTF-8?B?${Buffer.from(valor).toString("base64")}?=`;
  }

  private escaparParametroMime(valor: string) {
    return valor.replace(/["\r\n]/g, "");
  }

  private quebrarBase64(valor: string) {
    return valor.replace(/\s+/g, "").replace(/.{1,76}/g, "$&\r\n").trim();
  }

  private lerBoolean(chave: string, padrao: boolean) {
    const valor = this.config.get<string | boolean | undefined>(chave);

    if (valor === undefined || valor === "") {
      return padrao;
    }

    return valor === true || String(valor).toLowerCase() === "true";
  }
}
