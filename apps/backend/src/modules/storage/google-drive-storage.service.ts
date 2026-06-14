import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createSign } from "node:crypto";

type DriveTokenResponse = {
  access_token?: unknown;
  expires_in?: unknown;
};

type DriveFileResponse = {
  id?: unknown;
  webViewLink?: unknown;
};

export type SalvarPdfAssinadoPmocInput = {
  relatorioId: string;
  clienteNome: string;
  filename: string;
  pdf: Buffer;
};

@Injectable()
export class GoogleDriveStorageService {
  private accessToken?: {
    value: string;
    expiresAt: number;
  };

  constructor(private readonly config: ConfigService) {}

  async salvarPdfAssinadoPmoc(input: SalvarPdfAssinadoPmocInput) {
    if (!this.configurado()) {
      return null;
    }

    const folderId = this.config.get<string>("GOOGLE_DRIVE_PMOC_FOLDER_ID") ?? "1ar6WM_APajSPb85U1ffsc4uHMVSrw9Ih";
    const token = await this.obterAccessToken();
    const filename = this.normalizarFilename(input.filename, input.clienteNome, input.relatorioId);
    const metadata = {
      name: filename,
      parents: [folderId]
    };
    const boundary = `airmovebr-${Date.now().toString(36)}`;
    const body = Buffer.concat([
      Buffer.from(
        [
          `--${boundary}`,
          "Content-Type: application/json; charset=UTF-8",
          "",
          JSON.stringify(metadata),
          `--${boundary}`,
          "Content-Type: application/pdf",
          "",
          ""
        ].join("\r\n")
      ),
      input.pdf,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary="${boundary}"`,
        "Content-Length": String(body.length)
      },
      body
    });

    if (!response.ok) {
      throw new Error(`Google Drive respondeu ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as DriveFileResponse;
    const id = this.exigirString(data.id, "id do arquivo Drive");
    return typeof data.webViewLink === "string" && data.webViewLink.trim()
      ? data.webViewLink
      : `https://drive.google.com/file/d/${id}/view`;
  }

  private configurado() {
    return Boolean(this.config.get<string>("GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL") && this.config.get<string>("GOOGLE_DRIVE_PRIVATE_KEY"));
  }

  private async obterAccessToken() {
    const agora = Math.floor(Date.now() / 1000);

    if (this.accessToken && this.accessToken.expiresAt - 60 > agora) {
      return this.accessToken.value;
    }

    const email = this.config.getOrThrow<string>("GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL");
    const privateKey = this.normalizarPrivateKey(this.config.getOrThrow<string>("GOOGLE_DRIVE_PRIVATE_KEY"));
    const assertion = this.assinarJwt({
      iss: email,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: agora,
      exp: agora + 3600
    }, privateKey);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion
      })
    });

    if (!response.ok) {
      throw new Error(`Google OAuth respondeu ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as DriveTokenResponse;
    const value = this.exigirString(data.access_token, "access_token Google");
    const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
    this.accessToken = {
      value,
      expiresAt: agora + expiresIn
    };
    return value;
  }

  private assinarJwt(payload: Record<string, unknown>, privateKey: string) {
    const header = {
      alg: "RS256",
      typ: "JWT"
    };
    const unsigned = `${this.base64Url(JSON.stringify(header))}.${this.base64Url(JSON.stringify(payload))}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsigned);
    signer.end();
    return `${unsigned}.${signer.sign(privateKey, "base64url")}`;
  }

  private normalizarPrivateKey(value: string) {
    return value.replace(/\\n/g, "\n");
  }

  private normalizarFilename(filename: string, clienteNome: string, relatorioId: string) {
    const base = filename.trim() || `pmoc-${clienteNome}-${relatorioId}.pdf`;
    return base.replace(/["\r\n]/g, "").replace(/[\\/]/g, "-");
  }

  private base64Url(value: string) {
    return Buffer.from(value).toString("base64url");
  }

  private exigirString(value: unknown, campo: string) {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Google Drive sem ${campo}.`);
    }
    return value;
  }
}
