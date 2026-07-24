import { BoltData, BoltMessage, BoltOption, BoltResult, BoltServiceType } from "./bolt.types";

const MENU = "Olá! Seja bem-vindo à AIRMOVEBR.\n\nSou o Move, a IA de atendimento da AIRMOVEBR.\n\nVou fazer um breve pré-cadastro para identificar sua necessidade e direcionar seu atendimento ao técnico responsável.\n\nVamos começar?";
const MENU_OPTIONS: BoltOption[] = [
  { id: "menu_instalacao", title: "🔵 Instalação" },
  { id: "menu_manutencao", title: "🟠 Manutenção" },
  { id: "menu_mais_servicos", title: "🟢 Mais serviços" }
];
const MORE_SERVICE_OPTIONS: BoltOption[] = [
  { id: "menu_limpeza", title: "🟢 Limpeza" },
  { id: "menu_pmoc", title: "🟣 PMOC" },
  { id: "menu_atendente", title: "⚪ Atendente" }
];
const INSTALLATION_OPTIONS: BoltOption[] = [
  { id: "inst_aparelho_sim", title: "🟢 Já tenho" },
  { id: "inst_aparelho_nao", title: "🔵 Quero comprar" },
  { id: "inst_aparelho_orientacao", title: "🟣 Orientação" }
];
const MAINTENANCE_OPTIONS: BoltOption[] = [
  { id: "manut_nao_liga", title: "🔴 Não liga" },
  { id: "manut_nao_gela", title: "🔵 Não gela" },
  { id: "manut_outro", title: "⚪ Outro problema" }
];

export function dadosBoltIniciais(): BoltData {
  return { nome: null, cep: null, logradouro: null, bairro: null, cidade: null, uf: null, servico: null, cidade_bairro: null, detalhes: null, campos_extra: {}, status: "BOT_MENU", etapa_atual: null, tentativas_fallback: 0 };
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
    const texto = this.normalizarOpcao(this.normalizar(original));
    const base = { ...dados, ultima_interacao: new Date().toISOString() };
    if (dados.status === "HUMAN_ATTENDING" || dados.status === "CLOSED") return { texto: "", assumir: false, dados: base };
    if (/(humano|atendente|pessoa|equipe|suporte|operador|falar com alguem)/.test(texto) || texto === "menu_atendente") return this.humano(base);
    if (texto === "menu_mais_servicos") return this.resposta(base, "Escolha o serviço que você precisa:", MORE_SERVICE_OPTIONS);
    if (/(^|\s)(menu|cancelar|voltar|recomecar|inicio|ajuda)(\s|$)/.test(texto) || this.ehSaudacao(texto)) return this.menu({ ...dadosBoltIniciais(), ultima_interacao: base.ultima_interacao });
    if (texto === "corrigir" && dados.status === "BOT_QUALIFYING") return this.iniciarServico(base, dados.servico || "manutencao");
    const servico = this.identificarServico(texto, dados);
    if (servico) return this.iniciarServico(base, servico);
    if (dados.status === "BOT_QUALIFYING") return this.coletar(base, original, texto);
    if (/(atendimento)/.test(texto)) return this.resposta(base, "Nosso atendimento humano funciona em horário comercial. Você já pode deixar seus dados e responderemos assim que possível.");
    if (/(cobertura|regiao|atende)/.test(texto)) return this.resposta(base, "Atendemos Londrina e região. Informe seu CEP para confirmarmos a cobertura.");
    if (/(documento|orcamento)/.test(texto)) return this.resposta(base, "Para preparar um orçamento, precisamos do seu nome, CEP, serviço e uma breve descrição.");
    if (/(preco|valor|quanto custa)/.test(texto)) return this.resposta(base, "O valor final depende da avaliação técnica e das condições do local.");
    return this.fallback(base);
  }

  private coletar(dados: BoltData, original: string, texto: string): BoltResult {
    if (!dados.nome) {
      const nome = original.split(/\s+/)[0] || "Cliente";
      return this.resposta({ ...dados, nome, etapa_atual: "aguardando_cep", tentativas_fallback: 0 }, `Prazer, ${nome}. Você poderia me passar seu CEP? Com ele localizamos seu endereço.`);
    }
    if (dados.etapa_atual === "aguardando_cep" || !dados.cep) return this.resposta({ ...dados, etapa_atual: "aguardando_cep" }, "Informe seu CEP com oito números, por favor.");
    if (dados.etapa_atual === "aguardando_confirmacao_endereco") {
      if (texto === "cep_confirmar") return this.resposta({ ...dados, etapa_atual: this.proximaEtapa(dados), tentativas_fallback: 0 }, this.perguntaExtra(dados), this.opcoesPerguntaExtra(dados));
      if (texto === "cep_corrigir") return this.resposta({ ...dados, cep: null, logradouro: null, bairro: null, cidade: null, uf: null, cidade_bairro: null, etapa_atual: "aguardando_cep" }, "Sem problema. Você poderia me passar o CEP novamente?");
      return this.resposta(dados, "Confirma esse endereço?", [{ id: "cep_confirmar", title: "🟢 Confirmar" }, { id: "cep_corrigir", title: "🟠 Corrigir CEP" }]);
    }
    if (dados.servico === "instalacao" && !dados.campos_extra.situacao_aparelho) {
      if (dados.etapa_atual !== "aguardando_situacao_aparelho") return this.resposta({ ...dados, etapa_atual: "aguardando_situacao_aparelho" }, "Você já tem o aparelho?", INSTALLATION_OPTIONS);
      if (!("inst_aparelho_sim" === texto || "inst_aparelho_nao" === texto || "inst_aparelho_orientacao" === texto)) return this.resposta(dados, "Use um botão abaixo ou escreva sua resposta.", INSTALLATION_OPTIONS);
      return this.resposta({ ...dados, campos_extra: { ...dados.campos_extra, situacao_aparelho: this.rotuloOpcao(texto) }, etapa_atual: "aguardando_btus" }, "Sabe os BTUs ou a metragem do ambiente? Se não souber, escreva não sei.");
    }
    if (dados.servico === "instalacao" && !dados.campos_extra.btus) return this.resumo({ ...dados, campos_extra: { ...dados.campos_extra, btus: original }, etapa_atual: null });
    if (dados.servico === "pmoc" && !dados.campos_extra.qtd_aparelhos) return this.resumo({ ...dados, campos_extra: { ...dados.campos_extra, qtd_aparelhos: original }, etapa_atual: null });
    if (dados.servico === "locacao" && !dados.campos_extra.periodo) return this.resposta({ ...dados, campos_extra: { ...dados.campos_extra, periodo: original }, etapa_atual: "aguardando_ambiente" }, "Qual é o tipo de ambiente e o tamanho aproximado?");
    if (dados.servico === "locacao" && !dados.campos_extra.ambiente) return this.resumo({ ...dados, campos_extra: { ...dados.campos_extra, ambiente: original }, etapa_atual: null });
    if (!dados.detalhes && texto === "manut_outro") return this.resposta({ ...dados, etapa_atual: "aguardando_detalhes" }, "Descreva brevemente o problema do aparelho.");
    if (!dados.detalhes) return this.resumo({ ...dados, detalhes: this.rotuloOpcao(texto) === texto ? original : this.rotuloOpcao(texto), etapa_atual: null });
    return this.resumo(dados);
  }

  private iniciarServico(dados: BoltData, servico: BoltServiceType): BoltResult {
    const equipe = servico === "instalacao" ? "comercial" : "operacional";
    return this.resposta({ ...dados, servico, status: "BOT_QUALIFYING", etapa_atual: "aguardando_nome", tentativas_fallback: 0, campos_extra: { ...dados.campos_extra, equipe } }, `Certo. Atendimento de ${this.rotulo(servico)}.\n\nComo posso te chamar?`);
  }

  private identificarServico(texto: string, dados: BoltData): BoltServiceType | null {
    if (dados.status !== "BOT_MENU") return null;
    if (/^(instalacao|instalar)/.test(texto) || texto === "menu_instalacao") return "instalacao";
    if (/^(manutencao|limpeza|limpar|corretiva|preventiva)/.test(texto) || texto === "menu_manutencao" || texto === "menu_limpeza") return "manutencao";
    if (/^(pmoc)/.test(texto) || texto === "menu_pmoc") return "pmoc";
    if (/^(locacao|aluguel)/.test(texto) || texto === "menu_locacao") return "locacao";
    return null;
  }

  private menu(dados: BoltData): BoltResult { return { texto: MENU, assumir: false, dados, opcoes: MENU_OPTIONS }; }
  private fallback(dados: BoltData): BoltResult {
    const tentativas = dados.tentativas_fallback + 1;
    if (tentativas >= 2) return { texto: "Vou te encaminhar para nossa equipe.", assumir: true, dados: { ...dados, status: "HUMAN_QUEUE", etapa_atual: null, tentativas_fallback: 0 } };
    return this.resposta({ ...dados, tentativas_fallback: tentativas }, "Use um dos botões abaixo ou escreva o que precisa.", MENU_OPTIONS);
  }
  private resumo(dados: BoltData): BoltResult {
    const servico = ({ manutencao: "Manutenção", instalacao: "Instalação", pmoc: "PMOC", locacao: "Locação" } as Record<BoltServiceType, string>)[dados.servico || "manutencao"];
    const endereco = [dados.logradouro, dados.bairro, dados.cidade && dados.uf ? `${dados.cidade}/${dados.uf}` : dados.cidade].filter(Boolean).join(", ");
    const texto = `Pré-cadastro concluído.\n\nCliente: ${dados.nome || "Não informado"}\nEndereço: ${endereco || "Não informado"}\nServiço: ${servico}\nDetalhes: ${dados.detalhes || "Não informados."}\n\nCaso precise alterar alguma informação, responda com CORRIGIR.\n\nSeu atendimento já está sendo encaminhado ao técnico responsável. Em breve entraremos em contato para dar continuidade ao atendimento.`;
    return { texto, assumir: true, dados: { ...dados, status: "HUMAN_QUEUE", etapa_atual: null, tentativas_fallback: 0 } };
  }
  private humano(dados: BoltData): BoltResult { return { texto: "Vou te transferir para nossa equipe agora.", assumir: true, dados: { ...dados, status: "HUMAN_QUEUE", etapa_atual: null, tentativas_fallback: 0 } }; }
  private resposta(dados: BoltData, texto: string, opcoes?: BoltOption[]): BoltResult { return { texto, assumir: false, dados, ...(opcoes?.length ? { opcoes } : {}) }; }
  private rotuloOpcao(texto: string) { return ({ inst_aparelho_sim: "já possui o aparelho", inst_aparelho_nao: "quer comprar o aparelho", inst_aparelho_orientacao: "precisa de orientação", manut_nao_liga: "aparelho não liga", manut_nao_gela: "aparelho não gela", manut_outro: "outro problema" } as Record<string, string>)[texto] || texto; }
  private opcoesPerguntaExtra(dados: BoltData) { return dados.servico === "instalacao" ? INSTALLATION_OPTIONS : dados.servico === "manutencao" ? MAINTENANCE_OPTIONS : undefined; }
  private normalizarOpcao(texto: string) { return texto; }
  private normalizar(texto: string) { return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  private ehSaudacao(texto: string) { return /^(oi|ola|bom dia|boa tarde|boa noite)$/.test(texto); }
  private rotulo(servico: BoltServiceType) { return { manutencao: "Manutenção", instalacao: "Instalação", pmoc: "PMOC", locacao: "Locação" }[servico]; }
  private proximaEtapa(dados: BoltData) { return dados.servico === "instalacao" ? "aguardando_situacao_aparelho" : dados.servico === "pmoc" ? "aguardando_qtd_aparelhos" : dados.servico === "locacao" ? "aguardando_periodo" : "aguardando_detalhes"; }
  private perguntaExtra(dados: BoltData) { return dados.servico === "instalacao" ? "Você já tem o aparelho?" : dados.servico === "pmoc" ? "Quantos aparelhos aproximadamente?" : dados.servico === "locacao" ? "Qual a data ou período pretendido?" : "Qual é o principal problema do aparelho?"; }
}