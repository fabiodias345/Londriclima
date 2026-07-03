import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";

type TokenType = "access" | "refresh" | "onboarding";

type JwtHeader = {
  alg: "HS256";
  typ: "JWT";
};

export type TokenPayload = {
  sub: string;
  empresa_id: string;
  email: string;
  role: string;
};

type InternalTokenPayload = TokenPayload & {
  type: TokenType;
  iat: number;
  exp: number;
};

const TOKEN_EXPIRATION_SECONDS: Record<TokenType, number> = {
  access: 15 * 60,
  refresh: 30 * 24 * 60 * 60,
  onboarding: 60 * 60
};

@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService) {}

  sign(payload: TokenPayload, type: TokenType) {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = TOKEN_EXPIRATION_SECONDS[type];
    const internalPayload: InternalTokenPayload = {
      ...payload,
      type,
      iat: now,
      exp: now + expiresIn
    };
    const header: JwtHeader = {
      alg: "HS256",
      typ: "JWT"
    };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(internalPayload));
    const signature = this.signData(`${encodedHeader}.${encodedPayload}`, type);

    return {
      token: `${encodedHeader}.${encodedPayload}.${signature}`,
      expiresIn
    };
  }

  verify(token: string, expectedType: TokenType): TokenPayload {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException("Token inválido.");
    }

    const expectedSignature = this.signData(`${encodedHeader}.${encodedPayload}`, expectedType);
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      throw new UnauthorizedException("Token inválido.");
    }

    let payload: InternalTokenPayload;

    try {
      payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString()) as InternalTokenPayload;
    } catch {
      throw new UnauthorizedException("Token inválido.");
    }

    const now = Math.floor(Date.now() / 1000);

    if (payload.type !== expectedType || payload.exp < now) {
      throw new UnauthorizedException("Token inválido.");
    }

    return {
      sub: payload.sub,
      empresa_id: payload.empresa_id,
      email: payload.email,
      role: payload.role
    };
  }

  private signData(data: string, type: TokenType) {
    return createHmac("sha256", this.getSecret(type)).update(data).digest("base64url");
  }

  private getSecret(type: TokenType) {
    const envName = type === "access" ? "JWT_ACCESS_SECRET" : "JWT_REFRESH_SECRET";
    return this.config.getOrThrow<string>(envName);
  }

  private base64UrlEncode(value: string) {
    return Buffer.from(value).toString("base64url");
  }
}
