import { AutomacaoStatus,AutomacaoTipo } from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { AutomacoesService } from "./automacoes.service";
import { EmailSender } from "./smtp-email.service";

function criarConfig(valores: Record<string, string | number | boolean | undefined> = {}) {
  return {
    get: <T = string>(chave: string, padrao?: T) => (valores[chave] ?? padrao) as T
  };
}

test("processarPendentes marca falha definitiva quando atinge limite de tentativas", async () => {
  const chamadas = {
    updateFinal: undefined as unknown
  };
  const prisma = {
    automacaoAgendada: {
      findMany: async () => [
        {
          id: "automacao-limite-1",
          tipo: AutomacaoTipo.enviar_email,
          payload: {
            tipo: "pmoc_relatorio_assinado",
            relatorio_id: "relatorio-3",
            cliente_id: "cliente-3",
            cliente_nome: "Carlos Lima",
            cliente_email: "carlos@example.com",
            data_envio: "2026-06-12T12:00:00.000Z",
            engenheiro_nome: "Paulo Londriclima",
            engenheiro_cpf: "12345678901",
            engenheiro_crea: "CREA-PR 999999",
            pdf_hash: "hash-limite",
            pdf_filename: "pmoc-carlos.pdf",
            pdf_base64: Buffer.from("%PDF-1.4\npmoc").toString("base64")
          },
          tentativas: 2
        }
      ],
      updateMany: async () => ({ count: 1 }),
      update: async ({ data }: { data: unknown }) => {
        chamadas.updateFinal = data;
      }
    }
  };
  const emailSender: EmailSender = {
    enviar: async () => {
      throw new Error("SMTP indisponivel");
    }
  };
  const service = new AutomacoesService(prisma as never, emailSender, criarConfig() as never);

  const resultado = await service.processarPendentes(new Date("2026-06-12T12:00:00.000Z"));

  assert.equal(resultado.processadas, 1);
  assert.equal(resultado.concluidas, 0);
  assert.equal(resultado.falhas, 1);
  assert.deepEqual(chamadas.updateFinal, {
    status: AutomacaoStatus.falhou,
    tentativas: {
      increment: 1
    },
    erroUltimaTentativa: "SMTP indisponivel"
  });
});

test("processarPendentes nao conclui sem comprovante SMTP", async () => {
  const chamadas = {
    updateFinal: undefined as unknown
  };
  const prisma = {
    automacaoAgendada: {
      findMany: async () => [
        {
          id: "automacao-sem-comprovante-1",
          tipo: AutomacaoTipo.enviar_email,
          payload: {
            tipo: "pmoc_relatorio_assinado",
            relatorio_id: "relatorio-4",
            cliente_id: "cliente-4",
            cliente_nome: "Beatriz Rocha",
            cliente_email: "beatriz@example.com",
            data_envio: "2026-06-12T12:00:00.000Z",
            engenheiro_nome: "Paulo Londriclima",
            engenheiro_cpf: "12345678901",
            engenheiro_crea: "CREA-PR 999999",
            pdf_hash: "hash-sem-comprovante",
            pdf_filename: "pmoc-beatriz.pdf",
            pdf_base64: Buffer.from("%PDF-1.4\npmoc").toString("base64")
          },
          tentativas: 0
        }
      ],
      updateMany: async () => ({ count: 1 }),
      update: async ({ data }: { data: unknown }) => {
        chamadas.updateFinal = data;
      }
    }
  };
  const emailSender: EmailSender = {
    enviar: async () => undefined as never
  };
  const service = new AutomacoesService(prisma as never, emailSender, criarConfig() as never);

  const resultado = await service.processarPendentes(new Date("2026-06-12T12:00:00.000Z"));

  assert.equal(resultado.processadas, 1);
  assert.equal(resultado.concluidas, 0);
  assert.equal(resultado.falhas, 1);
  assert.deepEqual(chamadas.updateFinal, {
    status: AutomacaoStatus.pendente,
    tentativas: {
      increment: 1
    },
    executarEm: new Date("2026-06-12T12:05:00.000Z"),
    erroUltimaTentativa: "Entrega SMTP sem comprovante."
  });
});
