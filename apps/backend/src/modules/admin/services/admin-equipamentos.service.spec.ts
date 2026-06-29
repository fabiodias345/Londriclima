import { OrdemServicoStatus } from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { AdminEquipamentosService } from "./admin-equipamentos.service";

const usuario = {
  id: "admin-1",
  empresa_id: "empresa-1",
  email: "admin@airmovebr.local",
  role: "admin"
};

test("criarEquipamentoCliente permite modelo vazio para tecnico preencher em campo", async () => {
  const chamadas = {
    createData: undefined as unknown
  };
  const prisma = {
    cliente: {
      findFirst: async () => ({ id: "cliente-1" })
    },
    equipamento: {
      findUnique: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        chamadas.createData = data;
        return {
          id: "equipamento-1",
          codigoPublico: data.codigoPublico,
          acessoPublicoAtivo: true,
          tipo: null,
          patrimonio: null,
          codigoBarras: null,
          marca: data.marca,
          modelo: data.modelo,
          capacidadeBtu: null,
          gasRefrigerante: null,
          numeroSerie: null,
          localInstalacao: null,
          areaClimatizadaM2: null,
          ocupantesFixo: null,
          ocupantesVariavel: null,
          atualizadoEm: new Date("2026-06-29T10:00:00.000Z"),
          ordensServico: [] as Array<{ id: string; status: OrdemServicoStatus }>
        };
      }
    }
  };
  const service = new AdminEquipamentosService(prisma as never);

  const resposta = await service.criarEquipamentoCliente("cliente-1", { marca: "LG" }, usuario as never);

  assert.equal((chamadas.createData as { modelo: string }).modelo, "");
  assert.equal(resposta.modelo, "");
});
