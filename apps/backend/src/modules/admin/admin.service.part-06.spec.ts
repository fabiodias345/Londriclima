import {
UsuarioRole
} from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { AdminService } from "./admin.service";

const usuario = {
  id: "admin-1",
  empresa_id: "empresa-1",
  email: "admin@airmovebr.local",
  role: UsuarioRole.admin
};

function criarService(prisma: unknown) {
  return new AdminService(prisma as never);
}

test("criarEquipamentoCliente gera codigo publico e senha inicial", async () => {
  const chamadas = {
    createData: undefined as unknown
  };
  const prisma = {
    cliente: {
      findFirst: async () => ({ id: "cliente-1" })
    },
    equipamento: {
      findUnique: async () => null,
      create: async ({ data }: { data: unknown }) => {
        chamadas.createData = data;
        return {
          id: "equipamento-1",
          codigoPublico: (data as { codigoPublico: string }).codigoPublico,
          acessoPublicoAtivo: true,
          tipo: "Split",
          patrimonio: "PAT-1",
          codigoBarras: "789",
          marca: "LG",
          modelo: "Dual",
          capacidadeBtu: 12000,
          gasRefrigerante: (data as { gasRefrigerante?: string }).gasRefrigerante ?? null,
          numeroSerie: "SN1",
          localInstalacao: "Sala",
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
          ordensServico: []
        };
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.criarEquipamentoCliente(
    "cliente-1",
    {
      tipo: "Split",
      patrimonio: "PAT-1",
      codigo_barras: "789",
      marca: "LG",
      modelo: "Dual",
      capacidade_btu: 12000,
      gas_refrigerante: "R-410A",
      numero_serie: "SN1",
      local_instalacao: "Sala"
    },
    usuario
  );

  assert.match((chamadas.createData as { codigoPublico: string }).codigoPublico, /^EQ-[0-9A-F]{10}$/);
  assert.equal((chamadas.createData as { gasRefrigerante: string }).gasRefrigerante, "R-410A");
  assert.match((chamadas.createData as { senhaPublicaHash: string }).senhaPublicaHash, /^scrypt:/);
  assert.match(resposta.senha_publica, /^\d{6}$/);
});
