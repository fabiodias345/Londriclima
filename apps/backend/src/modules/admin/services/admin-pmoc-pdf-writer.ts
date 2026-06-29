import { readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { normalizarImagemPdf } from "../../ordens-servico/ordens-servico-pdf-image.util";
import { PAGE } from "./admin-pmoc-pdf-models";

export type PdfImage = { buffer: Buffer; x: number; y: number; width: number; height: number };
export type PdfPage = string[] & { imagens?: PdfImage[] };

export function criarPdfBuffer(pages: PdfPage[]) {
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  ];
  const pageObjectIds: number[] = [];

  for (const page of pages) {
    const imageObjectIds: number[] = [];
    for (const imagem of page.imagens ?? []) {
      const imageObjectId = objetos.length + 1;
      imageObjectIds.push(imageObjectId);
      objetos.push(criarObjetoImagemPdf(imagem.buffer));
    }

    const xObjects = imageObjectIds.map((id, index) => `/Im${index + 1} ${id} 0 R`).join(" ");
    const recursosImagem = xObjects ? `/XObject << ${xObjects} >>` : "";
    const comandosImagem = (page.imagens ?? [])
      .map((imagem, index) => `q\n${imagem.width} 0 0 ${imagem.height} ${imagem.x} ${imagem.y} cm\n/Im${index + 1} Do\nQ`)
      .join("\n");
    const conteudo = `0.2 w\n0 G\n${page.join("\n")}\n${comandosImagem}`;
    const pageObjectId = objetos.length + 1;
    const contentObjectId = objetos.length + 2;
    pageObjectIds.push(pageObjectId);
    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${recursosImagem} >> /Contents ${contentObjectId} 0 R >>`,
      `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\nstream\n${conteudo}\nendstream`
    );
  }

  objetos[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let index = 0; index < objetos.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${objetos[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

export function carregarArquivoStorage(storageUrl: string) {
  if (!storageUrl.startsWith("/storage/")) return null;
  const partes = storageUrl.replace(/^\/storage\//, "").split("/").filter(Boolean);
  const caminho = resolve(resolveStorageRoot(), join(...partes));

  try {
    return readFileSync(caminho);
  } catch {
    return null;
  }
}

function resolveStorageRoot() {
  const cwd = process.cwd();
  return basename(cwd) === "backend" ? resolve(cwd, "..", "..", "storage") : resolve(cwd, "storage");
}

function criarObjetoImagemPdf(buffer: Buffer) {
  const imagem = normalizarImagemPdf(buffer);
  return `<< /Type /XObject /Subtype /Image /Width ${imagem.width} /Height ${imagem.height} /ColorSpace /DeviceRGB /BitsPerComponent 8${imagem.filtro} /Length ${imagem.dados.length} >>\nstream\n${imagem.dados.toString("latin1")}\nendstream`;
}
