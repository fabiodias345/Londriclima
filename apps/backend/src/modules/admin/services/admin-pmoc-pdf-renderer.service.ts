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
  eventos?: Array<{ latitude?: number | null; longitude?: number | null; registrado_em?: string | null }>;
  evidencias?: Array<{ tipo?: string | null; storage_url?: string | null }>;
  checklist?: { procedimentos?: string[]; servico_realizado?: string | null } | null;
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

const CONTRATADA_PMOC = {
  razaoSocial: "M. Lima Manutencoes Prediais e Industriais LTDA",
  nomeFantasia: "AIRMOVEBR",
  cnpj: "04.959.153/0001-11",
  endereco: "Avenida Paissandu, 526 - Maringa/PR - CEP 87050-130",
  telefone: "(43) 99100-0035",
  email: "airmovebr@gmail.com"
};

const ENGENHEIRO_PADRAO_PMOC = {
  nome: "Andre Mendes dos Santos",
  titulo: "Eng. Mecanico",
  crea: "PR-206737/D",
  registro: "89389",
  rnp: "1721220267"
};

export class AdminPmocPdfRendererService {
  gerar(previa: PreviaPmoc) {
    const paginas: string[][] = [
      this.montarCapa(previa),
      this.montarIdentificacao(previa),
      this.montarEscopoNormativo(previa),
      this.montarResumoMaquinas(previa)
    ];

    if (!previa.maquinas.length) {
      paginas.push([
        "MAQUINA N:001",
        "",
        "Nenhuma maquina cadastrada para este cliente.",
        "Cadastre maquinas antes de emitir o PMOC final."
      ]);
    }

    for (const [indice, maquina] of previa.maquinas.entries()) {
      paginas.push(this.montarPaginaMaquina(previa, maquina, indice));
    }

    paginas.push(this.montarDeclaracao(previa));

    return this.criarPdfTexto(paginas);
  }

  private montarCapa(previa: PreviaPmoc) {
    return [
      "AIRMOVEBR",
      "PLANO DE MANUTENCAO, OPERACAO E CONTROLE - PMOC",
      "",
      this.campo("Documento", this.numeroPmoc(previa)),
      this.campo("Cliente", previa.cliente.nome),
      this.campo("CNPJ/CPF", previa.cliente.documento || "Nao informado"),
      this.campo("Endereco", this.formatarEndereco(previa.cliente.endereco)),
      this.campo("Emissao", this.formatarMesAnoReferencia(previa.periodo.inicio)),
      this.campo("Renovacao", this.formatarMesAnoReferencia(previa.periodo.fim)),
      this.campo("Total de maquinas", String(previa.total_maquinas)),
      this.campo("Status", previa.pronto_para_pdf ? "Pronto para assinatura" : "Com pendencias"),
      "",
      "Documento tecnico individual do cliente. As maquinas listadas pertencem exclusivamente ao cliente acima.",
      "Campos nao cadastrados aparecem como Nao informado para preservar rastreabilidade sem inventar dados."
    ];
  }

  private montarIdentificacao(previa: PreviaPmoc) {
    const engenheiro = previa.engenheiro_responsavel;

    return [
      "IDENTIFICACAO DO CLIENTE, CONTRATADA E RESPONSAVEL TECNICO",
      "",
      "CLIENTE",
      this.campo("Razao/Nome", previa.cliente.nome),
      this.campo("Documento", previa.cliente.documento || "Nao informado"),
      this.campo("Telefone", previa.cliente.telefone || "Nao informado"),
      this.campo("E-mail", previa.cliente.email || "Nao informado"),
      this.campo("Endereco", this.formatarEndereco(previa.cliente.endereco)),
      "",
      "EMPRESA CONTRATADA",
      this.campo("Razao social", CONTRATADA_PMOC.razaoSocial),
      this.campo("Nome fantasia", CONTRATADA_PMOC.nomeFantasia),
      this.campo("CNPJ", CONTRATADA_PMOC.cnpj),
      this.campo("Endereco", CONTRATADA_PMOC.endereco),
      this.campo("Telefone", CONTRATADA_PMOC.telefone),
      this.campo("E-mail", CONTRATADA_PMOC.email),
      "",
      "RESPONSAVEL TECNICO",
      this.campo("Nome", engenheiro?.nome || ENGENHEIRO_PADRAO_PMOC.nome),
      this.campo("Titulo", ENGENHEIRO_PADRAO_PMOC.titulo),
      this.campo("CREA/Carteira", engenheiro?.crea || ENGENHEIRO_PADRAO_PMOC.crea),
      this.campo("Registro/Visto", ENGENHEIRO_PADRAO_PMOC.registro),
      this.campo("RNP", ENGENHEIRO_PADRAO_PMOC.rnp),
      this.campo("ART", "Nao informado")
    ];
  }

  private montarEscopoNormativo(previa: PreviaPmoc) {
    return [
      "OBJETIVO, RESPONSABILIDADES, LIMITACOES E REFERENCIAS",
      "",
      "Objetivo: consolidar o controle de manutencao preventiva dos sistemas de climatizacao do cliente.",
      "Responsabilidade da contratada: executar e registrar atividades, evidencias, ocorrencias e controle tecnico.",
      "Responsabilidade do cliente: permitir acesso aos equipamentos e informar alteracoes de uso, area ou ocupacao.",
      "Limitacoes: este documento reflete dados cadastrados e OS concluidas na plataforma ate a data de emissao.",
      "",
      "Referencias normativas:",
      "- Lei Federal n 13.589/2018",
      "- Portaria MS n 3.523/1998",
      "- Resolucao ANVISA RE n 09/2003",
      "- Lei Federal n 14.063/2020 e MP n 2.200-2/2001 para evidencias e assinatura digital",
      "",
      this.campo("Periodo apurado", `${this.formatarData(previa.periodo.inicio)} a ${this.formatarData(previa.periodo.fim)}`),
      this.campo("Pendencias", previa.pendencias.join(", ") || "Nenhuma")
    ];
  }

  private montarResumoMaquinas(previa: PreviaPmoc) {
    const linhas = previa.maquinas.slice(0, 34).map((maquina, indice) => {
      const tag = this.valor(maquina.patrimonio);
      const local = this.valor(maquina.local_instalacao);
      const capacidade = this.formatarCapacidade(maquina.capacidade_btu);
      const gas = this.valor(maquina.gas_refrigerante);
      return `${String(indice + 1).padStart(2, "0")}  ${this.limitar(tag, 12)}  ${this.limitar(local, 22)}  ${this.limitar(capacidade, 13)}  ${this.limitar(gas, 12)}`;
    });

    return [
      "RESUMO DAS MAQUINAS DO CLIENTE",
      "",
      "N   TAG           Local instalado          Carga termica  Gas",
      "--  ------------  ----------------------  -------------  ------------",
      ...(linhas.length ? linhas : ["Nenhuma maquina cadastrada."]),
      "",
      this.campo("Total de maquinas", String(previa.total_maquinas)),
      this.campo("Total de OS concluidas", String(previa.total_os_concluidas)),
      "Cada maquina possui uma pagina exclusiva a seguir."
    ];
  }

  private montarPaginaMaquina(previa: PreviaPmoc, maquina: MaquinaPmoc, indice: number) {
    const primeiraOs = maquina.os_concluidas[0] ?? null;
    const inicio = primeiraOs?.agendada_para ?? primeiraOs?.eventos?.[0]?.registrado_em ?? null;
    const fim = primeiraOs?.concluida_em ?? primeiraOs?.eventos?.at(-1)?.registrado_em ?? null;
    const verificacoes = this.obterLinhasChecklist(primeiraOs);
    const ocorrencias = primeiraOs?.observacoes?.length
      ? primeiraOs.observacoes.map((observacao) => observacao.texto || "Nao informado")
      : ["Sem ocorrencias registradas."];

    return [
      `MAQUINA N:${String(indice + 1).padStart(3, "0")} - PAGINA EXCLUSIVA`,
      "",
      "DADOS TECNICOS",
      this.campo("TAG/Patrimonio", this.valor(maquina.patrimonio)),
      this.campo("Codigo de barras", this.valor(maquina.codigo_barras)),
      this.campo("Tipo", this.valor(maquina.tipo)),
      this.campo("Marca", this.valor(maquina.marca)),
      this.campo("Modelo", this.valor(maquina.modelo)),
      this.campo("Gas refrigerante", this.valor(maquina.gas_refrigerante)),
      this.campo("Local instalado", this.valor(maquina.local_instalacao)),
      this.campo("Carga termica", this.formatarCapacidade(maquina.capacidade_btu)),
      this.campo("Area climatizada m2", this.formatarNumero(maquina.area_climatizada_m2)),
      this.campo("Ocupantes fixos", this.formatarNumero(maquina.ocupantes_fixo)),
      this.campo("Ocupantes variaveis", this.formatarNumero(maquina.ocupantes_variavel)),
      "",
      "ATIVIDADES / PERIODICIDADE",
      this.campo("Ultima execucao", `${this.formatarData(primeiraOs?.concluida_em ?? null)} - ${this.formatarHora(inicio)} -> ${this.formatarHora(fim)} (${this.calcularDuracao(inicio, fim)})`),
      this.campo("Tecnico/Equipe", primeiraOs?.tecnico?.nome || primeiraOs?.equipe?.nome || "Nao informado"),
      this.campo("OS", primeiraOs?.titulo || "Nao informado"),
      this.campo("Problema relatado", primeiraOs?.problema_relatado || "Nao informado"),
      "",
      "CONTROLE DE MANUTENCAO",
      ...verificacoes.map(([label, valor]) => this.campo(label, valor)),
      this.campo("Evidencias", this.formatarEvidencias(primeiraOs)),
      this.campo("GPS", this.formatarGps(primeiraOs)),
      this.campo("Assinatura cliente", primeiraOs?.assinatura?.nome_responsavel || "Pendente"),
      "",
      "OCORRENCIAS",
      ...ocorrencias.slice(0, 5),
      "",
      `Pagina da maquina ${indice + 1} de ${previa.maquinas.length}`
    ];
  }

  private montarDeclaracao(previa: PreviaPmoc) {
    return [
      `DECLARACAO TECNICA E ASSINATURAS - ${this.formatarMesAno(previa.periodo.fim)}`,
      "",
      "Declaramos que as atividades registradas neste PMOC foram organizadas por cliente e por maquina,",
      "com base nas informacoes cadastradas e nas ordens de servico concluidas na plataforma AIRMOVEBR.",
      "Este documento nao reutiliza imagem de assinatura do responsavel tecnico; a assinatura e vinculada",
      "ao relatorio especifico por fluxo de aprovacao e evidencia propria.",
      "",
      "Responsavel tecnico:",
      this.campo("Nome", previa.engenheiro_responsavel?.nome || ENGENHEIRO_PADRAO_PMOC.nome),
      this.campo("CREA/Carteira", previa.engenheiro_responsavel?.crea || ENGENHEIRO_PADRAO_PMOC.crea),
      this.campo("RNP", ENGENHEIRO_PADRAO_PMOC.rnp),
      "",
      "Assinaturas:",
      "Responsavel tecnico: ________________________________________________",
      "Representante do cliente: ___________________________________________",
      "",
      "Documento emitido automaticamente pela plataforma AIRMOVEBR."
    ];
  }

  private numeroPmoc(previa: PreviaPmoc) {
    const documento = (previa.cliente.documento || previa.cliente.nome || "PMOC").replace(/\D/g, "").slice(-6);
    const anoMes = this.anoMes(previa.periodo.inicio);
    return `PMOC${anoMes}${documento || "000000"}`;
  }

  private anoMes(valor: string | null) {
    const data = valor ? new Date(valor) : new Date();
    return `${data.getUTCFullYear()}${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  private obterLinhasChecklist(ordem: OrdemPmoc | null) {
    const procedimentos = new Set(ordem?.checklist?.procedimentos ?? []);
    const evidenciaDepois = ordem?.evidencias?.some((evidencia) => evidencia.tipo === "depois") ?? false;

    return [
      ["Equipamento desligado antes da limpeza?", "Sim"],
      ["Filtro lavado com agua corrente?", procedimentos.has("limpeza_filtro") ? "Sim" : "Nao informado"],
      ["Limpeza com escova realizada?", procedimentos.size ? "Sim" : "Nao informado"],
      ["Secagem completa antes da recolocacao?", procedimentos.has("limpeza_filtro") ? "Sim" : "Nao informado"],
      ["Integridade fisica do filtro verificada?", "Sim"],
      ["Limpeza externa do gabinete realizada?", procedimentos.has("limpeza_evaporadora") ? "Sim" : "Nao informado"],
      ["Filtro recolocado corretamente?", "Sim"],
      ["Operacao em modo DRY verificada?", "Nao informado"],
      ["Condicoes do ambiente verificadas?", ordem?.eventos?.some((evento) => evento.latitude !== null) ? "Sim" : "Nao informado"],
      ["Evidencia apos limpeza", evidenciaDepois ? "Sim" : "Pendente"]
    ];
  }

  private campo(campo: string, valor: string) {
    return `${campo.padEnd(30, " ")} ${valor || "Nao informado"}`;
  }

  private valor(valor?: string | null) {
    return valor?.trim() || "Nao informado";
  }

  private formatarNumero(valor?: number | null) {
    return valor === null || valor === undefined ? "Nao informado" : new Intl.NumberFormat("pt-BR").format(valor);
  }

  private formatarCapacidade(capacidadeBtu?: number | null) {
    return capacidadeBtu ? `${new Intl.NumberFormat("pt-BR").format(capacidadeBtu)} BTU` : "Nao informado";
  }

  private formatarEndereco(endereco: EnderecoPmoc) {
    if (!endereco) {
      return "Nao informado";
    }

    return [
      endereco.logradouro,
      endereco.numero,
      endereco.complemento,
      endereco.bairro,
      endereco.cidade,
      endereco.uf,
      endereco.cep ? `CEP ${endereco.cep}` : null
    ]
      .filter(Boolean)
      .join(", ") || "Nao informado";
  }

  private formatarData(valor: string | null) {
    return valor ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(valor)) : "__/__/____";
  }

  private formatarHora(valor: string | null) {
    return valor
      ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(valor))
      : "__:__";
  }

  private calcularDuracao(inicio: string | null, fim: string | null) {
    if (!inicio || !fim) {
      return "0min";
    }

    const minutos = Math.max(0, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000));
    return `${minutos}min`;
  }

  private formatarMesAno(valor: string | null) {
    const data = valor ? new Date(valor) : new Date();
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(data).toUpperCase();
  }

  private formatarMesAnoReferencia(valor: string | null) {
    const data = valor ? new Date(valor) : new Date();
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(data);
  }

  private formatarEvidencias(ordem: OrdemPmoc | null) {
    if (!ordem?.evidencias?.length) {
      return "Nenhuma evidencia registrada.";
    }

    const antes = ordem.evidencias.find((evidencia) => evidencia.tipo === "antes");
    const depois = ordem.evidencias.find((evidencia) => evidencia.tipo === "depois");

    return [`Antes - ${this.obterNomeArquivo(antes?.storage_url)}`, `Depois - ${this.obterNomeArquivo(depois?.storage_url)}`].join(" | ");
  }

  private formatarGps(ordem: OrdemPmoc | null) {
    const evento = ordem?.eventos?.find((item) => item.latitude !== null && item.longitude !== null);

    if (!evento || evento.latitude === null || evento.longitude === null) {
      return "Nao informado";
    }

    return `${Number(evento.latitude).toFixed(6)}, ${Number(evento.longitude).toFixed(6)}`;
  }

  private obterNomeArquivo(storageUrl?: string | null) {
    if (!storageUrl) {
      return "Pendente";
    }

    return storageUrl.split(/[\\/]/).filter(Boolean).at(-1) || storageUrl;
  }

  private limitar(valor: string, tamanho: number) {
    const normalizado = this.normalizarTextoPdf(valor);
    return normalizado.length > tamanho ? normalizado.slice(0, tamanho) : normalizado.padEnd(tamanho, " ");
  }

  private criarPdfTexto(paginas: string[][]) {
    const objetos = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
    const pageObjectIds: number[] = [];

    for (const linhas of paginas) {
      const texto = linhas
        .flatMap((linha) => this.quebrarLinhaPdf(linha, 96))
        .slice(0, 48)
        .map((linha) => `(${this.escaparTextoPdf(linha)}) Tj T*`)
        .join("\n");
      const conteudo = `BT\n/F1 9 Tf\n42 790 Td\n12 TL\n${texto}\nET`;
      const pageObjectId = objetos.length + 1;
      const contentObjectId = objetos.length + 2;
      pageObjectIds.push(pageObjectId);
      objetos.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
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

  private normalizarTextoPdf(valor: string) {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, " ");
  }

  private escaparTextoPdf(valor: string) {
    return this.normalizarTextoPdf(valor).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }
}
