import { resumirChecklistPmoc } from "./admin-pmoc-checklist-resumo";

type EnderecoPmoc = {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
} | null;

type OrdemPmoc = {
  titulo?: string | null;
  problema_relatado?: string | null;
  agendada_para?: string | null;
  concluida_em?: string | null;
  tecnico?: { nome?: string | null } | null;
  equipe?: { nome?: string | null } | null;
  checklist_tipo?: "mensal" | "trimestral" | "semestral" | "anual" | null;
  eventos?: Array<{ latitude?: number | null; longitude?: number | null; registrado_em?: string | null }>;
  evidencias?: Array<{ tipo?: string | null; storage_url?: string | null }>;
  checklist?: { procedimentos?: string[]; servico_realizado?: string | null } | null;
  checklist_respostas?: Array<{ codigo?: string | null; tipo?: string | null; valor?: string | null; observacao?: string | null }>;
  assinatura?: { nome_responsavel?: string | null } | null;
  observacoes?: Array<{ texto?: string | null }>;
};

type MaquinaPmoc = {
  tipo?: string | null;
  patrimonio?: string | null;
  codigo_barras?: string | null;
  marca?: string | null;
  modelo?: string | null;
  capacidade_btu?: number | null;
  gas_refrigerante?: string | null;
  numero_serie?: string | null;
  local_instalacao?: string | null;
  area_climatizada_m2?: number | null;
  ocupantes_fixo?: number | null;
  ocupantes_variavel?: number | null;
  pendencias?: string[];
  os_concluidas: OrdemPmoc[];
};

type PreviaPmoc = {
  cliente: {
    nome: string;
    documento?: string | null;
    telefone?: string | null;
    email?: string | null;
    pmoc_art_numero?: string | null;
    endereco: EnderecoPmoc;
  };
  engenheiro_responsavel?: {
    nome?: string | null;
    cpf?: string | null;
    crea?: string | null;
    email?: string | null;
    telefone?: string | null;
  } | null;
  periodo: { inicio: string | null; fim: string | null };
  total_maquinas: number;
  total_os_concluidas: number;
  pronto_para_pdf: boolean;
  pendencias: string[];
  maquinas: MaquinaPmoc[];
};

type PdfPage = string[];

const PAGE = { width: 612, height: 842, margin: 36 };
const CONTRATADA_PMOC = {
  razaoSocial: "M. Lima Manutenções Prediais e Industriais LTDA",
  nomeFantasia: "AIRMOVEBR",
  cnpj: "04.959.153/0001-11",
  endereco: "Avenida Paissandu, 526 - Maringá/PR - CEP 87050-130",
  telefone: "(43) 99100-0035",
  email: "airmovebr@gmail.com"
};
const ENGENHEIRO_PADRAO_PMOC = {
  nome: "André Mendes dos Santos",
  titulo: "Eng. Mecânico",
  crea: "PR-206737/D",
  registro: "89389",
  rnp: "1721220267"
};

type PeriodicidadePmoc = "mensal" | "trimestral" | "semestral" | "anual";

const ATIVIDADES_MANUTENCAO: Array<[string, string, PeriodicidadePmoc]> = [
  ["4.1", "Limpeza dos filtros de ar e/ou substituição", "mensal"],
  ["4.2", "Limpeza externa do gabinete do evaporador", "mensal"],
  ["4.3", "Verificar operação de drenagem", "mensal"],
  ["4.4", "Verificar e corrigir ruídos e vibrações anormais", "mensal"],
  ["4.5", "Verificar termostatos, controles e sensores", "mensal"],
  ["4.6", "Higienizar evaporadores com bactericida", "mensal"],
  ["4.7", "Verificar e eliminar odores desagradáveis", "mensal"],
  ["4.8", "Limpeza das serpentinas do evaporador", "trimestral"],
  ["4.9", "Limpeza do ventilador/rotor do evaporador", "trimestral"],
  ["4.10", "Limpeza da bandeja de condensado", "trimestral"],
  ["4.11", "Reaperto de terminais/conexões elétricas", "trimestral"],
  ["4.12", "Verificar corrente/pressão/tensão", "semestral"],
  ["4.13", "Limpeza do condensador", "semestral"],
  ["4.14", "Verificar estado dos compressores", "semestral"],
  ["4.15", "Lubrificação geral do equipamento", "semestral"],
  ["4.16", "Verificar estado dos suportes/coxins", "semestral"],
  ["4.17", "Verificar e corrigir focos de corrosão", "semestral"],
  ["4.18", "Verificar isolantes térmicos das linhas", "semestral"],
  ["4.19", "Teste do controle remoto e comandos", "anual"],
  ["4.20", "Higienização completa da evaporadora", "anual"],
  ["4.21", "Higienização completa da condensadora", "anual"],
  ["4.22", "Verificação completa do circuito frigorífico", "anual"],
  ["4.23", "Inspeção completa dos componentes elétricos", "anual"],
  ["4.24", "Verificação do isolamento térmico das tubulações", "anual"],
  ["4.25", "Medição das temperaturas de insuflamento e retorno", "anual"]
];

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
      previa.maquinas.forEach((maquina, indice) => pages.push(this.criarPaginaMaquina(previa, maquina, indice)));
    }

    pages.push(this.criarDeclaracaoFinal(previa));
    return this.criarPdf(pages);
  }

  private criarCapa(previa: PreviaPmoc): PdfPage {
    const page: PdfPage = [];
    this.cabecalho(page, previa, "PLANO DE MANUTENÇÃO, OPERAÇÃO E CONTROLE - PMOC");
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

  private criarPaginaMaquina(previa: PreviaPmoc, maquina: MaquinaPmoc, indice: number): PdfPage {
    const page: PdfPage = [];
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
    this.text(page, `Manutenção executada ${this.rotuloPeriodicidade(periodicidade)}`, 36, 505, 7.5, true);
    this.table(page, 36, 487, [38, 380, 140], this.linhasAtividadesManutencao(periodicidade, "executada"), {
      rowHeight: 17,
      fontSize: 6.5
    });
    const linhasChecklist = this.linhasChecklistApk(primeiraOs);
    this.keyValueTable(
      page,
      36,
      145,
      [
        ["Data", this.formatarData(primeiraOs?.concluida_em ?? null)],
        ["Horário", `${this.formatarHora(inicio)} - ${this.formatarHora(fim)} (${this.calcularDuracao(inicio, fim)})`],
        ["Técnico/Equipe", primeiraOs?.tecnico?.nome || primeiraOs?.equipe?.nome || "Não informado"],
        ["OS", primeiraOs?.titulo || "Não informado"],
        ["Evidências", this.formatarEvidencias(primeiraOs)],
        ["GPS", this.formatarGps(primeiraOs)],
        ["Assinatura", primeiraOs?.assinatura?.nome_responsavel || "Não informado"],
        ...linhasChecklist
      ],
      11,
      6
    );
    this.compat(page, [
      `Área climatizada m2 ${this.formatarNumero(maquina.area_climatizada_m2)}`,
      `Ocupantes fixos ${this.formatarNumero(maquina.ocupantes_fixo)}`,
      `Ocupantes variáveis ${this.formatarNumero(maquina.ocupantes_variavel)}`
    ]);
    this.footer(page, 5 + indice);
    return page;
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
    this.footer(page, 5 + Math.max(previa.maquinas.length, 1));
    return page;
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

  private linhasChecklistApk(ordem: OrdemPmoc | null) {
    return resumirChecklistPmoc(ordem?.checklist_tipo, ordem?.checklist_respostas, (storageUrl) => this.obterNomeArquivo(storageUrl))
      .slice(0, 4)
      .map((linha, index) => [index === 0 ? "Checklist APK" : `Checklist APK ${index + 1}`, linha]);
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
    this.text(page, "Documento gerado pelo sistema AIRMOVEBR Digital", 36, 18, 7, false, undefined, "0.38 0.42 0.48");
    this.text(page, `Página ${numeroPagina}`, 535, 18, 7, false, undefined, "0.38 0.42 0.48");
  }

  private compat(page: PdfPage, values: string[]) {
    values.forEach((value, index) => this.text(page, value, 36, 42 - index * 2, 1, false));
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

  private criarPdf(pages: PdfPage[]) {
    const objetos = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    ];
    const pageObjectIds: number[] = [];

    for (const page of pages) {
      const conteudo = `0.2 w\n0 G\n${page.join("\n")}`;
      const pageObjectId = objetos.length + 1;
      const contentObjectId = objetos.length + 2;
      pageObjectIds.push(pageObjectId);
      objetos.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
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

  private formatarEvidencias(ordem: OrdemPmoc | null) {
    if (!ordem?.evidencias?.length) return "Nenhuma evidência registrada.";
    const antes = ordem.evidencias.find((evidencia) => evidencia.tipo === "antes");
    const depois = ordem.evidencias.find((evidencia) => evidencia.tipo === "depois");
    return [`Antes - ${this.obterNomeArquivo(antes?.storage_url)}`, `Depois - ${this.obterNomeArquivo(depois?.storage_url)}`].join(" | ");
  }

  private formatarGps(ordem: OrdemPmoc | null) {
    const evento = ordem?.eventos?.find((item) => item.latitude !== null && item.longitude !== null);
    if (!evento || evento.latitude === null || evento.longitude === null) return "Não informado";
    return `${Number(evento.latitude).toFixed(6)}, ${Number(evento.longitude).toFixed(6)}`;
  }

  private obterNomeArquivo(storageUrl?: string | null) {
    if (!storageUrl) return "Pendente";
    return storageUrl.split(/[\\/]/).filter(Boolean).at(-1) || storageUrl;
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
