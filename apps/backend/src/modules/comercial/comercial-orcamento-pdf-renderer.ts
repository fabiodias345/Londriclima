import { Prisma } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { criarPdfBuffer, PdfPage } from "../admin/services/admin-pmoc-pdf-writer";

export type OrcamentoPdfInput = {
  numero: string;
  titulo: string;
  detalhes?: string | null;
  validoAte?: Date | null;
  subtotal: Prisma.Decimal;
  desconto: Prisma.Decimal;
  total: Prisma.Decimal;
  empresa: { nome: string; razaoSocial?: string | null; cnpj?: string | null; telefone?: string | null; email?: string | null; logradouro?: string | null; numero?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null; cep?: string | null };
  cliente: { nome: string; telefone?: string | null; logradouro?: string | null; numero?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null; cep?: string | null };
  itens: Array<{ descricao: string; unidade: string; quantidade: Prisma.Decimal; valorUnitario: Prisma.Decimal; valorTotal: Prisma.Decimal }>;
};

const CONTENT_BOTTOM = 54;
const BLUE = "0.08 0.36 0.62";
const DARK = "0.08 0.12 0.18";
const AIR_MOVE_PHONE = "(43) 3067-3793";
const AIR_MOVE_EMAIL = "contato@airmove.com.br";

export class ComercialOrcamentoPdfRenderer {
  gerar(input: OrcamentoPdfInput) {
    const pages: PdfPage[] = [];
    let page = this.novaPagina(pages, input);
    let y = 690;

    this.text(page, "PROPOSTA COMERCIAL DE SERVIÇOS", 188, y, 15, true, BLUE);
    this.text(page, input.titulo.toUpperCase(), 90, y - 19, 9, true, DARK);
    y -= 38;
    y = this.dadosProjeto(page, input, y);
    y -= 14;
    this.text(page, "Apresentamos nossa proposta para execução dos serviços descritos abaixo:", 40, y, 9, false, DARK);
    y -= 16;
    y = this.tabela(page, input, y);

    const observacao = "Após a aprovação, nossa equipe entrará em contato para confirmar o agendamento e os detalhes da execução.";
    if (this.precisaNovaPagina(y, 135)) { page = this.novaPagina(pages, input); y = 690; }
    y -= 16;
    this.financeiro(page, input, y);
    y -= 62;
    this.text(page, `VALIDADE DA PROPOSTA: ${input.validoAte ? this.data(input.validoAte) : "A COMBINAR"}`, 40, y, 9, true, BLUE);
    this.text(page, "CONDIÇÕES COMERCIAIS", 40, y - 23, 9, true, BLUE);
    this.blocoTexto(page, observacao, y - 39, 8, false, DARK, 105, 11);

    for (const pdfPage of pages) this.rodape(pdfPage);
    return criarPdfBuffer(pages);
  }

  private novaPagina(pages: PdfPage[], input: OrcamentoPdfInput) {
    const page: PdfPage = [];
    pages.push(page);
    const logo = this.carregarLogo();
    if (logo) page.imagens = [{ buffer: logo, x: 55, y: 730, width: 170, height: 82 }];

    const empresa = input.empresa;
    const razao = empresa.razaoSocial || "M. LIMA MANUTENÇÕES PREDIAIS E INDUSTRIAIS LTDA";
    const endereco = this.endereco(empresa);
    this.text(page, razao.toUpperCase(), 350, 790, 8, false, DARK);
    this.text(page, `CNPJ: ${empresa.cnpj || "não informado"}`, 420, 776, 8, false, DARK);
    this.text(page, endereco, 350, 762, 8, false, DARK);
    this.text(page, `${AIR_MOVE_PHONE} | ${AIR_MOVE_EMAIL}`, 350, 748, 8, false, DARK);
    this.line(page, 40, 718, 576, 718, BLUE, 2);
    this.text(page, `Nº ${input.numero}`, 490, 704, 8, true, BLUE);
    return page;
  }

  private dadosProjeto(page: PdfPage, input: OrcamentoPdfInput, y: number) {
    const equipamento = input.itens.map((item) => item.descricao).join("; ") || "Conforme escopo da proposta";
    const contexto = input.detalhes || "Serviço conforme levantamento e necessidade apresentada pelo cliente.";
    const rows = [
      ["CLIENTE", input.cliente.nome],
      ["PROJETO / SERVIÇO", input.titulo],
      ["EQUIPAMENTO / ESCOPO", equipamento],
      ["CONTEXTO", contexto]
    ];
    rows.forEach(([label, value]) => {
      const lines = this.quebrarTexto(value, 93);
      const height = Math.max(20, lines.length * 11 + 8);
      this.rect(page, 40, y - height, 536, height, "1 1 1");
      this.rect(page, 40, y - height, 132, height, BLUE, false);
      this.text(page, label, 49, y - height / 2 + 3, 8, true, "1 1 1");
      lines.forEach((line, index) => this.text(page, line, 184, y - 14 - index * 11, 8, false, DARK));
      y -= height;
    });
    return y;
  }

  private tabela(page: PdfPage, input: OrcamentoPdfInput, y: number) {
    const columns = [["ITEM", 48], ["DESCRIÇÃO", 92], ["UN.", 360], ["QTD.", 402], ["VALOR UNIT.", 445], ["VALOR TOTAL", 515]] as const;
    this.rect(page, 40, y - 25, 536, 25, BLUE);
    columns.forEach(([label, x]) => this.text(page, label, x, y - 16, 7, true, "1 1 1"));
    y -= 25;
    input.itens.forEach((item, index) => {
      const lines = this.quebrarTexto(item.descricao, 40);
      const height = Math.max(27, lines.length * 11 + 12);
      if (this.precisaNovaPagina(y, height + 20)) return;
      this.rect(page, 40, y - height, 536, height, index % 2 ? "0.97 0.98 0.99" : "1 1 1");
      this.text(page, String(index + 1), 55, y - 16, 8, false, DARK);
      lines.forEach((line, lineIndex) => this.text(page, line, 92, y - 14 - lineIndex * 11, 8, false, DARK));
      this.text(page, item.unidade, 362, y - 16, 8, false, DARK);
      this.text(page, item.quantidade.toString(), 406, y - 16, 8, false, DARK);
      this.text(page, this.moeda(item.valorUnitario), 445, y - 16, 7, false, DARK);
      this.text(page, this.moeda(item.valorTotal), 515, y - 16, 7, true, DARK);
      y -= height;
    });
    return y;
  }

  private financeiro(page: PdfPage, input: OrcamentoPdfInput, y: number) {
    this.rect(page, 40, y - 31, 536, 31, "0.85 0.92 0.97");
    this.text(page, "VALOR TOTAL DA PROPOSTA", 52, y - 20, 10, true, BLUE);
    this.text(page, this.moeda(input.total), 468, y - 20, 12, true, "0.78 0.05 0.12");
  }

  private rodape(page: PdfPage) {
    this.line(page, 40, 37, 576, 37, "0.55 0.65 0.74", 1);
    this.text(page, `Air Move Climatização · WhatsApp ${AIR_MOVE_PHONE} · ${AIR_MOVE_EMAIL}`, 40, 23, 7, false, "0.35 0.4 0.46");
  }

  private blocoTexto(page: PdfPage, value: string, y: number, size: number, bold: boolean, color: string, maxChars: number, lineHeight: number) {
    this.quebrarTexto(value, maxChars).forEach((line, index) => this.text(page, line, 40, y - index * lineHeight, size, bold, color));
  }

  private carregarLogo() {
    for (const caminho of [resolve(process.cwd(), "assets", "air-move-logo-header.jpg"), resolve(process.cwd(), "apps", "backend", "assets", "air-move-logo-header.jpg")]) {
      try { return readFileSync(caminho); } catch { /* tenta o próximo caminho */ }
    }
    return null;
  }

  private endereco(value: OrcamentoPdfInput["empresa"] | OrcamentoPdfInput["cliente"]) { return [[value.logradouro, value.numero].filter(Boolean).join(", "), value.bairro, [value.cidade, value.uf].filter(Boolean).join("/"), value.cep].filter(Boolean).join(" - ") || "Endereço não informado"; }
  private moeda(value: Prisma.Decimal) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value)); }
  private data(value: Date) { return value.toLocaleDateString("pt-BR"); }
  private quebrarTexto(value: string, maxChars: number) { return value.trim().split(/\s+/).filter(Boolean).reduce<string[]>((lines, word) => { const current = lines.at(-1) || ""; if (!current || `${current} ${word}`.length > maxChars) lines.push(word); else lines[lines.length - 1] = `${current} ${word}`; return lines; }, []) || [""]; }
  private precisaNovaPagina(y: number, altura: number) { return y - altura < CONTENT_BOTTOM; }
  private text(page: PdfPage, value: string, x: number, y: number, size: number, bold: boolean, color: string) { page.push(`BT ${color} rg /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${this.escape(value)}) Tj ET`); }
  private rect(page: PdfPage, x: number, y: number, width: number, height: number, fill?: string, border = true) { if (fill) page.push(`q ${fill} rg ${x} ${y} ${width} ${height} re f Q`); if (border) page.push(`q 0.65 0.72 0.8 RG ${x} ${y} ${width} ${height} re S Q`); }
  private line(page: PdfPage, x1: number, y1: number, x2: number, y2: number, color: string, width = 1) { page.push(`q ${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`); }
  private escape(value: string) { return value.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\xff]/g, "?"); }
}
