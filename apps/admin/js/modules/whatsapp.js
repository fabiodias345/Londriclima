export const whatsappModule = { view: "whatsapp", summaryId: "whatsappSummary", viewId: "whatsappView" };

export const whatsappRoot = `
const whatsappNav = document.createElement("button");
whatsappNav.className = "nav-link";
whatsappNav.type = "button";
whatsappNav.dataset.view = "whatsapp";
whatsappNav.textContent = "WhatsApp";
const whatsappOperationGroup = document.querySelector('[aria-label="Menu principal"]');
whatsappOperationGroup?.insertBefore(whatsappNav, whatsappOperationGroup.querySelector(".nav-link"));

const whatsappSummary = document.createElement("section");
whatsappSummary.className = "summary-grid hidden whatsapp-summary";
whatsappSummary.id = "whatsappSummary";
document.querySelector("#dashboard")?.insertBefore(whatsappSummary, document.querySelector("#preChamadosSummary"));

const whatsappView = document.createElement("section");
whatsappView.className = "worklist hidden whatsapp-workspace";
whatsappView.id = "whatsappView";
whatsappView.innerHTML = \`
  <div class="whatsapp-page-header"><span class="kicker">Central de atendimento</span></div>
  <div class="whatsapp-inbox" role="region" aria-label="Central de conversas WhatsApp">
    <aside class="whatsapp-inbox-list">
      <div class="whatsapp-list-head"><div><strong>Caixa de entrada</strong><span class="whatsapp-list-count" id="whatsappListStatus">Carregando...</span></div><button class="whatsapp-icon-button" id="whatsappRefreshButton" type="button" aria-label="Atualizar conversas" title="Atualizar conversas">Atualizar</button></div>
      <label class="whatsapp-search"><span class="sr-only">Pesquisar conversa</span><input id="whatsappSearchInput" type="search" placeholder="Pesquisar nome ou telefone" autocomplete="off" /></label>
      <div class="whatsapp-filters" role="tablist" aria-label="Filtro de conversas"><button class="is-active" type="button" data-whatsapp-filter="atendimento">Em Atendimento</button><button type="button" data-whatsapp-filter="encerradas">Encerradas</button><button type="button" data-whatsapp-filter="todas">Todas</button></div>
      <div class="whatsapp-conversation-list" id="whatsappConversationList"></div>
    </aside>
    <section class="whatsapp-conversation-detail" id="whatsappConversationDetail"><div class="whatsapp-empty-state"><span class="whatsapp-empty-icon">◉</span><strong>Selecione uma conversa</strong><p>As mensagens, o cadastro e o agendamento aparecerão aqui.</p></div></section>
  </div>\`;
document.querySelector("#dashboard")?.append(whatsappView);

let whatsappConversations = [];
let selectedWhatsappId = "";
let selectedWhatsappConversation = null;
let whatsappRefreshTimer = 0;
let whatsappEventAbort = null;
let whatsappLoadingConversations = false;
let lastWhatsappEvent = "";
let whatsappScheduleOptions = { equipes: [], tecnicos: [], agenda: [] };
let whatsappCatalogItems = [];
let whatsappSelectedScheduleDate = "";
let whatsappScheduleDraft = { equipeId: "", tecnicoId: "", data: "", horario: "", proposalText: "", proposalSent: false, context: "os" };
let whatsappScheduleOpen = false;
let whatsappScheduleVisibleMonth = localDate().slice(0, 7);
let whatsappAiDraft = null;
let whatsappAiLoading = false;
let whatsappScheduleMode = "calendar";
let whatsappServiceMode = "";
let whatsappServiceChoiceRequired = false;
let whatsappClientResolution = "";
const whatsappTopbar = document.querySelector(".topbar");

function clearWhatsappSelection(message = "Selecione uma conversa") {
  selectedWhatsappId = "";
  selectedWhatsappConversation = null;
  const detail = document.querySelector("#whatsappConversationDetail");
  if (detail) detail.innerHTML = '<div class="whatsapp-empty-state"><span class="whatsapp-empty-icon" aria-hidden="true">&bull;</span><strong>' + esc(message) + '</strong><p>Selecione uma conversa para ver as mensagens, o cadastro, o orcamento e o agendamento.</p></div>';
}
function setWhatsappFilter(filter) {
  document.querySelectorAll("[data-whatsapp-filter]").forEach((item) => item.classList.toggle("is-active", item.dataset.whatsappFilter === filter));
  clearWhatsappSelection(filter === "atendimento" ? "Nenhuma conversa em atendimento" : "Selecione uma conversa");
  renderWhatsappConversations();
}
function esc(value) { const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML; }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value || "") : date.toLocaleString("pt-BR"); }
function localDate(value = new Date()) { const date = new Date(value); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 10); }
function hideWhatsappView() { whatsappView.classList.add("hidden"); whatsappSummary.classList.add("hidden"); whatsappTopbar?.classList.remove("hidden"); refreshButton?.classList.remove("hidden"); window.clearInterval(whatsappRefreshTimer); whatsappEventAbort?.abort(); }
function showWhatsappView() { document.querySelectorAll("[id$='View'], [id$='Summary']").forEach((e) => e.classList.add("hidden")); document.querySelectorAll(".nav-link").forEach((e) => e.classList.toggle("active", e === whatsappNav)); viewKicker.textContent = "Atendimento digital"; viewTitle.textContent = "WhatsApp"; whatsappTopbar?.classList.add("hidden"); refreshButton?.classList.add("hidden"); whatsappView.classList.remove("hidden"); setWhatsappFilter("atendimento"); window.clearInterval(whatsappRefreshTimer); void loadWhatsappConversations(); whatsappRefreshTimer = window.setInterval(() => void loadWhatsappConversations(), 10000); void connectWhatsappEvents(); }

async function loadWhatsappConversations() {
  const status = document.querySelector("#whatsappListStatus");
  const response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas\`, { headers: authHeaders() });
  if (await handleUnauthorized(response)) return;
  if (!response.ok) { status.textContent = "Não foi possível carregar."; return; }
  const result = await response.json(); whatsappConversations = result.items || [];
  status.textContent = whatsappConversations.length ? \`\${whatsappConversations.length} conversas\` : "Nenhuma conversa";
  renderWhatsappConversations();
  const resumoAberto = whatsappConversations.find((item) => item.id === selectedWhatsappId);
  if (resumoAberto && selectedWhatsappConversation && resumoAberto.ultimaMensagemEm !== selectedWhatsappConversation.ultimaMensagemEm) {
    void loadWhatsappConversation(selectedWhatsappId);
  }
}

function getWhatsappState(item) {
  if (item.status === "encerrada") return { key: "encerradas", className: "is-closed", label: "Encerrada", ageMinutes: 0 };
  const reference = new Date(item.ultimaMensagemEm || item.criadoEm || Date.now());
  const ageMinutes = Number.isNaN(reference.getTime()) ? 0 : Math.max(0, Math.floor((Date.now() - reference.getTime()) / 60000));
  if (item.status === "bot") {
    return ageMinutes >= 15
      ? { key: "atendimento", className: "is-overdue", label: "Bot aguardando há muito tempo", ageMinutes }
      : { key: "atendimento", className: "is-bot", label: "Atendimento pelo bot", ageMinutes };
  }
  if (item.atribuidoUsuarioId) {
    return ageMinutes >= 15
      ? { key: "atendimento", className: "is-overdue", label: "Atendente demorando", ageMinutes }
      : { key: "atendimento", className: "is-attending", label: "Atendimento humano", ageMinutes };
  }
  return ageMinutes >= 15
    ? { key: "atendimento", className: "is-overdue", label: "Aguardando atendente há muito tempo", ageMinutes }
    : { key: "atendimento", className: "is-waiting", label: "Aguardando atendente", ageMinutes };
}
function formatWaiting(ageMinutes) { return ageMinutes < 1 ? "Agora" : ageMinutes < 60 ? \`\${ageMinutes} min\` : \`\${Math.floor(ageMinutes / 60)} h \${ageMinutes % 60} min\`; }
function renderWhatsappConversations() {
  const list = document.querySelector("#whatsappConversationList"); const query = String(document.querySelector("#whatsappSearchInput")?.value || "").toLowerCase().trim(); const filter = document.querySelector("[data-whatsapp-filter].is-active")?.dataset.whatsappFilter || "atendimento";
  const prioridade = { atendimento: 0, encerradas: 1 }; const items = whatsappConversations.filter((item) => { const state = getWhatsappState(item); const text = \`\${item.nomeContato || ""} \${item.telefone || ""}\`.toLowerCase(); return (!query || text.includes(query)) && (filter === "todas" || filter === state.key); }).sort((a, b) => prioridade[getWhatsappState(a).key] - prioridade[getWhatsappState(b).key] || getWhatsappState(b).ageMinutes - getWhatsappState(a).ageMinutes);
  list.innerHTML = items.length ? items.map((item) => { const state = getWhatsappState(item); const last = item.mensagens?.[0]?.texto || "Sem mensagens"; return \`<button class="whatsapp-conversation-card \${state.className} \${selectedWhatsappId === item.id ? "is-selected" : ""}" type="button" data-whatsapp-id="\${esc(item.id)}"><span class="whatsapp-status-dot" aria-hidden="true"></span><span class="whatsapp-avatar">\${esc((item.nomeContato || item.telefone || "?").slice(0, 1).toUpperCase())}</span><span class="whatsapp-conversation-copy"><strong>\${esc(item.nomeContato || item.telefone)}</strong><small>\${esc(last.slice(0, 78))}</small><em>\${state.label}</em></span><span class="whatsapp-conversation-time">\${state.ageMinutes ? formatWaiting(state.ageMinutes) : ""}</span></button>\`; }).join("") : '<div class="whatsapp-list-empty">Nenhuma conversa encontrada.</div>';
  if (!items.some((item) => item.id === selectedWhatsappId)) clearWhatsappSelection(filter === "atendimento" && !items.length ? "Nenhuma conversa em atendimento" : "Selecione uma conversa");
}

async function loadWhatsappScheduleOptions() {
  if (whatsappScheduleOptions.equipes.length || whatsappScheduleOptions.tecnicos.length) {
    const response = await fetch(\`\${apiBaseUrl}/admin/agenda\`, { headers: authHeaders() });
    whatsappScheduleOptions.agenda = response.ok ? (await response.json()).items || [] : [];
    return;
  }
  const [equipes, tecnicos, agenda] = await Promise.all(["equipes", "tecnicos", "agenda"].map((route) => fetch(\`\${apiBaseUrl}/admin/\${route}\`, { headers: authHeaders() }).then((response) => response.ok ? response.json() : { items: [] }).catch(() => ({ items: [] }))));
  whatsappScheduleOptions = { equipes: equipes.items || [], tecnicos: tecnicos.items || [], agenda: agenda.items || [] };
}function scheduleItemsForDay(date) { return whatsappScheduleOptions.agenda.filter((item) => item.agendada_para && localDate(item.agendada_para) === date && ["aberta", "em_deslocamento", "em_atendimento"].includes(item.status)); }
function scheduleOptions(tag, items, selected) { return \`<option value="">Não definido</option>\${items.map((item) => \`<option value="\${esc(item.id)}" \${item.id === selected ? "selected" : ""}>\${esc(item.nome)}</option>\`).join("")}\`; }
function scheduleHours(date, equipeId, tecnicoId, currentId, selected) { const busy = scheduleItemsForDay(date).filter((item) => item.id !== currentId && ((equipeId && item.equipe?.id === equipeId) || (tecnicoId && item.tecnico?.id === tecnicoId))).map((item) => new Date(item.agendada_para).getHours()); return Array.from({ length: 12 }, (_, index) => index + 7).map((hour) => \`<option value="\${String(hour).padStart(2, "0")}:00" \${busy.includes(hour) ? "disabled" : ""} \${selected === String(hour).padStart(2, "0") + ":00" ? "selected" : ""}>\${String(hour).padStart(2, "0")}:00\${busy.includes(hour) ? " — ocupado" : ""}</option>\`).join(""); }
function dayAgenda(date) { const items = scheduleItemsForDay(date); return items.length ? \`<span>Agenda: \${items.map((item) => \`\${new Date(item.agendada_para).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · \${esc(item.equipe?.nome || item.tecnico?.nome || item.titulo)}\`).join(" | ")}</span>\` : "<span>Agenda livre neste dia.</span>"; }
function whatsappClientForm(conversa) { const dados = conversa.atendimento?.dados || {}; return \`<form data-whatsapp-form="cliente" class="whatsapp-workbench-form"><div class="whatsapp-workbench-title"><span>Pré-cadastro</span><strong>Confira os dados localizados pelo CEP e crie o cliente para montar o orçamento.</strong></div><label>Nome<input name="nome" value="\${esc(dados.nome || conversa.nomeContato || "")}" required></label><label>Telefone<input name="telefone" value="\${esc(conversa.telefone || "")}"></label><label>Cidade<input name="cidade" value="\${esc(dados.cidade || dados.cidade_bairro || "")}" required></label><label>UF<input name="uf" value="\${esc(dados.uf || "PR")}" maxlength="2" required></label><label class="whatsapp-field-wide">Endereço<input name="logradouro" value="\${esc(dados.logradouro || "")}" placeholder="Rua, avenida ou rodovia"></label><label>Número<input name="numero" placeholder="Nº"></label><label>Bairro<input name="bairro" value="\${esc(dados.bairro || "")}" placeholder="Bairro"></label><label>CPF ou RG<input name="documento" placeholder="CPF ou RG" required></label><label>CEP<input name="cep" value="\${esc(dados.cep || "")}" placeholder="00000-000"></label><button type="submit">Criar cliente</button></form>\`; }function money(value) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0)); }
function validadeOrcamento(dias) { const data = new Date(); data.setDate(data.getDate() + Number(dias || 14)); return localDate(data); }
document.querySelector("#whatsappConversationDetail").addEventListener("submit", (event) => { const form = event.target; if (!(form instanceof HTMLFormElement) || form.dataset.whatsappForm !== "orcamento") return; let field = form.querySelector('[name="valido_ate"]'); if (!(field instanceof HTMLInputElement)) { field = document.createElement("input"); field.type = "hidden"; field.name = "valido_ate"; form.appendChild(field); } field.value = validadeOrcamento(new FormData(form).get("validade_dias")); }, true);
const whatsappClientFormBase = whatsappClientForm;
whatsappClientForm = function (conversa) {
  const dados = conversa.atendimento?.dados || {};
  return whatsappClientFormBase(conversa)
    .replace('<label>Cidade', '<label>E-mail<input name="email" type="email" value="' + esc(dados.email || '') + '" autocomplete="email" placeholder="cliente@exemplo.com"></label><label>Cidade')
    .replace('name="numero" placeholder=', 'name="numero" value="' + esc(dados.numero || '') + '" placeholder=')
    .replace('name="documento" placeholder="CPF ou RG" required', 'name="documento" placeholder="Opcional"');
};
function whatsappExistingClientForm(conversa, cliente) {
  const endereco = cliente.endereco || {};
  return '<form data-whatsapp-form="cliente-existente" data-cliente-id="' + esc(cliente.id) + '" class="whatsapp-workbench-form"><div class="whatsapp-workbench-title"><span>Atualizar cliente</span><strong>Revise os dados antes de usar este cadastro no atendimento.</strong></div><label>Nome<input name="nome" value="' + esc(cliente.nome || "") + '" required></label><label>Telefone<input name="telefone" value="' + esc(cliente.telefone || conversa.telefone || "") + '"></label><label>E-mail<input name="email" type="email" value="' + esc(cliente.email || "") + '"></label><label>Cidade<input name="cidade" value="' + esc(endereco.cidade || "") + '" required></label><label>UF<input name="uf" value="' + esc(endereco.uf || "PR") + '" maxlength="2" required></label><label class="whatsapp-field-wide">Endereço<input name="logradouro" value="' + esc(endereco.logradouro || "") + '"></label><label>Número<input name="numero" value="' + esc(endereco.numero || "") + '"></label><label>Bairro<input name="bairro" value="' + esc(endereco.bairro || "") + '"></label><label>CEP<input name="cep" value="' + esc(endereco.cep || "") + '"></label><button type="submit">Atualizar e usar cliente</button></form>';
}
function whatsappClientResolutionForm(conversa) {
  const candidatos = conversa.clientes_candidatos || [];
  if (whatsappClientResolution === "novo" || !candidatos.length) return whatsappClientForm(conversa);
  const editando = candidatos.find((cliente) => cliente.id === whatsappClientResolution.replace("editar:", ""));
  if (editando && whatsappClientResolution.startsWith("editar:")) return whatsappExistingClientForm(conversa, editando);
  return '<section class="whatsapp-service-choice"><div class="whatsapp-workbench-title"><span>Cliente já cadastrado</span><strong>Confira o cadastro antes de continuar o atendimento.</strong></div><div class="whatsapp-service-choice-actions">' + candidatos.map((cliente) => '<div><strong>' + esc(cliente.nome) + '</strong><small>' + esc([cliente.telefone, cliente.email, cliente.endereco?.cidade].filter(Boolean).join(" · ") || "Sem contato complementar") + '</small><button type="button" data-whatsapp-action="usar-cliente" data-cliente-id="' + esc(cliente.id) + '">Usar este cliente</button><button type="button" class="secondary-button" data-whatsapp-action="editar-cliente" data-cliente-id="' + esc(cliente.id) + '">Atualizar dados</button></div>').join("") + '<button type="button" class="secondary-button" data-whatsapp-action="novo-cliente">Não é este cliente</button></div></section>';
}
async function loadWhatsappCatalog() { if (whatsappCatalogItems.length) return; const response = await fetch(\`\${apiBaseUrl}/admin/comercial/catalogo\`, { headers: authHeaders() }); if (response.ok) whatsappCatalogItems = (await response.json()).items || []; }
function quoteItemRow() { const options = whatsappCatalogItems.map((item) => \`<option value="\${esc(item.id)}">\${esc(item.grupo)} · \${esc(item.nome)} — \${money(item.valor)}</option>\`).join(""); return \`<div class="whatsapp-quote-line" data-quote-line><select name="catalogo_item" required><option value="">Selecione um item</option>\${options}</select><input name="quantidade" type="number" min="0.001" step="0.001" value="1" required><output>\${money(0)}</output><button type="button" class="secondary-button" data-quote-action="remover" aria-label="Remover item">×</button></div>\`; }
function quoteForm(conversa) {
  const quote = conversa.orcamentos?.[0];
  if (quote) {
    if (quote.status === "aprovado") return '<div class="whatsapp-quote-summary whatsapp-quote-approved"><div><span>Orçamento aprovado</span><strong>' + esc(quote.titulo) + '</strong></div><div><b>' + money(quote.total) + '</b><button type="button" class="secondary-button" data-whatsapp-action="baixar-orcamento-pdf" data-orcamento-id="' + esc(quote.id) + '">Baixar / visualizar PDF</button></div></div>';
    const items = quote.itens.map((item) => '<li>' + esc(item.descricao) + ' <strong>' + money(item.valorTotal) + '</strong></li>').join("");
    const assinaturaObrigatoria = Number(quote.total) > 2000;
    const action = quote.status === "rascunho"
      ? assinaturaObrigatoria
        ? '<button type="button" data-whatsapp-action="enviar-orcamento-assinatura" data-orcamento-id="' + esc(quote.id) + '">Enviar para assinatura por e-mail</button><p>O cliente receberá um e-mail para assinar digitalmente.</p>'
        : '<button type="button" data-whatsapp-action="enviar-orcamento-whatsapp" data-orcamento-id="' + esc(quote.id) + '">Enviar por WhatsApp</button><button type="button" data-whatsapp-action="enviar-orcamento-email" data-orcamento-id="' + esc(quote.id) + '" data-orcamento-email="' + esc(quote.cliente?.email || conversa.cliente?.email || "") + '">Enviar por e-mail</button>'
      : quote.status === "enviado" ? '<span>Aguardando autorização do cliente</span>' : "";
    return '<div class="whatsapp-quote-summary"><div><span>Orçamento ' + esc(quote.status) + '</span><strong>' + esc(quote.titulo) + '</strong><ul>' + items + '</ul></div><div><b>' + money(quote.total) + '</b><button type="button" class="secondary-button" data-whatsapp-action="baixar-orcamento-pdf" data-orcamento-id="' + esc(quote.id) + '">Baixar / visualizar PDF</button>' + action + '</div></div>';
  }
  if (!whatsappCatalogItems.length) return '<div class="whatsapp-quote-summary"><div><span>Orçamento</span><strong>Cadastre itens no catálogo antes de montar a proposta.</strong></div></div>';
  const dados = conversa.atendimento?.dados || {};
  return '<form data-whatsapp-form="orcamento" class="whatsapp-quote-form"><div class="whatsapp-workbench-title"><span>Orçamento</span><strong>Monte a proposta; a O.S. será aberta somente após o aceite.</strong></div><label class="whatsapp-quote-title">Título<input name="titulo" value="Orçamento - ' + esc(dados.servico || "atendimento") + '" required></label><label>Validade<select name="validade_dias"><option value="14" selected>14 dias</option><option value="30">30 dias</option><option value="50">50 dias</option></select></label><div class="whatsapp-quote-lines" data-quote-lines>' + quoteItemRow() + '</div><button type="button" class="secondary-button" data-quote-action="adicionar">+ Adicionar item</button><button type="submit">Salvar orçamento</button></form>';
}
function serviceChoiceForm() { return '<section class="whatsapp-service-choice"><div class="whatsapp-workbench-title"><span>Próximo passo</span><strong>Escolha como este atendimento deve continuar.</strong></div><div class="whatsapp-service-choice-actions"><button type="button" data-whatsapp-action="escolher-orcamento"><strong>Montar orçamento</strong><small>Montar proposta com itens, valores e validade.</small></button><button type="button" data-whatsapp-action="escolher-levantamento"><strong>Agendar visita ao cliente / Levantamento técnico</strong><small>Agendar visita para diagnóstico, sem preço e sem O.S.</small></button></div></section>'; }
function aiWorkbench() {
  const draft = whatsappAiDraft;
  const loading = whatsappAiLoading ? "Analisando..." : "Analisar conversa";
  if (!draft) return '<section class="whatsapp-ai-panel"><div class="whatsapp-ai-heading"><div><span>Copiloto comercial</span><strong>Resumo e rascunho assistido</strong></div><span class="whatsapp-ai-badge">Revisão humana</span></div><p>Extraia dados da conversa para acelerar o atendimento. A IA não grava cliente, preço ou orçamento.</p><label class="whatsapp-ai-context">Contexto para a IA<textarea id="whatsappAiContext" rows="2" placeholder="Ex.: priorizar instalação residencial e perguntar a capacidade do equipamento."></textarea></label><button type="button" class="whatsapp-ai-button" data-whatsapp-action="analisar-ia" ' + (whatsappAiLoading ? "disabled" : "") + '>' + loading + '</button></section>';
  const atendimento = draft.atendimento || {};
  const items = (draft.orcamento?.itens || []).map((item, index) => '<div class="whatsapp-ai-item"><label>Item<input name="ia_item_descricao_' + index + '" value="' + esc(item.descricao || "") + '"></label><label>Quantidade<input name="ia_item_quantidade_' + index + '" type="number" min="0.001" step="0.001" value="' + esc(item.quantidade || 1) + '"></label><span>Preço será informado pelo atendente</span></div>').join("");
  const pendencias = (draft.perguntas_pendentes || []).map((item) => '<li><button type="button" class="whatsapp-ai-pending-question" data-whatsapp-action="perguntar-pendencia" data-pergunta="' + esc(item) + '">' + esc(item) + '</button></li>').join("") || '<li>Nenhuma pendência identificada.</li>';
  return '<form data-whatsapp-form="ia" class="whatsapp-ai-panel whatsapp-ai-panel-ready"><div class="whatsapp-ai-heading"><div><span>Copiloto comercial</span><strong>Revise antes de aplicar</strong></div><button type="button" class="secondary-button" data-whatsapp-action="analisar-ia">Reanalisar</button></div><div class="whatsapp-ai-grid"><label>Cliente<input name="ia_nome" value="' + esc(draft.cliente?.nome || "") + '"></label><label>Documento<input name="ia_documento" value="' + esc(draft.cliente?.documento || "") + '"></label><label>Serviço<input name="ia_servico" value="' + esc(atendimento.servico || "") + '"></label><label>Equipamento<input name="ia_equipamento" value="' + esc(atendimento.equipamento || "") + '"></label><label class="whatsapp-ai-wide">Título do orçamento<input name="ia_titulo" value="' + esc(draft.orcamento?.titulo || "") + '"></label></div><div class="whatsapp-ai-items"><strong>Itens identificados</strong>' + (items || '<p>Nenhum item identificado.</p>') + '</div><div class="whatsapp-ai-pending"><strong>Perguntas pendentes</strong><ul>' + pendencias + '</ul></div><div class="whatsapp-ai-actions"><button type="submit" class="whatsapp-ai-button">Aplicar rascunho ao orçamento</button><button type="button" class="secondary-button" data-whatsapp-action="descartar-ia">Descartar sugestão</button></div><small class="whatsapp-ai-disclaimer">Valores e totais serão recalculados pelo catálogo e pelo backend.</small></form>';
}
function operationalForm(conversa) { if (!conversa.cliente) return whatsappClientResolutionForm(conversa); if (whatsappServiceChoiceRequired) return serviceChoiceForm(); if (conversa.levantamento) return levantamentoForm(conversa); const quote = conversa.orcamentos?.[0]; if (whatsappServiceMode === "levantamento") return levantamentoForm(conversa); if (whatsappServiceMode === "orcamento" || quote) return \`\${quoteForm(conversa)}\${!quote || quote.status === "aprovado" ? scheduleForm(conversa) : ""}\`; return serviceChoiceForm(); }
function isWhatsappMaintenance(conversa) { return conversa.atendimento?.dados?.servico === "manutencao"; }
function levantamentoDateValue(levantamento) { return whatsappScheduleDraft.data || whatsappSelectedScheduleDate || (levantamento?.agendadaPara ? localDate(levantamento.agendadaPara) : localDate()); }
function levantamentoTimeValue(levantamento) { return whatsappScheduleDraft.horario || (levantamento?.agendadaPara ? new Date(levantamento.agendadaPara).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "08:00"); }
function levantamentoNotification(levantamento) { const erro = levantamento?.notificacaoErro || levantamento?.notificacao_erro; const avisadoEm = levantamento?.tecnicoAvisadoEm || levantamento?.tecnico_avisado_em; if (!levantamento?.id) return ""; return '<div class="whatsapp-schedule-draft">' + (erro ? 'Aviso ao técnico não enviado: ' + esc(erro) : avisadoEm ? 'Técnico avisado em ' + esc(formatDate(avisadoEm)) : 'Aviso ao técnico pendente.') + '<button type="button" class="secondary-button" data-whatsapp-action="reenviar-aviso-levantamento" data-levantamento-id="' + esc(levantamento.id) + '">Reenviar aviso</button></div>'; }
function levantamentoForm(conversa) { const levantamento = conversa.levantamento; const dados = conversa.atendimento?.dados || {}; const equipeId = whatsappScheduleDraft.equipeId || levantamento?.equipeId || levantamento?.equipe_id || ""; const tecnicoId = whatsappScheduleDraft.tecnicoId || levantamento?.tecnicoId || levantamento?.tecnico_id || ""; const date = levantamentoDateValue(levantamento); const time = levantamentoTimeValue(levantamento); const problema = dados.detalhes || levantamento?.problema || ""; const status = levantamento?.status === "agendado" ? "agendado" : "pendente"; return '<form data-whatsapp-form="levantamento" class="whatsapp-workbench-form whatsapp-schedule-form"><div class="whatsapp-workbench-title"><span>Levantamento técnico ' + status + '</span><strong>Visita para diagnóstico, sem criar O.S. ou orçamento.</strong></div><label class="whatsapp-field-wide">Problema informado<textarea name="problema" rows="2" required>' + esc(problema) + '</textarea></label><label>Equipe<select name="equipe_id">' + scheduleOptions("equipe", whatsappScheduleOptions.equipes, equipeId) + '</select></label><label>Técnico<select name="tecnico_id">' + scheduleOptions("tecnico", whatsappScheduleOptions.tecnicos.filter((item) => item.role !== "admin"), tecnicoId) + '</select></label><button type="button" class="whatsapp-open-schedule" data-whatsapp-action="abrir-agenda-levantamento">' + date + ' · ' + time + '<span>Ver agenda</span></button><div class="whatsapp-schedule-draft">' + (levantamento?.status === "agendado" ? "Levantamento agendado. A mensagem ao cliente pode ser ajustada antes do envio." : "Escolha equipe ou técnico, data e horário.") + '</div>' + levantamentoNotification(levantamento) + '</form>'; }
function scheduleDateValue(os) { return whatsappScheduleDraft.data || whatsappSelectedScheduleDate || (os?.agendadaPara ? localDate(os.agendadaPara) : localDate()); }
function scheduleTimeValue(os) { return whatsappScheduleDraft.horario || (os?.agendadaPara ? new Date(os.agendadaPara).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "08:00"); }
function schedulePersonLabel(equipeId, tecnicoId) { return whatsappScheduleOptions.equipes.find((item) => item.id === equipeId)?.nome || whatsappScheduleOptions.tecnicos.find((item) => item.id === tecnicoId)?.nome || "responsável não definido"; }
function scheduleProposalText(conversa, date, time, equipeId, tecnicoId) { const when = new Date(date + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }); return "Olá, " + (conversa.nomeContato || "tudo bem") + ". Tenho disponibilidade " + when + " às " + time + " com " + schedulePersonLabel(equipeId, tecnicoId) + ". Pode ser?"; }
function scheduleCalendar(dateValue) { const parts = whatsappScheduleVisibleMonth.split("-").map(Number); const first = new Date(parts[0], parts[1] - 1, 1); const start = new Date(first); start.setDate(first.getDate() - first.getDay()); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); const key = localDate(date); const items = scheduleItemsForDay(key); const classes = "whatsapp-schedule-day " + (key === dateValue ? "is-selected " : "") + (date.getMonth() !== parts[1] - 1 ? "is-outside" : ""); return '<button type="button" class="' + classes + '" data-whatsapp-schedule-date="' + key + '"><strong>' + date.getDate() + '</strong><small>' + (items.length ? items.length + " O.S." : "Livre") + '</small></button>'; }).join(""); }
function scheduleSlots(date, equipeId, tecnicoId, currentId, selected) { const busy = new Set(scheduleItemsForDay(date).filter((item) => item.id !== currentId && ((equipeId && item.equipe?.id === equipeId) || (tecnicoId && item.tecnico?.id === tecnicoId))).map((item) => new Date(item.agendada_para).getHours())); return Array.from({ length: 11 }, (_, index) => index + 8).map((hour) => { const time = String(hour).padStart(2, "0") + ":00"; const occupied = busy.has(hour); return '<button type="button" class="whatsapp-schedule-slot ' + (time === selected ? "is-selected" : "") + '" data-whatsapp-schedule-time="' + time + '" ' + (occupied ? "disabled" : "") + '>' + time + '<small>' + (occupied ? "Ocupado" : "Livre") + '</small></button>'; }).join(""); }
function schedulePanel(conversa) {
  const os = conversa.ordemServico;
  const date = scheduleDateValue(os);
  const time = scheduleTimeValue(os);
  const equipeId = whatsappScheduleDraft.equipeId || os?.equipeId || "";
  const tecnicoId = whatsappScheduleDraft.tecnicoId || os?.tecnicoId || "";
  const ready = Boolean(equipeId || tecnicoId);
  const [visibleYear, visibleMonth] = whatsappScheduleVisibleMonth.split("-").map(Number);
  const label = new Date(visibleYear, visibleMonth - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const header = '<aside class="whatsapp-schedule-panel" aria-label="Disponibilidade da agenda"><header><div><span>Disponibilidade</span><strong>' + (whatsappScheduleMode === "calendar" ? "Escolha uma data" : "Escolha um horário") + '</strong></div><button type="button" class="secondary-button" data-whatsapp-action="fechar-agenda">×</button></header>';
  if (!ready) return header + '<p class="whatsapp-schedule-warning">Selecione uma equipe ou técnico antes de consultar a disponibilidade.</p></aside>';
  if (whatsappScheduleMode === "calendar") return header + '<div class="whatsapp-schedule-month"><button type="button" class="secondary-button" data-whatsapp-action="mes-anterior">‹</button><strong>' + label.charAt(0).toUpperCase() + label.slice(1) + '</strong><button type="button" class="secondary-button" data-whatsapp-action="mes-proximo">›</button></div><div class="whatsapp-schedule-weekdays"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div><div class="whatsapp-schedule-calendar">' + scheduleCalendar(date) + '</div></aside>';
  const selectedDate = new Date(date + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const message = whatsappScheduleDraft.proposalSent ? "Proposta enviada. Confirme somente após o aceite do cliente." : "Escolha o horário e prepare a mensagem para o cliente.";
  return header + '<div class="whatsapp-schedule-selected-date"><strong>' + selectedDate + '</strong><button type="button" class="secondary-button" data-whatsapp-action="alterar-data">Alterar data</button></div><div class="whatsapp-schedule-slots">' + scheduleSlots(date, equipeId, tecnicoId, os?.id, time) + '</div><div class="whatsapp-schedule-actions"><p>' + message + '</p><button type="button" class="secondary-button" data-whatsapp-action="propor-agendamento">Preparar mensagem</button><button type="button" data-whatsapp-action="confirmar-agendamento" ' + (whatsappScheduleDraft.proposalSent ? "" : "disabled") + '>Confirmar agendamento</button></div></aside>';
}
function scheduleForm(conversa) { const os = conversa.ordemServico; const equipeId = whatsappScheduleDraft.equipeId || os?.equipeId || ""; const tecnicoId = whatsappScheduleDraft.tecnicoId || os?.tecnicoId || ""; const date = scheduleDateValue(os); const time = scheduleTimeValue(os); const previa = conversa.atendimento?.previaOs || {}; const origem = os?.origem || (conversa.orcamentos?.[0]?.status === "aprovado" ? "orcamento_aprovado" : "contrato_recorrencia"); const option = (value, label) => '<option value="' + value + '" ' + (origem === value ? "selected" : "") + '>' + label + '</option>'; return '<form data-whatsapp-form="os" class="whatsapp-workbench-form whatsapp-schedule-form"><div class="whatsapp-workbench-title"><span>O.S. ' + (os ? "criada" : "pendente") + '</span><strong>' + esc(os?.titulo || previa.titulo || "Atendimento WhatsApp") + '</strong></div><label class="whatsapp-field-wide">Título<input name="titulo" value="' + esc(os?.titulo || previa.titulo || "") + '" required></label><label class="whatsapp-field-wide">Detalhes<textarea name="detalhes" rows="1">' + esc(previa.detalhes || "") + '</textarea></label><label>Origem<select name="origem">' + option("orcamento_aprovado", "Orçamento aprovado") + option("contrato_recorrencia", "Contrato ou recorrência") + option("servico_gratuito", "Serviço gratuito") + '</select></label><label>Equipe<select name="equipe_id">' + scheduleOptions("equipe", whatsappScheduleOptions.equipes, equipeId) + '</select></label><label>Técnico<select name="tecnico_id">' + scheduleOptions("tecnico", whatsappScheduleOptions.tecnicos.filter((item) => item.role !== "admin"), tecnicoId) + '</select></label><button type="button" class="whatsapp-open-schedule" data-whatsapp-action="abrir-agenda">' + date + ' · ' + time + '<span>Ver agenda</span></button><div class="whatsapp-schedule-draft">' + (whatsappScheduleDraft.proposalSent ? "Aguardando confirmação do cliente" : "Escolha uma data e horário para propor ao cliente") + '</div></form>'; }

const schedulePanelBase = schedulePanel;
schedulePanel = function (conversa) { if (whatsappScheduleDraft.context !== "levantamento") return schedulePanelBase(conversa); const levantamento = conversa.levantamento; const date = levantamentoDateValue(levantamento); const time = levantamentoTimeValue(levantamento); const equipeId = whatsappScheduleDraft.equipeId || levantamento?.equipeId || levantamento?.equipe_id || ""; const tecnicoId = whatsappScheduleDraft.tecnicoId || levantamento?.tecnicoId || levantamento?.tecnico_id || ""; const ready = Boolean(equipeId || tecnicoId); const label = new Date(date + "T12:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); const header = '<aside class="whatsapp-schedule-panel" aria-label="Disponibilidade da agenda"><header><div><span>Levantamento técnico</span><strong>' + (whatsappScheduleMode === "calendar" ? "Escolha uma data" : "Escolha um horário") + '</strong></div><button type="button" class="secondary-button" data-whatsapp-action="fechar-agenda">×</button></header>'; if (!ready) return header + '<p class="whatsapp-schedule-warning">Selecione uma equipe ou técnico antes de consultar a disponibilidade.</p></aside>'; if (whatsappScheduleMode === "calendar") return header + '<div class="whatsapp-schedule-month"><button type="button" class="secondary-button" data-whatsapp-action="mes-anterior">‹</button><strong>' + label.charAt(0).toUpperCase() + label.slice(1) + '</strong><button type="button" class="secondary-button" data-whatsapp-action="mes-proximo">›</button></div><div class="whatsapp-schedule-weekdays"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div><div class="whatsapp-schedule-calendar">' + scheduleCalendar(date) + '</div></aside>'; const selectedDate = new Date(date + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }); return header + '<div class="whatsapp-schedule-selected-date"><strong>' + selectedDate + '</strong><button type="button" class="secondary-button" data-whatsapp-action="alterar-data">Alterar data</button></div><div class="whatsapp-schedule-slots">' + scheduleSlots(date, equipeId, tecnicoId, levantamento?.id, time) + '</div><div class="whatsapp-schedule-actions"><p>Confirme o horário livre para criar ou atualizar o levantamento. A mensagem editável ao cliente será preenchida depois da confirmação.</p><button type="button" data-whatsapp-action="confirmar-levantamento">Confirmar levantamento</button></div></aside>'; };
whatsappClientForm = function (conversa) {
  const dados = conversa.atendimento?.dados || {};
  return '<form data-whatsapp-form="cliente" class="whatsapp-workbench-form"><div class="whatsapp-workbench-title"><span>Cadastro do cliente</span><strong>Revise os dados encontrados. O cadastro pode ser salvo mesmo incompleto.</strong></div><p class="whatsapp-client-note">Somente o nome é necessário para salvar. Os demais dados podem ser solicitados depois.</p><label>Nome<input name="nome" value="' + esc(dados.nome || conversa.nomeContato || '') + '" required></label><label>Telefone<input name="telefone" value="' + esc(conversa.telefone || '') + '"></label><label>E-mail<input name="email" type="email" value="' + esc(dados.email || '') + '" autocomplete="email"></label><label>Cidade<input name="cidade" value="' + esc(dados.cidade || dados.cidade_bairro || '') + '"></label><label>UF<input name="uf" value="' + esc(dados.uf || '') + '" maxlength="2"></label><label class="whatsapp-field-wide">Endereço<input name="logradouro" value="' + esc(dados.logradouro || '') + '"></label><label>Número<input name="numero" value="' + esc(dados.numero || '') + '"></label><label>Bairro<input name="bairro" value="' + esc(dados.bairro || '') + '"></label><label>Documento<input name="documento" value="' + esc(dados.documento || '') + '"></label><label>CEP<input name="cep" value="' + esc(dados.cep || '') + '"></label><button type="submit">Salvar cliente e continuar</button></form>';
};
serviceChoiceForm = function (conversa) {
  const cliente = conversa?.cliente;
  const dados = conversa?.atendimento?.dados || {};
  const titulo = whatsappAiDraft?.orcamento?.titulo || 'Orçamento - ' + (dados.servico || 'atendimento');
  const endereco = cliente?.endereco || cliente?.enderecos?.[0] || dados;
  const completo = Boolean(cliente?.nome && cliente?.email && cliente?.documento && endereco.cep && endereco.logradouro && endereco.numero && endereco.bairro && endereco.cidade && endereco.uf);
  const podeAgendar = String(dados.servico || '').toLowerCase().startsWith('manutencao');
  const agendamento = podeAgendar ? '<button type="button" data-whatsapp-action="escolher-levantamento"><strong>Agendar visita</strong><small>Agendar diagnóstico técnico, sem preço.</small></button>' : '';
  return '<section class="whatsapp-service-choice"><div class="whatsapp-workbench-title"><span>Copiloto comercial</span><strong>Cliente identificado</strong></div><div class="whatsapp-client-compact"><span>Cliente</span><strong>' + esc(cliente?.nome || 'Cliente') + '</strong><small>' + (completo ? 'Cadastro completo' : 'Cadastro parcial — pode completar depois') + '</small></div><label class="whatsapp-field-wide">Título do orçamento<input name="whatsapp_titulo_comercial" value="' + esc(titulo) + '"></label><div class="whatsapp-service-choice-actions"><button type="button" data-whatsapp-action="escolher-orcamento"><strong>Montar orçamento</strong><small>Montar proposta com itens, valores e validade.</small></button>' + agendamento + '</div></section>';
};
operationalForm = function (conversa) { if (!conversa.cliente) return whatsappClientResolutionForm(conversa); if (whatsappServiceChoiceRequired) return serviceChoiceForm(conversa); if (conversa.levantamento) return levantamentoForm(conversa); const quote = conversa.orcamentos?.[0]; if (whatsappServiceMode === "levantamento") return levantamentoForm(conversa); if (whatsappServiceMode === "orcamento" || quote) return \"\" + quoteForm(conversa) + (!quote || quote.status === \"aprovado\" ? scheduleForm(conversa) : \"\"); return serviceChoiceForm(conversa); };
async function loadWhatsappConversation(id) {
  const detailBeforeReload = document.querySelector("#whatsappConversationDetail");
  const previousThread = document.querySelector(".whatsapp-thread");
  const previousThreadScrollTop = previousThread instanceof HTMLElement ? previousThread.scrollTop : null;
  const previousDetailScrollTop = detailBeforeReload instanceof HTMLElement ? detailBeforeReload.scrollTop : null;
  const previousWindowScrollTop = window.scrollY;
  if (id !== selectedWhatsappId) { whatsappSelectedScheduleDate = ""; whatsappScheduleDraft = { equipeId: "", tecnicoId: "", data: "", horario: "", proposalText: "", proposalSent: false, context: "os" }; whatsappAiDraft = null; whatsappServiceMode = ""; whatsappServiceChoiceRequired = false; whatsappClientResolution = ""; whatsappScheduleOpen = false; whatsappScheduleVisibleMonth = localDate().slice(0, 7); whatsappScheduleMode = "calendar"; }
  const response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${id}\`, { headers: authHeaders() }); if (!response.ok) return;
  const conversa = await response.json(); await Promise.all([loadWhatsappScheduleOptions(), loadWhatsappCatalog()]); selectedWhatsappId = id; selectedWhatsappConversation = conversa; void fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${id}/ler\`, { method: "PATCH", headers: authHeaders() });
  const action = conversa.status === "encerrada" ? '<button class="secondary-button" data-whatsapp-action="reabrir">Reabrir conversa</button>' : conversa.atribuidoUsuario ? '<button class="secondary-button" data-whatsapp-action="liberar">Liberar para fila</button><button class="danger-button" data-whatsapp-action="encerrar">Encerrar</button>' : '<button class="danger-button" data-whatsapp-action="encerrar">Encerrar</button>';
  const form = operationalForm(conversa);
  const aiPanel = !whatsappAiDraft ? aiWorkbench() : "";
  const schedulePanelHtml = whatsappScheduleOpen && conversa.cliente ? schedulePanel(conversa) : "";
  document.querySelector("#whatsappConversationDetail").innerHTML = \`<header class="whatsapp-detail-header"><div class="whatsapp-detail-person"><span class="whatsapp-avatar whatsapp-avatar-large">\${esc((conversa.nomeContato || conversa.telefone || "?").slice(0, 1).toUpperCase())}</span><div><h3>\${esc(conversa.nomeContato || conversa.telefone)}</h3><p>\${esc(conversa.telefone || "Sem telefone")} · \${conversa.status === "encerrada" ? "Conversa encerrada" : conversa.atribuidoUsuario ? \`Atendimento com \${esc(conversa.atribuidoUsuario.nome)}\` : "Aguardando atendente"}</p></div></div><div class="whatsapp-detail-actions">\${action}<button class="danger-button" data-whatsapp-action="apagar">Apagar conversa</button></div></header><div class="whatsapp-detail-body"><div class="whatsapp-thread-wrap"><div class="whatsapp-thread-heading"><strong>Histórico da conversa</strong><span>\${conversa.mensagens.length} mensagens</span></div><div class="whatsapp-thread">\${conversa.mensagens.map((item) => \`<div class="whatsapp-message whatsapp-message-\${item.direcao}"><small>\${item.direcao === "entrada" ? "Cliente" : "AIRMOVEBR"} · \${esc(formatDate(item.criadoEm))}</small><p>\${esc(item.texto)}</p></div>\`).join("")}</div><form class="whatsapp-reply-form" id="whatsappReplyForm"><textarea name="texto" rows="2" placeholder="Escreva uma resposta..." required></textarea><div><span>A primeira resposta assume a conversa automaticamente.</span><button type="submit">Enviar resposta</button></div></form></div><aside class="whatsapp-ai-column">\${aiPanel}<div class="whatsapp-manual-workbench">\${form}</div>\${schedulePanelHtml}</aside></div>\`;
  const iaForm = document.querySelector('[data-whatsapp-form="ia"]');
  if (iaForm && !iaForm.querySelector('[name="ia_valor_atendente"]')) iaForm.querySelector('.whatsapp-ai-grid')?.insertAdjacentHTML("beforeend", '<label>Valor definido pelo atendente (R$)<input name="ia_valor_atendente" type="number" min="0.01" step="0.01" required placeholder="Ex.: 850,00"></label><label class="whatsapp-ai-wide">Condições da proposta<textarea name="ia_condicoes" rows="2" placeholder="Ex.: material incluso, instalação e garantia."></textarea></label>');
  if (iaForm) { const submit = iaForm.querySelector('button[type="submit"]'); if (submit) submit.textContent = "Gerar PDF e enviar proposta"; }
  renderWhatsappConversations(); requestAnimationFrame(() => { const thread = document.querySelector(".whatsapp-thread"); const detail = document.querySelector("#whatsappConversationDetail"); if (thread) thread.scrollTop = previousThreadScrollTop === null ? thread.scrollHeight : previousThreadScrollTop; if (detail && previousDetailScrollTop !== null) detail.scrollTop = previousDetailScrollTop; window.scrollTo({ top: previousWindowScrollTop, behavior: "auto" }); setTimeout(() => window.scrollTo({ top: previousWindowScrollTop, behavior: "auto" }), 0); });
}

async function connectWhatsappEvents() { whatsappEventAbort?.abort(); whatsappEventAbort = new AbortController(); try { const response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/eventos\`, { headers: { ...authHeaders(), Accept: "text/event-stream" }, signal: whatsappEventAbort.signal }); if (!response.ok || !response.body) return; const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; while (true) { const part = await reader.read(); if (part.done) break; buffer += decoder.decode(part.value, { stream: true }); const blocks = buffer.split("\\\\n\\\\n"); buffer = blocks.pop() || ""; for (const block of blocks) { const line = block.split("\\\\n").find((item) => item.startsWith("data:")); if (!line) continue; const event = JSON.parse(line.slice(5)); if (event.tipo === "transferida_humano" && lastWhatsappEvent !== event.conversaId) { lastWhatsappEvent = event.conversaId; if (window.Notification?.permission === "granted") new Notification("WhatsApp aguardando atendente"); } void loadWhatsappConversations(); if (selectedWhatsappId === event.conversaId) void loadWhatsappConversation(selectedWhatsappId); } } } catch { /* A atualização de um minuto continua ativa. */ } }
async function preencherEnderecoWhatsappPorCep(input) {
  const cep = String(input.value || "").replace(/\\D/g, "");
  if (cep.length !== 8 || input.dataset.cepConsultado === cep) return;
  input.dataset.cepConsultado = cep;
  try {
    const response = await fetch(\`https://viacep.com.br/ws/\${cep}/json/\`);
    const endereco = await response.json();
    if (!response.ok || endereco.erro) return;
    const form = input.closest("form");
    const preencher = (nome, valor) => { const campo = form?.elements.namedItem(nome); if (campo && valor) campo.value = valor; };
    preencher("logradouro", endereco.logradouro);
    preencher("bairro", endereco.bairro);
    preencher("cidade", endereco.localidade);
    preencher("uf", endereco.uf);
  } catch { input.dataset.cepConsultado = ""; }
}
async function whatsappAction(action) { if (action === "apagar" && !window.confirm("Apagar esta conversa e todo o histórico? A próxima mensagem deste número iniciará um novo atendimento.")) return; const path = action === "liberar" ? "liberar" : action === "reabrir" ? "reabrir" : action === "encerrar" ? "encerrar" : ""; const method = action === "apagar" ? "DELETE" : action === "encerrar" || action === "reabrir" ? "POST" : "PATCH"; const response = await fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + selectedWhatsappId + (path ? "/" + path : ""), { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: action === "encerrar" ? JSON.stringify({ motivo: "concluido" }) : undefined }); if (!response.ok) { window.alert("Não foi possível concluir esta ação."); return; } if (action === "apagar") { selectedWhatsappId = ""; document.querySelector("#whatsappConversationDetail").innerHTML = '<div class="whatsapp-empty-state"><span class="whatsapp-empty-icon">◉</span><strong>Conversa apagada</strong><p>Envie uma nova mensagem pelo WhatsApp para iniciar o atendimento novamente.</p></div>'; await loadWhatsappConversations(); return; } await loadWhatsappConversation(selectedWhatsappId); await loadWhatsappConversations(); }

whatsappNav.addEventListener("click", (event) => { event.stopImmediatePropagation(); showWhatsappView(); });
document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => { if (link !== whatsappNav) hideWhatsappView(); }));
document.querySelector("#whatsappRefreshButton").addEventListener("click", () => void loadWhatsappConversations());
document.querySelector("#whatsappSearchInput").addEventListener("input", renderWhatsappConversations);
document.querySelector(".whatsapp-filters").addEventListener("click", (event) => { const target = event.target.closest("[data-whatsapp-filter]"); if (target) setWhatsappFilter(target.dataset.whatsappFilter); });
document.querySelector("#whatsappConversationList").addEventListener("click", (event) => { const target = event.target.closest("[data-whatsapp-id]"); if (target) void loadWhatsappConversation(target.dataset.whatsappId); });
async function analisarWhatsappComIa() {
  if (!selectedWhatsappId || whatsappAiLoading) return;
  const contexto = String(document.querySelector("#whatsappAiContext")?.value || "").trim();
  whatsappAiLoading = true;
  const response = await fetch(apiBaseUrl + "/admin/ia/conversas/" + selectedWhatsappId + "/analisar", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ contexto }) });
  whatsappAiLoading = false;
  if (!response.ok) { const erro = await response.json().catch(() => null); window.alert(erro?.message || "Não foi possível analisar a conversa."); await loadWhatsappConversation(selectedWhatsappId); return; }
  whatsappAiDraft = await response.json();
  await loadWhatsappConversation(selectedWhatsappId);
}
async function criarRascunhoIa() {
  const conversa = selectedWhatsappConversation;
  const draft = whatsappAiDraft;
  if (!conversa?.cliente?.id || !draft) { window.alert("Vincule o cliente antes de gerar a proposta."); return; }
  const valor = Number(document.querySelector('[name="ia_valor_atendente"]')?.value || 0);
  if (!Number.isFinite(valor) || valor <= 0) { window.alert("Informe o valor definido pelo atendente."); return; }
  const condicoes = String(document.querySelector('[name="ia_condicoes"]')?.value || "").trim();
  const descricao = [draft.atendimento?.servico || "Serviço de climatização", draft.atendimento?.equipamento, "Proposta com valor definido pelo atendente"].filter(Boolean).join(" - ");
  const item = { item_catalogo_id: null, tipo: "servico", descricao, unidade: "serviço", quantidade: 1, valor_unitario: valor };
  if (!window.confirm("Gerar o PDF e enviar esta proposta ao cliente para aceite?")) return;
  const agenda = whatsappScheduleDraft.data && whatsappScheduleDraft.horario ? { agendada_para: whatsappScheduleDraft.data + "T" + whatsappScheduleDraft.horario + ":00", equipe_id: whatsappScheduleDraft.equipeId || undefined, tecnico_id: whatsappScheduleDraft.tecnicoId || undefined } : {};
  const propostaResponse = await fetch(apiBaseUrl + "/admin/comercial/orcamentos", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ cliente_id: conversa.cliente.id, conversa_id: conversa.id, titulo: draft.orcamento?.titulo || draft.atendimento?.servico || "Proposta de serviço", detalhes: [draft.atendimento?.detalhes, condicoes].filter(Boolean).join("\\n"), desconto: 0, itens: [item], ...agenda }) });
  if (!propostaResponse.ok) { const erro = await propostaResponse.json().catch(() => null); window.alert(erro?.message || "Não foi possível criar a proposta."); return; }
  const proposta = await propostaResponse.json();
  const confirmado = await fetch(apiBaseUrl + "/admin/comercial/orcamentos/" + proposta.id + "/confirmar", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ confirmado: true }) });
  if (!confirmado.ok) { window.alert("A proposta foi criada, mas não foi confirmada."); await loadWhatsappConversation(selectedWhatsappId); return; }
  const envio = await fetch(apiBaseUrl + "/admin/comercial/orcamentos/" + proposta.id + "/enviar-whatsapp", { method: "POST", headers: authHeaders() });
  if (!envio.ok) { const erro = await envio.json().catch(() => null); window.alert(erro?.message || "A proposta foi criada, mas não foi enviada ao cliente."); await loadWhatsappConversation(selectedWhatsappId); return; }
  whatsappAiDraft = null;
  await loadWhatsappConversation(selectedWhatsappId);
  return;
  const itens = draft.orcamento.itens.map((item, index) => ({ item_catalogo_id: item.item_catalogo_id || null, tipo: item.tipo, descricao: String(document.querySelector('[name="ia_item_descricao_' + index + '"]')?.value || item.descricao).trim(), unidade: item.unidade || "un", quantidade: Number(document.querySelector('[name="ia_item_quantidade_' + index + '"]')?.value || item.quantidade || 1) }));
  const validacao = await fetch(apiBaseUrl + "/admin/ia/conversas/" + selectedWhatsappId + "/rascunho", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ titulo: draft.orcamento.titulo, itens, desconto: 0 }) });
  if (!validacao.ok) { const erro = await validacao.json().catch(() => null); window.alert(erro?.message || "O rascunho não passou pela validação do backend."); return; }
  const calculado = await validacao.json();
  if (!calculado.pode_confirmar) { window.alert((calculado.pendencias || ["Associe todos os itens ao catálogo antes de confirmar."]).join("\\n")); return; }
  if (!window.confirm("Aplicar este rascunho validado e criar o orçamento? O envio ao cliente continuará separado.")) return;
  itens.splice(0, itens.length, ...calculado.itens);
  if (calculado.diferenca_total && Math.abs(calculado.diferenca_total) > 0.01 && !window.confirm("O total informado pela IA difere do total calculado em " + money(Math.abs(calculado.diferenca_total)) + ". Criar mesmo assim para revisão?")) return;
  const response = await fetch(apiBaseUrl + "/admin/comercial/orcamentos", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ cliente_id: conversa.cliente.id, conversa_id: conversa.id, titulo: draft.orcamento.titulo || draft.atendimento?.servico || "Orçamento WhatsApp", detalhes: draft.atendimento?.detalhes, desconto: Number(draft.orcamento.desconto || 0), itens }) });
  if (!response.ok) { const erro = await response.json().catch(() => null); window.alert(erro?.message || "Não foi possível criar o rascunho."); return; }
  whatsappAiDraft = null;
  await loadWhatsappConversation(selectedWhatsappId);
}

document.querySelector("#whatsappConversationDetail").addEventListener("click", async (event) => {
  const action = event.target.dataset.whatsappAction;
  if (action === "descartar-ia") { whatsappAiDraft = null; await loadWhatsappConversation(selectedWhatsappId); return; }
  if (action === "baixar-orcamento-pdf") {
    const response = await fetch(apiBaseUrl + "/admin/comercial/orcamentos/" + event.target.dataset.orcamentoId + "/pdf", { headers: authHeaders() });
    if (!response.ok) { window.alert("Não foi possível gerar o PDF."); return; }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a"); link.href = url; link.download = "orcamento-" + event.target.dataset.orcamentoId.slice(0, 8) + ".pdf"; link.click(); window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const endpoints = { "enviar-orcamento-whatsapp": "enviar-whatsapp", "enviar-orcamento-email": "enviar-email", "enviar-orcamento-assinatura": "assinafy" };
  const endpoint = endpoints[action];
  if (endpoint) {
    if (!window.confirm("Confirma o envio deste orçamento? O cliente receberá o PDF e poderá aceitar o serviço.")) return;
    const destinatario = action === "enviar-orcamento-email" ? window.prompt("E-mail para envio:", event.target.dataset.orcamentoEmail || "")?.trim() : "";
    if (action === "enviar-orcamento-email" && !destinatario) return;
    const response = await fetch(\`\${apiBaseUrl}/admin/comercial/orcamentos/\${event.target.dataset.orcamentoId}/\${endpoint}\`, { method: "POST", headers: { ...authHeaders(), ...(action === "enviar-orcamento-email" ? { "Content-Type": "application/json" } : {}) }, body: action === "enviar-orcamento-email" ? JSON.stringify({ destinatario }) : undefined });
    if (!response.ok) { const erro = await response.json().catch(() => null); window.alert(erro?.message || "Não foi possível enviar o orçamento."); return; }
    const resultado = await response.json().catch(() => null);
    window.alert(resultado?.mensagem || "Envio concluído.");
    await loadWhatsappConversation(selectedWhatsappId); await loadWhatsappConversations(); return;
  }
  if (["apagar", "liberar", "reabrir", "encerrar"].includes(action)) await whatsappAction(action);
});
function prepareWhatsappScheduleProposal() {
  const form = document.querySelector('[data-whatsapp-form="os"]');
  if (!(form instanceof HTMLFormElement) || !selectedWhatsappConversation) return;
  const data = new FormData(form);
  const equipeId = String(data.get("equipe_id") || "");
  const tecnicoId = String(data.get("tecnico_id") || "");
  const date = whatsappScheduleDraft.data || scheduleDateValue(selectedWhatsappConversation.ordemServico);
  const time = whatsappScheduleDraft.horario || scheduleTimeValue(selectedWhatsappConversation.ordemServico);
  if (!equipeId && !tecnicoId) { window.alert("Selecione uma equipe ou técnico antes de propor o horário."); return; }
  const text = scheduleProposalText(selectedWhatsappConversation, date, time, equipeId, tecnicoId);
  whatsappScheduleDraft = { ...whatsappScheduleDraft, equipeId, tecnicoId, data: date, horario: time, proposalText: text, proposalSent: false };
  const textarea = document.querySelector('#whatsappReplyForm textarea[name="texto"]');
  if (textarea instanceof HTMLTextAreaElement) { textarea.value = text; textarea.focus(); }
}
async function confirmWhatsappSchedule() {
  const form = document.querySelector('[data-whatsapp-form="os"]');
  if (!(form instanceof HTMLFormElement)) return;
  if (!whatsappScheduleDraft.proposalSent) { window.alert("Envie a proposta e aguarde o aceite do cliente antes de confirmar."); return; }
  if (!window.confirm("Confirma que o cliente aceitou este horário?")) return;
  const data = new FormData(form);
  const equipeId = String(data.get("equipe_id") || "");
  const tecnicoId = String(data.get("tecnico_id") || "");
  const date = whatsappScheduleDraft.data || scheduleDateValue(selectedWhatsappConversation?.ordemServico);
  const time = whatsappScheduleDraft.horario || scheduleTimeValue(selectedWhatsappConversation?.ordemServico);
  const response = await fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + selectedWhatsappId + "/os", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ titulo: data.get("titulo"), detalhes: data.get("detalhes"), origem: data.get("origem"), equipe_id: equipeId || undefined, tecnico_id: tecnicoId || undefined, agendada_para: date + "T" + time + ":00" }) });
  if (!response.ok) { const erro = await response.json().catch(() => null); window.alert(erro?.message || "Não foi possível confirmar o agendamento."); return; }
  const resultado = await response.json(); if (resultado.confirmacaoAgendamentoEnviada === false) window.alert("Agendamento salvo, mas não foi possível enviar a confirmação ao cliente pelo WhatsApp.");
  whatsappScheduleOptions.agenda = []; whatsappScheduleOpen = false; whatsappScheduleDraft.proposalSent = false;
  await loadWhatsappScheduleOptions(); await loadWhatsappConversation(selectedWhatsappId); await loadWhatsappConversations();
}

function levantamentoCustomerMessage(conversa, date, time, equipeId, tecnicoId) { const when = new Date(date + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }); return "Olá, " + (conversa.nomeContato || "tudo bem") + ". Confirmamos o levantamento técnico para " + when + " às " + time + " com " + schedulePersonLabel(equipeId, tecnicoId) + ". Nossa equipe avaliará o equipamento no local. Se precisar reagendar, avise por aqui."; }
async function confirmWhatsappLevantamento() { const form = document.querySelector('[data-whatsapp-form="levantamento"]'); if (!(form instanceof HTMLFormElement) || !selectedWhatsappConversation) return; const data = new FormData(form); const problema = String(data.get("problema") || "").trim(); const equipeId = String(data.get("equipe_id") || ""); const tecnicoId = String(data.get("tecnico_id") || ""); const date = whatsappScheduleDraft.data || levantamentoDateValue(selectedWhatsappConversation.levantamento); const time = whatsappScheduleDraft.horario || levantamentoTimeValue(selectedWhatsappConversation.levantamento); if (!problema) { window.alert("Informe o problema antes de confirmar o levantamento."); return; } if (!equipeId && !tecnicoId) { window.alert("Selecione uma equipe ou um técnico antes de agendar."); return; } let levantamento = selectedWhatsappConversation.levantamento; if (!levantamento?.id) { const createResponse = await fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + selectedWhatsappId + "/levantamento", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ problema }) }); if (!createResponse.ok) { const erro = await createResponse.json().catch(() => null); window.alert(erro?.message || "Não foi possível criar o levantamento."); return; } const criado = await createResponse.json(); levantamento = criado.levantamento || criado; } const response = await fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + selectedWhatsappId + "/levantamento/agendar", { method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ equipe_id: equipeId || undefined, tecnico_id: tecnicoId || undefined, agendada_para: date + "T" + time + ":00" }) }); if (!response.ok) { const erro = await response.json().catch(() => null); window.alert(erro?.message || "Não foi possível agendar o levantamento."); return; } whatsappScheduleDraft = { ...whatsappScheduleDraft, equipeId, tecnicoId, data: date, horario: time, proposalText: levantamentoCustomerMessage(selectedWhatsappConversation, date, time, equipeId, tecnicoId), proposalSent: false, context: "levantamento" }; whatsappScheduleOptions.agenda = []; whatsappScheduleOpen = false; await loadWhatsappScheduleOptions(); await loadWhatsappConversation(selectedWhatsappId); const textarea = document.querySelector('#whatsappReplyForm textarea[name="texto"]'); if (textarea instanceof HTMLTextAreaElement) { textarea.value = whatsappScheduleDraft.proposalText; textarea.focus(); } await loadWhatsappConversations(); }
async function resendLevantamentoNotification(id) { const response = await fetch(apiBaseUrl + "/admin/levantamentos/" + id + "/notificacao/reenviar", { method: "POST", headers: authHeaders() }); if (!response.ok) { const erro = await response.json().catch(() => null); window.alert(erro?.message || "Não foi possível reenviar o aviso ao técnico."); return; } await loadWhatsappConversation(selectedWhatsappId); }

document.querySelector("#whatsappConversationDetail").addEventListener("click", async (event) => {
  const target = event.target.closest("[data-whatsapp-action], [data-whatsapp-schedule-date], [data-whatsapp-schedule-time]");
  if (!(target instanceof HTMLButtonElement)) return;
  const action = target.dataset.whatsappAction;
  if (action === "analisar-ia") { await analisarWhatsappComIa(); return; }
  if (action === "perguntar-pendencia") {
    const textarea = document.querySelector('#whatsappReplyForm textarea[name="texto"]');
    if (textarea instanceof HTMLTextAreaElement) { textarea.value = target.dataset.pergunta || ""; textarea.focus(); textarea.scrollIntoView({ behavior: "smooth", block: "center" }); }
    return;
  }
  if (action === "criar-rascunho-ia") { await criarRascunhoIa(); return; }
  if (action === "escolher-levantamento" || action === "escolher-orcamento") { whatsappServiceMode = action === "escolher-levantamento" ? "levantamento" : "orcamento"; whatsappServiceChoiceRequired = false; await loadWhatsappConversation(selectedWhatsappId); return; }
  if (action === "abrir-agenda") { whatsappScheduleDraft.context = "os"; whatsappScheduleOpen = true; whatsappScheduleMode = "calendar"; whatsappScheduleOptions.agenda = []; await loadWhatsappScheduleOptions(); await loadWhatsappConversation(selectedWhatsappId); return; }
  if (action === "abrir-agenda-levantamento") { whatsappScheduleDraft.context = "levantamento"; whatsappScheduleOpen = true; whatsappScheduleMode = "calendar"; whatsappScheduleOptions.agenda = []; await loadWhatsappScheduleOptions(); await loadWhatsappConversation(selectedWhatsappId); return; }
  if (action === "fechar-agenda") { whatsappScheduleOpen = false; whatsappScheduleMode = "calendar"; await loadWhatsappConversation(selectedWhatsappId); return; }
  if (action === "mes-anterior" || action === "mes-proximo") { const [year, month] = whatsappScheduleVisibleMonth.split("-").map(Number); whatsappScheduleVisibleMonth = localDate(new Date(year, month + (action === "mes-proximo" ? 0 : -2), 1)).slice(0, 7); await loadWhatsappConversation(selectedWhatsappId); return; }
  if (action === "alterar-data") { whatsappScheduleMode = "calendar"; await loadWhatsappConversation(selectedWhatsappId); return; }
  if (target.dataset.whatsappScheduleDate) { whatsappScheduleDraft.data = target.dataset.whatsappScheduleDate; whatsappScheduleMode = "times"; whatsappScheduleVisibleMonth = whatsappScheduleDraft.data.slice(0, 7); whatsappScheduleDraft.proposalSent = false; await loadWhatsappConversation(selectedWhatsappId); return; }
  if (target.dataset.whatsappScheduleTime) { whatsappScheduleDraft.horario = target.dataset.whatsappScheduleTime; whatsappScheduleDraft.proposalSent = false; await loadWhatsappConversation(selectedWhatsappId); return; }
  if (action === "propor-agendamento") { prepareWhatsappScheduleProposal(); return; }
  if (action === "confirmar-agendamento") { await confirmWhatsappSchedule(); return; }
  if (action === "confirmar-levantamento") { await confirmWhatsappLevantamento(); return; }
  if (action === "reenviar-aviso-levantamento") { await resendLevantamentoNotification(target.dataset.levantamentoId); }
});
document.querySelector("#whatsappConversationDetail").addEventListener("click", async (event) => {
  const target = event.target.closest("[data-whatsapp-action]");
  if (!(target instanceof HTMLButtonElement)) return;
  const action = target.dataset.whatsappAction;
  if (action === "novo-cliente") { whatsappClientResolution = "novo"; await loadWhatsappConversation(selectedWhatsappId); return; }
  if (action === "editar-cliente") { whatsappClientResolution = "editar:" + target.dataset.clienteId; await loadWhatsappConversation(selectedWhatsappId); return; }
  if (action !== "usar-cliente") return;
  const response = await fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + selectedWhatsappId + "/cliente/" + target.dataset.clienteId, { method: "POST", headers: authHeaders() });
  if (!response.ok) { const erro = await response.json().catch(() => null); window.alert(erro?.message || "Não foi possível vincular o cliente."); return; }
  whatsappClientResolution = ""; whatsappServiceMode = ""; whatsappServiceChoiceRequired = true;
  await loadWhatsappConversation(selectedWhatsappId); await loadWhatsappConversations();
});
document.querySelector("#whatsappConversationDetail").addEventListener("input", (event) => { if (event.target.name === "cep" && event.target.closest('[data-whatsapp-form="cliente"]')) void preencherEnderecoWhatsappPorCep(event.target); });
document.querySelector("#whatsappConversationDetail").addEventListener("change", (event) => { if (["data", "equipe_id", "tecnico_id"].includes(event.target.name)) { if (event.target.name === "data") whatsappSelectedScheduleDate = event.target.value; if (event.target.name === "equipe_id") whatsappScheduleDraft.equipeId = event.target.value; if (event.target.name === "tecnico_id") whatsappScheduleDraft.tecnicoId = event.target.value; whatsappScheduleDraft.proposalSent = false; void loadWhatsappConversation(selectedWhatsappId); } });
document.querySelector("#whatsappConversationDetail").addEventListener("click", (event) => {
  const target = event.target.closest("[data-quote-action]"); if (!target) return;
  const form = target.closest("form"); const lines = form?.querySelector("[data-quote-lines]");
  if (target.dataset.quoteAction === "adicionar" && lines) lines.insertAdjacentHTML("beforeend", quoteItemRow());
  if (target.dataset.quoteAction === "remover" && form?.querySelectorAll("[data-quote-line]").length > 1) target.closest("[data-quote-line]")?.remove();
});
document.querySelector("#whatsappConversationDetail").addEventListener("submit", async (event) => { const form = event.target; if (!(form instanceof HTMLFormElement) || form.dataset.whatsappForm !== "cliente") return; event.preventDefault(); event.stopImmediatePropagation(); const data = new FormData(form); const response = await fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + selectedWhatsappId + "/cliente", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "pf", nome: data.get("nome"), documento: data.get("documento"), telefone: data.get("telefone"), email: data.get("email"), cep: data.get("cep"), logradouro: data.get("logradouro"), numero: data.get("numero"), bairro: data.get("bairro"), cidade: data.get("cidade"), uf: String(data.get("uf") || "").toUpperCase() }) }); if (!response.ok) { const erro = await response.json().catch(() => null); window.alert(erro?.message || "Não foi possível salvar o atendimento."); return; } whatsappServiceMode = ""; whatsappServiceChoiceRequired = true; whatsappScheduleOptions.agenda = []; await loadWhatsappScheduleOptions(); await loadWhatsappConversation(selectedWhatsappId); await loadWhatsappConversations(); }, true);
document.querySelector("#whatsappConversationDetail").addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.dataset.whatsappForm !== "cliente-existente") return;
  event.preventDefault(); event.stopImmediatePropagation();
  const data = new FormData(form);
  const body = { tipo: "pf", nome: data.get("nome"), telefone: data.get("telefone"), email: data.get("email"), cep: data.get("cep"), logradouro: data.get("logradouro"), numero: data.get("numero"), bairro: data.get("bairro"), cidade: data.get("cidade"), uf: String(data.get("uf") || "").toUpperCase() };
  const atualizado = await fetch(apiBaseUrl + "/admin/clientes/" + form.dataset.clienteId, { method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!atualizado.ok) { const erro = await atualizado.json().catch(() => null); window.alert(erro?.message || "Não foi possível atualizar o cliente."); return; }
  const vinculo = await fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + selectedWhatsappId + "/cliente/" + form.dataset.clienteId, { method: "POST", headers: authHeaders() });
  if (!vinculo.ok) { const erro = await vinculo.json().catch(() => null); window.alert(erro?.message || "Cliente atualizado, mas não foi possível vinculá-lo."); return; }
  whatsappClientResolution = ""; whatsappServiceMode = ""; whatsappServiceChoiceRequired = true;
  await loadWhatsappConversation(selectedWhatsappId); await loadWhatsappConversations();
}, true);
document.querySelector("#whatsappConversationDetail").addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.dataset.whatsappForm !== "ia") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const data = new FormData(form);
  const itens = (whatsappAiDraft?.orcamento?.itens || []).map((item, index) => ({ ...item, descricao: String(data.get("ia_item_descricao_" + index) || item.descricao).trim(), quantidade: Number(data.get("ia_item_quantidade_" + index) || item.quantidade), valor_unitario: Number(data.get("ia_item_valor_" + index) || item.valor_unitario) }));
  whatsappAiDraft = { ...whatsappAiDraft, cliente: { ...whatsappAiDraft.cliente, nome: String(data.get("ia_nome") || "").trim(), documento: String(data.get("ia_documento") || "").trim() }, atendimento: { ...whatsappAiDraft.atendimento, servico: String(data.get("ia_servico") || "").trim(), equipamento: String(data.get("ia_equipamento") || "").trim() }, orcamento: { ...whatsappAiDraft.orcamento, titulo: String(data.get("ia_titulo") || "").trim(), itens } };
  void criarRascunhoIa();
}, true);
document.querySelector("#whatsappConversationDetail").addEventListener("change", (event) => {
  if (event.target.name !== "catalogo_item") return; const line = event.target.closest("[data-quote-line]"); const item = whatsappCatalogItems.find((entry) => entry.id === event.target.value); if (line && item) line.querySelector("output").textContent = money(item.valor * Number(line.querySelector('[name="quantidade"]').value || 0));
});
document.querySelector("#whatsappConversationDetail").addEventListener("input", (event) => {
  if (event.target.name !== "quantidade") return; const line = event.target.closest("[data-quote-line]"); const item = whatsappCatalogItems.find((entry) => entry.id === line?.querySelector('[name="catalogo_item"]')?.value); if (line && item) line.querySelector("output").textContent = money(item.valor * Number(event.target.value || 0));
});document.querySelector("#whatsappConversationDetail").addEventListener("submit", async (event) => { event.preventDefault(); const form = event.target; const data = new FormData(form); let response; if (form.id === "whatsappReplyForm") { const texto = String(data.get("texto") || "").trim(); if (!texto) return; response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${selectedWhatsappId}/mensagens\`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ texto }) }); } else if (form.dataset.whatsappForm === "cliente") { response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${selectedWhatsappId}/cliente\`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "pf", nome: data.get("nome"), documento: data.get("documento"), telefone: data.get("telefone"), cep: data.get("cep"), logradouro: data.get("logradouro"), numero: data.get("numero"), bairro: data.get("bairro"), cidade: data.get("cidade"), uf: String(data.get("uf") || "").toUpperCase() }) }); } else if (form.dataset.whatsappForm === "orcamento") { const itens = Array.from(form.querySelectorAll("[data-quote-line]")).map((line) => { const item = whatsappCatalogItems.find((entry) => entry.id === line.querySelector('[name="catalogo_item"]').value); return item && { item_catalogo_id: item.id, tipo: item.tipo, descricao: item.nome, unidade: item.unidade, quantidade: Number(line.querySelector('[name="quantidade"]').value), valor_unitario: Number(item.valor) }; }).filter(Boolean); response = await fetch(\`\${apiBaseUrl}/admin/comercial/orcamentos\`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ cliente_id: selectedWhatsappConversation?.cliente?.id || "", conversa_id: selectedWhatsappId, titulo: data.get("titulo"), valido_ate: data.get("valido_ate") || undefined, itens }) }); } else if (form.dataset.whatsappForm === "os") { const equipeId = String(data.get("equipe_id") || ""); const tecnicoId = String(data.get("tecnico_id") || ""); if (!equipeId && !tecnicoId) { window.alert("Selecione uma equipe ou um técnico antes de agendar."); return; } response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${selectedWhatsappId}/os\`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ titulo: data.get("titulo"), detalhes: data.get("detalhes"), origem: data.get("origem"), equipe_id: equipeId || undefined, tecnico_id: tecnicoId || undefined, agendada_para: \`\${data.get("data")}T\${data.get("horario")}:00\` }) }); }
  if (!response?.ok) { const erro = await response?.json().catch(() => null); window.alert(erro?.message || "Não foi possível salvar o atendimento."); return; } if (form.id === "whatsappReplyForm" && String(data.get("texto") || "").trim() === whatsappScheduleDraft.proposalText) whatsappScheduleDraft.proposalSent = true; whatsappScheduleOptions.agenda = []; await loadWhatsappScheduleOptions(); await loadWhatsappConversation(selectedWhatsappId); await loadWhatsappConversations(); });
async function confirmWhatsappSchedule() { window.alert("A O.S. será criada automaticamente após o aceite do cliente. Não confirme manualmente nesta etapa."); }
document.querySelector("#whatsappConversationDetail").addEventListener("click", (event) => { const target = event.target.closest("[data-whatsapp-action]"); if (!target || !["escolher-orcamento", "escolher-levantamento"].includes(target.dataset.whatsappAction)) return; const titulo = document.querySelector('[name="whatsapp_titulo_comercial"]')?.value?.trim(); if (titulo) whatsappAiDraft = { ...(whatsappAiDraft || {}), orcamento: { ...(whatsappAiDraft?.orcamento || {}), titulo } }; });
`;
