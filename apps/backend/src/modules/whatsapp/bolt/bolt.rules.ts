import { BoltData, BoltMemory, BoltResult, BoltServiceType } from "./bolt.types";

const WELCOME = "Olá! Eu sou o Move, da AIRMOVEBR. Como posso te ajudar?";
const ASK_NAME = "Como posso te chamar?";
const ASK_SERVICE = "O que você precisa: instalação, manutenção, limpeza, aluguel ou PMOC?";
const ASK_CEP = "Para calcular o atendimento na sua região, qual é o seu CEP?";

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
    const dados = normalizarDadosBolt(dadosEntrada);
    const original = mensagem.texto.trim();
    const texto = this.normalizar(original);
    const base = { ...dados, ultima_interacao: new Date().toISOString() };

    if (dados.status === "HUMAN_ATTENDING" || dados.status === "CLOSED") return { texto: "", assumir: false, dados: base };
    if (/\b(humano|atendente|pessoa|equipe|suporte|operador|falar com alguem)\b/.test(texto)) return this.humano(base);
    if (/(^|\s)(cancelar|voltar|recomecar|inicio)(\s|$)/.test(texto)) return this.menu({ ...dadosBoltIniciais(), ultima_interacao: base.ultima_interacao });

    const atualizado = this.atualizarMemoria(base, original, texto, mensagem.nomeContato);
    if (this.ehSaudacao(texto) && !atualizado.detalhes) {
      return this.resposta({ ...atualizado, nome: null, status: "BOT_QUALIFYING", etapa_atual: "aguardando_nome", memoria: { ...atualizado.memoria, nome_status: "nao_informado" } }, `${WELCOME}\n\n${ASK_NAME}`);
    }
    if (atualizado.memoria.nome_status === "nao_informado" && !atualizado.nome && !this.identificarServico(texto) && !this.ehRecusa(texto)) {
      return this.resposta({ ...atualizado, nome: original, memoria: { ...atualizado.memoria, nome_status: "informado" }, etapa_atual: "aguardando_servico" }, `Prazer, ${original}. ${ASK_SERVICE}`);
    }
    if (!atualizado.servico) {
      const tentouExplicar = atualizado.etapa_atual === "aguardando_servico" && atualizado.detalhes && atualizado.detalhes !== atualizado.nome;
      return this.resposta({ ...atualizado, status: "BOT_QUALIFYING", etapa_atual: "aguardando_servico" }, tentouExplicar ? "Entendi. Você quer instalar, desinstalar, trocar o aparelho de lugar ou fazer algum tipo de manutenção?" : ASK_SERVICE);
    }

    const pergunta = this.proximaPergunta(atualizado);
    if (pergunta) return this.resposta({ ...atualizado, status: "BOT_QUALIFYING", etapa_atual: pergunta.etapa }, pergunta.texto);
    if (atualizado.memoria.cep_status === "nao_informado") return this.resposta({ ...atualizado, status: "BOT_QUALIFYING", etapa_atual: "aguardando_cep" }, ASK_CEP);
    if (atualizado.memoria.email_status === "invalido") return this.resposta({ ...atualizado, status: "BOT_QUALIFYING", etapa_atual: "aguardando_email" }, "Esse e-mail parece inválido. Se preferir, podemos continuar pelo WhatsApp.");
    if (atualizado.memoria.email_status === "nao_informado") return this.resposta({ ...atualizado, status: "BOT_QUALIFYING", etapa_atual: "aguardando_email" }, "Se quiser receber o orçamento por e-mail, qual endereço devo usar? Se preferir, seguimos pelo WhatsApp.");
    return this.handoff(atualizado);
  }

  private atualizarMemoria(dados: BoltData, original: string, texto: string, nomeContato?: string): BoltData {
    const servico = this.identificarServico(texto) || dados.servico;
    const recusouEmail = dados.etapa_atual === "aguardando_email" && this.ehRecusa(texto);
    const recusouCep = dados.etapa_atual === "aguardando_cep" && this.ehRecusa(texto);
    const recusouNome = dados.etapa_atual === "aguardando_nome" && this.ehRecusa(texto);
    const numeroBtus = texto.match(/\b(\d{4,5})\s*(?:btu|btus)?\b/)?.[1];
    const btus = numeroBtus ? (numeroBtus.length <= 2 ? `${Number(numeroBtus) * 1000}` : numeroBtus) : dados.memoria.btus;
    const recusouBtus = dados.etapa_atual === "aguardando_btus" && /^(nao|nao sei|nao sei informar|nao lembro)$/.test(texto);
    const possui: BoltMemory["possui_aparelho"] = /\b(ja\s+tenho|ja\s+possuo|tenho\s+o\s+aparelho)\b/.test(texto) ? "informado" : dados.memoria.possui_aparelho;
    const naoPossui: BoltMemory["possui_aparelho"] = /\b(ainda\s+nao|nao\s+tenho|vou\s+comprar)\b/.test(texto) ? "informado" : possui;
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(original) ? original.toLowerCase() : dados.email;
    const emailInformado = Boolean(email && email !== dados.email);
    const nome = recusouNome ? (nomeContato || null) : dados.etapa_atual === "aguardando_nome" ? original : dados.nome || nomeContato || null;
    const detalhes = ["aguardando_problema", "aguardando_servico"].includes(dados.etapa_atual || "") ? original : dados.detalhes || (this.ehSaudacao(texto) ? null : original) || null;
    const equipamento = dados.memoria.equipamento || (dados.etapa_atual === "aguardando_equipamento" ? original : this.extrairEquipamento(texto));
    const infraestrutura = dados.memoria.infraestrutura || (dados.etapa_atual === "aguardando_infraestrutura" ? original : null);
    return {
      ...dados,
      nome,
      email,
      servico: servico || null,
      detalhes,
      etapa_atual: recusouEmail ? "aguardando_email" : dados.etapa_atual,
      memoria: {
        ...dados.memoria,
        btus,
        btus_status: recusouBtus ? "recusado" : btus !== dados.memoria.btus ? "informado" : dados.memoria.btus_status,
        possui_aparelho: naoPossui,
        nome_status: nome ? "informado" : recusouNome ? "recusado" : dados.memoria.nome_status,
        cep_status: recusouCep ? "recusado" : dados.memoria.cep_status,
        email_status: recusouEmail ? "recusado" : emailInformado ? "informado" : dados.etapa_atual === "aguardando_email" ? "invalido" : dados.memoria.email_status,
        equipamento,
        infraestrutura,
        urgencia: dados.memoria.urgencia || (this.ehProblema(texto) ? "avaliar_com_urgencia" : null),
        proximo_passo: null
      }
    };
  }

  private proximaPergunta(dados: BoltData): { etapa: string; texto: string } | null {
    switch (dados.servico) {
      case "instalacao":
        if (dados.memoria.possui_aparelho === "nao_informado") return { etapa: "aguardando_aparelho", texto: "Você já tem o aparelho ou ainda está escolhendo?" };
        if (!dados.memoria.btus && dados.memoria.btus_status !== "recusado") return { etapa: "aguardando_btus", texto: "Sabe quantos BTUs ele possui? Se preferir, pode mandar uma foto da etiqueta." };
        if (!dados.memoria.infraestrutura) return { etapa: "aguardando_infraestrutura", texto: "No local já existe tubulação para ar-condicionado ou será uma instalação nova?" };
        break;
      case "manutencao_corretiva":
        if (!dados.detalhes || dados.detalhes === dados.nome) return { etapa: "aguardando_problema", texto: "O que está acontecendo com o equipamento?" };
        break;
      case "manutencao":
        return { etapa: "aguardando_tipo_manutencao", texto: "É uma manutenção preventiva ou o aparelho está com algum problema?" };
      case "aluguel":
        if (!dados.memoria.equipamento) return { etapa: "aguardando_equipamento", texto: "Qual equipamento você precisa alugar e por quanto tempo?" };
        break;
      case "pmoc":
        if (!dados.memoria.equipamento) return { etapa: "aguardando_equipamento", texto: "É para uma empresa? Quantos aparelhos precisam entrar no PMOC?" };
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
  private menu(dados: BoltData): BoltResult { return this.resposta({ ...dados, status: "BOT_QUALIFYING", etapa_atual: "aguardando_servico" }, `${WELCOME}\n\n${ASK_SERVICE}`); }
  private resposta(dados: BoltData, texto: string): BoltResult { return { texto, assumir: false, dados }; }
  private ehRecusa(texto: string) { return /\b(nao quero|nao tenho|sem email|sem e-mail|prefiro whatsapp|pelo whatsapp|nao vou informar|prefiro nao|nao precisa|seguir|ok|whatsapp|pode ser)\b/.test(texto); }
  private ehProblema(texto: string) { return /\b(parou|problema|defeito|nao gela|nao liga|quebrou|vazando|ruido)\b/.test(texto); }
  private extrairEquipamento(texto: string) { return /\b(split|cassete|piso teto|janela|portatil|evaporadora|condensadora)\b/.exec(texto)?.[1] || null; }
  private normalizar(texto: string) { return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  private ehSaudacao(texto: string) { return /^(oi|ola|bom dia|boa tarde|boa noite)$/.test(texto); }
  private emHorarioComercial() { return estaNoHorarioComercial(); }
}
