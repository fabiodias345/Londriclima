import { test } from "node:test";
import * as assert from "node:assert/strict";
import { AutomacaoStatus, AutomacaoTipo } from "@prisma/client";
import { AutomacoesService } from "./automacoes.service";
import { EmailSender } from "./smtp-email.service";

function criarConfig(valores: Record<string, string | number | boolean | undefined> = {}) {
  return {
    get: <T = string>(chave: string, padrao?: T) => (valores[chave] ?? padrao) as T
  };
}

test("processarPendentes envia email PMOC e marca automacao como concluida", async () => {
  const agora = new Date("2026-06-12T12:00:00.000Z");
  const chamadas = {
    email: undefined as unknown,
    updates: [] as unknown[]
  };
  const prisma = {
    automacaoAgendada: {
      findMany: async () => [
        {
          id: "automacao-1",
          tipo: AutomacaoTipo.enviar_email,
          payload: {
            tipo: "pmoc_relatorio_assinado",
            relatorio_id: "relatorio-1",
            cliente_id: "cliente-1",
            cliente_email: "maria@example.com",
            engenheiro_crea: "CREA-PR 123456",
            pdf_hash: "hash-pdf"
          },
          tentativas: 0
        }
      ],
      updateMany: async ({ where, data }: { where: unknown; data: unknown }) => {
        chamadas.updates.push({ where, data });
        return { count: 1 };
      },
      update: async ({ where, data }: { where: unknown; data: unknown }) => {
        chamadas.updates.push({ where, data });
      }
    }
  };
  const emailSender: EmailSender = {
    enviar: async (email) => {
      chamadas.email = email;
    }
  };
  const service = new AutomacoesService(prisma as never, emailSender, criarConfig({ SMTP_FROM: "AIRMOVEBR <noreply@example.com>" }) as never);

  const resultado = await service.processarPendentes(agora);

  assert.equal(resultado.processadas, 1);
  assert.equal(resultado.concluidas, 1);
  assert.equal(resultado.falhas, 0);
  assert.deepEqual(chamadas.email, {
    from: "AIRMOVEBR <noreply@example.com>",
    to: "maria@example.com",
    subject: "Relatorio PMOC assinado - AIRMOVEBR",
    text: [
      "O relatorio PMOC foi assinado pelo engenheiro responsavel.",
      "",
      "Relatorio: relatorio-1",
      "Cliente: cliente-1",
      "CREA: CREA-PR 123456",
      "Hash PDF: hash-pdf"
    ].join("\n")
  });
  assert.deepEqual(chamadas.updates.at(-1), {
    where: { id: "automacao-1" },
    data: {
      status: AutomacaoStatus.concluida,
      erroUltimaTentativa: null
    }
  });
});

test("processarPendentes envia link de assinatura PMOC para o engenheiro", async () => {
  const chamadas = {
    email: undefined as unknown
  };
  const prisma = {
    automacaoAgendada: {
      findMany: async () => [
        {
          id: "automacao-engenheiro-1",
          tipo: AutomacaoTipo.enviar_email,
          payload: {
            tipo: "pmoc_assinatura_engenheiro",
            relatorio_id: "relatorio-1",
            cliente_nome: "Maria Souza",
            engenheiro_email: "paulo@example.com",
            engenheiro_nome: "Paulo Londriclima",
            link_assinatura: "https://airmovebr.com.br/landing/assinatura-pmoc.html?token=abc123",
            pdf_hash: "hash-pdf"
          },
          tentativas: 0
        }
      ],
      updateMany: async () => ({ count: 1 }),
      update: async () => undefined
    }
  };
  const emailSender: EmailSender = {
    enviar: async (email) => {
      chamadas.email = email;
    }
  };
  const service = new AutomacoesService(prisma as never, emailSender, criarConfig({ SMTP_FROM: "AIRMOVEBR <noreply@example.com>" }) as never);

  const resultado = await service.processarPendentes(new Date("2026-06-12T12:00:00.000Z"));

  assert.equal(resultado.concluidas, 1);
  assert.deepEqual(chamadas.email, {
    from: "AIRMOVEBR <noreply@example.com>",
    to: "paulo@example.com",
    subject: "Assinatura PMOC pendente - Maria Souza",
    text: [
      "Paulo Londriclima, existe um relatorio PMOC aguardando sua assinatura.",
      "",
      "Cliente: Maria Souza",
      "Relatorio: relatorio-1",
      "Hash PDF: hash-pdf",
      "",
      "Acesse o link abaixo para conferir e assinar:",
      "https://airmovebr.com.br/landing/assinatura-pmoc.html?token=abc123"
    ].join("\n")
  });
});

test("processarPendentes registra falha SMTP e incrementa tentativa", async () => {
  const chamadas = {
    updateFinal: undefined as unknown
  };
  const prisma = {
    automacaoAgendada: {
      findMany: async () => [
        {
          id: "automacao-2",
          tipo: AutomacaoTipo.enviar_email,
          payload: {
            tipo: "pmoc_relatorio_assinado",
            relatorio_id: "relatorio-2",
            cliente_id: "cliente-2",
            cliente_email: "ana@example.com",
            engenheiro_crea: "CREA-PR 999999",
            pdf_hash: "hash-falha"
          },
          tentativas: 1
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
