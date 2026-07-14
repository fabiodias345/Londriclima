import { carregarFotosRelatorioTecnico } from "./admin-relatorio-pdf-fotos";
import { montarLinhasChecklistRelatorioTecnico } from "./admin-relatorio-pdf-checklist";
import {
  AdminRelatorioAvulsoCompactoImagensService,
  ImagemPdfCompacta
} from "./admin-relatorio-avulso-compacto-imagens.service";

type OrdemCompacta = {
  titulo?: string | null;
  tipo_servico?: string | null;
  problema_relatado?: string | null;
  agendada_para?: string | null;
  concluida_em?: string | null;
  tecnico?: { nome?: string | null; assinatura_storage_url?: string | null } | null;
  tecnico_executor?: { nome?: string | null; assinatura_storage_url?: string | null } | null;
  equipe?: { nome?: string | null; membros?: Array<{ usuario?: { nome?: string | null } }> } | null;
  checklist?: { servico_realizado?: string | null } | null;
  checklist_respostas?: Array<{ codigo: string; valor: string; observacao?: string | null }>;
  evidencias?: Array<{ storage_url?: string | null }>;
  assinatura?: { nome_responsavel?: string | null; storage_url?: string | null; latitude?: number | null; longitude?: number | null; assinado_em?: string | null } | null;
  observacoes?: Array<{ texto?: string | null }>;
};

type PreviaCompacta = {
  cliente: {
    nome: string;
    documento?: string | null;
    telefone?: string | null;
    endereco?: { logradouro?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null; cep?: string | null } | null;
  };
  maquinas: Array<{
    tipo?: string | null;
    marca?: string | null;
    modelo?: string | null;
    patrimonio?: string | null;
    numero_serie?: string | null;
    capacidade_btu?: number | null;
    local_instalacao?: string | null;
    os_concluidas: OrdemCompacta[];
  }>;
};

type ImagemPagina = { imagem: ImagemPdfCompacta; x: number; y: number; width: number; height: number; rotulo: string };
type PaginaCompacta = { comandos: string[]; imagens: ImagemPagina[] };

export class AdminRelatorioAvulsoCompactoRendererService {
  private readonly imagens = new AdminRelatorioAvulsoCompactoImagensService();

  gerar(previa: PreviaCompacta, carregarArquivo: (storageUrl: string) => Buffer | null) {
    const paginas: PaginaCompacta[] = [];
    let sequencia = 0;

    for (const maquina of previa.maquinas) {
      for (const ordem of maquina.os_concluidas) {
        sequencia += 1;
        const linhasServico = this.obterLinhasServico(ordem);
        const blocos = this.dividir(linhasServico, 7);
        blocos.forEach((bloco, indice) => paginas.push(this.criarPaginaServico(previa, maquina, ordem, sequencia, bloco, indice)));
        paginas.push(this.criarPaginaEvidencias(previa, maquina, ordem, sequencia, carregarArquivo));
      }
    }

    if (!paginas.length) paginas.push(this.criarPaginaVazia(previa));
    return this.criarPdf(paginas);
  }

  private criarPaginaServico(
    previa: PreviaCompacta,
    maquina: PreviaCompacta["maquinas"][number],
    ordem: OrdemCompacta,
    sequencia: number,
    linhas: Array<[string, string]>,
    indiceBloco: number
  ) {
    const pagina = this.novaPagina(`RELATÓRIO TÉCNICO AVULSO - O.S. ${String(sequencia).padStart(3, "0")}`);
    let y = 716;
    y = this.secao(pagina, indiceBloco ? "SERVIÇO EXECUTADO - CONTINUAÇÃO" : "DADOS DO ATENDIMENTO", y);
    if (!indiceBloco) {
      y = this.campos(pagina, [
        ["Cliente", previa.cliente.nome],
        ["Documento", previa.cliente.documento || "não informado"],
        ["Local", this.endereco(previewEndereco(previa))],
        ["O.S.", ordem.titulo || "não informada"],
        ["Data de conclusão", this.data(ordem.concluida_em)],
        ["Técnico responsável", this.tecnico(ordem)]
      ], y);
      y = this.secao(pagina, "EQUIPAMENTO", y - 8);
      y = this.campos(pagina, [
        ["Equipamento", [maquina.tipo, maquina.marca, maquina.modelo].filter(Boolean).join(" - ") || "não informado"],
        ["Patrimônio / série", [maquina.patrimonio, maquina.numero_serie].filter(Boolean).join(" / ") || "não informado"],
        ["Capacidade", maquina.capacidade_btu ? `${maquina.capacidade_btu.toLocaleString("pt-BR")} BTU/h` : "não informada"],
        ["Local de instalação", maquina.local_instalacao || "não informado"]
      ], y);
      y = this.secao(pagina, "SERVIÇO EXECUTADO", y - 8);
    }
    this.campos(pagina, linhas, y);
    return pagina;
  }

  private criarPaginaEvidencias(
    previa: PreviaCompacta,
    maquina: PreviaCompacta["maquinas"][number],
    ordem: OrdemCompacta,
    sequencia: number,
    carregarArquivo: (storageUrl: string) => Buffer | null
  ) {
    const pagina = this.novaPagina(`EVIDÊNCIAS E VALIDAÇÃO - O.S. ${String(sequencia).padStart(3, "0")}`);
    const fotos = carregarFotosRelatorioTecnico(ordem, carregarArquivo).slice(0, 4);
    this.secao(pagina, "EVIDÊNCIAS FOTOGRÁFICAS", 716);
    if (!fotos.length) this.texto(pagina, "Nenhuma foto disponível para esta ordem.", 52, 680, 10, "F1", "0.30 0.34 0.40");
    fotos.forEach((foto, indice) => this.imagem(pagina, foto, indice, fotos.length, `Evidência ${indice + 1}`));

    const yAssinaturas = fotos.length > 2 ? 190 : 325;
    this.secao(pagina, "VALIDAÇÃO DO ATENDIMENTO", yAssinaturas + 66);
    this.campos(pagina, [
      ["Cliente", previa.cliente.nome],
      ["Responsável que acompanhou", ordem.assinatura?.nome_responsavel || "não informado"],
      ["Coordenadas", this.gps(ordem)],
      ["Observações", ordem.observacoes?.map((item) => item.texto?.trim()).filter(Boolean).join(" | ") || "Sem observações"]
    ], yAssinaturas + 38);

    const assinaturaCliente = ordem.assinatura?.storage_url ? carregarArquivo(ordem.assinatura.storage_url) : null;
    const assinaturaTecnicoUrl = ordem.tecnico_executor?.assinatura_storage_url ?? ordem.tecnico?.assinatura_storage_url;
    const assinaturaTecnico = assinaturaTecnicoUrl ? carregarArquivo(assinaturaTecnicoUrl) : null;
    this.assinatura(pagina, assinaturaCliente, 52, 48, "Assinatura do cliente", ordem.assinatura?.nome_responsavel || "Pendente");
    this.assinatura(pagina, assinaturaTecnico, 318, 48, "Assinatura do técnico", this.tecnico(ordem));
    return pagina;
  }

  private criarPaginaVazia(previa: PreviaCompacta) {
    const pagina = this.novaPagina("RELATÓRIO TÉCNICO AVULSO");
    this.secao(pagina, "RELATÓRIO SEM O.S. CONCLUÍDA", 716);
    this.texto(pagina, `Cliente: ${previa.cliente.nome}`, 52, 680, 11, "F1", "0.12 0.16 0.22");
    this.texto(pagina, "Finalize uma ordem de serviço para emitir este relatório.", 52, 654, 10, "F1", "0.30 0.34 0.40");
    return pagina;
  }

  private novaPagina(titulo: string): PaginaCompacta {
    const pagina: PaginaCompacta = { comandos: [], imagens: [] };
    pagina.comandos.push("0.05 0.17 0.30 rg", "0 786 612 56 re f");
    this.texto(pagina, "AIRMOVEBR", 52, 816, 18, "F2", "1 1 1");
    this.texto(pagina, titulo, 52, 798, 8.5, "F1", "0.78 0.90 1");
    this.texto(pagina, "Documento não PMOC", 458, 816, 9, "F1", "1 1 1");
    pagina.comandos.push("0.80 0.84 0.90 RG", "0.8 w", "42 30 m 570 30 l S");
    this.texto(pagina, "Relatório técnico avulso", 42, 18, 8, "F1", "0.35 0.39 0.45");
    return pagina;
  }

  private secao(pagina: PaginaCompacta, titulo: string, y: number) {
    pagina.comandos.push("0.90 0.95 0.99 rg", `42 ${y - 18} 528 24 re f`);
    this.texto(pagina, titulo, 52, y - 2, 11, "F2", "0.05 0.17 0.30");
    return y - 32;
  }

  private campos(pagina: PaginaCompacta, campos: Array<[string, string]>, yInicial: number) {
    let y = yInicial;
    for (const [campo, valor] of campos) {
      const linhas = this.quebrar(valor || "não informado", 54);
      const altura = Math.max(24, 14 + linhas.length * 11);
      pagina.comandos.push("0.80 0.84 0.90 RG", "0.6 w", `42 ${y - altura} 528 ${altura} re S`);
      this.texto(pagina, campo, 52, y - 12, 8.5, "F2", "0.18 0.25 0.34");
      linhas.forEach((linha, indice) => this.texto(pagina, linha, 220, y - 12 - indice * 10, 8.8, "F1", "0.12 0.16 0.22"));
      y -= altura + 4;
      if (y < 90) break;
    }
    return y;
  }

  private imagem(pagina: PaginaCompacta, buffer: Buffer, indice: number, total: number, rotulo: string) {
    const colunas = total === 1 ? 1 : 2;
    const larguraBox = colunas === 1 ? 420 : 244;
    const alturaBox = total > 2 ? 120 : 170;
    const coluna = total === 1 ? 0 : indice % 2;
    const linha = Math.floor(indice / 2);
    const x = total === 1 ? 96 : 52 + coluna * 266;
    const y = 670 - alturaBox - linha * (alturaBox + 32);
    const imagem = this.imagens.normalizar(buffer);
    const proporcao = [6, 8].includes(imagem.orientacao) ? imagem.height / imagem.width : imagem.width / imagem.height;
    let width = larguraBox - 12;
    let height = width / proporcao;
    if (height > alturaBox - 20) {
      height = alturaBox - 20;
      width = height * proporcao;
    }
    const imagemX = x + (larguraBox - width) / 2;
    const imagemY = y + 10 + (alturaBox - 20 - height) / 2;
    pagina.comandos.push("0.80 0.84 0.90 RG", "0.8 w", `${x} ${y} ${larguraBox} ${alturaBox} re S`);
    pagina.imagens.push({ imagem, x: imagemX, y: imagemY, width, height, rotulo });
  }

  private assinatura(pagina: PaginaCompacta, buffer: Buffer | null, x: number, y: number, rotulo: string, nome: string) {
    const width = 242;
    const height = 88;
    pagina.comandos.push("0.80 0.84 0.90 RG", "0.8 w", `${x} ${y} ${width} ${height} re S`);
    this.texto(pagina, rotulo, x + 10, y + height - 14, 8.5, "F2", "0.18 0.25 0.34");
    this.texto(pagina, nome, x + 10, y + 8, 8, "F1", "0.12 0.16 0.22");
    if (!buffer) return;
    const imagem = this.imagens.normalizar(buffer);
    const proporcao = imagem.width / imagem.height;
    const imagemHeight = 48;
    const imagemWidth = Math.min(180, imagemHeight * proporcao);
    pagina.imagens.push({ imagem, x: x + (width - imagemWidth) / 2, y: y + 24, width: imagemWidth, height: imagemHeight, rotulo: "" });
  }

  private criarPdf(paginas: PaginaCompacta[]) {
    const objetos = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"];
    const paginasIds: number[] = [];
    for (const pagina of paginas) {
      const imagens = pagina.imagens.map((item) => ({ ...item, id: objetos.length + 1 }));
      imagens.forEach((item) => objetos.push(this.imagens.criarObjeto(item.imagem)));
      const xObjects = imagens.map((item, indice) => `/Im${indice + 1} ${item.id} 0 R`).join(" ");
      const comandosImagem = imagens.map((item, indice) => ["q", this.imagens.transformacao(item.x, item.y, item.width, item.height, item.imagem.orientacao), `/Im${indice + 1} Do`, "Q", item.rotulo ? this.comandoTexto(item.rotulo, item.x, item.y - 9, 7, "F1", "0.35 0.39 0.45") : ""].join("\n")).join("\n");
      const conteudo = [...pagina.comandos, comandosImagem].filter(Boolean).join("\n");
      const pageId = objetos.length + 1;
      const contentId = objetos.length + 2;
      paginasIds.push(pageId);
      objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${xObjects} >> >> /Contents ${contentId} 0 R >>`, `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\nstream\n${conteudo}\nendstream`);
    }
    objetos[1] = `<< /Type /Pages /Kids [${paginasIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${paginasIds.length} >>`;
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objetos.forEach((objeto, indice) => {
      offsets.push(Buffer.byteLength(pdf, "latin1"));
      pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf, "latin1");
    pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf, "latin1");
  }

  private obterLinhasServico(ordem: OrdemCompacta) {
    return montarLinhasChecklistRelatorioTecnico({
      problemaRelatado: ordem.problema_relatado,
      servicoRealizado: ordem.checklist?.servico_realizado,
      respostas: ordem.checklist_respostas
    });
  }

  private dividir<T>(itens: T[], tamanho: number) {
    const blocos: T[][] = [];
    for (let indice = 0; indice < itens.length; indice += tamanho) blocos.push(itens.slice(indice, indice + tamanho));
    return blocos.length ? blocos : [[]];
  }

  private tecnico(ordem: OrdemCompacta) {
    return ordem.tecnico_executor?.nome || ordem.tecnico?.nome || ordem.equipe?.membros?.map((item) => item.usuario?.nome).filter(Boolean).join(", ") || ordem.equipe?.nome || "não informado";
  }

  private endereco(endereco: PreviaCompacta["cliente"]["endereco"]) {
    if (!endereco) return "não informado";
    return [endereco.logradouro, endereco.numero, endereco.complemento, endereco.bairro, endereco.cidade, endereco.uf, endereco.cep].filter(Boolean).join(" - ");
  }

  private data(valor?: string | null) {
    return valor ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor)) : "não informada";
  }

  private gps(ordem: OrdemCompacta) {
    const latitude = ordem.assinatura?.latitude;
    const longitude = ordem.assinatura?.longitude;
    return latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : "não informado";
  }

  private quebrar(valor: string, limite: number) {
    const palavras = this.limpar(valor).split(/\s+/);
    const linhas: string[] = [];
    let atual = "";
    palavras.forEach((palavra) => {
      const proxima = atual ? `${atual} ${palavra}` : palavra;
      if (proxima.length > limite && atual) {
        linhas.push(atual);
        atual = palavra;
      } else atual = proxima;
    });
    if (atual) linhas.push(atual);
    return linhas.slice(0, 5);
  }

  private texto(pagina: PaginaCompacta, texto: string, x: number, y: number, tamanho: number, fonte: "F1" | "F2", cor: string) {
    pagina.comandos.push(this.comandoTexto(texto, x, y, tamanho, fonte, cor));
  }

  private comandoTexto(texto: string, x: number, y: number, tamanho: number, fonte: "F1" | "F2", cor: string) {
    return `BT\n/${fonte} ${tamanho} Tf\n${cor} rg\n1 0 0 1 ${x} ${y} Tm\n(${this.escapar(texto)}) Tj\nET`;
  }

  private limpar(valor: string) {
    return String(valor || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  }

  private escapar(valor: string) {
    return this.limpar(valor).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }
}

function previewEndereco(previa: PreviaCompacta) {
  return previa.cliente.endereco;
}
