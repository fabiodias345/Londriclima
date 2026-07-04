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
  const service = new AutomacoesService(prisma as never, emailSender, criarConfig({ SMTP_FROM: "Clima do Brasil <noreply@example.com>" }) as never);

  const resultado = await service.processarPendentes(agora);

  assert.equal(resultado.processadas, 1);
  assert.equal(resultado.concluidas, 1);
  assert.equal(resultado.falhas, 0);
  assert.deepEqual(chamadas.email, {
    from: "Clima do Brasil <noreply@example.com>",
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
      "Clima do Brasil"
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
      SMTP_FROM: "Clima do Brasil <noreply@example.com>",
      PMOC_INTERNAL_COPY_EMAIL: "airmovebr2@gmail.com"
    }) as never
  );

  const resultado = await service.processarPendentes(new Date("2026-06-12T12:00:00.000Z"));

  assert.equal(resultado.concluidas, 1);
  assert.equal((chamadas.email as { to?: unknown }).to, "maria@example.com");
  assert.equal((chamadas.email as { bcc?: unknown }).bcc, "airmovebr2@gmail.com");
});

test("processarPendentes envia relatorio tecnico avulso direto ao cliente com copia interna", async () => {
  const chamadas = {
    email: undefined as unknown
  };
  const prisma = {
    automacaoAgendada: {
      findMany: async () => [
        {
          id: "automacao-avulsa-1",
          tipo: AutomacaoTipo.enviar_email,
          payload: {
            tipo: "relatorio_tecnico_avulso",
            cliente_id: "cliente-1",
            cliente_nome: "Cliente Avulso",
            cliente_email: "cliente@example.com",
            data_envio: "2026-06-12T12:00:00.000Z",
            periodo_inicio: "2026-06-11T12:00:00.000Z",
            periodo_fim: "2026-06-11T15:00:00.000Z",
            total_maquinas: 1,
            total_os_concluidas: 1,
            os_ids: ["os-1"],
            pdf_filename: "relatorio-tecnico-cliente-avulso.pdf",
            pdf_base64: Buffer.from("%PDF-1.4\nrelatorio").toString("base64")
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
      SMTP_FROM: "Clima do Brasil <noreply@example.com>",
      REPORT_INTERNAL_COPY_EMAIL: "airmovebr2@gmail.com"
    }) as never
  );

  const resultado = await service.processarPendentes(new Date("2026-06-12T12:00:00.000Z"));

  assert.equal(resultado.concluidas, 1);
  assert.deepEqual(chamadas.email, {
    from: "Clima do Brasil <noreply@example.com>",
    to: "cliente@example.com",
    bcc: "airmovebr2@gmail.com",
    subject: "Relatório de manutenção - Cliente Avulso",
    text: [
      "Prezado(a) Cliente Avulso,",
      "",
      "Encaminhamos em anexo o relatório de manutenção referente ao atendimento realizado pela Clima do Brasil.",
      "",
      "Atendimento finalizado em: 11/06/2026 12:00",
      "Máquinas atendidas: 1",
      "O.S. concluídas: 1",
      "",
      "Permanecemos à disposição.",
      "",
      "Cordialmente,",
      "",
      "Clima do Brasil"
    ].join("\n"),
    attachments: [
      {
        filename: "relatorio-tecnico-cliente-avulso.pdf",
        contentType: "application/pdf",
        contentBase64: Buffer.from("%PDF-1.4\nrelatorio").toString("base64")
      }
    ]
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
  const service = new AutomacoesService(prisma as never, emailSender, criarConfig({ SMTP_FROM: "Clima do Brasil <noreply@example.com>" }) as never);

  const resultado = await service.processarPendentes(new Date("2026-06-12T12:00:00.000Z"));

  assert.equal(resultado.concluidas, 1);
  assert.deepEqual(chamadas.email, {
    from: "Clima do Brasil <noreply@example.com>",
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
      SMTP_FROM: "Clima do Brasil <noreply@example.com>",
      PMOC_SIGNATURE_ALERT_EMAIL: "airmovebr2@gmail.com"
    }) as never
  );

  const resultado = await service.processarPendentes(new Date("2026-06-12T12:00:00.000Z"));

  assert.equal(resultado.concluidas, 1);
  assert.deepEqual(chamadas.email, {
    from: "Clima do Brasil <noreply@example.com>",
    to: "airmovebr2@gmail.com",
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
