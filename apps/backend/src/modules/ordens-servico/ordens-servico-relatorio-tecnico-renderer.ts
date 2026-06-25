import { EvidenciaTipo, OrdemServicoTipoServico } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

type RelatorioTecnicoInput = {
  clienteNome: string;
  titulo: string;
  tipoServico: OrdemServicoTipoServico;
  agendadaPara: Date | null;
  finalizadoEm: Date;
  assinaturaUrl: string;
  nomeResponsavelAssinatura: string;
  storageRoot: string;
  equipamento: { marca?: string | null; modelo?: string | null; gasRefrigerante?: string | null } | null;
  evidencias: Array<{ tipo: EvidenciaTipo; descricao: string | null; storageUrl: string; criadoEm: Date }>;
  checklistRespostas: Array<{ codigo: string; valor: string; observacao: string | null }>;
};

export class OrdensServicoRelatorioTecnicoRenderer {
  renderizar(input: RelatorioTecnicoInput) {
    const checklistLinhas = this.formatarChecklist(input.checklistRespostas);
    const evidenciaLinhas = this.formatarEvidencias(input.evidencias);
    const imagens = [
      ...input.evidencias.map((evidencia) => this.carregarArquivoStorage(input.storageRoot, evidencia.storageUrl)),
      this.carregarArquivoStorage(input.storageRoot, input.assinaturaUrl)
    ];

    return this.criarPdfVisual(
      [
        "AIRMOVEBR - RELATORIO TECNICO VISUAL",
        "Relatorio tecnico de atendimento sem PMOC",
        "",
        `Cliente: ${input.clienteNome}`,
        `Servico: ${input.titulo}`,
        `Tipo de servico: ${this.formatarTipoServico(input.tipoServico)}`,
        `Agendado para: ${this.formatarDataHora(input.agendadaPara)}`,
        `Finalizado em: ${this.formatarDataHora(input.finalizadoEm)}`,
        `Equipamento: ${[input.equipamento?.marca, input.equipamento?.modelo].filter(Boolean).join(" ") || "todos do cliente"}`,
        `Gas refrigerante: ${input.equipamento?.gasRefrigerante || "nao informado"}`,
        "",
        "SERVICO REALIZADO",
        ...checklistLinhas,
        "",
        "FOTOS E EVIDENCIAS",
        ...evidenciaLinhas,
        "",
        "ASSINATURA DO RESPONSAVEL",
        `Assinado por: ${input.nomeResponsavelAssinatura}`,
        "",
        "Obrigado por escolher a AIRMOVEBR."
      ],
      imagens
    );
  }

  private formatarChecklist(respostas: Array<{ codigo: string; valor: string; observacao: string | null }>) {
    if (!respostas.length) {
      return ["Sem respostas de checklist registradas."];
    }

    return respostas.map((resposta) => {
      const label = this.obterLabelChecklist(resposta.codigo);
      const observacao = resposta.observacao?.trim() ? ` (${resposta.observacao.trim()})` : "";
      return `${label}: ${resposta.valor || "nao informado"}${observacao}`;
    });
  }

  private obterLabelChecklist(codigo: string) {
    return {
      C1: "Problema encontrado",
      C2: "Acao realizada",
      C3: "Foto do atendimento",
      C4: "Pecas utilizadas",
      C5: "Observacao final",
      M4: "Foto inicial"
    }[codigo] || codigo;
  }

  private formatarEvidencias(
    evidencias: Array<{ tipo: EvidenciaTipo; descricao: string | null; storageUrl: string; criadoEm: Date }>
  ) {
    if (!evidencias.length) {
      return ["Sem fotos registradas."];
    }

    return evidencias.map((evidencia) => {
      const tipo = evidencia.tipo === EvidenciaTipo.antes ? "Foto inicial" : "Foto final";
      return `${tipo}: ${evidencia.descricao || "sem descricao"} - ${this.formatarDataHora(evidencia.criadoEm)}`;
    });
  }

  private carregarArquivoStorage(storageRoot: string, storageUrl: string) {
    if (!storageUrl.startsWith("/storage/")) {
      return null;
    }

    const partes = storageUrl.replace(/^\/storage\//, "").split("/").filter(Boolean);
    const caminho = resolve(storageRoot, join(...partes));

    try {
      return readFileSync(caminho);
    } catch {
      return null;
    }
  }

  private criarPdfVisual(linhas: string[], imagens: Array<Buffer | null>) {
    const objetos = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
    const imageObjectIds: number[] = [];

    for (const imagem of imagens) {
      const imageObjectId = objetos.length + 1;
      imageObjectIds.push(imageObjectId);
      objetos.push(this.criarObjetoImagemPdf(imagem));
    }

    const xObjects = imageObjectIds.map((id, index) => `/Im${index + 1} ${id} 0 R`).join(" ");
    const recursosImagem = xObjects ? `/XObject << ${xObjects} >>` : "";
    const texto = linhas
      .flatMap((linha) => this.quebrarLinhaPdf(linha, 88))
      .slice(0, 36)
      .map((linha) => `(${this.escaparTextoPdf(linha)}) Tj T*`)
      .join("\n");
    const comandosImagem = imageObjectIds
      .map((_, index) => {
        const x = 42 + (index % 2) * 260;
        const y = 90 + Math.floor(index / 2) * 130;
        return `q\n220 0 0 115 ${x} ${y} cm\n/Im${index + 1} Do\nQ`;
      })
      .join("\n");
    const conteudo = ["BT", "/F1 10 Tf", "42 790 Td", "13 TL", texto, "ET", comandosImagem]
      .filter(Boolean)
      .join("\n");
    const pageObjectId = objetos.length + 1;
    const contentObjectId = objetos.length + 2;

    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> ${recursosImagem} >> /Contents ${contentObjectId} 0 R >>`,
      `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\nstream\n${conteudo}\nendstream`
    );
    objetos[1] = `<< /Type /Pages /Kids [${pageObjectId} 0 R] /Count 1 >>`;

    return this.montarPdfObjetos(objetos);
  }

  private criarObjetoImagemPdf(buffer: Buffer | null) {
    const imagem = this.normalizarImagemPdf(buffer);

    return `<< /Type /XObject /Subtype /Image /Width ${imagem.width} /Height ${imagem.height} /ColorSpace /DeviceRGB /BitsPerComponent 8${imagem.filtro} /Length ${imagem.dados.length} >>\nstream\n${imagem.dados.toString("latin1")}\nendstream`;
  }

  private normalizarImagemPdf(buffer: Buffer | null) {
    if (buffer && this.ehJpeg(buffer)) {
      return {
        dados: buffer,
        ...this.obterDimensoesJpeg(buffer),
        filtro: " /Filter /DCTDecode"
      };
    }

    if (buffer && this.ehPng(buffer)) {
      const png = this.converterPngParaRgb(buffer);
      if (png) {
        return {
          dados: deflateSync(png.rgb),
          width: png.width,
          height: png.height,
          filtro: " /Filter /FlateDecode"
        };
      }
    }

    return {
      dados: Buffer.from([255, 255, 255]),
      width: 1,
      height: 1,
      filtro: ""
    };
  }

  private ehJpeg(buffer: Buffer) {
    return buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
  }

  private ehPng(buffer: Buffer) {
    return buffer.length > 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }

  private converterPngParaRgb(buffer: Buffer) {
    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    const idat: Buffer[] = [];

    while (offset < buffer.length - 8) {
      const length = buffer.readUInt32BE(offset);
      const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
      const data = buffer.subarray(offset + 8, offset + 8 + length);

      if (type === "IHDR") {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8];
        colorType = data[9];
      }

      if (type === "IDAT") {
        idat.push(data);
      }

      if (type === "IEND") {
        break;
      }

      offset += length + 12;
    }

    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
    if (!width || !height || bitDepth !== 8 || !channels || !idat.length) {
      return null;
    }

    const raw = inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    const linhas: Buffer[] = [];
    let rawOffset = 0;
    let anterior = Buffer.alloc(stride);

    for (let y = 0; y < height; y += 1) {
      const filtro = raw[rawOffset];
      rawOffset += 1;
      const atual = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
      rawOffset += stride;
      this.aplicarFiltroPng(atual, anterior, filtro, channels);
      linhas.push(atual);
      anterior = atual;
    }

    const rgb = Buffer.alloc(width * height * 3);
    let destino = 0;

    for (const linha of linhas) {
      for (let index = 0; index < linha.length; index += channels) {
        rgb[destino++] = linha[index];
        rgb[destino++] = linha[index + 1];
        rgb[destino++] = linha[index + 2];
      }
    }

    return { width, height, rgb };
  }

  private aplicarFiltroPng(linha: Buffer, anterior: Buffer, filtro: number, bytesPorPixel: number) {
    for (let index = 0; index < linha.length; index += 1) {
      const esquerda = index >= bytesPorPixel ? linha[index - bytesPorPixel] : 0;
      const acima = anterior[index] ?? 0;
      const acimaEsquerda = index >= bytesPorPixel ? anterior[index - bytesPorPixel] : 0;
      let ajuste = 0;

      if (filtro === 1) ajuste = esquerda;
      if (filtro === 2) ajuste = acima;
      if (filtro === 3) ajuste = Math.floor((esquerda + acima) / 2);
      if (filtro === 4) ajuste = this.paethPng(esquerda, acima, acimaEsquerda);

      linha[index] = (linha[index] + ajuste) & 0xff;
    }
  }

  private paethPng(esquerda: number, acima: number, acimaEsquerda: number) {
    const estimativa = esquerda + acima - acimaEsquerda;
    const distanciaEsquerda = Math.abs(estimativa - esquerda);
    const distanciaAcima = Math.abs(estimativa - acima);
    const distanciaAcimaEsquerda = Math.abs(estimativa - acimaEsquerda);

    if (distanciaEsquerda <= distanciaAcima && distanciaEsquerda <= distanciaAcimaEsquerda) return esquerda;
    if (distanciaAcima <= distanciaAcimaEsquerda) return acima;
    return acimaEsquerda;
  }

  private obterDimensoesJpeg(buffer: Buffer) {
    for (let offset = 2; offset < buffer.length - 9; ) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);

      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7)
        };
      }

      offset += 2 + length;
    }

    return { width: 1, height: 1 };
  }

  private formatarTipoServico(tipo: OrdemServicoTipoServico) {
    return tipo === OrdemServicoTipoServico.corretiva ? "Corretiva" : "Preventiva";
  }

  private formatarDataHora(data: Date | null) {
    if (!data) {
      return "nao informado";
    }

    const dia = String(data.getUTCDate()).padStart(2, "0");
    const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
    const ano = data.getUTCFullYear();
    const hora = String(data.getUTCHours()).padStart(2, "0");
    const minuto = String(data.getUTCMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  }

  private montarPdfObjetos(objetos: string[]) {
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

  private quebrarLinhaPdf(texto: string, limite: number) {
    const linhas: string[] = [];
    let restante = texto;

    while (restante.length > limite) {
      linhas.push(restante.slice(0, limite));
      restante = restante.slice(limite);
    }

    linhas.push(restante);
    return linhas;
  }

  private escaparTextoPdf(texto: string) {
    return texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }
}
