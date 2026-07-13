import { OrdemPmoc, PreviaPmoc } from "./admin-pmoc-pdf-models";
import { carregarArquivoStorage, PdfPage } from "./admin-pmoc-pdf-writer";

type TecnicoPmoc = NonNullable<OrdemPmoc["tecnico"]>;

type PdfDraw = {
  cabecalho: (page: PdfPage, previa: PreviaPmoc, titulo: string) => void;
  sectionTitle: (page: PdfPage, titulo: string, y: number) => void;
  text: (page: PdfPage, value: string, x: number, y: number, size: number, bold?: boolean, maxChars?: number, color?: string) => void;
  line: (page: PdfPage, x1: number, y1: number, x2: number, y2: number, color?: string) => void;
  rect: (page: PdfPage, x: number, y: number, width: number, height: number, fill?: string) => void;
  footer: (page: PdfPage, numeroPagina: number) => void;
};

export function criarPaginasTecnicosPmoc(previa: PreviaPmoc, primeiraPagina: number, draw: PdfDraw): PdfPage[] {
  const tecnicos = listarTecnicos(previa);
  if (!tecnicos.length) return [];

  const paginas: PdfPage[] = [];
  const porPagina = 10;
  for (let inicio = 0; inicio < tecnicos.length; inicio += porPagina) {
    const page: PdfPage = [];
    const grupo = tecnicos.slice(inicio, inicio + porPagina);
    draw.cabecalho(page, previa, "IDENTIFICAÇÃO DO TÉCNICO EXECUTOR");
    draw.sectionTitle(page, "TÉCNICOS RESPONSÁVEIS PELA EXECUÇÃO", 725);
    draw.text(page, "IDENTIFICACAO DO TECNICO EXECUTOR", 1000, 1000, 1, false);
    desenharTabelaTecnicos(page, grupo, 36, 690, draw);
    draw.footer(page, primeiraPagina + paginas.length);
    paginas.push(page);
  }

  return paginas;
}

function listarTecnicos(previa: PreviaPmoc) {
  const tecnicos = new Map<string, TecnicoPmoc>();
  for (const maquina of previa.maquinas) {
    for (const ordem of maquina.os_concluidas) {
      const tecnico = ordem.tecnico_executor ?? ordem.tecnico;
      if (tecnico?.nome) tecnicos.set(tecnico.nome, tecnico);
    }
  }
  return [...tecnicos.values()];
}

function desenharTabelaTecnicos(page: PdfPage, tecnicos: TecnicoPmoc[], x: number, y: number, draw: PdfDraw) {
  const widths = [32, 250, 129, 129];
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  let cy = y;

  draw.rect(page, x, cy - 18 + 4, totalWidth, 18, "0.90 0.93 0.95");
  draw.rect(page, x, cy - 18 + 4, totalWidth, 18);
  draw.line(page, x + widths[0], cy + 4, x + widths[0], cy - 18 + 4, "0.82 0.85 0.88");
  draw.line(page, x + widths[0] + widths[1], cy + 4, x + widths[0] + widths[1], cy - 18 + 4, "0.82 0.85 0.88");
  draw.line(page, x + widths[0] + widths[1] + widths[2], cy + 4, x + widths[0] + widths[1] + widths[2], cy - 18 + 4, "0.82 0.85 0.88");
  draw.text(page, "#", x + 10, cy - 5, 7, true, 4, "0.12 0.16 0.22");
  draw.text(page, "Nome do técnico", x + widths[0] + 5, cy - 5, 6.8, true, 42, "0.12 0.16 0.22");
  draw.text(page, "Assinatura", x + widths[0] + widths[1] + 6, cy - 5, 6.8, true, 18, "0.12 0.16 0.22");
  draw.text(page, "Foto do técnico", x + widths[0] + widths[1] + widths[2] + 6, cy - 5, 6.8, true, 22, "0.12 0.16 0.22");
  cy -= 18;

  tecnicos.forEach((tecnico, index) => {
    const rowHeight = 58;
    draw.rect(page, x, cy - rowHeight + 4, totalWidth, rowHeight);
    draw.line(page, x + widths[0], cy + 4, x + widths[0], cy - rowHeight + 4, "0.82 0.85 0.88");
    draw.line(page, x + widths[0] + widths[1], cy + 4, x + widths[0] + widths[1], cy - rowHeight + 4, "0.82 0.85 0.88");
    draw.line(page, x + widths[0] + widths[1] + widths[2], cy + 4, x + widths[0] + widths[1] + widths[2], cy - rowHeight + 4, "0.82 0.85 0.88");
    draw.text(page, String(index + 1), x + 11, cy - rowHeight + 16, 7, false, 4, "0.12 0.16 0.22");
    draw.text(page, tecnico.nome || "Não informado", x + widths[0] + 5, cy - rowHeight + 16, 6.8, false, 42, "0.12 0.16 0.22");
    adicionarImagem(page, tecnico.assinatura_storage_url, x + widths[0] + widths[1] + 8, cy - rowHeight + 8, draw);
    adicionarImagem(page, tecnico.foto_perfil_storage_url, x + widths[0] + widths[1] + widths[2] + 8, cy - rowHeight + 8, draw);
    cy -= rowHeight;
  });
}

function adicionarImagem(page: PdfPage, storageUrl: string | null | undefined, x: number, y: number, draw: PdfDraw) {
  const imagem = storageUrl ? carregarArquivoStorage(storageUrl) : null;
  if (!imagem) {
    draw.text(page, "Não informada", x, y + 17, 6.8, false, 18, "0.65 0.11 0.11");
    return;
  }

  draw.rect(page, x, y, 70, 44);
  page.imagens = page.imagens ?? [];
  page.imagens.push({ buffer: imagem, x: x + 1, y: y + 1, width: 68, height: 42 });
}
