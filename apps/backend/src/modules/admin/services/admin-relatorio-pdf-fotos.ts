import { createHash } from "node:crypto";
import { ordenarRespostasRelatorioTecnico } from "./admin-relatorio-pdf-checklist";

export type FotoRelatorioTecnicoPdf = { storage_url?: string | null };
export type OrdemFotosRelatorioTecnicoPdf = {
  evidencias?: FotoRelatorioTecnicoPdf[];
  checklist_respostas?: Array<{ codigo: string; valor: string }>;
};

export function carregarFotosRelatorioTecnico(
  ordem: OrdemFotosRelatorioTecnicoPdf | null,
  carregarArquivo: (storageUrl: string) => Buffer | null
) {
  if (!ordem) {
    return [];
  }

  const imagens: Buffer[] = [];
  const urls = new Set<string>();
  const hashes = new Set<string>();

  for (const evidencia of ordem.evidencias ?? []) {
    if (evidencia.storage_url) {
      registrarFotoRelatorioTecnico(evidencia.storage_url, carregarArquivo, urls, hashes, imagens);
    }
  }

  for (const resposta of ordenarRespostasRelatorioTecnico(ordem.checklist_respostas ?? [])) {
    if (resposta.valor?.startsWith("/storage/")) {
      registrarFotoRelatorioTecnico(resposta.valor, carregarArquivo, urls, hashes, imagens);
    }
  }

  return imagens;
}

function registrarFotoRelatorioTecnico(
  storageUrl: string,
  carregarArquivo: (storageUrl: string) => Buffer | null,
  urls: Set<string>,
  hashes: Set<string>,
  imagens: Buffer[]
) {
  if (urls.has(storageUrl)) {
    return;
  }

  const imagem = carregarArquivo(storageUrl);
  if (!imagem) {
    return;
  }

  const hash = createHash("sha256").update(imagem).digest("hex");
  if (hashes.has(hash)) {
    urls.add(storageUrl);
    return;
  }

  urls.add(storageUrl);
  hashes.add(hash);
  imagens.push(imagem);
}
