import { test } from "node:test";
import * as assert from "node:assert/strict";
import { UnauthorizedException } from "@nestjs/common";
import { UsuarioRole } from "@prisma/client";
import { AuthService } from "./auth.service";

const usuarioAtivo = {
  id: "usuario-1",
  empresaId: "empresa-1",
  nome: "Tecnico AIRMOVEBR",
  login: "tecnico",
  email: "tecnico@airmovebr.local",
  senhaHash: "hash-seguro",
  role: UsuarioRole.tecnico
};

function criarAuthService(options: {
  usuario?: typeof usuarioAtivo | null;
  senhaValida?: boolean;
  refreshPayload?: { sub: string; empresa_id: string; email: string; role: string };
}) {
  const chamadas = {
    findFirstWhere: undefined as unknown,
    usuarioUpdate: undefined as unknown,
    verifyPassword: undefined as unknown,
    verifyToken: undefined as unknown,
    signPayloads: [] as Array<{ payload: unknown; type: string }>
  };
  const prisma = {
    usuario: {
      findFirst: async ({ where }: { where: unknown }) => {
        chamadas.findFirstWhere = where;
        return options.usuario === undefined ? usuarioAtivo : options.usuario;
      },
      update: async (args: unknown) => {
        chamadas.usuarioUpdate = args;
      }
    }
  };
  const passwordHashService = {
    verify: async (senha: string, hash: string) => {
      chamadas.verifyPassword = { senha, hash };
      return options.senhaValida ?? true;
    }
  };
  const tokenService = {
    verify: (token: string, type: string) => {
      chamadas.verifyToken = { token, type };
      return (
        options.refreshPayload ?? {
          sub: "usuario-1",
          empresa_id: "empresa-1",
          email: "tecnico@airmovebr.local",
          role: UsuarioRole.tecnico
        }
      );
    },
    sign: (payload: unknown, type: string) => {
      chamadas.signPayloads.push({ payload, type });
      return {
        token: `${type}-token`,
        expiresIn: type === "access" ? 900 : 2_592_000
      };
    }
  };

  return {
    chamadas,
    service: new AuthService(prisma as never, passwordHashService as never, tokenService as never)
  };
}

test("login retorna tokens e atualiza ultimo login para usuario ativo de empresa ativa", async () => {
  const { chamadas, service } = criarAuthService({});

  const resposta = await service.login({
    email: "tecnico@airmovebr.local",
    senha: "123456"
  });

  assert.deepEqual(chamadas.findFirstWhere, {
    OR: [
      { login: "tecnico@airmovebr.local" },
      { email: "tecnico@airmovebr.local" }
    ],
    ativo: true,
    empresa: {
      ativa: true
    }
  });
  assert.deepEqual(chamadas.verifyPassword, {
    senha: "123456",
    hash: "hash-seguro"
  });
  assert.equal((chamadas.usuarioUpdate as { where: { id: string } }).where.id, "usuario-1");
  assert.equal(resposta.access_token, "access-token");
  assert.equal(resposta.refresh_token, "refresh-token");
  assert.equal(resposta.token_type, "Bearer");
  assert.equal(resposta.expires_in, 900);
  assert.deepEqual(resposta.usuario, {
    id: "usuario-1",
    empresa_id: "empresa-1",
    nome: "Tecnico AIRMOVEBR",
    email: "tecnico@airmovebr.local",
    role: UsuarioRole.tecnico
  });
});

test("login curto e normalizado autentica o mesmo usuario", async () => {
  const { chamadas, service } = criarAuthService({});

  await service.login({ login: " Tecnico ", senha: "123456" });

  assert.deepEqual(chamadas.findFirstWhere, {
    OR: [{ login: "tecnico" }, { email: "tecnico" }],
    ativo: true,
    empresa: { ativa: true }
  });
});

test("login bloqueia usuario inexistente, inativo ou empresa inativa sem validar senha", async () => {
  const { chamadas, service } = criarAuthService({ usuario: null });

  await assert.rejects(
    () =>
      service.login({
        email: "bloqueado@airmovebr.local",
        senha: "123456"
      }),
    UnauthorizedException
  );
  assert.equal(chamadas.verifyPassword, undefined);
  assert.equal(chamadas.usuarioUpdate, undefined);
});

test("login bloqueia senha invalida sem atualizar ultimo login nem detalhar motivo", async () => {
  const { chamadas, service } = criarAuthService({ senhaValida: false });

  await assert.rejects(
    () =>
      service.login({
        email: "tecnico@airmovebr.local",
        senha: "errada"
      }),
    (erro) => erro instanceof UnauthorizedException && erro.getStatus() === 401
  );
  assert.equal(chamadas.usuarioUpdate, undefined);
});

test("refresh valida token refresh e emite novo par de tokens para usuario ativo", async () => {
  const { chamadas, service } = criarAuthService({});

  const resposta = await service.refresh({ refresh_token: "refresh-token-antigo" });

  assert.deepEqual(chamadas.verifyToken, {
    token: "refresh-token-antigo",
    type: "refresh"
  });
  assert.deepEqual(chamadas.findFirstWhere, {
    id: "usuario-1",
    ativo: true,
    empresa: {
      ativa: true
    }
  });
  assert.equal(resposta.access_token, "access-token");
  assert.equal(resposta.refresh_token, "refresh-token");
});

test("refresh bloqueia token de usuario inativo ou empresa inativa", async () => {
  const { service } = criarAuthService({ usuario: null });

  await assert.rejects(
    () => service.refresh({ refresh_token: "refresh-token-antigo" }),
    (erro) => erro instanceof UnauthorizedException && erro.getStatus() === 401
  );
});

