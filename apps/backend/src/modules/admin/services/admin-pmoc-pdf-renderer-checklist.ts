import { montarChecklistMobile } from "../../mobile/mobile-checklists";
import { OrdemPmoc } from "./admin-pmoc-pdf-models";
import { carregarArquivoStorage, PdfPage } from "./admin-pmoc-pdf-writer";

type ChecklistLinha = { item: string; tipo: "foto" | "temperatura" | "status"; valor: string };

type PdfDraw = {
  text: (page: PdfPage, value: string, x: number, y: number, size: number, bold?: boolean, maxChars?: number, color?: string) => void;
  line: (page: PdfPage, x1: number, y1: number, x2: number, y2: number, color?: string) => void;
  rect: (page: PdfPage, x: number, y: number, width: number, height: number, fill?: string) => void;
};

export function adicionarChecklistApkPdf(page: PdfPage, ordem: OrdemPmoc | null, x: number, y: number, draw: PdfDraw) {
  const linhas = linhasChecklistApk(ordem);
  const widths = [32, 285, 223];
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  let cy = y;

  const drawRow = (height: number, cells: string[], bold = false) => {
    if (bold) draw.rect(page, x, cy - height + 4, totalWidth, height, "0.90 0.93 0.95");
    draw.rect(page, x, cy - height + 4, totalWidth, height);
    draw.line(page, x + widths[0], cy + 4, x + widths[0], cy - height + 4, "0.82 0.85 0.88");
    draw.line(page, x + widths[0] + widths[1], cy + 4, x + widths[0] + widths[1], cy - height + 4, "0.82 0.85 0.88");
    draw.text(page, cells[0], x + 8, cy - height + 13, 7, bold, 4, "0.12 0.16 0.22");
    draw.text(page, cells[1], x + widths[0] + 5, cy - height + 13, 6.8, bold, 42, "0.12 0.16 0.22");
    draw.text(page, cells[2], x + widths[0] + widths[1] + 6, cy - height + 13, 6.8, bold, 32, "0.12 0.16 0.22");
    cy -= height;
  };

  drawRow(18, ["#", "Item de Verificação", "Resultado"], true);

  if (!linhas.length) {
    drawRow(24, ["-", "Checklist não informado no app", "Não informado"]);
    return;
  }

  linhas.forEach((linha, index) => {
    const rowHeight = linha.tipo === "foto" ? 58 : 24;
    draw.rect(page, x, cy - rowHeight + 4, totalWidth, rowHeight);
    draw.line(page, x + widths[0], cy + 4, x + widths[0], cy - rowHeight + 4, "0.82 0.85 0.88");
    draw.line(page, x + widths[0] + widths[1], cy + 4, x + widths[0] + widths[1], cy - rowHeight + 4, "0.82 0.85 0.88");
    draw.text(page, String(index + 1), x + 11, cy - rowHeight + 16, 7, false, 4, "0.12 0.16 0.22");
    draw.text(page, linha.item, x + widths[0] + 5, cy - rowHeight + 16, 6.8, false, 42, "0.12 0.16 0.22");

    if (linha.tipo === "foto") {
      adicionarImagemChecklist(page, linha.valor, x + widths[0] + widths[1] + 8, cy - rowHeight + 8, draw);
    } else if (linha.tipo === "temperatura") {
      desenharTemperatura(page, linha.valor, x + widths[0] + widths[1] + 8, cy - rowHeight + 14, draw);
    } else {
      desenharResultadoNormal(page, linha.valor, x + widths[0] + widths[1] + 8, cy - rowHeight + 15, draw);
    }

    cy -= rowHeight;
  });
}

export function adicionarFotosAppPdf(page: PdfPage, ordem: OrdemPmoc | null, x: number, y: number, draw: PdfDraw) {
  urlsEvidenciasApp(ordem)
    .slice(0, 4)
    .forEach((url, index) => {
      const imagem = carregarArquivoStorage(url);
      if (!imagem) return;
      const left = x + index * 138;
      draw.rect(page, left, y, 120, 120);
      draw.text(page, obterNomeArquivo(url), left, y - 12, 6.5, false, 18, "0.38 0.42 0.48");
      page.imagens = page.imagens ?? [];
      page.imagens.push({ buffer: imagem, x: left + 1, y: y + 1, width: 118, height: 118 });
    });
}

function linhasChecklistApk(ordem: OrdemPmoc | null): ChecklistLinha[] {
  if (!ordem?.checklist_respostas?.length) return [];
  const labels = new Map(montarChecklistMobile(tipoChecklistPmoc(ordem)).map((item) => [item.codigo, item.item]));
  return ordem.checklist_respostas
    .filter((resposta) => resposta.codigo && resposta.valor && resposta.tipo !== "etapa" && !resposta.codigo.startsWith("ANU_ETAPA_"))
    .map((resposta) => ({
      item: labels.get(resposta.codigo ?? "") ?? resposta.codigo ?? "Item",
      tipo: resposta.tipo === "foto" ? "foto" : resposta.tipo === "numerico" ? "temperatura" : "status",
      valor: resposta.valor ?? ""
    }));
}

function tipoChecklistPmoc(ordem: OrdemPmoc) {
  const tipo = ordem.checklist_tipo;
  return tipo === "mensal" || tipo === "trimestral" || tipo === "semestral" || tipo === "anual" ? tipo : "mensal";
}

function adicionarImagemChecklist(page: PdfPage, storageUrl: string, x: number, y: number, draw: PdfDraw) {
  const imagem = carregarArquivoStorage(storageUrl);
  if (!imagem) {
    draw.text(page, "Foto não encontrada", x, y + 17, 6.8, false, 30, "0.65 0.11 0.11");
    return;
  }
  draw.rect(page, x, y, 70, 44);
  page.imagens = page.imagens ?? [];
  page.imagens.push({ buffer: imagem, x: x + 1, y: y + 1, width: 68, height: 42 });
}

function desenharResultadoNormal(page: PdfPage, valor: string, x: number, y: number, draw: PdfDraw) {
  circle(page, x + 4, y + 2, 4, "0.05 0.58 0.34");
  draw.line(page, x + 2, y + 2, x + 4, y, "1 1 1");
  draw.line(page, x + 4, y, x + 8, y + 5, "1 1 1");
  draw.text(page, valor || "Executado", x + 14, y, 7, false, 28, "0.05 0.34 0.22");
}

function desenharTemperatura(page: PdfPage, valor: string, x: number, y: number, draw: PdfDraw) {
  draw.line(page, x + 4, y + 2, x + 4, y + 12, "0.86 0.14 0.14");
  circle(page, x + 4, y + 1, 3, "0.86 0.14 0.14");
  draw.text(page, `${valor} °C`, x + 13, y, 7, false, 18, "0.12 0.16 0.22");
}

function urlsEvidenciasApp(ordem: OrdemPmoc | null) {
  const urls: string[] = [];
  const vistos = new Set<string>();
  const fotosChecklist = new Set(
    (ordem?.checklist_respostas ?? [])
      .filter((resposta) => resposta.tipo === "foto" && resposta.valor)
      .map((resposta) => resposta.valor as string)
  );
  for (const evidencia of ordem?.evidencias ?? []) {
    const storageUrl = evidencia.storage_url;
    if (storageUrl && !fotosChecklist.has(storageUrl) && !vistos.has(storageUrl)) {
      vistos.add(storageUrl);
      urls.push(storageUrl);
    }
  }
  return urls;
}

function obterNomeArquivo(storageUrl?: string | null) {
  return storageUrl?.split("/").filter(Boolean).at(-1) || "arquivo";
}

function circle(page: PdfPage, x: number, y: number, radius: number, fill: string) {
  const c = radius * 0.5522847498;
  page.push(
    `q ${fill} rg ${x + radius} ${y} m ${x + radius} ${y + c} ${x + c} ${y + radius} ${x} ${y + radius} c ${x - c} ${y + radius} ${x - radius} ${y + c} ${x - radius} ${y} c ${x - radius} ${y - c} ${x - c} ${y - radius} ${x} ${y - radius} c ${x + c} ${y - radius} ${x + radius} ${y - c} ${x + radius} ${y} c f Q`
  );
}
