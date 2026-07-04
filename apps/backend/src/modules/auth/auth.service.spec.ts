import { test } from "node:test";
import * as assert from "node:assert/strict";
import { UnauthorizedException } from "@nestjs/common";
import { UsuarioRole } from "@prisma/client";
import { AuthService } from "./auth.service";

const usuarioAtivo = {
  id: "usuario-1",
  empresaId: "empresa-1",
  nome: "Tecnico Clima do Brasil",
  login: "tecnico",
  email: "tecnico@airmovebr.local",
  senhaHash: "hash-seguro",
  role: UsuarioRole.tecnico,
  primeiroAcessoPendente: false
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
        expiresIn: type === "access" ? 900 : type === "refresh" ? 2_592_000 : 3_600
      };
    }
  };

  return {
    chamadas,
    service: new AuthService(prisma as never, passwordHashService as never, tokenService as never, {} as never, {} as never)
  };
}

test("login retorna tokens e atualiza ultimo login para usuario ativo de empresa ativa", async () => {
  const { chamadas, service } = criarAuthService({});

  const resposta = (await service.login({
    email: "tecnico@airmovebr.local",
    senha: "123456"
  })) as any;

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
    nome: "Tecnico Clima do Brasil",
    email: "tecnico@airmovebr.local",
    role: UsuarioRole.tecnico
  });
});

test("login de primeiro acesso retorna token de onboarding em vez de acesso normal", async () => {
  const { chamadas, service } = criarAuthService({
    usuario: {
      ...usuarioAtivo,
      primeiroAcessoPendente: true
    }
  });

  const resposta = (await service.login({
    login: "tecnico",
    senha: "123456"
  })) as any;

  assert.equal(resposta.onboarding_required, true);
  assert.equal(resposta.onboarding_token, "onboarding-token");
  assert.equal(resposta.expires_in, 3600);
  assert.equal(chamadas.usuarioUpdate, undefined);
  assert.deepEqual(chamadas.signPayloads[0], {
    payload: {
      sub: "usuario-1",
      empresa_id: "empresa-1",
      email: "tecnico@airmovebr.local",
      role: UsuarioRole.tecnico
    },
    type: "onboarding"
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

test("finalizar primeiro acesso troca a senha, desativa a pendencia e emite tokens normais", async () => {
  const chamadas = {
    findFirstWhere: undefined as unknown,
    usuarioUpdate: undefined as unknown,
    documentoCreate: undefined as unknown,
    verifyToken: undefined as unknown,
    verifyPassword: undefined as unknown,
    signPayloads: [] as Array<{ payload: unknown; type: string }>
  };
  const tx = {
    usuario: {
      findFirst: async ({ where }: { where: unknown }) => {
        chamadas.findFirstWhere = where;
        return {
          ...usuarioAtivo,
          primeiroAcessoPendente: true
        };
      },
      update: async (args: unknown) => {
        chamadas.usuarioUpdate = args;
      }
    },
    funcionarioDocumento: {
      create: async (args: unknown) => {
        chamadas.documentoCreate = args;
      }
    }
  };
  const prisma = {
    ...tx,
    $transaction: async (callback: (value: typeof tx) => Promise<void>) => callback(tx)
  };
  const passwordHashService = {
    verify: async () => true,
    hash: async (senha: string) => {
      chamadas.verifyPassword = senha;
      return "novo-hash";
    }
  };
  const tokenService = {
    verify: (token: string, type: string) => {
      chamadas.verifyToken = { token, type };
      return {
        sub: "usuario-1",
        empresa_id: "empresa-1",
        email: "tecnico@airmovebr.local",
        role: UsuarioRole.tecnico
      };
    },
    sign: (payload: unknown, type: string) => {
      chamadas.signPayloads.push({ payload, type });
      return {
        token: `${type}-token`,
        expiresIn: type === "access" ? 900 : type === "refresh" ? 2_592_000 : 3_600
      };
    }
  };
  const funcionarioStorageService = {
    salvarCadastro: async () => ({
      fotoStorageUrl: "/storage/funcionarios/empresa-1/usuario-1/perfil/foto.jpg",
      assinaturaStorageUrl: "/storage/funcionarios/empresa-1/usuario-1/perfil/assinatura.png"
    }),
    salvarDocumentoPdf: async () => "/storage/funcionarios/empresa-1/usuario-1/documentos/termo.pdf"
  };
  const funcionarioTermoService = {
    gerar: () => ({ pdf: Buffer.from("%PDF-1.4"), sha256: "hash-termo" })
  };
  const service = new AuthService(
    prisma as never,
    passwordHashService as never,
    tokenService as never,
    funcionarioStorageService as never,
    funcionarioTermoService as never
  );

  const resposta = (await service.finalizarPrimeiroAcesso({
    onboarding_token: "onboarding-token",
    senha: "12345678",
    nome: "Tecnico Atualizado",
    cpf: "12345678901",
    telefone: "43999999999",
    termo_aceito: true
  }, {
    foto: { originalname: "foto.jpg", mimetype: "image/jpeg", size: 10, buffer: Buffer.from("foto") },
    assinatura: { originalname: "assinatura.png", mimetype: "image/png", size: 10, buffer: Buffer.from("assinatura") }
  })) as any;

  assert.deepEqual(chamadas.verifyToken, {
    token: "onboarding-token",
    type: "onboarding"
  });
  assert.equal(chamadas.verifyPassword, "12345678");
  assert.equal((chamadas.usuarioUpdate as { where: { id: string } }).where.id, "usuario-1");
  assert.equal(
    (chamadas.documentoCreate as { data: { tipo: string } }).data.tipo,
    "termo_responsabilidade_app"
  );
  assert.equal(resposta.access_token, "access-token");
  assert.equal(resposta.refresh_token, "refresh-token");
  assert.deepEqual(resposta.usuario, {
    id: "usuario-1",
    empresa_id: "empresa-1",
    nome: "Tecnico Atualizado",
    email: "tecnico@airmovebr.local",
    role: UsuarioRole.tecnico
  });
});

test("cadastro com convite cria usuario com role auxiliar definida no convite", async () => {
  const chamadas = {
    usuarioCreate: undefined as unknown,
    conviteUpdate: undefined as unknown,
    documentoCreate: undefined as unknown,
    signPayloads: [] as Array<{ payload: unknown; type: string }>
  };
  const tx = {
    usuario: {
      create: async (args: unknown) => {
        chamadas.usuarioCreate = args;
      },
      findFirst: async () => null
    },
    conviteTecnico: {
      updateMany: async (args: unknown) => {
        chamadas.conviteUpdate = args;
        return { count: 1 };
      }
    },
    funcionarioDocumento: {
      create: async (args: unknown) => {
        chamadas.documentoCreate = args;
      }
    }
  };
  const prisma = {
    conviteTecnico: {
      findFirst: async () => ({
        id: "convite-1",
        empresaId: "empresa-1",
        expiraEm: new Date(Date.now() + 60_000),
        role: UsuarioRole.auxiliar
      })
    },
    usuario: {
      findFirst: async () => null
    },
    $transaction: async (callback: (value: typeof tx) => Promise<void>) => callback(tx)
  };
  const passwordHashService = {
    hash: async () => "novo-hash"
  };
  const tokenService = {
    sign: (payload: unknown, type: string) => {
      chamadas.signPayloads.push({ payload, type });
      return {
        token: `${type}-token`,
        expiresIn: type === "access" ? 900 : 2_592_000
      };
    }
  };
  const funcionarioStorageService = {
    salvarCadastro: async () => ({
      fotoStorageUrl: "/storage/funcionarios/empresa-1/usuario-2/perfil/foto.jpg",
      assinaturaStorageUrl: "/storage/funcionarios/empresa-1/usuario-2/perfil/assinatura.png"
    }),
    salvarDocumentoPdf: async () => "/storage/funcionarios/empresa-1/usuario-2/documentos/termo.pdf"
  };
  const funcionarioTermoService = {
    gerar: () => ({ pdf: Buffer.from("%PDF-1.4"), sha256: "hash-termo" })
  };
  const service = new AuthService(
    prisma as never,
    passwordHashService as never,
    tokenService as never,
    funcionarioStorageService as never,
    funcionarioTermoService as never
  );

  const resposta = (await service.cadastrarComConvite({
    codigo: "ABCD-EFGH",
    nome: "Auxiliar Convite",
    login: "auxiliar.convite",
    email: "auxiliar@empresa.com",
    telefone: "43999999999",
    cpf: "12345678901",
    senha: "12345678",
    termo_aceito: true
  }, {
    foto: { originalname: "foto.jpg", mimetype: "image/jpeg", size: 10, buffer: Buffer.from("foto") },
    assinatura: { originalname: "assinatura.png", mimetype: "image/png", size: 10, buffer: Buffer.from("assinatura") }
  })) as any;

  assert.equal((chamadas.usuarioCreate as { data: { role: UsuarioRole } }).data.role, UsuarioRole.auxiliar);
  assert.equal((chamadas.documentoCreate as { data: { tipo: string } }).data.tipo, "termo_responsabilidade_app");
  assert.equal((chamadas.conviteUpdate as { where: { id: string } }).where.id, "convite-1");
  assert.equal(resposta.usuario.role, UsuarioRole.auxiliar);
  assert.deepEqual(chamadas.signPayloads.map((item) => item.type), ["access", "refresh"]);
});

