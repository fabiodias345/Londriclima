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
      this.montarCabecalhoProfissional(previa),
      this.montarObjetivo(previa),
      this.montarDadosContratante(previa),
      this.montarDadosContratada(previa),
      this.montarAtividadesManutencao()
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

    paginas.push(this.montarConsideracoesFinais(previa));
    paginas.push(this.montarReferenciaDeclaracao(previa));

    return this.criarPdfTexto(paginas);
  }

  private montarCabecalhoProfissional(previa: PreviaPmoc) {
    const mesAno = this.formatarMesAnoReferencia(previa.periodo.inicio);
    const ano = new Date(previa.periodo.inicio || new Date()).getUTCFullYear();

    return [
      "PMOC — Plano de Manutenção, Operação e Controle",
      `N° Documento: ${this.numeroPmoc(previa)}`,
      `Emissão: ${mesAno} / ${ano}`,
      `Renovação: ${this.formatarMesAnoReferencia(previa.periodo.fim)} / ${ano + 1}`,
      "",
      "Empresa: M. LIMA MANUTENÇÕES PREDIAIS E INDUSTRIAIS LTDA",
      "",
      "Controle de Revisões",
      "Alterações                              Revisão    Data             Elaborado    Aprovado",
      "─────────────────────────────────────  ─────────  ──────────────  ───────────  ──────────",
      "Emissão inicial                        00         15/01/2024      André        Paulo"
    ];
  }

  private montarObjetivo(previa: PreviaPmoc) {
    return [
      "1. Objetivo",
      "",
      "O objetivo do PMOC é estabelecer as atividades preventivas a serem desenvolvidas, como",
      "limpeza e manutenção, a periodicidade das mesmas, as recomendações a serem adotadas em",
      "situações de falha dos equipamentos e de emergência, para garantia de segurança do",
      "sistema de climatização. O presente programa é estabelecido por lei visando garantir a",
      "qualidade do ambiente, preservando a saúde das pessoas."
    ];
  }

  private montarDadosContratante(previa: PreviaPmoc) {
    return [
      "2. Dados do Contratante / Proprietário / Edificação",
      "",
      "Campo                                  Informação",
      "─────────────────────────────────────  ────────────────────────────────────────────────",
      `Razão Social                           ${previa.cliente.nome}`,
      `CNPJ                                   ${previa.cliente.documento || "Não informado"}`,
      `Município/UF                           ${this.obterMunicipioUf(previa.cliente.endereco)}`,
      `Contato                                ${previa.cliente.telefone || "Não informado"}`,
      `Endereço                               ${this.formatarEndereco(previa.cliente.endereco)}`
    ];
  }

  private montarDadosContratada(previa: PreviaPmoc) {
    const engenheiro = previa.engenheiro_responsavel || ENGENHEIRO_PADRAO_PMOC;

    return [
      "3. Dados da Contratada",
      "",
      "Campo                                  Informação",
      "─────────────────────────────────────  ────────────────────────────────────────────────",
      `Razão Social                           ${CONTRATADA_PMOC.razaoSocial}`,
      `CNPJ                                   ${CONTRATADA_PMOC.cnpj}`,
      `Município/UF                           Maringá / PR`,
      `Contato                                ${CONTRATADA_PMOC.telefone}`,
      `Registro CREA                          CREA-PR ${ENGENHEIRO_PADRAO_PMOC.registro} — Resp. Téc. ${engenheiro.nome}`,
      `Número da ART                          Não informado`
    ];
  }

  private montarAtividadesManutencao() {
    return [
      "4. PMOC — Plano de Manutenção, Operação e Controle",
      "",
      "Os procedimentos devem seguir o plano descrito no Anexo II, considerando-se as",
      "orientações do fabricante e a legislação vigente. Qualquer procedimento fora do comum",
      "deve ser comunicado ao responsável técnico e registrado no Registro de Ocorrências.",
      "",
      "A empresa contratada deverá preencher o Anexo I (declaração de execução) uma única",
      "vez e o Anexo II (plano de manutenção) de cada máquina mensalmente.",
      "",
      "Atividades de Manutenção",
      "",
      "Nº   Atividade                                          Mensal  Trimestral  Semestral",
      "───  ───────────────────────────────────────────────────  ──────  ─────────  ────────",
      "4.1  Limpeza dos filtros de ar e/ou substituição          X       X          X",
      "4.2  Limpeza externa do gabinete do evaporador            X       X          X",
      "4.3  Verificar operação de drenagem                       X       X          X",
      "4.4  Verificar e corrigir ruídos e vibrações anormais     X       X          X",
      "4.5  Verificar termostatos, controles e sensores          X       X          X",
      "4.6  Higienizar evaporadores com bactericida              X       X          X",
      "4.7  Verificar e eliminar odores desagradáveis            X       X          X",
      "4.8  Limpeza das serpentinas do evaporador                        X          X",
      "4.9  Limpeza do ventilador/rotor do evaporador                    X          X",
      "4.10 Limpeza da bandeja de condensado                             X          X",
      "4.11 Reaperto de terminais/conexões elétricas                     X          X",
      "4.12 Verificar corrente/pressão/tensão                                      X",
      "4.13 Limpeza do condensador                                                  X",
      "4.14 Verificar estado dos compressores                                       X",
      "4.15 Lubrificação geral do equipamento                                       X",
      "4.16 Verificar estado dos suportes/coxins                                    X",
      "4.17 Verificar e corrigir focos de corrosão                                  X",
      "4.18 Verificar isolantes térmicos das linhas                                 X"
    ];
  }

  private montarConsideracoesFinais(previa: PreviaPmoc) {
    return [
      "5. Limitação do Plano",
      "",
      "Esta análise de riscos está limitada às fases de elaboração e supervisão. Não foram",
      "contemplados a execução da manutenção e o projeto. O Engenheiro responsável não assume",
      "responsabilidade por julgamentos baseados em informações incorretas ou imprecisas.",
      "",
      "Erros humanos e mau uso — alimentação incorreta da máquina, uso incorreto de materiais",
      "ou inabilidade dos operadores — não fazem parte deste Plano.",
      "",
      "6. Considerações Finais",
      "",
      "O PMOC tem importância fundamental na proteção dos ocupantes do imóvel, minimizando ou",
      "eliminando potenciais problemas de saúde relacionados à qualidade do ar, proporcionando",
      "maior bem-estar, conforto e produtividade, e reduzindo o absenteísmo.",
      "",
      "Além de garantir um ambiente livre de contaminação, o plano aumenta a vida útil dos",
      "equipamentos. Equipamentos bem mantidos consomem menos energia e apresentam menos",
      "falhas, resultando em economia.",
      "",
      "Fica sob responsabilidade do proprietário/responsável executar este PMOC, avaliando a",
      "necessidade de intervenções e manutenções preventivas adicionais.",
      "",
      "Requisitos obrigatórios:",
      "• Realizar Análise da Qualidade do Ar (RE/09) 2 vezes ao ano",
      "• Inspecionar (e limpar, se necessário) os dutos de ar 1 vez ao ano"
    ];
  }

  private montarReferenciaDeclaracao(previa: PreviaPmoc) {
    const engenheiro = previa.engenheiro_responsavel || ENGENHEIRO_PADRAO_PMOC;
    const dataAtual = new Date();
    const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(dataAtual);

    return [
      "7. Referência Normativa",
      "",
      "Portaria 3.523 de 28/08/1998 — Ministério da Saúde",
      "Exige a manutenção dos aparelhos de ar-condicionado e determina procedimentos de",
      "limpeza e manutenção dos sistemas de climatização.",
      "",
      "Resolução nº 9 de 16/01/2003 — ANVISA",
      "Atualiza os padrões referenciais de qualidade do ar interior em ambientes climatizados",
      "artificialmente de uso público e coletivo.",
      "",
      "Lei Federal 13.589 de 04/01/2018",
      "Atualização da Portaria 3.523. Dispõe sobre a manutenção de instalações e equipamentos",
      "de sistemas de climatização de ambientes.",
      "",
      "Lei Federal 6.437 de 20/08/1977",
      "Configura as infrações à legislação Sanitária Federal e estabelece as sanções",
      "respectivas.",
      "",
      "Resolução CONFEA 218 de 29/06/1973 — Art. 12",
      "Estabelece a competência e responsabilidade técnica ao Engenheiro Mecânico pela",
      "elaboração, implantação e manutenção do PMOC.",
      "",
      "─────────────────────────────────────────────────────────────────────────────────────",
      "",
      `Londrina, ${dataFormatada}`,
      "",
      engenheiro.nome || ENGENHEIRO_PADRAO_PMOC.nome,
      "Responsável Técnico — Engenheiro Mecânico",
      `CREA-PR ${engenheiro.crea || ENGENHEIRO_PADRAO_PMOC.crea}`
    ];
  }

  private obterMunicipioUf(endereco: EnderecoPmoc) {
    if (!endereco) return "Não informado";
    return `${endereco.cidade || "Não informado"} / ${endereco.uf || "PR"}`;
  }


  private montarPaginaMaquina(previa: PreviaPmoc, maquina: MaquinaPmoc, indice: number) {
    const primeiraOs = maquina.os_concluidas[0] ?? null;
    const inicio = primeiraOs?.agendada_para ?? primeiraOs?.eventos?.[0]?.registrado_em ?? null;
    const fim = primeiraOs?.concluida_em ?? primeiraOs?.eventos?.at(-1)?.registrado_em ?? null;
    const verificacoes = this.obterLinhasChecklist(primeiraOs);
    const ocorrencias = primeiraOs?.observacoes?.length
      ? primeiraOs.observacoes.map((observacao) => observacao.texto || "Não informado")
      : ["Sem ocorrências registradas."];

    return [
      `EQUIPAMENTO AC${indice + 1} — ${this.valor(maquina.local_instalacao)}`,
      "",
      "DADOS TÉCNICOS",
      "",
      "Campo                                  Informação",
      "─────────────────────────────────────  ────────────────────────────────────────────────",
      `Ambiente                               ${this.valor(maquina.local_instalacao)}`,
      `Ocupantes (Fixo/Variável)              ${this.formatarNumero(maquina.ocupantes_fixo)} / ${this.formatarNumero(maquina.ocupantes_variavel)}`,
      `Área Climatizada                       ${this.formatarNumero(maquina.area_climatizada_m2)} m²`,
      `Carga Térmica                          ${this.formatarCapacidade(maquina.capacidade_btu)}`,
      `Equipamento                            ${this.valor(maquina.tipo)} ${this.valor(maquina.marca)} ${this.valor(maquina.modelo)}`,
      `TAG                                    ${this.valor(maquina.patrimonio)}`,
      `Código de barras                       ${this.valor(maquina.codigo_barras)}`,
      `Gás Refrigerante                       ${this.valor(maquina.gas_refrigerante)}`,
      "",
      "ÚLTIMA EXECUÇÃO",
      "",
      `Data                                   ${this.formatarData(primeiraOs?.concluida_em ?? null)}`,
      `Horário                                ${this.formatarHora(inicio)} → ${this.formatarHora(fim)} (${this.calcularDuracao(inicio, fim)})`,
      `Técnico/Equipe                         ${primeiraOs?.tecnico?.nome || primeiraOs?.equipe?.nome || "Não informado"}`,
      `OS                                     ${primeiraOs?.titulo || "Não informado"}`,
      `Problema relatado                      ${primeiraOs?.problema_relatado || "Manutenção preventiva"}`,
      "",
      "CONTROLE DE MANUTENÇÃO",
      "",
      ...verificacoes.map(([label, valor]) => `${label.padEnd(35, " ")} ${valor}`),
      "",
      `Evidências                             ${this.formatarEvidencias(primeiraOs)}`,
      `GPS                                    ${this.formatarGps(primeiraOs)}`,
      `Assinatura do cliente                  ${primeiraOs?.assinatura?.nome_responsavel || "Pendente"}`,
      "",
      "OCORRÊNCIAS",
      "",
      ...ocorrencias.slice(0, 5),
      "",
      "─────────────────────────────────────────────────────────────────────────────────────",
      `Página do equipamento ${indice + 1} de ${previa.maquinas.length}`
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
      ["Filtro lavado com água corrente?", procedimentos.has("limpeza_filtro") ? "Sim" : "Não informado"],
      ["Limpeza com escova realizada?", procedimentos.size ? "Sim" : "Não informado"],
      ["Secagem completa antes da recolocação?", procedimentos.has("limpeza_filtro") ? "Sim" : "Não informado"],
      ["Integridade física do filtro verificada?", "Sim"],
      ["Limpeza externa do gabinete realizada?", procedimentos.has("limpeza_evaporadora") ? "Sim" : "Não informado"],
      ["Filtro recolocado corretamente?", "Sim"],
      ["Operação em modo DRY verificada?", "Não informado"],
      ["Condições do ambiente verificadas?", ordem?.eventos?.some((evento) => evento.latitude !== null) ? "Sim" : "Não informado"],
      ["Evidência após limpeza", evidenciaDepois ? "Sim" : "Pendente"]
    ];
  }

  private valor(valor?: string | null) {
    return valor?.trim() || "Não informado";
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
      ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(valor))
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

  private normalizarTextoPdf(valor: string) {
    return valor
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\x20-\x7E]/g, " ");
  }

  private escaparTextoPdf(valor: string) {
    return this.normalizarTextoPdf(valor).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
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
}