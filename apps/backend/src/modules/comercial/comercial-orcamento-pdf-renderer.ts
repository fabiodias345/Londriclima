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

export class ComercialOrcamentoPdfRenderer {
  gerar(input: OrcamentoPdfInput) {
    const page: PdfPage = [];
    this.rect(page, 36, 770, 540, 48, "0.04 0.22 0.39");
    this.text(page, input.empresa.nome.toUpperCase(), 50, 795, 18, true, "1 1 1");
    this.text(page, "PROPOSTA COMERCIAL", 50, 779, 9, true, "0.78 0.9 1");
    this.text(page, input.numero, 485, 795, 9, true, "1 1 1");
    this.text(page, `Emissão: ${this.data(new Date())}`, 453, 779, 8, false, "0.78 0.9 1");
    this.box(page, "DADOS DA EMPRESA", 36, 715, [
      input.empresa.razaoSocial || input.empresa.nome,
      input.empresa.cnpj ? `CNPJ: ${input.empresa.cnpj}` : "CNPJ: não informado",
      this.endereco(input.empresa),
      [input.empresa.telefone, input.empresa.email].filter(Boolean).join(" | ") || "Contato não informado"
    ]);
    this.box(page, "CLIENTE", 36, 625, [input.cliente.nome, this.endereco(input.cliente), input.cliente.telefone || "Telefone não informado"]);
    this.text(page, input.titulo, 36, 565, 14, true, "0.04 0.22 0.39");
    if (input.detalhes) this.text(page, input.detalhes, 36, 547, 9, false, "0.2 0.25 0.3", 90);
    let y = 510;
    this.tableHeader(page, y);
    y -= 25;
    for (const item of input.itens) {
      this.rect(page, 36, y - 5, 540, 25);
      this.text(page, item.descricao, 43, y + 4, 9, false, "0.1 0.14 0.2", 45);
      this.text(page, `${item.quantidade.toString()} ${item.unidade}`, 330, y + 4, 8, false, "0.1 0.14 0.2", 15);
      this.text(page, this.moeda(item.valorUnitario), 415, y + 4, 8, false, "0.1 0.14 0.2", 15);
      this.text(page, this.moeda(item.valorTotal), 500, y + 4, 8, true, "0.1 0.14 0.2", 13);
      y -= 25;
    }
    y -= 12;
    this.total(page, "Subtotal", input.subtotal, y); y -= 21;
    if (Number(input.desconto)) { this.total(page, "Desconto", input.desconto, y); y -= 21; }
    this.rect(page, 365, y - 4, 211, 25, "0.88 0.95 0.94");
    this.text(page, "TOTAL", 374, y + 5, 10, true, "0 0.39 0.34");
    this.text(page, this.moeda(input.total), 488, y + 5, 12, true, "0 0.39 0.34");
    y -= 58;
    this.text(page, `Validade: ${input.validoAte ? this.data(input.validoAte) : "a combinar"}`, 36, y, 9, true, "0.04 0.22 0.39");
    y -= 28;
    this.text(page, "Agradecemos por escolher a AIRMOVEBR.", 36, y, 11, true, "0.04 0.22 0.39");
    this.text(page, "Após sua aprovação, nossa equipe entrará em contato para programar a ordem de serviço.", 36, y - 17, 9, false, "0.2 0.25 0.3", 95);
    this.line(page, 36, 34, 576, 34, "0.65 0.7 0.76");
    this.text(page, "AIRMOVEBR - Ar-condicionado sob demanda", 36, 20, 8, false, "0.35 0.4 0.46");
    this.text(page, "Proposta comercial", 490, 20, 8, false, "0.35 0.4 0.46");
    return criarPdfBuffer([page]);
  }

  private box(page: PdfPage, title: string, x: number, y: number, lines: string[]) { this.rect(page, x, y - 10, 540, 18, "0.92 0.95 0.98"); this.text(page, title, x + 7, y - 4, 8, true, "0.04 0.22 0.39"); lines.filter(Boolean).forEach((line, index) => this.text(page, line, x + 7, y - 28 - index * 14, 8, false, "0.12 0.16 0.22", 100)); }
  private tableHeader(page: PdfPage, y: number) { this.rect(page, 36, y - 5, 540, 24, "0.04 0.22 0.39"); [["DESCRIÇÃO", 43], ["QTD.", 330], ["UNITÁRIO", 415], ["TOTAL", 500]].forEach(([text, x]) => this.text(page, String(text), Number(x), y + 4, 8, true, "1 1 1")); }
  private total(page: PdfPage, label: string, value: Prisma.Decimal, y: number) { this.text(page, label, 410, y, 9, false, "0.2 0.25 0.3"); this.text(page, this.moeda(value), 500, y, 9, true, "0.1 0.14 0.2"); }
  private endereco(value: OrcamentoPdfInput["empresa"] | OrcamentoPdfInput["cliente"]) { return [[value.logradouro, value.numero].filter(Boolean).join(", "), value.bairro, [value.cidade, value.uf].filter(Boolean).join("/"), value.cep].filter(Boolean).join(" - ") || "Endereço não informado"; }
  private moeda(value: Prisma.Decimal) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value)); }
  private data(value: Date) { return value.toLocaleDateString("pt-BR"); }
  private text(page: PdfPage, value: string, x: number, y: number, size: number, bold: boolean, color: string, max = 0) { const text = max && value.length > max ? `${value.slice(0, max - 3)}...` : value; page.push(`BT ${color} rg /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${this.escape(text)}) Tj ET`); }
  private rect(page: PdfPage, x: number, y: number, width: number, height: number, fill?: string) { if (fill) page.push(`q ${fill} rg ${x} ${y} ${width} ${height} re f Q`); page.push(`q 0.78 0.82 0.87 RG ${x} ${y} ${width} ${height} re S Q`); }
  private line(page: PdfPage, x1: number, y1: number, x2: number, y2: number, color: string) { page.push(`q ${color} RG ${x1} ${y1} m ${x2} ${y2} l S Q`); }
  private escape(value: string) { return value.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\xff]/g, "?"); }
}
