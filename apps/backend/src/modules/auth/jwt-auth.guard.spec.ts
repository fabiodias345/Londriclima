import { test } from "node:test";
import * as assert from "node:assert/strict";
import { UnauthorizedException } from "@nestjs/common";
import { UsuarioRole } from "@prisma/client";
import { JwtAuthGuard } from "./jwt-auth.guard";

function criarContexto(authorization?: string) {
  const request = {
    headers: {
      authorization
    },
    user: undefined as unknown
  };

  return {
    request,
    context: {
      switchToHttp: () => ({
        getRequest: () => request
      })
    }
  };
}

test("JwtAuthGuard aceita Bearer token valido e injeta usuario autenticado", () => {
  const tokenService = {
    verify: (token: string, type: string) => {
      assert.equal(token, "access-token");
      assert.equal(type, "access");

      return {
        sub: "usuario-1",
        empresa_id: "empresa-1",
        email: "tecnico@airmovebr.local",
        role: UsuarioRole.tecnico
      };
    }
  };
  const { request, context } = criarContexto("Bearer access-token");
  const guard = new JwtAuthGuard(tokenService as never);

  assert.equal(guard.canActivate(context as never), true);
  assert.deepEqual(request.user, {
    id: "usuario-1",
    empresa_id: "empresa-1",
    email: "tecnico@airmovebr.local",
    role: UsuarioRole.tecnico
  });
});

test("JwtAuthGuard rejeita header Authorization ausente", () => {
  const { context } = criarContexto();
  const guard = new JwtAuthGuard({ verify: () => undefined } as never);

  assert.throws(() => guard.canActivate(context as never), UnauthorizedException);
});

test("JwtAuthGuard rejeita esquema diferente de Bearer", () => {
  const { context } = criarContexto("Basic access-token");
  const guard = new JwtAuthGuard({ verify: () => undefined } as never);

  assert.throws(() => guard.canActivate(context as never), UnauthorizedException);
});

