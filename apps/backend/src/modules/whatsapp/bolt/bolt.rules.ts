import { BoltData, BoltMemory, BoltResult, BoltServiceType } from "./bolt.types";

const WELCOME = "Olá! Eu sou a atendente virtual da Londri Clima. Seja bem-vindo(a) ao nosso atendimento.";
const ASK_NAME = "Por favor, me passe seu nome completo.";
const ASK_SERVICE = "Agora escolha uma opção para encaminharmos seu atendimento para uma pessoa.";
const ASK_CEP = "Para calcular o atendimento na sua região, qual é o seu CEP?";
const SERVICO_OPCOES = [
  { id: "triagem_orcamento", title: "Orçamento" },
  { id: "triagem_instalacao", title: "Instalação" },
  { id: "triagem_manutencao", title: "Manutenção" },
  { id: "triagem_visita", title: "Agendar visita" },
  { id: "triagem_atendente", title: "Falar com atendente" }
];
const MANUTENCAO_OPCOES = [
  { id: "manutencao_preventiva", title: "Preventiva" },
  { id: "manutencao_corretiva", title: "Está com problema" }
];
const ASK_SERVICE_DIRECT = "O que voce deseja? Vou passar voce para um atendente.";

function memoriaInicial(): BoltMemory {
  return {
    equipamento: null,
    btus: null,
    btus_status: "nao_informado",
    possui_aparelho: "nao_informado",
    infraestrutura: null,
    fotos: "nao_informado",
    urgencia: null,
    objecoes: [],
    proximo_passo: null,
    nome_status: "nao_informado",
    cep_status: "nao_informado",
    email_status: "nao_informado"
  };
}

export function dadosBoltIniciais(): BoltData {
  return {
    nome: null,
    cep: null,
    logradouro: null,
    bairro: null,
    cidade: null,
    uf: null,
    numero: null,
    email: null,
    servico: null,
    cidade_bairro: null,
    detalhes: null,
    campos_extra: {},
    memoria: memoriaInicial(),
    status: "BOT_MENU",
    etapa_atual: null,
    tentativas_fallback: 0
  };
}

export function normalizarDadosBolt(value: unknown): BoltData {
  const base = dadosBoltIniciais();
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const dados = value as Partial<BoltData>;
  const memoria = { ...base.memoria, ...(dados.memoria || {}) };
  return {
    ...base,
    ...dados,
    memoria: {
      ...memoria,
      objecoes: Array.isArray(memoria.objecoes) ? memoria.objecoes : []
    },
    campos_extra: dados.campos_extra && typeof dados.campos_extra === "object" ? dados.campos_extra : {},
    tentativas_fallback: typeof dados.tentativas_fallback === "number" ? dados.tentativas_fallback : 0
  };
}

export function estaNoHorarioComercial(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(data);
  const weekday = partes.find((parte) => parte.type === "weekday")?.value;
  const hour = Number(partes.find((parte) => parte.type === "hour")?.value);
  const minute = Number(partes.find((parte) => parte.type === "minute")?.value);
  return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday || "") && hour >= 8 && hour < 18 && minute >= 0;
}

export class BoltRules {
  processar(mensagem: { texto: string; nomeContato?: string }, dadosEntrada: unknown): BoltResult {
    return this.processarTriagemSimples(mensagem, dadosEntrada);
  }
  /* Fluxo legado mantido abaixo para preservar regras históricas.
    const dados = normalizarDadosBolt(dadosEntrada);
    const original = mensagem.texto.trim();
    const texto = this.normalizar(original);
    const base = { ...dados, ultima_interacao: new Date().toISOString() };

    if (dados.status === "HUMAN_ATTENDING" || dados.status === "CLOSED") return { texto: "", assumir: false, dados: base };
    if (/\b(humano|atendente|pessoa|equipe|suporte|operador|falar com alguem)\b/.test(texto)) return this.humano(base);
    if (/(^|\s)(cancelar|voltar|recomecar|inicio)(\s|$)/.test(texto)) return this.menu({ ...dadosBoltIniciais(), ultima_interacao: base.ultima_interacao });

    const fallback = this.prepararFallback(base, texto);
    if (fallback.resposta) return fallback.resposta;
    const atualizado = this.atualizarMemoria(fallback.dados, original, texto, mensagem.nomeContato);
    if (this.ehSaudacao(texto) && !atualizado.detalhes) {
      return this.resposta({ ...atualizado, nome: null, status: "BOT_QUALIFYING", etapa_atual: "aguardando_nome", memoria: { ...atualizado.memoria, nome_status: "nao_informado" } }, `${WELCOME}\n\n${ASK_NAME}`);
    }
    if (atualizado.memoria.nome_status === "nao_informado" && !atualizado.nome && !this.identificarServico(texto) && !this.ehRecusa(texto)) {
      return this.resposta({ ...atualizado, nome: original, memoria: { ...atualizado.memoria, nome_status: "informado" }, etapa_atual: "aguardando_servico" }, `Prazer, ${original}. ${ASK_SERVICE}`, SERVICO_OPCOES);
    }
    if (!atualizado.servico) {
      const tentouExplicar = atualizado.etapa_atual === "aguardando_servico" && atualizado.detalhes && atualizado.detalhes !== atualizado.nome;
      return this.resposta({ ...atualizado, status: "BOT_QUALIFYING", etapa_atual: "aguardando_servico" }, tentouExplicar ? "Entendi. Você quer instalar, desinstalar, trocar o aparelho de lugar ou fazer algum tipo de manutenção?" : ASK_SERVICE, SERVICO_OPCOES);
    }

    const pergunta = this.proximaPergunta(atualizado);
    if (pergunta) return this.resposta({ ...atualizado, status: "BOT_QUALIFYING", etapa_atual: pergunta.etapa }, pergunta.texto, pergunta.opcoes);
    if (atualizado.memoria.cep_status === "nao_informado") return this.resposta({ ...atualizado, status: "BOT_QUALIFYING", etapa_atual: "aguardando_cep" }, ASK_CEP);
    if (atualizado.memoria.email_status === "invalido") return this.resposta({ ...atualizado, status: "BOT_QUALIFYING", etapa_atual: "aguardando_email" }, "Esse e-mail parece inválido. Se preferir, podemos continuar pelo WhatsApp.");
    if (atualizado.memoria.email_status === "nao_informado") return this.resposta({ ...atualizado, status: "BOT_QUALIFYING", etapa_atual: "aguardando_email" }, "Se quiser receber o orçamento por e-mail, qual endereço devo usar? Se preferir, seguimos pelo WhatsApp.");
    return this.handoff(atualizado);
  }

  */
  private processarTriagemSimples(mensagem: { texto: string; nomeContato?: string }, dadosEntrada: unknown): BoltResult {
    const dados = normalizarDadosBolt(dadosEntrada);
    const original = mensagem.texto.trim();
    const texto = this.normalizar(original);
    const base = { ...dados, ultima_interacao: new Date().toISOString() };
    if (dados.status === "HUMAN_ATTENDING" || dados.status === "CLOSED") return { texto: "", assumir: false, dados: base };
    if (!dados.nome && dados.etapa_atual !== "aguardando_nome") return this.resposta({ ...base, status: "BOT_QUALIFYING", etapa_atual: "aguardando_nome" }, `${WELCOME}\n\n${ASK_NAME}`);
    if (!dados.nome) {
      if (!original || this.ehSaudacao(texto)) return this.resposta({ ...base, status: "BOT_QUALIFYING", etapa_atual: "aguardando_nome" }, ASK_NAME);
      return this.resposta({ ...base, nome: original, status: "BOT_QUALIFYING", etapa_atual: "aguardando_servico", memoria: { ...base.memoria, nome_status: "informado" } }, ASK_SERVICE_DIRECT);
    }
    const opcao = SERVICO_OPCOES.find((item) => item.id === texto);
    if (opcao) {
      const necessidade = opcao.id.replace("triagem_", "");
      const servico = necessidade === "instalacao" ? "instalacao" : necessidade === "manutencao" ? "manutencao" : dados.servico;
      return this.handoff({ ...base, servico, detalhes: dados.detalhes || necessidade, campos_extra: { ...base.campos_extra, necessidade }, etapa_atual: null });
    }
    const servico = this.identificarServico(texto);
    return this.handoff({ ...base, servico: servico || dados.servico || "nao_identificado", detalhes: dados.detalhes || original, etapa_atual: null });
  }

  private atualizarMemoria(dados: BoltData, original: string, texto: string, nomeContato?: string): BoltData {
    const servico = this.identificarServico(texto) || dados.servico;
    const recusouEmail = dados.etapa_atual === "aguardando_email" && this.ehRecusa(texto);
    const recusouCep = dados.etapa_atual === "aguardando_cep" && this.ehRecusa(texto);
    const recusouNome = dados.etapa_atual === "aguardando_nome" && this.ehRecusa(texto);
    const numeroBtus = texto.match(/\b(\d{4,5})\s*(?:btu|btus)?\b/)?.[1];
    const btus = numeroBtus ? (numeroBtus.length <= 2 ? `${Number(numeroBtus) * 1000}` : numeroBtus) : dados.memoria.btus;
    const recusouBtus = dados.etapa_atual === "aguardando_btus" && /^(nao|nao sei|nao sei informar|nao lembro|btus_nao)$/.test(texto);
    const sabeBtus = dados.etapa_atual === "aguardando_btus" && /^(sim|s|btus_sim)$/.test(texto);
    const possui: BoltMemory["possui_aparelho"] = /\b(ja\s+tenho|ja\s+possuo|tenho\s+o\s+aparelho)\b/.test(texto) || texto === "aparelho_sim" ? "informado" : dados.memoria.possui_aparelho;
    const naoPossui: BoltMemory["possui_aparelho"] = /\b(ainda\s+nao|nao\s+tenho|vou\s+comprar)\b/.test(texto) || texto === "aparelho_nao" ? "recusado" : possui;
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(original) ? original.toLowerCase() : dados.email;
    const emailInformado = Boolean(email && email !== dados.email);
    const nome = recusouNome ? (nomeContato || null) : dados.etapa_atual === "aguardando_nome" ? original : dados.nome || nomeContato || null;
    const detalhes = ["aguardando_problema", "aguardando_servico"].includes(dados.etapa_atual || "") ? original : dados.detalhes || (this.ehSaudacao(texto) ? null : original) || null;
    const equipamento = dados.memoria.equipamento || (dados.etapa_atual === "aguardando_equipamento" ? original : this.extrairEquipamento(texto));
    const infraestrutura = dados.memoria.infraestrutura || (dados.etapa_atual === "aguardando_infraestrutura" ? (this.ehNao(texto) ? "instalacao_nova" : this.ehSim(texto) ? "existente" : original) : null);
    const camposExtra = { ...dados.campos_extra };
    const logradouro = dados.etapa_atual === "aguardando_logradouro" ? original : dados.logradouro;
    if (dados.etapa_atual === "aguardando_quantidade_aparelhos") camposExtra.quantidade_aparelhos = original;
    if (dados.etapa_atual === "aguardando_tipo_aparelho") camposExtra.tipo_aparelho = original;
    if (dados.etapa_atual === "aguardando_duracao_aluguel") camposExtra.duracao_aluguel = original;
    if (dados.etapa_atual === "aguardando_pmoc_local") camposExtra.pmoc_local = original;
    if (dados.etapa_atual === "aguardando_pmoc_quantidade") camposExtra.pmoc_quantidade = original;
    if (dados.etapa_atual === "aguardando_infraestrutura" && this.ehNao(texto)) {
      camposExtra.instalacao_nova = "sim";
      camposExtra.levantamento_tecnico = "avaliar antes do orçamento";
    }
    return {
      ...dados,
      nome,
      email,
      servico: servico || null,
      logradouro,
      detalhes,
      campos_extra: camposExtra,
      etapa_atual: recusouEmail ? "aguardando_email" : dados.etapa_atual,
      memoria: {
        ...dados.memoria,
        btus,
        btus_status: recusouBtus ? "recusado" : sabeBtus ? "informado" : btus !== dados.memoria.btus ? "informado" : dados.memoria.btus_status,
        possui_aparelho: naoPossui,
        nome_status: nome ? "informado" : recusouNome ? "recusado" : dados.memoria.nome_status,
        cep_status: recusouCep ? "recusado" : dados.memoria.cep_status,
        email_status: recusouEmail || dados.memoria.email_status === "recusado" ? "recusado" : emailInformado ? "informado" : dados.etapa_atual === "aguardando_email" ? "invalido" : dados.memoria.email_status,
        equipamento,
        infraestrutura,
        urgencia: dados.memoria.urgencia || (this.ehProblema(texto) ? "avaliar_com_urgencia" : null),
        proximo_passo: null
      },
      tentativas_fallback: 0
    };
  }

  private proximaPergunta(dados: BoltData): { etapa: string; texto: string; opcoes?: BoltResult["opcoes"] } | null {
    switch (dados.servico) {
      case "instalacao":
        if (dados.memoria.possui_aparelho === "nao_informado") return { etapa: "aguardando_aparelho", texto: "Você já tem o aparelho?", opcoes: [{ id: "aparelho_sim", title: "Sim" }, { id: "aparelho_nao", title: "Não" }] };
        if (dados.memoria.possui_aparelho === "recusado") break;
        if (!dados.memoria.btus && dados.memoria.btus_status === "nao_informado") return { etapa: "aguardando_btus", texto: "Você sabe quantos BTUs ele possui?", opcoes: [{ id: "btus_sim", title: "Sim" }, { id: "btus_nao", title: "Não" }] };
        if (dados.memoria.btus_status === "informado" && !dados.memoria.btus) return { etapa: "aguardando_btus_valor", texto: "Quantos BTUs?" };
        if (!dados.memoria.infraestrutura) return { etapa: "aguardando_infraestrutura", texto: "No local já existe tubulação para ar-condicionado?", opcoes: [{ id: "tubulacao_sim", title: "Sim" }, { id: "tubulacao_nao", title: "Não" }] };
        break;
      case "manutencao_corretiva":
        if (dados.etapa_atual === "aguardando_tipo_manutencao" || !dados.detalhes || dados.detalhes === dados.nome) return { etapa: "aguardando_problema", texto: "O que está acontecendo com o equipamento?" };
        break;
      case "manutencao":
        return { etapa: "aguardando_tipo_manutencao", texto: "É uma manutenção preventiva ou o aparelho está com algum problema?", opcoes: MANUTENCAO_OPCOES };
      case "aluguel":
        if (!dados.memoria.equipamento) return { etapa: "aguardando_equipamento", texto: "Qual equipamento você precisa alugar?" };
        if (!dados.campos_extra.duracao_aluguel) return { etapa: "aguardando_duracao_aluguel", texto: "Por quanto tempo você pretende utilizar o equipamento?" };
        break;
      case "pmoc":
        if (!dados.campos_extra.pmoc_local) return { etapa: "aguardando_pmoc_local", texto: "O PMOC será para uma residência ou empresa?" };
        if (!dados.campos_extra.pmoc_quantidade) return { etapa: "aguardando_pmoc_quantidade", texto: "Quantos aparelhos precisam ser incluídos no PMOC?" };
        break;
      case "limpeza_filtro":
        if (!dados.campos_extra.quantidade_aparelhos) return { etapa: "aguardando_quantidade_aparelhos", texto: "Quantos aparelhos precisam de limpeza?" };
        if (!dados.campos_extra.tipo_aparelho) return { etapa: "aguardando_tipo_aparelho", texto: "Você poderia me informar qual é o tipo do aparelho?", opcoes: [{ id: "tipo_split", title: "Split" }, { id: "tipo_piso_teto", title: "Piso-teto" }, { id: "tipo_cassete", title: "Cassete" }, { id: "tipo_outro", title: "Outro" }] };
        break;
      case "desinstalacao":
      case "manutencao_preventiva":
      case "limpeza_filtro":
      case "venda_equipamento":
        if (!dados.memoria.equipamento && !dados.detalhes) return { etapa: "aguardando_equipamento", texto: "Pode me contar qual equipamento e qual serviço você precisa?" };
        break;
    }
    return null;
  }

  private identificarServico(texto: string): BoltServiceType | null {
    if (texto === "servico_instalacao") return "instalacao";
    if (texto === "servico_manutencao") return "manutencao";
    if (texto === "servico_limpeza") return "limpeza_filtro";
    if (texto === "servico_aluguel") return "aluguel";
    if (texto === "servico_pmoc") return "pmoc";
    if (texto === "servico_outros") return "nao_identificado";
    if (/^(outro|outros)$/.test(texto)) return "nao_identificado";
    if (texto === "manutencao_preventiva") return "manutencao_preventiva";
    if (texto === "manutencao_corretiva" || texto === "problema") return "manutencao_corretiva";
    if (/\b(trocar|troca|mudar|mudan[çc]a)\b.*\b(aparelho|maquina|máquina|lugar)\b/.test(texto)) return "desinstalacao";
    if (/\b(desinstal|retirar|remover)\w*\b/.test(texto)) return "desinstalacao";
    if (/\b(instal|instala)\w*\b/.test(texto)) return "instalacao";
    if (/\b(pmoc)\b/.test(texto)) return "pmoc";
    if (/\b(aluguel|locacao|locar)\b/.test(texto)) return "aluguel";
    if (/\b(limpeza|limpar)\b.*\b(filtro|ar|aparelho)\b/.test(texto)) return "limpeza_filtro";
    if (/\b(preventiva|revisao|revisão)\b/.test(texto)) return "manutencao_preventiva";
    if (/\b(corretiva|defeito|parou|nao gela|não gela|nao liga|não liga|vazando|quebrou)\b/.test(texto)) return "manutencao_corretiva";
    if (/\b(manutencao|manutenção|manutencoes|manutenções)\b/.test(texto)) return "manutencao";
    if (/\b(comprar|vender|aparelho novo|equipamento novo)\b/.test(texto)) return "venda_equipamento";
    return null;
  }

  private handoff(dados: BoltData): BoltResult {
    const texto = this.emHorarioComercial()
      ? "Perfeito, já registrei as informações. Vou transferir você para nosso especialista continuar o atendimento."
      : "Já registrei as informações. Nosso horário é de segunda a sexta, das 08:00 às 18:00, e nossa equipe entrará em contato.";
    return { texto, assumir: true, dados: { ...dados, status: "HUMAN_QUEUE", etapa_atual: null, tentativas_fallback: 0 } };
  }

  private humano(dados: BoltData): BoltResult { return { texto: "Vou transferir você para nossa equipe agora.", assumir: true, dados: { ...dados, status: "HUMAN_QUEUE", etapa_atual: null, tentativas_fallback: 0 } }; }
  private menu(dados: BoltData): BoltResult { return this.resposta({ ...dados, status: "BOT_QUALIFYING", etapa_atual: "aguardando_servico" }, `${WELCOME}\n\n${ASK_SERVICE}`, SERVICO_OPCOES); }
  private resposta(dados: BoltData, texto: string, opcoes?: BoltResult["opcoes"]): BoltResult { return { texto, assumir: false, dados, opcoes }; }
  private ehRecusa(texto: string) { return /\b(nao quero|nao tenho|sem email|sem e-mail|prefiro whatsapp|pelo whatsapp|nao vou informar|prefiro nao|nao precisa|seguir|ok|whatsapp|pode ser)\b/.test(texto); }
  private ehProblema(texto: string) { return /\b(parou|problema|defeito|nao gela|nao liga|quebrou|vazando|ruido)\b/.test(texto); }
  private extrairEquipamento(texto: string) { return /\b(split|cassete|piso teto|janela|portatil|evaporadora|condensadora)\b/.exec(texto)?.[1] || null; }
  private normalizar(texto: string) { return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  private ehSaudacao(texto: string) { return /^(?:(?:oi|ola)(?:[\s,!.]+(?:bom dia|boa tarde|boa noite))?|bom dia|boa tarde|boa noite)[\s,!.]*$/.test(texto); }
  private ehSim(texto: string) { return /^(sim|s|yes|aparelho_sim|btus_sim|tubulacao_sim|cep_confirmar|pmoc_empresa)$/.test(texto); }
  private ehNao(texto: string) { return /^(nao|n|no|aparelho_nao|btus_nao|tubulacao_nao|cep_corrigir|pmoc_residencia)$/.test(texto); }
  private prepararFallback(dados: BoltData, texto: string): { resposta?: BoltResult; dados: BoltData } {
    const etapa = dados.etapa_atual;
    if (!this.etapaIncompreendida(etapa, texto)) return { dados: { ...dados, tentativas_fallback: 0 } };
    if (dados.tentativas_fallback < 1) return { resposta: this.resposta({ ...dados, tentativas_fallback: 1 }, this.perguntaFallback(etapa), this.opcoesFallback(etapa)), dados };
    const avancado = { ...dados, tentativas_fallback: 0 };
    if (etapa === "aguardando_cep") {
      return {
        resposta: this.resposta({ ...avancado, etapa_atual: "aguardando_logradouro", memoria: { ...avancado.memoria, cep_status: "recusado" } }, "Não consegui localizar esse CEP. Qual é o nome da rua?"),
        dados
      };
    }
    if (etapa === "aguardando_servico") avancado.servico = "nao_identificado";
    if (etapa === "aguardando_aparelho") avancado.memoria = { ...avancado.memoria, possui_aparelho: "recusado" };
    if (etapa === "aguardando_btus" || etapa === "aguardando_btus_valor") avancado.memoria = { ...avancado.memoria, btus_status: "recusado" };
    if (etapa === "aguardando_infraestrutura") avancado.memoria = { ...avancado.memoria, infraestrutura: "nao informado" };
    if (etapa === "aguardando_tipo_manutencao") avancado.servico = "manutencao_corretiva";
    if (etapa === "aguardando_email") avancado.memoria = { ...avancado.memoria, email_status: "recusado" };
    return { dados: avancado };
  }
  private etapaIncompreendida(etapa: string | null, texto: string) {
    if (!texto) return true;
    if (etapa === "aguardando_servico") return !this.identificarServico(texto);
    if (etapa === "aguardando_aparelho" || etapa === "aguardando_infraestrutura" || etapa === "aguardando_btus") return !this.ehSim(texto) && !this.ehNao(texto);
    if (etapa === "aguardando_btus_valor" || etapa === "aguardando_quantidade_aparelhos" || etapa === "aguardando_pmoc_quantidade") return !/\d+/.test(texto);
    if (etapa === "aguardando_tipo_manutencao") return !["manutencao_preventiva", "manutencao_corretiva", "preventiva", "corretiva", "problema"].includes(texto);
    if (etapa === "aguardando_tipo_aparelho") return !/^(split|piso teto|piso-teto|cassete|outro|tipo_split|tipo_piso_teto|tipo_cassete|tipo_outro)$/.test(texto);
    if (etapa === "aguardando_email") return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto) && !this.ehRecusa(texto);
    if (etapa === "aguardando_cep") return !/^\d{8}$/.test(texto.replace(/\D/g, ""));
    return false;
  }
  private perguntaFallback(etapa: string | null) {
    if (etapa === "aguardando_servico") return ASK_SERVICE;
    if (etapa === "aguardando_aparelho") return "Você já tem o aparelho?";
    if (etapa === "aguardando_btus") return "Você sabe quantos BTUs ele possui?";
    if (etapa === "aguardando_btus_valor") return "Quantos BTUs?";
    if (etapa === "aguardando_infraestrutura") return "No local já existe tubulação para ar-condicionado?";
    if (etapa === "aguardando_tipo_manutencao") return "A manutenção é preventiva ou o aparelho está com algum problema?";
    if (etapa === "aguardando_tipo_aparelho") return "Você poderia me informar qual é o tipo do aparelho?";
    if (etapa === "aguardando_quantidade_aparelhos") return "Quantos aparelhos precisam de limpeza?";
    if (etapa === "aguardando_pmoc_quantidade") return "Quantos aparelhos precisam ser incluídos no PMOC?";
    if (etapa === "aguardando_email") return "Se quiser receber o orçamento por e-mail, qual endereço devo usar?";
    return "Pode me informar essa informação, por favor?";
  }
  private opcoesFallback(etapa: string | null): BoltResult["opcoes"] {
    if (etapa === "aguardando_servico") return SERVICO_OPCOES;
    if (etapa === "aguardando_aparelho") return [{ id: "aparelho_sim", title: "Sim" }, { id: "aparelho_nao", title: "Não" }];
    if (etapa === "aguardando_btus") return [{ id: "btus_sim", title: "Sim" }, { id: "btus_nao", title: "Não" }];
    if (etapa === "aguardando_infraestrutura") return [{ id: "tubulacao_sim", title: "Sim" }, { id: "tubulacao_nao", title: "Não" }];
    if (etapa === "aguardando_tipo_manutencao") return MANUTENCAO_OPCOES;
    if (etapa === "aguardando_tipo_aparelho") return [{ id: "tipo_split", title: "Split" }, { id: "tipo_piso_teto", title: "Piso-teto" }, { id: "tipo_cassete", title: "Cassete" }, { id: "tipo_outro", title: "Outro" }];
    return undefined;
  }
  private emHorarioComercial() { return estaNoHorarioComercial(); }
}
