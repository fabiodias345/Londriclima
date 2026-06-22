import { NotFoundException } from "@nestjs/common";
import {
EvidenciaTipo,
OrdemServicoStatus,
UsuarioRole
} from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { OrdensServicoService } from "./ordens-servico.service";

const usuario = {
  id: "usuario-1",
  empresa_id: "empresa-1",
  email: "tecnico@airmovebr.local",
  role: UsuarioRole.tecnico
};

function criarService(prisma: unknown, options: { onSalvarAssinatura?: () => void } = {}) {
  const service = new OrdensServicoService(prisma as never);
  (service as unknown as { salvarAssinatura: () => Promise<string> }).salvarAssinatura = async () => {
    options.onSalvarAssinatura?.();
    return "/storage/os/os-1/assinatura.png";
  };
  return service;
}

const finalizarDto = {
  assinatura_cliente_base64: "data:image/png;base64,aGVsbG8=",
  nome_responsavel_assinatura: "Maria Souza",
  latitude: -23.3048,
  longitude: -51.1701,
  finalizado_em: "2026-06-10T12:05:00-03:00"
};

function criarOrdemProntaParaFinalizar(overrides: Record<string, unknown> = {}) {
  return {
    id: "os-1",
    empresaId: "empresa-1",
    status: OrdemServicoStatus.em_atendimento,
    equipamento: {
      marca: "LG",
      modelo: "Dual Inverter",
      gasRefrigerante: "R-410A"
    },
    evidencias: [{ tipo: EvidenciaTipo.antes }, { tipo: EvidenciaTipo.depois }],
    checklist: {
      servicoRealizado: "Limpeza completa"
    },
    assinatura: null,
    ...overrides
  };
}

test("identificarEquipamento salva gas refrigerante no equipamento novo", async () => {
  const chamadas = {
    createData: undefined as unknown,
    updateData: undefined as unknown
  };
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-1",
        clienteId: "cliente-1",
        equipamentoId: null,
        status: OrdemServicoStatus.em_atendimento
      }),
      update: async ({ data }: { data: unknown }) => {
        chamadas.updateData = data;
      }
    },
    equipamento: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.createData = data;
        return {
          id: "equipamento-1",
          marca: "LG",
          modelo: "Dual Inverter",
          capacidadeBtu: 12000,
          gasRefrigerante: (data as { gasRefrigerante: string }).gasRefrigerante,
          numeroSerie: "SN1",
          localInstalacao: "Sala",
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z")
        };
      }
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.identificarEquipamento(
    "os-1",
    {
      codigo_qr: "QR-1",
      tipo: "Split",
      marca: "LG",
      modelo: "Dual Inverter",
      capacidade_btu: 12000,
      gas_refrigerante: "R-410A",
      numero_serie: "SN1",
      local_instalacao: "Sala"
    },
    usuario
  );

  assert.equal((chamadas.createData as { gasRefrigerante: string }).gasRefrigerante, "R-410A");
  assert.deepEqual(chamadas.updateData, {
    equipamentoId: "equipamento-1"
  });
  assert.equal(resposta.equipamento.gas_refrigerante, "R-410A");
});

test("identificarEquipamento esconde OS de outra empresa", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-2",
        clienteId: "cliente-1",
        equipamentoId: null,
        status: OrdemServicoStatus.em_atendimento
      })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(
    () =>
      service.identificarEquipamento(
        "os-1",
        {
          codigo_qr: "QR-1",
          tipo: "Split",
          marca: "LG",
          modelo: "Dual Inverter"
        },
        usuario
      ),
    NotFoundException
  );
});

test("registrarEvidencia esconde OS de outra empresa antes de salvar foto", async () => {
  const prisma = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-2",
        status: OrdemServicoStatus.em_atendimento,
        evidencias: []
      })
    }
  };
  const service = criarService(prisma);

  await assert.rejects(
    () =>
      service.registrarEvidencia("os-1", {
        tipo: EvidenciaTipo.antes,
        descricao: "Antes do servico",
        foto: {
          originalname: "antes.jpg",
          buffer: Buffer.from("foto"),
          mimetype: "image/jpeg",
          size: 4
        },
        usuario
      }),
    NotFoundException
  );
});

test("registrarChecklist esconde OS de outra empresa", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-2",
        status: OrdemServicoStatus.em_atendimento,
        evidencias: [{ tipo: EvidenciaTipo.antes }],
        checklist: null
      })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(
    () =>
      service.registrarChecklist(
        "os-1",
        {
          servico_realizado: "Limpeza completa"
        },
        usuario
      ),
    NotFoundException
  );
});

test("registrarObservacoes esconde OS de outra empresa", async () => {
  const prisma = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-2",
        status: OrdemServicoStatus.em_atendimento
      })
    }
  };
  const service = criarService(prisma);

  await assert.rejects(
    () =>
      service.registrarObservacoes(
        "os-1",
        {
          observacoes: "Cliente orientado sobre manutencao preventiva."
        },
        usuario
      ),
    NotFoundException
  );
});

test("finalizarOs esconde OS de outra empresa e nao salva assinatura", async () => {
  let salvouAssinatura = false;
  const tx = {
    ordemServico: {
      findUnique: async () => criarOrdemProntaParaFinalizar({ empresaId: "empresa-2" })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma, {
    onSalvarAssinatura: () => {
      salvouAssinatura = true;
    }
  });

  await assert.rejects(() => service.finalizarOs("os-1", finalizarDto, usuario), NotFoundException);
  assert.equal(salvouAssinatura, false);
});
