import * as assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { ComercialOrcamentoPdfRenderer, OrcamentoPdfInput } from "./comercial-orcamento-pdf-renderer";

const decimal = (value: number) => new Prisma.Decimal(value);

function criarInput({ quantidadeItens = 1 }: { quantidadeItens?: number } = {}): OrcamentoPdfInput {
  return {
    numero: "ORC-2026-0001",
    titulo: "Instalação e manutenção de ar-condicionado",
    detalhes: "Proposta para instalação com materiais, mão de obra e garantia do serviço executado.",
    validoAte: new Date("2026-08-15T12:00:00.000Z"),
    subtotal: decimal(3500), desconto: decimal(0), total: decimal(3500),
    empresa: { nome: "AIRMOVEBR", razaoSocial: "AIRMOVEBR Climatização", cnpj: "12.345.678/0001-90", telefone: "(43) 99999-9999", email: "contato@airmovebr.com.br", logradouro: "Rua São João", numero: "100", bairro: "Centro", cidade: "Londrina", uf: "PR", cep: "86000-000" },
    cliente: { nome: "João da Silva", telefone: "(43) 98888-8888", logradouro: "Avenida República", numero: "200", bairro: "Jardim São Paulo", cidade: "Londrina", uf: "PR", cep: "86000-100" },
    itens: Array.from({ length: quantidadeItens }, (_, index) => ({ descricao: `Item ${index + 1}: instalação e manutenção preventiva de ar-condicionado no ambiente comercial`, unidade: "un", quantidade: decimal(1), valorUnitario: decimal(100), valorTotal: decimal(100) }))
  };
}

test("PDF preserva caracteres em português", () => {
  const pdf = new ComercialOrcamentoPdfRenderer().gerar(criarInput());
  const conteudo = pdf.toString("latin1");
  assert.match(conteudo, /Instalação e manutenção/);
  assert.match(conteudo, /João da Silva/);
  assert.doesNotMatch(conteudo, /InstalaÃ§Ã£o|manutenÃ§Ã£o|JoÃ£o/);
});

test("PDF cria outra página para lista longa de itens e repete o cabeçalho", () => {
  const pdf = new ComercialOrcamentoPdfRenderer().gerar(criarInput({ quantidadeItens: 35 }));
  const conteudo = pdf.toString("latin1");
  assert.match(conteudo, /\/Count [2-9]/);
  assert.ok((conteudo.match(/DESCRIÇÃO/g) ?? []).length >= 2);
  assert.match(conteudo, /Item 35: instalação e manutenção/);
});
