import { OrdemServicoStatus, UsuarioRole } from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { MobileService } from "./mobile.service";

const usuario = {
  id: "usuario-1",
  empresa_id: "empresa-1",
  email: "tecnico@airmovebr.local",
  role: UsuarioRole.tecnico
};

function criarService(prisma: unknown) {
  return new MobileService(prisma as never);
}

test("listarOrdens retorna OS do tecnico com equipamentos do atendimento", async () => {
  const prisma = {
    ordemServico: {
      findMany: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, {
          empresaId: usuario.empresa_id,
          status: { in: [OrdemServicoStatus.aberta, OrdemServicoStatus.em_deslocamento, OrdemServicoStatus.em_atendimento] },
          OR: [
            { tecnicoId: usuario.id },
            { responsaveis: { some: { usuarioId: usuario.id } } },
            { equipe: { membros: { some: { usuarioId: usuario.id, ativo: true } } } },
            { responsaveis: { some: { equipe: { membros: { some: { usuarioId: usuario.id, ativo: true } } } } } }
          ]
        });

        return [
          {
            id: "os-1",
            clienteId: "cliente-1",
            titulo: "Limpeza de filtros",
            status: OrdemServicoStatus.aberta,
            agendadaPara: new Date("2026-06-22T12:00:00.000Z"),
            cliente: {
              nome: "Hospital Norte",
              equipamentos: [
                { id: "eq-1", modelo: "Split Hi-Wall", localInstalacao: "Sala 101", capacidadeBtu: 24000 },
                { id: "eq-2", modelo: "Split Hi-Wall", localInstalacao: "Sala 102", capacidadeBtu: 24000 }
              ]
            },
            endereco: { logradouro: "Av. Santos Dumont", numero: "1480", cidade: "Londrina", uf: "PR" },
            equipamento: { id: "eq-1", modelo: "Split Hi-Wall", localInstalacao: "Sala 101", capacidadeBtu: 24000 },
            responsaveis: []
          }
        ];
      }
    }
  };

  const resultado = await criarService(prisma).listarOrdens(usuario);

  assert.equal(resultado.items.length, 1);
  assert.equal(resultado.items[0].cliente, "Hospital Norte");
  assert.equal(resultado.items[0].equipamentos[0].nome, "Sala 101");
  assert.equal(resultado.items[0].equipamentos[1].nome, "Sala 102");
});

test("listarOrdens retorna checklist flat definido pelo backend", async () => {
  const prisma = {
    ordemServico: {
      findMany: async () => [
        {
          id: "os-2",
          clienteId: "cliente-1",
          titulo: "Texto livre qualquer",
          checklistTipo: "semestral",
          status: OrdemServicoStatus.aberta,
          agendadaPara: new Date("2026-06-22T12:00:00.000Z"),
          cliente: {
            nome: "Hospital Norte",
            equipamentos: []
          },
          endereco: null,
          equipamento: null,
          responsaveis: []
        }
      ]
    }
  };

  const resultado = await criarService(prisma).listarOrdens(usuario);
  const ordem = resultado.items[0];

  assert.equal(ordem.checklist_tipo, "semestral");
  assert.ok(Array.isArray(ordem.checklist));
  assert.equal(ordem.checklist[0].codigo, "M1");
  assert.equal(ordem.checklist[0].tipo, "checkbox");
  assert.ok(ordem.checklist.some((item: { codigo: string }) => item.codigo === "T21"));
  assert.ok(ordem.checklist.some((item: { codigo: string }) => item.codigo === "S14"));
  assert.equal(ordem.checklist.some((item: { codigo: string }) => item.codigo === "A1"), false);
});

test("listarOrdens retorna apenas uma foto no checklist antes da finalizacao", async () => {
  const prisma = {
    ordemServico: {
      findMany: async () => [
        {
          id: "os-3",
          clienteId: "cliente-1",
          titulo: "PMOC anual",
          checklistTipo: "anual",
          status: OrdemServicoStatus.aberta,
          agendadaPara: new Date("2026-06-22T12:00:00.000Z"),
          cliente: {
            nome: "Hospital Norte",
            equipamentos: []
          },
          endereco: null,
          equipamento: null,
          responsaveis: []
        }
      ]
    }
  };

  const resultado = await criarService(prisma).listarOrdens(usuario);
  const fotos = resultado.items[0].checklist.filter((item: { tipo: string }) => item.tipo === "foto");

  assert.equal(fotos.length, 1);
  assert.equal(fotos[0].item, "Foto apos abrir tampa frontal");
});
