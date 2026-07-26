import { BoltData, BoltResult, BoltServiceType } from "./bolt.types";

const WELCOME = "Olá! Eu sou o Move, da AIRMOVEBR. Como posso te chamar?";
const ASK_CEP = "Para preparar um orçamento, preciso de alguns dados. Qual é o seu CEP?";

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
    status: "BOT_MENU",
    etapa_atual: null,
    tentativas_fallback: 0
  };
}

export function normalizarDadosBolt(value: unknown): BoltData {
  const base = dadosBoltIniciais();
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const dados = value as Partial<BoltData>;
  return {
    ...base,
    ...dados,
    campos_extra: dados.campos_extra && typeof dados.campos_extra === "object" ? dados.campos_extra : {},
    tentativas_fallback: typeof dados.tentativas_fallback === "number" ? dados.tentativas_fallback : 0
  };
}

export function estaNoHorarioComercial(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(data);
  const weekday = partes.find((parte) => parte.type === "weekday")?.value;
  const hour = Number(partes.find((parte) => parte.type === "hour")?.value);
  const minute = Number(partes.find((parte) => parte.type === "minute")?.value);
  const diaUtil = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday || "");
  return diaUtil && hour >= 8 && hour < 18 && minute >= 0;
}

export class BoltRules {
  processar(mensagem: { texto: string; nomeContato?: string }, dadosEntrada: unknown): BoltResult {
    const dados = normalizarDadosBolt(dadosEntrada);
    const original = mensagem.texto.trim();
    const texto = this.normalizar(original);
    const base = { ...dados, ultima_interacao: new Date().toISOString() };

    if (dados.status === "HUMAN_ATTENDING" || dados.status === "CLOSED") return { texto: "", assumir: false, dados: base };
    if (/\b(humano|atendente|pessoa|equipe|suporte|operador|falar com alguem)\b/.test(texto)) return this.humano(base);
    if (/(^|\s)(menu|cancelar|voltar|recomecar|inicio|ajuda)(\s|$)/.test(texto) || this.ehSaudacao(texto)) return this.menu({ ...dadosBoltIniciais(), ultima_interacao: base.ultima_interacao });
    if (texto === "corrigir" && dados.status === "BOT_QUALIFYING") return this.iniciarColeta({ ...base, nome: null, cep: null, numero: null, email: null, logradouro: null, bairro: null, cidade: null, uf: null, cidade_bairro: null, detalhes: null }, "aguardando_nome");
    if (dados.status === "BOT_QUALIFYING") return this.coletar(base, original, texto);
    return this.fallback(base);
  }

  private coletar(dados: BoltData, original: string, texto: string): BoltResult {
    if (dados.etapa_atual === "aguardando_nome" || !dados.nome) {
      const nome = original.trim() || "Cliente";
      return this.resposta({ ...dados, nome, etapa_atual: "aguardando_descricao", tentativas_fallback: 0 }, `Prazer, ${nome}. Como podemos ajudar? Pode me contar com suas palavras.`);
    }
    if (dados.etapa_atual === "aguardando_descricao" || !dados.detalhes) {
      const servico = this.identificarServico(texto);
      const tom = this.ehProblema(texto) && servico === "manutencao"
        ? "Puxa, que pena. Mas estamos aqui para ajudar."
        : "Entendi. Estamos aqui para ajudar.";
      return this.resposta({ ...dados, servico, detalhes: original.trim(), etapa_atual: "aguardando_cep", tentativas_fallback: 0 }, `${tom}\n\n${ASK_CEP}`);
    }
    if (dados.etapa_atual === "aguardando_cep" || !dados.cep) return this.resposta({ ...dados, etapa_atual: "aguardando_cep" }, "Qual é o seu CEP?");
    if (dados.etapa_atual === "aguardando_confirmacao_endereco") {
      if (/^(sim|s|confirmar|correto|está correto|esta correto|cep_confirmar)$/.test(texto)) return this.resposta({ ...dados, etapa_atual: "aguardando_numero", tentativas_fallback: 0 }, "Qual é o número do endereço?");
      if (/^(nao|não|n|cep_corrigir|corrigir)$/.test(texto)) return this.resposta({ ...dados, cep: null, logradouro: null, bairro: null, cidade: null, uf: null, cidade_bairro: null, etapa_atual: "aguardando_cep" }, "Sem problema. Qual é o seu CEP?");
      return this.resposta(dados, "O endereço está correto? Responda sim ou não.");
    }
    if (dados.etapa_atual === "aguardando_numero") {
      const numero = original.trim();
      if (!numero) return this.resposta(dados, "Qual é o número do endereço?");
      return this.resposta({ ...dados, numero, etapa_atual: "aguardando_email", tentativas_fallback: 0 }, "Qual é o seu e-mail?");
    }
    if (dados.etapa_atual === "aguardando_email") {
      const email = original.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.resposta(dados, "Por favor, informe um e-mail válido.");
      return this.handoff({ ...dados, email, etapa_atual: null });
    }
    return this.handoff(dados);
  }

  private identificarServico(texto: string): BoltServiceType {
    if (/\b(instala(?:cao|ção)|instalar|instalação)\b/.test(texto)) return "instalacao";
    if (/\b(pmoc)\b/.test(texto)) return "pmoc";
    if (/\b(locacao|locação|aluguel)\b/.test(texto)) return "locacao";
    return "manutencao";
  }

  private iniciarColeta(dados: BoltData, etapa: string): BoltResult {
    return this.resposta({ ...dados, status: "BOT_QUALIFYING", etapa_atual: etapa, tentativas_fallback: 0 }, etapa === "aguardando_nome" ? WELCOME : ASK_CEP);
  }

  private menu(dados: BoltData): BoltResult {
    return this.iniciarColeta({ ...dados, status: "BOT_QUALIFYING" }, "aguardando_nome");
  }

  private fallback(dados: BoltData): BoltResult {
    return this.resposta({ ...dados, status: "BOT_QUALIFYING", etapa_atual: "aguardando_nome", tentativas_fallback: 0 }, WELCOME);
  }

  private handoff(dados: BoltData): BoltResult {
    const texto = this.emHorarioComercial()
      ? "Obrigado, já registrei seus dados. Estamos transferindo você para nosso especialista; ele vai continuar ajudando você e passar tudo que precisa."
      : "Nosso horário de atendimento é de segunda a sexta, das 08:00 às 18:00. Mas já registrei tudo por aqui. Nossos especialistas entrarão em contato o mais rápido possível.";
    return { texto, assumir: true, dados: { ...dados, status: "HUMAN_QUEUE", etapa_atual: null, tentativas_fallback: 0 } };
  }

  private humano(dados: BoltData): BoltResult {
    return { texto: "Vou te transferir para nossa equipe agora.", assumir: true, dados: { ...dados, status: "HUMAN_QUEUE", etapa_atual: null, tentativas_fallback: 0 } };
  }

  private resposta(dados: BoltData, texto: string): BoltResult { return { texto, assumir: false, dados }; }

  private ehProblema(texto: string) {
    return /\b(parou|problema|defeito|nao gela|não gela|nao liga|não liga|quebrou|parado|vazando|ruido|ruído)\b/.test(texto);
  }

  private normalizar(texto: string) { return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  private ehSaudacao(texto: string) { return /^(oi|ola|bom dia|boa tarde|boa noite)$/.test(texto); }

  private emHorarioComercial() {
    return estaNoHorarioComercial();
  }
}
