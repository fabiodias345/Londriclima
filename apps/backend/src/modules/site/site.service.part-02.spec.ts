import { BadRequestException } from "@nestjs/common";
import { PmocRelatorioStatus } from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { SiteService } from "./site.service";

function criarService(prisma: unknown, adminService?: unknown) {
  return new SiteService(prisma as never, adminService as never);
}

test("confirmarAssinaturaPmoc nao arquiva PDF assinado no Drive", async () => {
  const pdfAssinado = Buffer.from("%PDF-1.7\nassinado-govbr");
  const chamadas = {
    updateData: undefined as unknown,
    driveChamado: false
  };
  const tx = {
    pmocRelatorio: {
      update: async ({ data }: { data: unknown }) => {
        chamadas.updateData = data;
        return {
          id: "relatorio-1",
          status: PmocRelatorioStatus.assinado,
          pdfHash: (data as { pdfHash: string }).pdfHash,
          assinadoEm: new Date("2026-06-12T12:00:00.000Z"),
          emailCliente: "maria@example.com",
          emailAgendadoEm: new Date("2026-06-12T12:00:00.000Z"),
          historicoFinalizadoEm: new Date("2026-06-12T12:00:00.000Z")
        };
      }
    },
    automacaoAgendada: {
      create: async () => undefined
    }
  };
  const prisma = {
    pmocRelatorio: {
      findUnique: async () => ({
        id: "relatorio-1",
        empresaId: "empresa-1",
        clienteId: "cliente-1",
        status: PmocRelatorioStatus.aguardando_assinatura_engenheiro,
        pdfHash: "hash-pdf",
        cliente: {
          id: "cliente-1",
          nome: "Maria Souza",
          email: "maria@example.com"
        },
        engenheiroResponsavel: {
          nome: "Paulo Londriclima",
          cpf: "12345678901",
          crea: "CREA-PR 123456",
          email: "paulo@example.com"
        }
      })
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const driveStorage = {
    salvarPdfAssinadoPmoc: async () => {
      chamadas.driveChamado = true;
      return "https://drive.google.com/file/d/pdf-drive-1/view";
    }
  };
  void driveStorage;
  const service = criarService(prisma);

  const resposta = await service.confirmarAssinaturaPmoc("token-assinatura", {
    pdf_assinado_base64: pdfAssinado.toString("base64"),
    pdf_assinado_filename: "pmoc-maria-souza-assinado-govbr.pdf"
  });

  assert.equal(chamadas.driveChamado, false);
  assert.equal("pdfDriveUrl" in (chamadas.updateData as Record<string, unknown>), false);
  assert.equal("pdf_drive_url" in resposta, false);
});

test("confirmarAssinaturaPmoc rejeita confirmacao sem PDF assinado valido", async () => {
  const chamadas = {
    transacao: false
  };
  const prisma = {
    pmocRelatorio: {
      findUnique: async () => ({
        id: "relatorio-1",
        empresaId: "empresa-1",
        clienteId: "cliente-1",
        status: PmocRelatorioStatus.aguardando_assinatura_engenheiro,
        pdfHash: "hash-pdf",
        emailCliente: null,
        emailAgendadoEm: null,
        historicoFinalizadoEm: null,
        cliente: {
          id: "cliente-1",
          nome: "Maria Souza",
          email: "maria@example.com"
        },
        engenheiroResponsavel: {
          nome: "Paulo Londriclima",
          cpf: "12345678901",
          crea: "CREA-PR 123456",
          email: "paulo@example.com"
        }
      })
    },
    $transaction: async () => {
      chamadas.transacao = true;
    }
  };
  const service = criarService(prisma);

  await assert.rejects(
    () => service.confirmarAssinaturaPmoc("token-assinatura", { pdf_assinado_base64: Buffer.from("texto").toString("base64") }),
    BadRequestException
  );
  assert.equal(chamadas.transacao, false);
});
