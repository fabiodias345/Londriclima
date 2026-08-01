import { readFileSync } from "fs";
import { resolve } from "path";
import { Prisma } from "@prisma/client";
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

const PAGE_TOP = 806;
const CONTENT_BOTTOM = 68;
const AIR_MOVE_PHONE = "(43) 3067-3793";
const AIR_MOVE_EMAIL = "airmove@gmail.com";

export class ComercialOrcamentoPdfRenderer {
  gerar(input: OrcamentoPdfInput) {
    const pages: PdfPage[] = [];
    let page = this.novaPagina(pages, input);
    let y = 735;

    y = this.box(page, "DADOS DA EMPRESA", y, [
      input.empresa.razaoSocial || input.empresa.nome,
      input.empresa.cnpj ? `CNPJ: ${input.empresa.cnpj}` : "CNPJ: não informado",
      this.endereco(input.empresa),
      `WhatsApp: ${AIR_MOVE_PHONE} | ${AIR_MOVE_EMAIL}`
    ]);
    y -= 12;
    y = this.box(page, "CLIENTE", y, [input.cliente.nome, this.endereco(input.cliente), input.cliente.telefone || "Telefone não informado"]);
    y -= 18;
    y = this.blocoTexto(page, input.titulo, y, 14, true, "0.04 0.22 0.39", 72, 17);
    if (input.detalhes) {
      y -= 7;
      y = this.blocoTexto(page, input.detalhes, y, 9, false, "0.2 0.25 0.3", 100, 12);
    }
    y -= 16;

    if (this.precisaNovaPagina(y, 25)) {
      page = this.novaPagina(pages, input);
      y = 735;
    }
    y = this.tableHeader(page, y);

    for (const item of input.itens) {
      const descricao = this.quebrarTexto(item.descricao, 45);
      const altura = Math.max(25, descricao.length * 12 + 10);
      if (this.precisaNovaPagina(y, altura)) {
        page = this.novaPagina(pages, input);
        y = this.tableHeader(page, 735);
      }
      this.item(page, item, descricao, y, altura);
      y -= altura;
    }

    const rodapeComercial = this.quebrarTexto("Após sua aprovação, nossa equipe entrará em contato para programar a ordem de serviço.", 95);
    const resumoAltura = 21 + (Number(input.desconto) ? 21 : 0) + 25 + 18 + 17 + 12 + rodapeComercial.length * 12;
    if (this.precisaNovaPagina(y - 12, resumoAltura)) {
      page = this.novaPagina(pages, input);
      y = 735;
    }
    y -= 12;
    this.total(page, "Subtotal", input.subtotal, y); y -= 21;
    if (Number(input.desconto)) { this.total(page, "Desconto", input.desconto, y); y -= 21; }
    this.rect(page, 365, y - 4, 211, 25, "0.88 0.95 0.94");
    this.text(page, "TOTAL", 374, y + 5, 10, true, "0 0.39 0.34");
    this.text(page, this.moeda(input.total), 488, y + 5, 12, true, "0 0.39 0.34");
    y -= 38;
    this.text(page, `Validade: ${input.validoAte ? this.data(input.validoAte) : "a combinar"}`, 36, y, 9, true, "0.04 0.22 0.39");
    y -= 28;
    this.text(page, "Agradecemos por escolher a AIRMOVEBR.", 36, y, 11, true, "0.04 0.22 0.39");
    this.blocoTexto(page, rodapeComercial.join(" "), y - 17, 9, false, "0.2 0.25 0.3", 95, 12);

    for (const pdfPage of pages) this.rodape(pdfPage);
    return criarPdfBuffer(pages);
  }

  private novaPagina(pages: PdfPage[], input: OrcamentoPdfInput) {
    const page: PdfPage = [];
    pages.push(page);
    this.rect(page, 36, 770, 540, 48, "0.04 0.22 0.39");
    const logo = this.carregarLogo();
    if (logo) {
      page.imagens = [{ buffer: logo, x: 45, y: 777, width: 50, height: 34 }];
    }
    this.text(page, "AIR MOVE CLIMATIZAÇÃO", 108, PAGE_TOP, 16, true, "1 1 1");
    this.text(page, "PROPOSTA COMERCIAL", 108, 790, 9, true, "0.78 0.9 1");
    this.text(page, input.numero, 485, PAGE_TOP, 9, true, "1 1 1");
    this.text(page, `Emissão: ${this.data(new Date())}`, 453, 790, 8, false, "0.78 0.9 1");
    return page;
  }

  private box(page: PdfPage, title: string, y: number, values: string[]) {
    const lines = values.filter(Boolean).flatMap((value) => this.quebrarTexto(value, 100));
    const height = 30 + lines.length * 12;
    this.rect(page, 36, y - height, 540, height, "0.98 0.99 1");
    this.rect(page, 36, y - 18, 540, 18, "0.92 0.95 0.98");
    this.text(page, title, 43, y - 12, 8, true, "0.04 0.22 0.39");
    lines.forEach((line, index) => this.text(page, line, 43, y - 31 - index * 12, 8, false, "0.12 0.16 0.22"));
    return y - height;
  }

  private blocoTexto(page: PdfPage, value: string, y: number, size: number, bold: boolean, color: string, maxChars: number, lineHeight: number) {
    const lines = this.quebrarTexto(value, maxChars);
    lines.forEach((line, index) => this.text(page, line, 36, y - index * lineHeight, size, bold, color));
    return y - lines.length * lineHeight;
  }

  private tableHeader(page: PdfPage, y: number) {
    this.rect(page, 36, y - 24, 540, 24, "0.04 0.22 0.39");
    [["DESCRIÇÃO", 43], ["QTD.", 330], ["UNITÁRIO", 415], ["TOTAL", 500]].forEach(([text, x]) => this.text(page, String(text), Number(x), y - 15, 8, true, "1 1 1"));
    return y - 25;
  }

  private item(page: PdfPage, item: OrcamentoPdfInput["itens"][number], descricao: string[], y: number, altura: number) {
    this.rect(page, 36, y - altura, 540, altura);
    descricao.forEach((line, index) => this.text(page, line, 43, y - 14 - index * 12, 9, false, "0.1 0.14 0.2"));
    this.text(page, `${item.quantidade.toString()} ${item.unidade}`, 330, y - 14, 8, false, "0.1 0.14 0.2");
    this.text(page, this.moeda(item.valorUnitario), 415, y - 14, 8, false, "0.1 0.14 0.2");
    this.text(page, this.moeda(item.valorTotal), 500, y - 14, 8, true, "0.1 0.14 0.2");
  }

  private rodape(page: PdfPage) {
    this.line(page, 36, 34, 576, 34, "0.65 0.7 0.76");
    this.text(page, `AIR MOVE Climatização · WhatsApp ${AIR_MOVE_PHONE} · ${AIR_MOVE_EMAIL}`, 36, 20, 7, false, "0.35 0.4 0.46");
    this.text(page, "Proposta comercial", 490, 20, 8, false, "0.35 0.4 0.46");
  }

  private quebrarTexto(value: string, maxChars: number) {
    const words = value.trim().split(/\s+/).filter(Boolean);
    return words.reduce<string[]>((lines, word) => {
      const current = lines.at(-1) || "";
      if (!current || `${current} ${word}`.length > maxChars) lines.push(word);
      else lines[lines.length - 1] = `${current} ${word}`;
      return lines;
    }, []) || [""];
  }

  private precisaNovaPagina(y: number, altura: number) { return y - altura < CONTENT_BOTTOM; }
  private total(page: PdfPage, label: string, value: Prisma.Decimal, y: number) { this.text(page, label, 410, y, 9, false, "0.2 0.25 0.3"); this.text(page, this.moeda(value), 500, y, 9, true, "0.1 0.14 0.2"); }
  private endereco(value: OrcamentoPdfInput["empresa"] | OrcamentoPdfInput["cliente"]) { return [[value.logradouro, value.numero].filter(Boolean).join(", "), value.bairro, [value.cidade, value.uf].filter(Boolean).join("/"), value.cep].filter(Boolean).join(" - ") || "Endereço não informado"; }
  private moeda(value: Prisma.Decimal) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value)); }
  private data(value: Date) { return value.toLocaleDateString("pt-BR"); }
  private carregarLogo() {
    const caminhos = [
      resolve(process.cwd(), "assets", "air-move-logo-header.jpg"),
      resolve(process.cwd(), "apps", "backend", "assets", "air-move-logo-header.jpg")
    ];
    for (const caminho of caminhos) {
      try { return readFileSync(caminho); } catch { /* tenta o próximo caminho */ }
    }
    return null;
  }
  private text(page: PdfPage, value: string, x: number, y: number, size: number, bold: boolean, color: string) { page.push(`BT ${color} rg /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${this.escape(value)}) Tj ET`); }
  private rect(page: PdfPage, x: number, y: number, width: number, height: number, fill?: string) { if (fill) page.push(`q ${fill} rg ${x} ${y} ${width} ${height} re f Q`); page.push(`q 0.78 0.82 0.87 RG ${x} ${y} ${width} ${height} re S Q`); }
  private line(page: PdfPage, x1: number, y1: number, x2: number, y2: number, color: string) { page.push(`q ${color} RG ${x1} ${y1} m ${x2} ${y2} l S Q`); }
  private escape(value: string) { return value.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\xff]/g, "?"); }
}
