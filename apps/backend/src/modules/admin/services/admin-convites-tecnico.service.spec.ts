import { test } from "node:test";
import * as assert from "node:assert/strict";
import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { AdminConvitesTecnicoService } from "./admin-convites-tecnico.service";
import { hashCodigoConvite } from "../../auth/convite-tecnico-codigo";

const admin = { id: "admin-1", empresa_id: "empresa-1", email: "admin@teste.com", role: "admin" };

test("gerar convite vincula empresa, administrador e validade de 24 horas", async () => {
  let data: any;
  const agora = Date.now();
  const prisma = {
    conviteTecnico: {
      create: async (args: any) => {
        data = args.data;
        return { id: "convite-1", criadoEm: new Date(agora) };
      }
    }
  };
  const resposta = await new AdminConvitesTecnicoService(prisma as never).gerar(admin);
  assert.equal(data.empresaId, "empresa-1");
  assert.equal(data.criadoPorId, "admin-1");
  assert.match(data.codigoHash, /^[a-f0-9]{64}$/);
  assert.ok(data.expiraEm.getTime() - agora >= 86_399_000);
  assert.match(resposta.codigo, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
});

test("cancelamento recusa convite utilizado", async () => {
  const prisma = {
    conviteTecnico: {
      findFirst: async () => ({
        id: "convite-1",
        expiraEm: new Date(Date.now() + 60_000),
        canceladoEm: null,
        usadoEm: new Date()
      })
    }
  };
  await assert.rejects(
    () => new AdminConvitesTecnicoService(prisma as never).cancelar("convite-1", admin),
    BadRequestException
  );
});

test("encaminhar convite envia codigo por email", async () => {
  let mensagem: any;
  const codigo = "ABCD-EFGH";
  const prisma = {
    conviteTecnico: {
      findFirst: async () => ({
        id: "convite-1",
        codigoHash: hashCodigoConvite(codigo),
        expiraEm: new Date(Date.now() + 60_000),
        canceladoEm: null,
        usadoEm: null
      })
    }
  };
  const emailSender = {
    enviar: async (input: any) => {
      mensagem = input;
      return { recipient: input.to, response: "250 OK" };
    }
  };
  const config = { get: (_key: string, fallback: string) => fallback };

  const resposta = await new AdminConvitesTecnicoService(
    prisma as never,
    emailSender as never,
    config as never
  ).encaminharEmail("convite-1", { email: "Tecnico@Exemplo.com", codigo }, admin);

  assert.equal(mensagem.to, "tecnico@exemplo.com");
  assert.match(mensagem.text, /ABCD-EFGH/);
  assert.deepEqual(resposta, { id: "convite-1", email: "tecnico@exemplo.com", enviado: true });
});

test("encaminhar convite recusa codigo divergente", async () => {
  const prisma = {
    conviteTecnico: {
      findFirst: async () => ({
        id: "convite-1",
        codigoHash: hashCodigoConvite("ABCD-EFGH"),
        expiraEm: new Date(Date.now() + 60_000),
        canceladoEm: null,
        usadoEm: null
      })
    }
  };

  await assert.rejects(
    () => new AdminConvitesTecnicoService(prisma as never).encaminharEmail(
      "convite-1",
      { email: "tecnico@exemplo.com", codigo: "WXYZ-2345" },
      admin
    ),
    BadRequestException
  );
});

test("encaminhar convite informa falha SMTP sem alterar convite", async () => {
  const codigo = "ABCD-EFGH";
  const prisma = {
    conviteTecnico: {
      findFirst: async () => ({
        id: "convite-1",
        codigoHash: hashCodigoConvite(codigo),
        expiraEm: new Date(Date.now() + 60_000),
        canceladoEm: null,
        usadoEm: null
      })
    }
  };
  const emailSender = { enviar: async () => { throw new Error("SMTP offline"); } };

  await assert.rejects(
    () => new AdminConvitesTecnicoService(prisma as never, emailSender as never).encaminharEmail(
      "convite-1",
      { email: "tecnico@exemplo.com", codigo },
      admin
    ),
    ServiceUnavailableException
  );
});
