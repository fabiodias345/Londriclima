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
            cliente_nome: "Maria Souza",
            cliente_email: "maria@example.com",
            data_envio: "2026-06-12T12:00:00.000Z",
            engenheiro_nome: "Paulo Londriclima",
            engenheiro_cpf: "12345678901",
            engenheiro_crea: "CREA-PR 123456",
            pdf_hash: "hash-pdf",
            pdf_filename: "pmoc-maria-souza.pdf",
            pdf_base64: Buffer.from("%PDF-1.4\npmoc").toString("base64")
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
      return {
        response: "250 2.0.0 OK smtp-id - gsmtp",
        recipient: email.to
      };
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
    subject: "Relatorio Tecnico PMOC - Junho/2026 - Maria Souza",
    text: [
      "Prezado(a) Senhor(a) Souza,",
      "",
      "Cumprimentando-o(a) cordialmente, encaminhamos em anexo o relatorio final do PMOC referente ao periodo de junho de 2026.",
      "",
      "O documento ja se encontra devidamente validado e assinado pelo engenheiro responsavel pela inspecao. Seguem abaixo as informacoes de registro do profissional:",
      "",
      "Responsavel Tecnico: Paulo Londriclima",
      "CPF: 123.456.789-01",
      "Conselho Regional: CREA-PR 123456",
      "",
      "Agradecemos a confianca em nossos servicos e renovamos nossos protestos de estima. Permanecemos a inteira disposicao.",
      "",
      "Cordialmente,",
      "",
      "AIRMOVEBR"
    ].join("\n"),
    attachments: [
      {
        filename: "pmoc-maria-souza.pdf",
        contentType: "application/pdf",
        contentBase64: Buffer.from("%PDF-1.4\npmoc").toString("base64")
      }
    ]
  });
  assert.deepEqual(chamadas.updates.at(-1), {
    where: { id: "automacao-1" },
    data: {
      status: AutomacaoStatus.concluida,
      erroUltimaTentativa: null,
      payload: {
        tipo: "pmoc_relatorio_assinado",
        relatorio_id: "relatorio-1",
        cliente_id: "cliente-1",
        cliente_nome: "Maria Souza",
        cliente_email: "maria@example.com",
        data_envio: "2026-06-12T12:00:00.000Z",
        engenheiro_nome: "Paulo Londriclima",
        engenheiro_cpf: "12345678901",
        engenheiro_crea: "CREA-PR 123456",
        pdf_hash: "hash-pdf",
        pdf_filename: "pmoc-maria-souza.pdf",
        pdf_base64: Buffer.from("%PDF-1.4\npmoc").toString("base64"),
        smtp_entrega: {
          destinatario: "maria@example.com",
          resposta: "250 2.0.0 OK smtp-id - gsmtp",
          enviado_em: "2026-06-12T12:00:00.000Z"
        }
      }
    }
  });
});

test("processarPendentes envia copia oculta interna no email final PMOC quando configurado", async () => {
  const chamadas = {
    email: undefined as unknown
  };
  const prisma = {
    automacaoAgendada: {
      findMany: async () => [
        {
          id: "automacao-copia-1",
          tipo: AutomacaoTipo.enviar_email,
          payload: {
            tipo: "pmoc_relatorio_assinado",
            relatorio_id: "relatorio-1",
            cliente_id: "cliente-1",
            cliente_nome: "Maria Souza",
            cliente_email: "maria@example.com",
            data_envio: "2026-06-12T12:00:00.000Z",
            engenheiro_nome: "Paulo Londriclima",
            engenheiro_cpf: "12345678901",
            engenheiro_crea: "CREA-PR 123456",
            pdf_hash: "hash-pdf",
            pdf_filename: "pmoc-maria-souza.pdf",
            pdf_base64: Buffer.from("%PDF-1.4\npmoc").toString("base64")
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
      return {
        response: "250 2.0.0 OK smtp-id - gsmtp",
        recipient: email.to
      };
    }
  };
  const service = new AutomacoesService(
    prisma as never,
    emailSender,
    criarConfig({
      SMTP_FROM: "AIRMOVEBR <noreply@example.com>",
      PMOC_INTERNAL_COPY_EMAIL: "airmovebr2@gmail.com"
    }) as never
  );

  const resultado = await service.processarPendentes(new Date("2026-06-12T12:00:00.000Z"));

  assert.equal(resultado.concluidas, 1);
  assert.equal((chamadas.email as { to?: unknown }).to, "maria@example.com");
  assert.equal((chamadas.email as { bcc?: unknown }).bcc, "airmovebr2@gmail.com");
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
            cliente_email: "maria@example.com",
            data_envio: "2026-06-12T12:00:00.000Z",
            engenheiro_email: "paulo@example.com",
            engenheiro_nome: "Paulo Londriclima",
            link_assinatura: "https://airmovebr.com.br/landing/assinatura-pmoc.html?token=abc123",
            pdf_hash: "hash-pdf",
            pdf_filename: "pmoc-maria-souza.pdf",
            pdf_base64: Buffer.from("%PDF-1.4\npmoc").toString("base64")
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
      return {
        response: "250 2.0.0 OK smtp-id - gsmtp",
        recipient: email.to
      };
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
      "Paulo Londriclima, existe um PMOC aguardando sua assinatura.",
      "",
      "Cliente: Maria Souza",
      "E-mail: maria@example.com",
      "Data: 12/06/2026 09:00",
      "Relatorio: relatorio-1",
      "",
      "PDF original em anexo.",
      "Assine o PDF no portal Gov.br e envie o arquivo assinado pelo link abaixo:",
      "https://airmovebr.com.br/landing/assinatura-pmoc.html?token=abc123"
    ].join("\n"),
    attachments: [
      {
        filename: "pmoc-maria-souza.pdf",
        contentType: "application/pdf",
        contentBase64: Buffer.from("%PDF-1.4\npmoc").toString("base64")
      }
    ]
  });
});

test("processarPendentes envia alerta interno quando assinatura PMOC e negada no Assinafy", async () => {
  const chamadas = {
    email: undefined as unknown
  };
  const prisma = {
    automacaoAgendada: {
      findMany: async () => [
        {
          id: "automacao-negada-1",
          tipo: AutomacaoTipo.enviar_email,
          payload: {
            tipo: "pmoc_assinatura_negada",
            relatorio_id: "relatorio-1",
            cliente_nome: "Maria Souza",
            cliente_email: "maria@example.com",
            data_evento: "2026-06-12T12:00:00.000Z",
            engenheiro_nome: "Paulo Londriclima",
            assinafy_status: "refused"
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
      return {
        response: "250 2.0.0 OK smtp-id - gsmtp",
        recipient: email.to
      };
    }
  };
  const service = new AutomacoesService(
    prisma as never,
    emailSender,
    criarConfig({
      SMTP_FROM: "AIRMOVEBR <noreply@example.com>",
      PMOC_SIGNATURE_ALERT_EMAIL: "operacao@airmovebr.com.br"
    }) as never
  );

  const resultado = await service.processarPendentes(new Date("2026-06-12T12:00:00.000Z"));

  assert.equal(resultado.concluidas, 1);
  assert.deepEqual(chamadas.email, {
    from: "AIRMOVEBR <noreply@example.com>",
    to: "operacao@airmovebr.com.br",
    subject: "Assinatura PMOC negada - Maria Souza",
    text: [
      "A assinatura do PMOC foi negada no Assinafy.",
      "",
      "Cliente: Maria Souza",
      "E-mail: maria@example.com",
      "Engenheiro: Paulo Londriclima",
      "Status Assinafy: refused",
      "Data: 12/06/2026 09:00",
      "Relatorio: relatorio-1",
      "",
      "Acesse o painel administrativo para revisar o PMOC e reenviar a assinatura se necessario."
    ].join("\n")
  });
});

test("processarPendentes reagenda falha SMTP antes do limite de tentativas", async () => {
  const agora = new Date("2026-06-12T12:00:00.000Z");
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
            cliente_nome: "Ana Oliveira",
            cliente_email: "ana@example.com",
            data_envio: "2026-06-12T12:00:00.000Z",
            engenheiro_nome: "Paulo Londriclima",
            engenheiro_cpf: "12345678901",
            engenheiro_crea: "CREA-PR 999999",
            pdf_hash: "hash-falha",
            pdf_filename: "pmoc-ana.pdf",
            pdf_base64: Buffer.from("%PDF-1.4\npmoc").toString("base64")
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

  const resultado = await service.processarPendentes(agora);

  assert.equal(resultado.processadas, 1);
  assert.equal(resultado.concluidas, 0);
  assert.equal(resultado.falhas, 1);
  assert.deepEqual(chamadas.updateFinal, {
    status: AutomacaoStatus.pendente,
    tentativas: {
      increment: 1
    },
    executarEm: new Date("2026-06-12T12:05:00.000Z"),
    erroUltimaTentativa: "SMTP indisponivel"
  });
});

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
