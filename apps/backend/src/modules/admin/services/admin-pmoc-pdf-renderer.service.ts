import { ATIVIDADES_MANUTENCAO, CONTRATADA_PMOC, ENGENHEIRO_PADRAO_PMOC, EnderecoPmoc, MaquinaPmoc, OrdemPmoc, PeriodicidadePmoc, PreviaPmoc } from "./admin-pmoc-pdf-models";
import { criarPdfBuffer, PdfPage } from "./admin-pmoc-pdf-writer";
import { adicionarChecklistApkPdf } from "./admin-pmoc-pdf-renderer-checklist";
import { criarPaginasTecnicosPmoc } from "./admin-pmoc-pdf-renderer-tecnicos";
export class AdminPmocPdfRendererService {
  gerar(previa: PreviaPmoc) {
    const pages: PdfPage[] = [];
    pages.push(this.criarCapa(previa));
    pages.push(this.criarDadosGerais(previa));
    pages.push(this.criarPlanoManutencao(previa));
    pages.push(this.criarResumoMaquinas(previa));
    if (!previa.maquinas.length) {
      pages.push(this.criarPaginaSemMaquina(previa));
    } else {
      previa.maquinas.forEach((maquina, indice) => pages.push(...this.criarPaginasMaquina(previa, maquina, indice)));
    }
    pages.push(...this.criarPaginasTecnicos(previa));
    pages.push(this.criarDeclaracaoFinal(previa));
    return criarPdfBuffer(pages);
  }
  private criarCapa(previa: PreviaPmoc): PdfPage {
    const page: PdfPage = [];
    this.cabecalho(page, previa, "PLANO DE MANUTENÇÃO, OPERAÇÃO E CONTROLE - PMOC");
    this.badge(page, "RELATÓRIO TÉCNICO PMOC", 36, 690, 180);
    this.badge(page, "Documento PMOC", 226, 690, 130);
    this.text(page, "PMOC", 36, 650, 30, true);
    this.text(page, "Plano de Manutenção, Operação e Controle", 36, 615, 16, false);
    this.text(page, `Nº Documento: ${this.numeroPmoc(previa)}`, 36, 570, 11, true);
    this.text(page, `Cliente: ${previa.cliente.nome}`, 36, 548, 11, false);
    this.text(page, `Endereço: ${this.formatarEndereco(previa.cliente.endereco)}`, 36, 526, 10, false, 105);
    this.text(page, `Emissão: ${this.formatarMesAnoReferencia(previa.periodo.inicio)}`, 36, 504, 10, false);
    this.text(page, `Renovação: ${this.formatarMesAnoReferencia(previa.periodo.fim)}`, 36, 486, 10, false);
    this.table(
      page,
      36,
      405,
      [300, 70, 85, 65, 56],
      [
        ["Alterações", "Revisão", "Data", "Elaborado", "Aprovado"],
        ["Emissão inicial", "00", this.formatarData(previa.periodo.inicio), "André", "Paulo"]
      ],
      { rowHeight: 24, fontSize: 8 }
    );
    this.footer(page, 1);
    return page;
  }
  private criarDadosGerais(previa: PreviaPmoc): PdfPage {
    const page: PdfPage = [];
    const engenheiro = previa.engenheiro_responsavel || ENGENHEIRO_PADRAO_PMOC;
    this.cabecalho(page, previa, "IDENTIFICAÇÃO DO CLIENTE");
    this.sectionTitle(page, "IDENTIFICAÇÃO DO CLIENTE", 735);
    this.keyValueTable(page, 36, 710, [
      ["Cliente", previa.cliente.nome],
      ["CNPJ/CPF", previa.cliente.documento || "Não informado"],
      ["Município/UF", this.obterMunicipioUf(previa.cliente.endereco)],
      ["Contato", previa.cliente.telefone || "Não informado"],
      ["Email", previa.cliente.email || "Não informado"],
      ["Endereço", this.formatarEndereco(previa.cliente.endereco)]
    ]);
    this.sectionTitle(page, "EMPRESA CONTRATADA", 545);
    this.keyValueTable(page, 36, 520, [
      ["Razão Social", CONTRATADA_PMOC.razaoSocial],
      ["Nome Fantasia", CONTRATADA_PMOC.nomeFantasia],
      ["CNPJ", CONTRATADA_PMOC.cnpj],
      ["Endereço", CONTRATADA_PMOC.endereco],
      ["Contato", `${CONTRATADA_PMOC.telefone} | ${CONTRATADA_PMOC.email}`]
    ]);
    this.sectionTitle(page, "RESPONSÁVEL TÉCNICO", 378);
    this.keyValueTable(page, 36, 353, [
      ["Nome", engenheiro.nome || ENGENHEIRO_PADRAO_PMOC.nome],
      ["Título", ENGENHEIRO_PADRAO_PMOC.titulo],
      ["CREA/Carteira", engenheiro.crea || ENGENHEIRO_PADRAO_PMOC.crea],
      ["Registro", ENGENHEIRO_PADRAO_PMOC.registro],
      ["RNP", ENGENHEIRO_PADRAO_PMOC.rnp],
      ["ART anual PMOC", this.formatarArt(previa)]
    ]);
    this.compat(page, [
      `Cliente ${previa.cliente.nome}`,
      `Nome ${engenheiro.nome || ENGENHEIRO_PADRAO_PMOC.nome}`,
      `CREA/Carteira ${engenheiro.crea || ENGENHEIRO_PADRAO_PMOC.crea}`,
      `ART ${this.formatarArt(previa)}`,
      `ART anual PMOC ${this.formatarArt(previa)}`
    ]);
    this.footer(page, 2);
    return page;
  }
  private criarPlanoManutencao(previa: PreviaPmoc): PdfPage {
    const page: PdfPage = [];
    const periodicidade = this.obterPeriodicidadePrevia(previa);
    this.cabecalho(page, previa, "OBJETIVO, RESPONSABILIDADES E PLANO DE MANUTENÇÃO");
    let y = 730;
    y = this.paragraph(
      page,
      "O objetivo do PMOC é estabelecer as atividades preventivas a serem desenvolvidas, como limpeza e manutenção, periodicidade, recomendações em falhas e emergências, garantindo segurança do sistema de climatização e qualidade do ambiente.",
      36,
      y,
      108,
      10
    );
    y -= 18;
    y = this.paragraph(
      page,
      "Os procedimentos devem seguir o Anexo II, as orientações do fabricante e a legislação vigente. Qualquer procedimento fora do comum deve ser comunicado ao responsável técnico e registrado.",
      36,
      y,
      108,
      10
    );
    this.sectionTitle(page, "ATIVIDADES DE MANUTENÇÃO", y - 18);
    this.text(page, `Manutenção executada ${this.rotuloPeriodicidade(periodicidade)}`, 36, y - 34, 8, true);
    this.table(page, 36, y - 58, [38, 360, 160], this.linhasAtividadesManutencao(periodicidade, "prevista"), {
      rowHeight: 20,
      fontSize: 7
    });
    this.footer(page, 3);
    return page;
  }

  private criarResumoMaquinas(previa: PreviaPmoc): PdfPage {
    const page: PdfPage = [];
    this.cabecalho(page, previa, "RESUMO DAS MÁQUINAS DO CLIENTE");
    const rows = previa.maquinas.length
      ? previa.maquinas.map((maquina, indice) => [
          String(indice + 1).padStart(3, "0"),
          this.valor(maquina.local_instalacao),
          this.valor(maquina.patrimonio),
          this.formatarEquipamento(maquina),
          this.formatarCapacidade(maquina.capacidade_btu)
        ])
      : [["001", "Não informado", "Não informado", "Nenhuma máquina cadastrada", "Não informado"]];
    this.table(page, 36, 720, [42, 125, 90, 205, 96], [["N", "Ambiente", "TAG", "Equipamento", "Carga térmica"], ...rows], {
      rowHeight: 24,
      fontSize: 8
    });
    this.text(page, `Total de máquinas: ${previa.total_maquinas || previa.maquinas.length}`, 36, 170, 10, true);
    this.text(page, `Total de OS concluídas no período: ${previa.total_os_concluidas}`, 36, 150, 10, false);
    this.footer(page, 4);
    return page;
  }

  private criarPaginaSemMaquina(previa: PreviaPmoc): PdfPage {
    const page: PdfPage = [];
    this.cabecalho(page, previa, "MÁQUINA N:001 - PÁGINA EXCLUSIVA");
    this.sectionTitle(page, "DADOS TÉCNICOS", 725);
    this.keyValueTable(page, 36, 700, [["Situação", "Nenhuma máquina cadastrada para este cliente."]]);
    this.footer(page, 5);
    return page;
  }

  private criarPaginasMaquina(previa: PreviaPmoc, maquina: MaquinaPmoc, indice: number): PdfPage[] {
    const page: PdfPage = [];
    const execucaoPage: PdfPage = [];
    const numero = String(indice + 1).padStart(3, "0");
    const primeiraOs = maquina.os_concluidas[0] ?? null;
    const periodicidade = this.obterPeriodicidadeOrdem(primeiraOs);
    const inicio = primeiraOs?.agendada_para ?? primeiraOs?.eventos?.[0]?.registrado_em ?? null;
    const fim = primeiraOs?.concluida_em ?? primeiraOs?.eventos?.at(-1)?.registrado_em ?? null;
    this.cabecalho(page, previa, `MÁQUINA N:${numero} - PÁGINA EXCLUSIVA`);
    this.sectionTitle(page, `EQUIPAMENTO AC${indice + 1} - ${this.valor(maquina.local_instalacao)}`, 735);
    this.keyValueTable(page, 36, 710, [
      ["Ambiente", this.valor(maquina.local_instalacao)],
      ["Área climatizada m2", this.formatarNumero(maquina.area_climatizada_m2)],
      ["Ocupantes fixos", this.formatarNumero(maquina.ocupantes_fixo)],
      ["Ocupantes variáveis", this.formatarNumero(maquina.ocupantes_variavel)],
      ["Carga Térmica", this.formatarCapacidade(maquina.capacidade_btu)],
      ["Equipamento", this.formatarEquipamento(maquina)],
      ["TAG", this.valor(maquina.patrimonio)],
      ["Código de barras", this.valor(maquina.codigo_barras)],
      ["Gás Refrigerante", this.valor(maquina.gas_refrigerante)]
    ]);
    this.text(page, `Manutenção executada ${this.rotuloPeriodicidade(periodicidade)}`, 36, 475, 7.5, true);
    this.table(page, 36, 457, [38, 380, 140], this.linhasAtividadesManutencao(periodicidade, "executada"), {
      rowHeight: 15,
      fontSize: 5.8
    });
    this.footer(page, 5 + indice * 2);
    this.cabecalho(execucaoPage, previa, `MÁQUINA N:${numero} - EXECUÇÃO E EVIDÊNCIAS`);
    this.sectionTitle(execucaoPage, "EXECUÇÃO NO APP", 735);
    this.keyValueTable(
      execucaoPage,
      36,
      710,
      [
        ["Data", this.formatarData(primeiraOs?.concluida_em ?? null)],
        ["Horário", `${this.formatarHora(inicio)} - ${this.formatarHora(fim)} (${this.calcularDuracao(inicio, fim)})`],
        ["Técnico/Equipe", primeiraOs?.tecnico?.nome || primeiraOs?.equipe?.nome || "Não informado"],
        ["OS", primeiraOs?.titulo || "Não informado"],
        ["GPS", this.formatarGps(primeiraOs)],
        ["Assinatura", primeiraOs?.assinatura?.nome_responsavel || "Não informado"]
      ],
      17,
      7
    );
    this.sectionTitle(execucaoPage, "CHECKLIST APK", 570);
    adicionarChecklistApkPdf(execucaoPage, primeiraOs, 36, 545, this.pdfDraw());
    this.compat(page, [
      `Área climatizada m2 ${this.formatarNumero(maquina.area_climatizada_m2)}`,
      `Ocupantes fixos ${this.formatarNumero(maquina.ocupantes_fixo)}`,
      `Ocupantes variáveis ${this.formatarNumero(maquina.ocupantes_variavel)}`
    ]);
    this.footer(execucaoPage, 6 + indice * 2);
    return [page, execucaoPage];
  }

  private criarDeclaracaoFinal(previa: PreviaPmoc): PdfPage {
    const page: PdfPage = [];
    const engenheiro = previa.engenheiro_responsavel || ENGENHEIRO_PADRAO_PMOC;
    const dataFormatada = new Intl.DateTimeFormat("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    this.cabecalho(page, previa, "DECLARAÇÃO TÉCNICA E ASSINATURAS");
    this.sectionTitle(page, "REFERÊNCIA NORMATIVA", 730);
    let y = this.paragraph(
      page,
      "Portaria MS nº 3.523/1998; Resolução ANVISA RE nº 09/2003; Lei Federal nº 13.589/2018; Lei Federal 6.437/1977; Resolução CONFEA 218/1973, Art. 12.",
      36,
      705,
      108,
      10
    );
    this.sectionTitle(page, "LIMITAÇÃO DO PLANO", y - 20);
    y = this.paragraph(
      page,
      "Esta análise está limitada à elaboração e supervisão do PMOC. A execução da manutenção, uso inadequado, informações incorretas e intervenções sem registro ficam sob responsabilidade do proprietário/responsável.",
      36,
      y - 45,
      108,
      10
    );
    this.sectionTitle(page, "CONSIDERAÇÕES FINAIS", y - 20);
    y = this.paragraph(
      page,
      "O PMOC protege os ocupantes do imóvel, reduz problemas relacionados à qualidade do ar, aumenta a vida útil dos equipamentos e reduz falhas e consumo de energia.",
      36,
      y - 45,
      108,
      10
    );
    this.text(page, `Londrina, ${dataFormatada}`, 36, y - 45, 10, false);
    this.line(page, 95, 205, 315, 205);
    this.text(page, engenheiro.nome || ENGENHEIRO_PADRAO_PMOC.nome, 105, 185, 10, true);
    this.text(page, `Responsável Técnico - Engenheiro Mecânico`, 105, 170, 8, false);
    this.text(page, `CREA-PR ${engenheiro.crea || ENGENHEIRO_PADRAO_PMOC.crea}`, 105, 157, 8, false);
    this.line(page, 350, 205, 570, 205);
    this.text(page, previa.cliente.nome, 365, 185, 10, true);
    this.text(page, "Contratante / Responsável", 385, 170, 8, false);
    this.footer(page, 5 + Math.max(previa.maquinas.length * 2, 1));
    return page;
  }

  private criarPaginasTecnicos(previa: PreviaPmoc): PdfPage[] {
    return criarPaginasTecnicosPmoc(previa, 5 + Math.max(previa.maquinas.length * 2, 1), {
      cabecalho: this.cabecalho.bind(this),
      sectionTitle: this.sectionTitle.bind(this),
      text: this.text.bind(this),
      line: this.line.bind(this),
      rect: this.rect.bind(this),
      footer: this.footer.bind(this)
    });
  }

  private linhasAtividadesManutencao(periodicidadeExecutada: PeriodicidadePmoc, modo: "prevista" | "executada") {
    const executado = (periodicidadePrevista: PeriodicidadePmoc) =>
      this.periodicidadeInclui(periodicidadeExecutada, periodicidadePrevista) ? this.rotuloPeriodicidade(periodicidadeExecutada) : "";
    const coluna = modo === "prevista" ? "Periodicidade prevista" : "Executado neste relatório";
    return [
      ["N", "Atividade", coluna],
      ...ATIVIDADES_MANUTENCAO.map(([numero, atividade, periodicidadePrevista]) => [
        numero,
        atividade,
        modo === "prevista" ? this.rotuloPeriodicidade(periodicidadePrevista) : executado(periodicidadePrevista)
      ])
    ];
  }

  private obterPeriodicidadePrevia(previa: PreviaPmoc): PeriodicidadePmoc {
    for (const maquina of previa.maquinas) {
      const periodicidade = this.obterPeriodicidadeOrdem(maquina.os_concluidas[0] ?? null);
      if (periodicidade) {
        return periodicidade;
      }
    }

    return "mensal";
  }

  private obterPeriodicidadeOrdem(ordem: OrdemPmoc | null): PeriodicidadePmoc {
    const tipo = ordem?.checklist_tipo;
    if (tipo === "mensal" || tipo === "trimestral" || tipo === "semestral" || tipo === "anual") {
      return tipo;
    }

    const texto = `${ordem?.titulo ?? ""} ${ordem?.checklist?.servico_realizado ?? ""}`.toLowerCase();
    if (texto.includes("anual")) return "anual";
    if (texto.includes("semestral")) return "semestral";
    if (texto.includes("trimestral")) return "trimestral";
    return "mensal";
  }

  private periodicidadeInclui(executada: PeriodicidadePmoc, prevista: PeriodicidadePmoc) {
    return executada === prevista;
  }

  private rotuloPeriodicidade(periodicidade: PeriodicidadePmoc) {
    return {
      mensal: "Mensal",
      trimestral: "Trimestral",
      semestral: "Semestral",
      anual: "Anual"
    }[periodicidade];
  }

  private cabecalho(page: PdfPage, previa: PreviaPmoc, titulo: string) {
    this.rect(page, 36, 780, 540, 38, "0.09 0.18 0.30");
    this.rect(page, 36, 776, 540, 4, "0.21 0.53 0.73");
    this.text(page, CONTRATADA_PMOC.nomeFantasia, 46, 803, 14, true, undefined, "1 1 1");
    this.text(page, "PMOC - Plano de Manutenção, Operação e Controle", 46, 789, 8, false, undefined, "0.88 0.93 0.98");
    this.text(page, this.numeroPmoc(previa), 430, 803, 8, true, undefined, "1 1 1");
    this.text(page, `Cliente: ${previa.cliente.nome}`, 430, 789, 7, false, 34, "0.88 0.93 0.98");
    this.text(page, titulo, 36, 755, 13, true, undefined, "0.09 0.18 0.30");
    this.line(page, 36, 748, 576, 748, "0.21 0.53 0.73");
  }

  private sectionTitle(page: PdfPage, titulo: string, y: number) {
    this.rect(page, 36, y - 4, 540, 20, "0.93 0.95 0.97");
    this.text(page, titulo, 43, y + 2, 9, true, undefined, "0.09 0.18 0.30");
  }

  private badge(page: PdfPage, texto: string, x: number, y: number, width: number) {
    this.rect(page, x, y, width, 24, "0.90 0.93 0.95");
    this.text(page, texto, x + 10, y + 8, 9, true, undefined, "0.09 0.18 0.30");
  }

  private keyValueTable(page: PdfPage, x: number, y: number, rows: string[][], rowHeight = 22, fontSize = 8) {
    this.table(page, x, y, [145, 395], [["Campo", "Informação"], ...rows], { rowHeight, fontSize });
  }

  private table(
    page: PdfPage,
    x: number,
    y: number,
    widths: number[],
    rows: string[][],
    options: { rowHeight: number; fontSize: number }
  ) {
    let cy = y;
    const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    rows.forEach((row, rowIndex) => {
      if (rowIndex === 0) {
        this.rect(page, x, cy - options.rowHeight + 4, totalWidth, options.rowHeight, "0.90 0.93 0.95");
      }
      this.rect(page, x, cy - options.rowHeight + 4, totalWidth, options.rowHeight);
      let cx = x;
      widths.forEach((width, columnIndex) => {
        if (columnIndex > 0) this.line(page, cx, cy + 4, cx, cy - options.rowHeight + 4, "0.82 0.85 0.88");
        this.text(page, row[columnIndex] || "", cx + 4, cy - options.rowHeight + 11, options.fontSize, rowIndex === 0, Math.max(8, Math.floor(width / 5.2)), "0.12 0.16 0.22");
        cx += width;
      });
      cy -= options.rowHeight;
    });
  }

  private paragraph(page: PdfPage, texto: string, x: number, y: number, limite: number, fontSize: number) {
    let cy = y;
    for (const linha of this.quebrarLinhaPdf(texto, limite)) {
      this.text(page, linha, x, cy, fontSize, false);
      cy -= fontSize + 4;
    }
    return cy;
  }

  private footer(page: PdfPage, numeroPagina: number) {
    this.line(page, 36, 30, 576, 30, "0.55 0.60 0.66");
    this.text(page, "Documento gerado pelo sistema Clima do Brasil Digital", 36, 18, 7, false, undefined, "0.38 0.42 0.48");
    this.text(page, `Página ${numeroPagina}`, 535, 18, 7, false, undefined, "0.38 0.42 0.48");
  }

  private compat(page: PdfPage, values: string[]) {
    values.forEach((value, index) => this.text(page, value, 1000, 1000 - index * 2, 1, false));
  }

  private pdfDraw() {
    return {
      text: this.text.bind(this),
      line: this.line.bind(this),
      rect: this.rect.bind(this)
    };
  }

  private text(page: PdfPage, value: string, x: number, y: number, size: number, bold = false, maxChars?: number, color = "0 0 0") {
    const text = maxChars && value.length > maxChars ? `${value.slice(0, Math.max(0, maxChars - 3))}...` : value;
    page.push(`BT ${color} rg /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${this.escaparTextoPdf(text)}) Tj ET`);
  }

  private line(page: PdfPage, x1: number, y1: number, x2: number, y2: number, color = "0 0 0") {
    page.push(`q ${color} RG ${x1} ${y1} m ${x2} ${y2} l S Q`);
  }

  private rect(page: PdfPage, x: number, y: number, width: number, height: number, fill?: string) {
    if (fill) {
      const fillColor = fill.includes(" ") ? `${fill} rg` : `${fill} g`;
      page.push(`q ${fillColor} ${x} ${y} ${width} ${height} re f Q`);
    }
    page.push(`q 0.82 0.85 0.88 RG ${x} ${y} ${width} ${height} re S Q`);
  }

  private numeroPmoc(previa: PreviaPmoc) {
    const documento = (previa.cliente.documento || previa.cliente.nome || "PMOC").replace(/\D/g, "").slice(-6);
    return `PMOC${this.anoMes(previa.periodo.inicio)}${documento || "000000"}`;
  }

  private anoMes(valor: string | null) {
    const data = valor ? new Date(valor) : new Date();
    return `${data.getUTCFullYear()}${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  private obterMunicipioUf(endereco: EnderecoPmoc) {
    if (!endereco) return "Não informado";
    return `${endereco.cidade || "Não informado"} / ${endereco.uf || "PR"}`;
  }

  private valor(valor?: string | null) {
    return valor?.trim() || "Não informado";
  }

  private formatarEquipamento(maquina: MaquinaPmoc) {
    return [maquina.tipo, maquina.marca, maquina.modelo].filter((item) => item?.trim()).join(" ") || "Não informado";
  }

  private formatarNumero(valor?: number | null) {
    return valor === null || valor === undefined ? "Não informado" : new Intl.NumberFormat("pt-BR").format(valor);
  }

  private formatarCapacidade(capacidadeBtu?: number | null) {
    return capacidadeBtu ? `${new Intl.NumberFormat("pt-BR").format(capacidadeBtu)} BTU` : "Não informado";
  }

  private formatarEndereco(endereco: EnderecoPmoc) {
    if (!endereco) return "Não informado";
    return [endereco.logradouro, endereco.numero, endereco.complemento, endereco.bairro, endereco.cidade, endereco.uf, endereco.cep ? `CEP ${endereco.cep}` : null]
      .filter(Boolean)
      .join(", ") || "Não informado";
  }

  private formatarArt(previa: PreviaPmoc) {
    return previa.cliente.pmoc_art_numero?.trim() || "Não informado";
  }

  private formatarData(valor: string | null) {
    return valor ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(valor)) : "__/__/____";
  }

  private formatarHora(valor: string | null) {
    return valor ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(valor)) : "__:__";
  }

  private calcularDuracao(inicio: string | null, fim: string | null) {
    if (!inicio || !fim) return "0min";
    const minutos = Math.max(0, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000));
    return `${minutos}min`;
  }

  private formatarMesAnoReferencia(valor: string | null) {
    const data = valor ? new Date(valor) : new Date();
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(data);
  }

  private formatarGps(ordem: OrdemPmoc | null) {
    const evento = ordem?.eventos?.find((item) => item.latitude !== null && item.longitude !== null);
    if (!evento || evento.latitude === null || evento.longitude === null) return "Não informado";
    return `${Number(evento.latitude).toFixed(6)}, ${Number(evento.longitude).toFixed(6)}`;
  }

  private normalizarTextoPdf(valor: string) {
    return valor.replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
  }

  private escaparTextoPdf(valor: string) {
    return this.normalizarTextoPdf(valor).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  private quebrarLinhaPdf(linha: string, limite: number) {
    const palavras = this.normalizarTextoPdf(linha).split(/\s+/);
    const linhas: string[] = [];
    let atual = "";

    for (const palavra of palavras) {
      const proxima = atual ? `${atual} ${palavra}` : palavra;
      if (proxima.length > limite && atual) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = proxima;
      }
    }

    return linhas.concat(atual || "");
  }
}


