import { CategoriaAtendimento, ChecklistTipo, EvidenciaTipo, OrdemServicoTipoServico } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { normalizarImagemPdf } from "./ordens-servico-pdf-image.util";
import { OrdensServicoRelatorioCamaraFriaRenderer } from "./ordens-servico-relatorio-camara-fria-renderer";

type RelatorioTecnicoInput = {
  osId?: string;
  categoriaServico?: CategoriaAtendimento;
  checklistTipo?: ChecklistTipo;
  clienteNome: string;
  clienteDocumento: string | null;
  clienteEmail: string | null;
  clienteEndereco: string;
  titulo: string;
  tipoServico: OrdemServicoTipoServico;
  agendadaPara: Date | null;
  finalizadoEm: Date;
  assinaturaUrl: string;
  nomeResponsavelAssinatura: string;
  assinaturaTecnicoUrl?: string;
  nomeTecnicoAssinatura?: string;
  fotoTecnicoUrl?: string;
  storageRoot: string;
  totalMaquinas: number;
  equipamento: {
    id?: string | null;
    tipo?: string | null;
    marca?: string | null;
    modelo?: string | null;
    numeroSerie?: string | null;
    codigoBarras?: string | null;
    localInstalacao?: string | null;
    gasRefrigerante?: string | null;
  } | null;
  equipamentos?: Array<{
    id: string;
    tipo?: string | null;
    marca?: string | null;
    modelo?: string | null;
    numeroSerie?: string | null;
    codigoQr?: string | null;
    localInstalacao?: string | null;
    gasRefrigerante?: string | null;
  }>;
  evidencias: Array<{ tipo: EvidenciaTipo; descricao: string | null; storageUrl: string; criadoEm: Date }>;
  checklistRespostas: Array<{
    equipamentoId?: string | null;
    codigo: string;
    tipo?: string;
    valor: string;
    observacao: string | null;
  }>;
};

export class OrdensServicoRelatorioTecnicoRenderer {
  renderizar(input: RelatorioTecnicoInput) {
    if (input.categoriaServico === CategoriaAtendimento.camara_fria) {
      return new OrdensServicoRelatorioCamaraFriaRenderer().renderizar({
        ...input,
        osId: input.osId ?? input.titulo,
        categoriaServico: CategoriaAtendimento.camara_fria,
        checklistTipo: input.checklistTipo ?? ChecklistTipo.mensal,
        assinaturaTecnicoUrl: input.assinaturaTecnicoUrl ?? input.assinaturaUrl,
        nomeTecnicoAssinatura: input.nomeTecnicoAssinatura ?? "não informado",
        fotoTecnicoUrl: input.fotoTecnicoUrl,
        equipamento: input.equipamento ? {
          ...input.equipamento,
          codigoQr: input.equipamento.codigoBarras
        } : null,
        equipamentos: input.equipamentos ?? []
      });
    }
    const checklistLinhas = this.formatarChecklist(input.checklistRespostas);
    const evidenciaLinhas = this.formatarEvidencias(input.evidencias);
    const imagens = [
      ...input.evidencias.map((evidencia) => this.carregarArquivoStorage(input.storageRoot, evidencia.storageUrl)),
      this.carregarArquivoStorage(input.storageRoot, input.assinaturaUrl)
    ].filter(Boolean) as Buffer[];
    const identidadeTecnico = [
      input.fotoTecnicoUrl ? this.carregarArquivoStorage(input.storageRoot, input.fotoTecnicoUrl) : null,
      input.assinaturaTecnicoUrl ? this.carregarArquivoStorage(input.storageRoot, input.assinaturaTecnicoUrl) : null
    ].filter(Boolean) as Buffer[];

    return this.criarPdfVisual(
      [{
        linhas: [
          "AIRMOVEBR - RELATORIO DE MANUTENCAO",
          "Documento emitido automaticamente pela plataforma AIRMOVEBR",
          "",
          this.formatarLinhaCampo("Data", this.formatarData(input.finalizadoEm)),
          "",
          "DADOS DA EMPRESA",
          this.formatarLinhaCampo("Campo", "Informacao"),
          this.formatarLinhaCampo("Razao Social", "AIRMOVEBR"),
          this.formatarLinhaCampo("Base operacional", "Londrina, PR"),
          this.formatarLinhaCampo("Dominio", "airmovebr.com.br"),
          "",
          "DADOS DO CLIENTE",
          this.formatarLinhaCampo("Campo", "Informacao"),
          this.formatarLinhaCampo("Cliente", input.clienteNome),
          this.formatarLinhaCampo("Documento", input.clienteDocumento || "nao informado"),
          this.formatarLinhaCampo("E-mail", input.clienteEmail || "pendente"),
          this.formatarLinhaCampo("Endereco", input.clienteEndereco),
          "",
          "EQUIPE RESPONSAVEL",
          this.formatarLinhaCampo("Campo", "Informacao"),
          this.formatarLinhaCampo("Periodo", `${this.formatarData(input.agendadaPara)} a ${this.formatarData(input.finalizadoEm)}`),
          this.formatarLinhaCampo("Total de OS Concluidas", "1"),
          this.formatarLinhaCampo("Total de Maquinas", String(input.totalMaquinas)),
          this.formatarLinhaCampo("Pendencias", "Nenhuma")
        ]
      }, {
        linhas: [
          "MAQUINA N:001",
          "MANUTENCAO N:001 DE 001",
          "",
          "DADOS DO EQUIPAMENTO",
          this.formatarLinhaCampo("Campo", "Informacao"),
          this.formatarLinhaCampo("Marca / Modelo", [input.equipamento?.marca, input.equipamento?.modelo].filter(Boolean).join(" ") || "todos do cliente"),
          this.formatarLinhaCampo("Fluido Refrigerante", input.equipamento?.gasRefrigerante || "nao informado"),
          "",
          "SERVICO EXECUTADO",
          this.formatarLinhaCampo("Campo", "Informacao"),
          this.formatarLinhaCampo("OS", input.titulo),
          this.formatarLinhaCampo("Natureza do atendimento", this.formatarTipoServico(input.tipoServico)),
          this.formatarLinhaCampo("Data e Horario", `${this.formatarDataHora(input.agendadaPara)} -> ${this.formatarDataHora(input.finalizadoEm)}`),
          ...checklistLinhas.map(([label, valor]) => this.formatarLinhaCampo(label, valor))
        ]
      }, {
        linhas: [
          "MAQUINA N:001",
          "EVIDENCIAS E VALIDACAO",
          "",
          "EVIDENCIAS E VALIDACAO",
          this.formatarLinhaCampo("Campo", "Informacao"),
          this.formatarLinhaCampo("Fotos", evidenciaLinhas.join(" - ")),
          this.formatarLinhaCampo("Assinatura do Cliente", input.nomeResponsavelAssinatura),
          "",
          "DECLARACAO DE CONCLUSAO",
          "Declaro para os devidos fins que o servico descrito neste relatorio foi executado integralmente."
        ],
        imagens
      }, {
        linhas: [
          "IDENTIFICACAO DO TECNICO",
          "Validacao automatica pelo acesso autenticado no aplicativo",
          "",
          this.formatarLinhaCampo("Tecnico", input.nomeTecnicoAssinatura || "nao informado"),
          this.formatarLinhaCampo("Foto", input.fotoTecnicoUrl ? "Cadastro conferido" : "nao informada"),
          this.formatarLinhaCampo("Assinatura", input.assinaturaTecnicoUrl ? "Cadastro conferido" : "nao informada"),
          "",
          "A identidade acima pertence ao usuario autenticado que concluiu esta ordem de servico."
        ],
        imagens: identidadeTecnico
      }
      ],
    );
  }

  private formatarChecklist(respostas: Array<{ codigo: string; valor: string; observacao: string | null }>) {
    if (!respostas.length) {
      return [["Servico realizado", "Sem respostas de checklist registradas."]];
    }

    return respostas
      .filter((resposta) => this.deveExibirRespostaChecklist(resposta))
      .map((resposta) => {
        const label = this.obterLabelChecklist(resposta.codigo);
        const observacao = resposta.observacao?.trim() ? ` (${resposta.observacao.trim()})` : "";
        return [label, `${resposta.valor.trim()}${observacao}`];
      });
  }

  private deveExibirRespostaChecklist(resposta: { codigo: string; valor: string }) {
    const valor = resposta.valor?.trim() ?? "";

    if (/^ANU_ETAPA_.*_CONCLUIDA$/.test(resposta.codigo)) {
      return false;
    }

    if (!valor || /^pendente$/i.test(valor)) {
      return false;
    }

    if (resposta.codigo === "C3" || valor.startsWith("/storage/")) {
      return false;
    }

    return true;
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

  private criarPdfVisual(paginas: Array<{ linhas: string[]; imagens?: Buffer[] }>) {
    const objetos = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
    ];
    const pageObjectIds: number[] = [];

    for (const pagina of paginas) {
      const imageObjectIds: number[] = [];

      for (const imagem of (pagina.imagens ?? []).slice(0, 3)) {
        const imageObjectId = objetos.length + 1;
        imageObjectIds.push(imageObjectId);
        objetos.push(this.criarObjetoImagemPdf(imagem));
      }

      const xObjects = imageObjectIds.map((id, index) => `/Im${index + 1} ${id} 0 R`).join(" ");
      const recursosImagem = xObjects ? `/XObject << ${xObjects} >>` : "";
      const conteudo = [
        this.montarConteudoTexto(pagina.linhas, Boolean(imageObjectIds.length)),
        this.montarConteudoImagens(imageObjectIds)
      ].filter(Boolean).join("\n");
      const pageObjectId = objetos.length + 1;
      const contentObjectId = objetos.length + 2;
      pageObjectIds.push(pageObjectId);
      objetos.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${recursosImagem} >> /Contents ${contentObjectId} 0 R >>`,
        `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\nstream\n${conteudo}\nendstream`
      );
    }

    objetos[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

    return this.montarPdfObjetos(objetos);
  }

  private montarConteudoTexto(linhas: string[], reservarEspacoImagens: boolean) {
    const comandos: string[] = [
      "0.09 0.18 0.30 rg",
      "42 776 528 44 re f",
      "0.21 0.53 0.73 rg",
      "42 772 528 4 re f"
    ];
    const titulo = linhas[0] ?? "AIRMOVEBR - RELATORIO DE MANUTENCAO";
    const subtitulo = linhas[1] ?? "";
    comandos.push(this.comandoTextoPdf(titulo, 54, 804, 15, "F2", "1 1 1"));
    comandos.push(this.comandoTextoPdf(subtitulo, 54, 787, 9, "F1", "0.88 0.93 0.98"));

    let y = 748;
    const limiteInferior = reservarEspacoImagens ? 250 : 58;

    for (const linhaOriginal of linhas.slice(2)) {
      const linha = linhaOriginal.trimEnd();

      if (!linha.trim()) {
        y -= 8;
        continue;
      }

      if (y < limiteInferior) {
        break;
      }

      if (this.ehTituloSecao(linha)) {
        const altura = linha.startsWith("MAQUINA") ? 24 : 20;
        const fill = linha.startsWith("MAQUINA") ? "0.09 0.18 0.30" : "0.93 0.95 0.97";
        const color = linha.startsWith("MAQUINA") ? "1 1 1" : "0.09 0.18 0.30";
        comandos.push(`${fill} rg\n42 ${y - altura + 6} 528 ${altura} re f`);
        comandos.push(this.comandoTextoPdf(linha, 54, y - 8, linha.startsWith("MAQUINA") ? 11 : 10, "F2", color));
        y -= altura + 8;
        continue;
      }

      if (this.ehLinhaTabela(linha)) {
        const celulas = this.separarLinhaTabela(linha);
        const labelQuebrado = this.quebrarLinhaPdf(celulas.label, 30);
        const valorQuebrado = this.quebrarLinhaPdf(celulas.valor, 60);
        const totalLinhas = Math.max(labelQuebrado.length, valorQuebrado.length);
        const altura = Math.max(22, totalLinhas * 11 + 10);
        const cabecalho = /^Campo\s+Informacao$/i.test(linha.trim());
        const fill = cabecalho ? "0.94 0.95 0.96" : "1 1 1";
        comandos.push(`% ${linha}`);
        comandos.push(`${fill} rg\n42 ${y - altura + 6} 528 ${altura} re f`);
        comandos.push("0.82 0.85 0.88 RG\n0.6 w");
        comandos.push(`42 ${y - altura + 6} 528 ${altura} re S`);
        comandos.push(`232 ${y - altura + 6} m 232 ${y + 6} l S`);
        labelQuebrado.forEach((parte, index) => {
          comandos.push(this.comandoTextoPdf(parte, 54, y - 8 - index * 11, 8.5, cabecalho ? "F2" : "F1", "0.12 0.16 0.22"));
        });
        valorQuebrado.forEach((parte, index) => {
          comandos.push(this.comandoTextoPdf(parte, 244, y - 8 - index * 11, 8.5, cabecalho ? "F2" : "F1", "0.12 0.16 0.22"));
        });
        y -= altura;
        continue;
      }

      for (const parte of this.quebrarLinhaPdf(linha, 88)) {
        comandos.push(this.comandoTextoPdf(parte, 54, y, 9, "F1", "0.12 0.16 0.22"));
        y -= 13;
      }
    }

    comandos.push("0.55 0.60 0.66 rg\n42 34 528 1 re f");
    comandos.push(this.comandoTextoPdf("Documento gerado automaticamente pela plataforma AIRMOVEBR.", 42, 20, 7.5, "F1", "0.38 0.42 0.48"));
    return comandos.join("\n");
  }

  private montarConteudoImagens(imageObjectIds: number[]) {
    return imageObjectIds
      .map((_, index) => {
        const width = 160;
        const height = 100;
        const x = 42 + index * 176;
        const y = 75;
        return `q\n0.80 0.84 0.90 RG\n1 w\n${x} ${y} ${width} ${height} re S\n${width} 0 0 ${height} ${x} ${y} cm\n/Im${index + 1} Do\nQ`;
      })
      .join("\n");
  }

  private formatarLinhaCampo(campo: string, valor: string) {
    return `${campo.padEnd(35, " ")} ${valor || "nao informado"}`;
  }

  private ehTituloSecao(linha: string) {
    return /^[A-Z0-9 .:/-]+$/.test(linha) && linha.length <= 80 && !this.ehLinhaTabela(linha);
  }

  private ehLinhaTabela(linha: string) {
    return /\S\s{2,}\S/.test(linha) || /^OS:/.test(linha);
  }

  private separarLinhaTabela(linha: string) {
    const partes = linha.split(/\s{2,}/).filter(Boolean);

    if (partes.length >= 2) {
      return { label: partes[0].trim(), valor: partes.slice(1).join(" ").trim() };
    }

    const porDoisPontos = linha.match(/^([^:]+):\s*(.*)$/);
    if (porDoisPontos) {
      return { label: porDoisPontos[1].trim(), valor: porDoisPontos[2].trim() };
    }

    return { label: linha, valor: "" };
  }

  private comandoTextoPdf(texto: string, x: number, y: number, tamanho: number, fonte: "F1" | "F2", cor: string) {
    return ["BT", `${cor} rg`, `/${fonte} ${tamanho} Tf`, `${x} ${y} Td`, `(${this.escaparTextoPdf(texto)}) Tj`, "ET"].join("\n");
  }

  private criarObjetoImagemPdf(buffer: Buffer | null) {
    const imagem = normalizarImagemPdf(buffer);

    return `<< /Type /XObject /Subtype /Image /Width ${imagem.width} /Height ${imagem.height} /ColorSpace /DeviceRGB /BitsPerComponent 8${imagem.filtro} /Length ${imagem.dados.length} >>\nstream\n${imagem.dados.toString("latin1")}\nendstream`;
  }

  private formatarTipoServico(tipo: OrdemServicoTipoServico) {
    if (tipo === OrdemServicoTipoServico.corretiva) {
      return "Corretiva";
    }
    if (tipo === OrdemServicoTipoServico.instalacao) {
      return "Instalação";
    }
    return "Preventiva";
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

  private formatarData(data: Date | null) {
    if (!data) {
      return "__/__/____";
    }

    const dia = String(data.getUTCDate()).padStart(2, "0");
    const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
    const ano = data.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
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
