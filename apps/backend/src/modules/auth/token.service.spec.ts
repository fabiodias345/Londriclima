import { test } from "node:test";
import * as assert from "node:assert/strict";
import { UnauthorizedException } from "@nestjs/common";
import { UsuarioRole } from "@prisma/client";
import { TokenService } from "./token.service";

const payload = {
  sub: "usuario-1",
  empresa_id: "empresa-1",
  email: "tecnico@airmovebr.local",
  role: UsuarioRole.tecnico
};

function criarTokenService() {
  const config = {
    getOrThrow: (name: string) => {
      if (name === "JWT_ACCESS_SECRET") {
        return "access-secret-for-tests";
      }

      if (name === "JWT_REFRESH_SECRET") {
        return "refresh-secret-for-tests";
      }

      throw new Error(`Config ausente: ${name}`);
    }
  };

  return new TokenService(config as never);
}

test("TokenService assina e valida access token preservando apenas claims publicas necessarias", () => {
  const service = criarTokenService();
  const { token, expiresIn } = service.sign(payload, "access");

  assert.equal(expiresIn, 900);
  assert.deepEqual(service.verify(token, "access"), payload);
});

test("TokenService rejeita refresh token usado como access token", () => {
  const service = criarTokenService();
  const { token } = service.sign(payload, "refresh");

  assert.throws(() => service.verify(token, "access"), UnauthorizedException);
});

test("TokenService rejeita token adulterado", () => {
  const service = criarTokenService();
  const { token } = service.sign(payload, "access");
  const [header, encodedPayload] = token.split(".");
  const payloadAdulterado = Buffer.from(
    JSON.stringify({
      ...JSON.parse(Buffer.from(encodedPayload, "base64url").toString()),
      role: UsuarioRole.admin
    })
  ).toString("base64url");

  assert.throws(() => service.verify(`${header}.${payloadAdulterado}.assinatura-invalida`, "access"), UnauthorizedException);
});

test("TokenService rejeita token expirado", () => {
  const realDateNow = Date.now;
  Date.now = () => new Date("2026-06-10T12:00:00.000Z").getTime();

  try {
    const service = criarTokenService();
    const { token } = service.sign(payload, "access");

    Date.now = () => new Date("2026-06-10T12:16:00.000Z").getTime();

    assert.throws(() => service.verify(token, "access"), UnauthorizedException);
  } finally {
    Date.now = realDateNow;
  }
});

