import { BadRequestException, ConflictException } from "@nestjs/common";
import { UsuarioRole } from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { AdminTecnicosService } from "./admin-tecnicos.service";

const admin = { id: "admin-1", empresa_id: "empresa-1", email: "admin@teste.com", role: "admin" };

test("apagarTecnico exclui definitivamente e limpa arquivos", async () => {
  let usuarioExcluido = "";
  let cadastroApagado: unknown;
  const prisma = {
    usuario: {
      findFirst: async () => ({ id: "tecnico-1", role: UsuarioRole.tecnico })
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
      usuario: {
        delete: async ({ where }: { where: { id: string } }) => {
          usuarioExcluido = where.id;
          return { id: where.id };
        }
      }
    })
  };
  const storage = {
    apagarCadastro: async (input: unknown) => {
      cadastroApagado = input;
    }
  };

  const resposta = await new AdminTecnicosService(prisma as never, storage as never).apagarTecnico("tecnico-1", admin);

  assert.equal(usuarioExcluido, "tecnico-1");
  assert.deepEqual(cadastroApagado, { empresaId: "empresa-1", usuarioId: "tecnico-1" });
  assert.deepEqual(resposta, { id: "tecnico-1", apagado: true });
});

test("apagarTecnico recusa excluir o proprio acesso", async () => {
  await assert.rejects(
    () => new AdminTecnicosService({} as never).apagarTecnico("admin-1", admin),
    BadRequestException
  );
});

test("apagarTecnico recusa excluir o unico admin ativo", async () => {
  const prisma = {
    usuario: {
      findFirst: async () => ({ id: "admin-2", role: UsuarioRole.admin }),
      count: async () => 1
    }
  };

  await assert.rejects(
    () => new AdminTecnicosService(prisma as never).apagarTecnico("admin-2", admin),
    BadRequestException
  );
});

test("atualizarFotoTecnico substitui somente a foto do acesso da empresa", async () => {
  let cadastroSalvo: unknown;
  let atualizacao: unknown;
  const agora = new Date("2026-07-06T12:00:00.000Z");
  const prisma = {
    usuario: {
      findFirst: async () => ({ id: "tecnico-1", role: UsuarioRole.tecnico }),
      update: async (input: unknown) => {
        atualizacao = input;
        return {
          id: "tecnico-1",
          nome: "Joao Tecnico",
          login: "joao",
          email: "joao@example.com",
          telefone: null,
          cpf: null,
          role: UsuarioRole.tecnico,
          ativo: true,
          primeiroAcessoPendente: false,
          primeiroAcessoEm: agora,
          fotoPerfilStorageUrl: "/storage/funcionarios/empresa-1/tecnico-1/perfil/foto.jpg",
          assinaturaStorageUrl: "/storage/funcionarios/empresa-1/tecnico-1/perfil/assinatura.png",
          documentosFuncionario: [],
          criadoEm: agora,
          atualizadoEm: agora
        };
      }
    }
  };
  const foto = { originalname: "perfil.jpg", mimetype: "image/jpeg", size: 3, buffer: Buffer.from([1, 2, 3]) };
  const storage = {
    salvarFoto: async (input: unknown) => {
      cadastroSalvo = input;
      return "/storage/funcionarios/empresa-1/tecnico-1/perfil/foto.jpg";
    }
  };

  const resposta = await (new AdminTecnicosService(prisma as never, storage as never) as any)
    .atualizarFotoTecnico("tecnico-1", foto, admin);

  assert.deepEqual(cadastroSalvo, { empresaId: "empresa-1", usuarioId: "tecnico-1", foto });
  assert.deepEqual((atualizacao as { where: unknown }).where, { id: "tecnico-1" });
  assert.deepEqual((atualizacao as { data: unknown }).data, {
    fotoPerfilStorageUrl: "/storage/funcionarios/empresa-1/tecnico-1/perfil/foto.jpg"
  });
  assert.equal(resposta.foto_perfil_storage_url, "/storage/funcionarios/empresa-1/tecnico-1/perfil/foto.jpg");
  assert.equal(resposta.assinatura_storage_url, "/storage/funcionarios/empresa-1/tecnico-1/perfil/assinatura.png");
});

test("criarTecnico recusa email ja cadastrado na empresa", async () => {
  const prisma = {
    usuario: {
      findFirst: async (input: { where: { login?: string; email?: string } }) => input.where.email ? { id: "tecnico-1" } : null
    }
  };

  await assert.rejects(
    () => new AdminTecnicosService(prisma as never).criarTecnico({
      nome: "Monica Trivezan",
      login: "monica",
      email: "fabiodias@uel.br",
      telefone: "43984451266",
      role: "auxiliar",
      senha: "123456"
    }, admin),
    (error: unknown) => error instanceof ConflictException && error.message === "E-mail ja cadastrado."
  );
});