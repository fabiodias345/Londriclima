import { BadRequestException } from "@nestjs/common";
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
