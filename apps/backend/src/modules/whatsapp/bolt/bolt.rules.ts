import { BoltData, BoltMessage, BoltResult, BoltServiceType } from "./bolt.types";

const MENU = "Ola! Seja bem-vindo(a) a AIRMOVEBR!\n\nDigite o numero da opcao desejada:\n1 - Manutencao ou Conserto\n2 - Instalacao de Ar-Condicionado\n3 - PMOC\n4 - Locacao de Equipamentos\n5 - Falar com Atendente\n\nSeus dados serao usados apenas para retorno do seu atendimento.";

export function dadosBoltIniciais(): BoltData {
  return { nome: null, servico: null, cidade_bairro: null, detalhes: null, campos_extra: {}, status: "BOT_MENU", etapa_atual: null, tentativas_fallback: 0 };
}

export function normalizarDadosBolt(value: unknown): BoltData {
  const base = dadosBoltIniciais();
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const dados = value as Partial<BoltData>;
  return { ...base, ...dados, campos_extra: dados.campos_extra && typeof dados.campos_extra === "object" ? dados.campos_extra : {}, tentativas_fallback: typeof dados.tentativas_fallback === "number" ? dados.tentativas_fallback : 0 };
}

export class BoltRules {
  processar(mensagem: BoltMessage, dadosEntrada: unknown): BoltResult {
    const dados = normalizarDadosBolt(dadosEntrada);
    const original = mensagem.texto.trim();
    const texto = this.normalizar(original);
    const base = { ...dados, ultima_interacao: new Date().toISOString() };
    if (dados.status === "HUMAN_ATTENDING" || dados.status === "CLOSED") return { texto: "", assumir: false, dados: base };
    if (/(humano|atendente|pessoa|equipe|suporte|operador|falar com alguem)/.test(texto)) return this.humano(base);
    if (/(^|\s)(menu|cancelar|voltar|recomecar|inicio|ajuda)(\s|$)/.test(texto) || this.ehSaudacao(texto)) return { texto: MENU, assumir: false, dados: { ...dadosBoltIniciais(), ultima_interacao: base.ultima_interacao } };
    if (texto === "corrigir" && dados.status === "BOT_QUALIFYING") return this.iniciarServico(base, dados.servico || "manutencao");
    if (texto === "5") return this.humano(base);
    const servico = this.identificarServico(texto, dados);
    if (servico) return this.iniciarServico(base, servico);
    if (dados.status === "BOT_QUALIFYING") return this.coletar(base, original, texto);
    if (/atendimento/.test(texto)) return this.resposta(base, "Nosso atendimento humano funciona em horario comercial. Voce ja pode deixar seus dados e responderemos assim que possivel.");
    if (/(cobertura|regiao|atende)/.test(texto)) return this.resposta(base, "Atendemos Londrina e regiao. Informe sua cidade e bairro para confirmarmos a cobertura.");
    if (/(documento|orcamento)/.test(texto)) return this.resposta(base, "Para preparar um orcamento, precisamos do nome, cidade/bairro, servico e uma breve descricao. Os valores dependem da avaliacao tecnica.");
    if (/(preco|valor|quanto custa)/.test(texto)) return this.resposta(base, "Nao informo preco final pelo WhatsApp. O valor depende do equipamento, capacidade, metragem e infraestrutura.");
    if (/(pingando|vazando|barulho|nao liga|nao gela|defeito|problema)/.test(texto)) return this.resposta({ ...base, detalhes: original }, "Registrei a ocorrencia. Nao vou orientar um reparo sem avaliacao tecnica; a equipe organizara o atendimento.");
    return this.fallback(base);
  }

  private coletar(dados: BoltData, original: string, texto: string): BoltResult {
    if (!dados.nome) return this.resposta({ ...dados, nome: original, etapa_atual: "aguardando_cidade_bairro", tentativas_fallback: 0 }, "Obrigado. Em qual bairro e cidade fica o local?");
    if (!dados.cidade_bairro) return this.resposta({ ...dados, cidade_bairro: original, etapa_atual: this.proximaEtapa(dados), tentativas_fallback: 0 }, this.perguntaExtra(dados));
    if (dados.servico === "instalacao" && !dados.campos_extra.situacao_aparelho) {
      if (dados.etapa_atual !== "aguardando_situacao_aparelho") return this.resposta({ ...dados, etapa_atual: "aguardando_situacao_aparelho" }, "Voce ja tem o aparelho?\n1 - Ja tenho\n2 - Quero comprar\n3 - Preciso de orientacao");
      if (!/^[123]$/.test(texto)) return this.resposta(dados, "Nao entendi. Digite apenas 1, 2 ou 3.");
      return this.resposta({ ...dados, campos_extra: { ...dados.campos_extra, situacao_aparelho: texto }, etapa_atual: "aguardando_btus" }, "Sabe os BTUs ou a metragem do ambiente? Se nao souber, responda nao sei.");
    }
    if (dados.servico === "instalacao" && !dados.campos_extra.btus) return this.resumo({ ...dados, campos_extra: { ...dados.campos_extra, btus: original }, etapa_atual: null });
    if (dados.servico === "pmoc" && !dados.campos_extra.qtd_aparelhos) return this.resumo({ ...dados, campos_extra: { ...dados.campos_extra, qtd_aparelhos: original }, etapa_atual: null });
    if (dados.servico === "locacao" && !dados.campos_extra.periodo) return this.resposta({ ...dados, campos_extra: { ...dados.campos_extra, periodo: original }, etapa_atual: "aguardando_ambiente" }, "Qual e o tipo de ambiente e o tamanho aproximado?");
    if (dados.servico === "locacao" && !dados.campos_extra.ambiente) return this.resumo({ ...dados, campos_extra: { ...dados.campos_extra, ambiente: original }, etapa_atual: null });
    if (!dados.detalhes) return this.resumo({ ...dados, detalhes: original, etapa_atual: null });
    return this.resumo(dados);
  }

  private iniciarServico(dados: BoltData, servico: BoltServiceType): BoltResult {
    const equipe = servico === "instalacao" ? "comercial" : "operacional";
    const atualizados = { ...dados, servico, status: "BOT_QUALIFYING" as const, etapa_atual: "aguardando_nome", tentativas_fallback: 0, campos_extra: { ...dados.campos_extra, equipe } };
    const pergunta = servico === "pmoc" ? "Qual e o nome da empresa e do responsavel?" : servico === "locacao" ? "Seu nome ou nome da empresa?" : "Qual e o seu nome completo?";
    return this.resposta(atualizados, `Certo. Atendimento de ${this.rotulo(servico)}.\n\n${pergunta}`);
  }

  private identificarServico(texto: string, dados: BoltData): BoltServiceType | null {
    if (dados.status !== "BOT_MENU") return null;
    if (/^(2|instalacao|instalar)/.test(texto)) return "instalacao";
    if (/^(1|manutencao|limpeza|limpar|corretiva|preventiva)/.test(texto)) return "manutencao";
    if (/^(3|pmoc)/.test(texto)) return "pmoc";
    if (/^(4|locacao|aluguel)/.test(texto)) return "locacao";
    if (/^5$/.test(texto)) return null;
    return null;
  }

  private fallback(dados: BoltData): BoltResult {
    const tentativas = dados.tentativas_fallback + 1;
    if (tentativas >= 2) return { texto: "Vou te encaminhar direto para nossa equipe.", assumir: true, dados: { ...dados, status: "HUMAN_QUEUE", etapa_atual: null, tentativas_fallback: 0 } };
    return this.resposta({ ...dados, tentativas_fallback: tentativas }, "Nao entendi. Digite: 1-Manutencao, 2-Instalacao, 3-PMOC, 4-Locacao ou 5-Atendente.");
  }

  private resumo(dados: BoltData): BoltResult {
    const texto = `Resumo ${this.rotulo(dados.servico || "manutencao")}\nCliente: ${dados.nome || "nao informado"} - Local: ${dados.cidade_bairro || "nao informado"}\nDetalhes: ${dados.detalhes || "nao informado"}\n\nSe algum dado estiver incorreto, digite CORRIGIR.\nTransferindo para nossa equipe.`;
    return { texto, assumir: true, dados: { ...dados, status: "HUMAN_QUEUE", etapa_atual: null, tentativas_fallback: 0 } };
  }

  private humano(dados: BoltData): BoltResult { return { texto: "Vou te transferir para nossa equipe agora.\nSe puder, envie seu nome e o motivo do contato.", assumir: true, dados: { ...dados, status: "HUMAN_QUEUE", etapa_atual: null, tentativas_fallback: 0 } }; }
  private resposta(dados: BoltData, texto: string): BoltResult { return { texto, assumir: false, dados }; }
  private normalizar(texto: string) { return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  private ehSaudacao(texto: string) { return /^(oi|ola|bom dia|boa tarde|boa noite)$/.test(texto); }
  private rotulo(servico: BoltServiceType) { return { manutencao: "Manutencao/Conserto", instalacao: "Instalacao", pmoc: "PMOC", locacao: "Locacao" }[servico]; }
  private proximaEtapa(dados: BoltData) { return dados.servico === "instalacao" ? "aguardando_situacao_aparelho" : dados.servico === "pmoc" ? "aguardando_qtd_aparelhos" : dados.servico === "locacao" ? "aguardando_periodo" : "aguardando_detalhes"; }
  private perguntaExtra(dados: BoltData) { return dados.servico === "instalacao" ? "Voce ja tem o aparelho?\n1 - Ja tenho\n2 - Quero comprar\n3 - Preciso de orientacao" : dados.servico === "pmoc" ? "Quantos aparelhos aproximadamente?" : dados.servico === "locacao" ? "Qual a data ou periodo pretendido?" : "Descreva o defeito ou necessidade."; }
}