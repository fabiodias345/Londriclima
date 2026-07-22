export const whatsappModule = { view: "whatsapp", summaryId: "whatsappSummary", viewId: "whatsappView" };

export const whatsappRoot = `
const whatsappNav = document.createElement("button");
whatsappNav.className = "nav-link";
whatsappNav.type = "button";
whatsappNav.dataset.view = "whatsapp";
whatsappNav.textContent = "Conversas WhatsApp";
document.querySelector(".nav-group")?.append(whatsappNav);

const whatsappSummary = document.createElement("section");
whatsappSummary.className = "summary-grid hidden whatsapp-summary";
whatsappSummary.id = "whatsappSummary";
whatsappSummary.innerHTML = "";
document.querySelector("#dashboard")?.insertBefore(whatsappSummary, document.querySelector("#preChamadosSummary"));

const whatsappView = document.createElement("section");
whatsappView.className = "worklist hidden whatsapp-workspace";
whatsappView.id = "whatsappView";
whatsappView.innerHTML = \`
  <div class="whatsapp-page-header">
    <div><span class="kicker">Central de atendimento</span><h2>Conversas WhatsApp</h2><p>Organize as solicita&ccedil;&otilde;es e responda seus clientes em um s&oacute; lugar.</p></div>
    <button class="refresh-button compact-button" id="whatsappRefreshButton" type="button">Atualizar</button>
  </div>
  <div class="whatsapp-inbox" role="region" aria-label="Central de conversas WhatsApp">
    <aside class="whatsapp-inbox-list">
      <div class="whatsapp-list-head"><div><strong>Caixa de entrada</strong><span class="whatsapp-list-count" id="whatsappListStatus">Carregando...</span></div><button class="whatsapp-icon-button" type="button" aria-label="Pesquisar conversas">?</button></div>
      <label class="whatsapp-search"><span class="sr-only">Pesquisar conversa</span><input id="whatsappSearchInput" type="search" placeholder="Pesquisar nome ou telefone" autocomplete="off" /></label>
      <div class="whatsapp-filters" role="tablist" aria-label="Filtro de conversas"><button class="is-active" type="button" data-whatsapp-filter="todas">Todas</button><button type="button" data-whatsapp-filter="aguardando">Aguardando <span id="whatsappPendingBadge">0</span></button><button type="button" data-whatsapp-filter="atendimento">Em atendimento</button><button type="button" data-whatsapp-filter="encerradas">Encerradas</button></div>
      <div class="whatsapp-conversation-list" id="whatsappConversationList"></div>
    </aside>
    <section class="whatsapp-conversation-detail" id="whatsappConversationDetail"><div class="whatsapp-empty-state"><span class="whatsapp-empty-icon">&#9673;</span><strong>Selecione uma conversa</strong><p>As mensagens e os dados do cliente aparecer&atilde;o aqui.</p></div></section>
  </div>\`;
document.querySelector("#dashboard")?.append(whatsappView);

let whatsappConversations = [];
let selectedWhatsappId = "";
let whatsappRefreshTimer = 0;
let whatsappEventAbort = null;
let lastWhatsappEvent = "";

function esc(value) { const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML; }\nfunction formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value || "") : date.toLocaleString("pt-BR"); }
function hideWhatsappView() { whatsappView.classList.add("hidden"); whatsappSummary.classList.add("hidden"); window.clearInterval(whatsappRefreshTimer); whatsappEventAbort?.abort(); }
function showWhatsappView() { document.querySelectorAll("[id$='View'], [id$='Summary']").forEach((e) => e.classList.add("hidden")); document.querySelectorAll(".nav-link").forEach((e) => e.classList.toggle("active", e === whatsappNav)); viewKicker.textContent = "Atendimento digital"; viewTitle.textContent = "Conversas WhatsApp"; whatsappView.classList.remove("hidden"); void loadWhatsappConversations(); whatsappRefreshTimer = window.setInterval(() => void loadWhatsappConversations(), 5000); void connectWhatsappEvents(); }

async function loadWhatsappConversations() {
  const status = document.querySelector("#whatsappListStatus");
  const response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas\`, { headers: authHeaders() });
  if (await handleUnauthorized(response)) return;
  if (!response.ok) { status.innerHTML = "N&atilde;o foi poss&iacute;vel carregar."; return; }
  const result = await response.json(); whatsappConversations = result.items || [];
  const pendingCount = result.pendentes ?? whatsappConversations.filter((item) => item.status === "humano" && !item.atribuidoUsuarioId).length;
  document.querySelector("#whatsappPendingBadge").textContent = pendingCount;
  status.textContent = whatsappConversations.length ? \`\${whatsappConversations.length} conversas\` : "Nenhuma conversa"; renderWhatsappConversations();
}

function getWhatsappState(item) {
  if (item.status === "encerrada") return { key: "encerradas", className: "is-closed", label: "Encerrada", ageMinutes: 0 };
  if (item.status === "humano" && item.atribuidoUsuarioId) return { key: "atendimento", className: "is-attending", label: "Em atendimento", ageMinutes: 0 };
  const reference = new Date(item.ultimaMensagemEm || item.criadoEm || Date.now());
  const ageMinutes = Number.isNaN(reference.getTime()) ? 0 : Math.max(0, Math.floor((Date.now() - reference.getTime()) / 60000));
  return ageMinutes >= 15 ? { key: "aguardando", className: "is-overdue", label: "Aguardando h&aacute; muito tempo", ageMinutes } : { key: "aguardando", className: "is-waiting", label: "Aguardando atendimento", ageMinutes };
}
function formatWaiting(ageMinutes) { return ageMinutes < 1 ? "Agora" : ageMinutes < 60 ? \`\${ageMinutes} min\` : \`\${Math.floor(ageMinutes / 60)} h \${ageMinutes % 60} min\`; }
function renderWhatsappConversations() {
  const list = document.querySelector("#whatsappConversationList");
  const query = String(document.querySelector("#whatsappSearchInput")?.value || "").toLowerCase().trim();
  const filter = document.querySelector("[data-whatsapp-filter].is-active")?.dataset.whatsappFilter || "todas";
  const items = whatsappConversations.filter((item) => { const state = getWhatsappState(item); const text = \`\${item.nomeContato || ""} \${item.telefone || ""}\`.toLowerCase(); return (!query || text.includes(query)) && (filter === "todas" || filter === state.key); });
  list.innerHTML = items.length ? items.map((item) => { const state = getWhatsappState(item); const last = item.mensagens?.[0]?.texto || "Sem mensagens"; return \`<button class="whatsapp-conversation-card \${state.className} \${selectedWhatsappId === item.id ? "is-selected" : ""}" type="button" data-whatsapp-id="\${esc(item.id)}"><span class="whatsapp-status-dot" aria-hidden="true"></span><span class="whatsapp-avatar">\${esc((item.nomeContato || item.telefone || "?").slice(0, 1).toUpperCase())}</span><span class="whatsapp-conversation-copy"><strong>\${esc(item.nomeContato || item.telefone)}</strong><small>\${esc(last.slice(0, 78))}</small><em>\${state.label}</em></span><span class="whatsapp-conversation-time">\${state.ageMinutes ? formatWaiting(state.ageMinutes) : ""}</span></button>\`; }).join("") : \`<div class="whatsapp-list-empty">Nenhuma conversa encontrada.</div>\`;
}

async function loadWhatsappConversation(id) {
  const response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${id}\`, { headers: authHeaders() }); if (!response.ok) return;
  const conversa = await response.json(); selectedWhatsappId = id; void fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${id}/ler\`, { method: "PATCH", headers: authHeaders() });
  const action = conversa.status === "encerrada" ? \`<button class="secondary-button" data-whatsapp-action="reabrir">Reabrir conversa</button>\` : conversa.atribuidoUsuario ? \`<button class="secondary-button" data-whatsapp-action="liberar">Liberar para fila</button><button class="danger-button" data-whatsapp-action="encerrar">Encerrar</button>\` : \`<button class="danger-button" data-whatsapp-action="encerrar">Encerrar</button>\`;
  const clientData = conversa.cliente ? \`<div class="whatsapp-linked-client"><span>Cliente vinculado</span><strong>\${esc(conversa.cliente.nome)}</strong></div>\` : \`<form data-whatsapp-form="cliente" class="whatsapp-context-form"><h4>Criar cliente</h4><div class="whatsapp-address-grid"><label>Nome completo<input name="nome" placeholder="Nome completo" autocomplete="name" required></label><label>Telefone<input name="telefone" placeholder="Telefone" autocomplete="tel"></label><label>CEP<input name="cep" placeholder="00000-000" autocomplete="postal-code"></label><label>UF<input name="uf" placeholder="PR" maxlength="2" autocomplete="address-level1"></label><label class="whatsapp-address-wide">Endere&ccedil;o<input name="logradouro" placeholder="Rua, avenida ou rodovia" autocomplete="address-line1"></label><label>N&uacute;mero<input name="numero" placeholder="N&ordm;" autocomplete="address-line2"></label><label>Complemento<input name="complemento" placeholder="Sala, bloco..." autocomplete="address-line2"></label><label>Bairro<input name="bairro" placeholder="Bairro" autocomplete="address-level3"></label><label>Cidade<input name="cidade" placeholder="Cidade" autocomplete="address-level2"></label></div><button type="submit">Criar cliente</button></form>\`;
  document.querySelector("#whatsappConversationDetail").innerHTML = \`<header class="whatsapp-detail-header"><div class="whatsapp-detail-person"><span class="whatsapp-avatar whatsapp-avatar-large">\${esc((conversa.nomeContato || conversa.telefone || "?").slice(0, 1).toUpperCase())}</span><div><h3>\${esc(conversa.nomeContato || conversa.telefone)}</h3><p>\${esc(conversa.telefone || "Sem telefone")} &middot; \${conversa.status === "encerrada" ? "Conversa encerrada" : conversa.atribuidoUsuario ? \`Atendimento com \${esc(conversa.atribuidoUsuario.nome)}\` : "Aguardando atendente"}</p></div></div><div class="whatsapp-detail-actions">\${action}</div></header><div class="whatsapp-detail-body"><div class="whatsapp-thread-wrap"><div class="whatsapp-thread-heading"><strong>Hist&oacute;rico da conversa</strong><span>\${conversa.mensagens.length} mensagens</span></div><div class="whatsapp-thread">\${conversa.mensagens.map((item) => \`<div class="whatsapp-message whatsapp-message-\${item.direcao}"><small>\${item.direcao === "entrada" ? "Cliente" : "AIRMOVEBR"} &middot; \${esc(formatDate(item.criadoEm))}</small><p>\${esc(item.texto)}</p></div>\`).join("")}</div><form class="whatsapp-reply-form" id="whatsappReplyForm"><textarea name="texto" rows="2" placeholder="Escreva uma resposta..." required></textarea><div><span>Enter para enviar</span><button type="submit">Enviar resposta</button></div></form></div><aside class="whatsapp-context"><div class="whatsapp-context-heading"><span>Contexto</span><strong>Dados do cliente</strong></div><dl><div><dt>Nome</dt><dd>\${esc(conversa.nomeContato || conversa.telefone)}</dd></div><div><dt>Telefone</dt><dd>\${esc(conversa.telefone || "N&atilde;o informado")}</dd></div><div><dt>Servi&ccedil;o</dt><dd>\${esc(conversa.dados?.servico || conversa.dados?.tipo_servico || "N&atilde;o informado")}</dd></div><div><dt>Local</dt><dd>\${esc(conversa.dados?.local || conversa.dados?.cidade || "N&atilde;o informado")}</dd></div></dl>\${clientData}<form data-whatsapp-form="os" class="whatsapp-context-form"><h4>Criar O.S.</h4><input name="titulo" placeholder="T&iacute;tulo da O.S." required><textarea name="detalhes" rows="3" placeholder="Detalhes do servi&ccedil;o"></textarea><button type="submit">Criar O.S.</button></form></aside></div>\`;
  renderWhatsappConversations();
  requestAnimationFrame(() => { const thread = document.querySelector(".whatsapp-thread"); if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" }); });
}

async function connectWhatsappEvents() {
  whatsappEventAbort?.abort(); whatsappEventAbort = new AbortController();
  try { const response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/eventos\`, { headers: { ...authHeaders(), Accept: "text/event-stream" }, signal: whatsappEventAbort.signal }); if (!response.ok || !response.body) return; const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; while (true) { const part = await reader.read(); if (part.done) break; buffer += decoder.decode(part.value, { stream: true }); const blocks = buffer.split("\\n\\n"); buffer = blocks.pop() || ""; for (const block of blocks) { const line = block.split("\\n").find((item) => item.startsWith("data:")); if (!line) continue; const event = JSON.parse(line.slice(5)); if (event.tipo === "transferida_humano" && lastWhatsappEvent !== event.conversaId) { lastWhatsappEvent = event.conversaId; if (window.Notification?.permission === "granted") new Notification("WhatsApp aguardando atendente"); } void loadWhatsappConversations(); if (selectedWhatsappId === event.conversaId) void loadWhatsappConversation(selectedWhatsappId); } } } catch { /* polling continua ativo */ }
}

async function whatsappAction(action) { const path = action === "assumir" ? "assumir" : action === "liberar" ? "liberar" : action === "reabrir" ? "reabrir" : "encerrar"; const method = action === "encerrar" || action === "reabrir" ? "POST" : "PATCH"; await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${selectedWhatsappId}/\${path}\`, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: action === "encerrar" ? JSON.stringify({ motivo: "concluido" }) : undefined }); await loadWhatsappConversation(selectedWhatsappId); await loadWhatsappConversations(); }

whatsappNav.addEventListener("click", (event) => { event.stopImmediatePropagation(); showWhatsappView(); });
document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => { if (link !== whatsappNav) hideWhatsappView(); }));
document.querySelector("#whatsappRefreshButton").addEventListener("click", () => void loadWhatsappConversations());
document.querySelector("#whatsappSearchInput").addEventListener("input", renderWhatsappConversations);
document.querySelector(".whatsapp-filters").addEventListener("click", (event) => { const target = event.target.closest("[data-whatsapp-filter]"); if (!target) return; document.querySelectorAll("[data-whatsapp-filter]").forEach((item) => item.classList.toggle("is-active", item === target)); renderWhatsappConversations(); });
document.querySelector("#whatsappConversationList").addEventListener("click", (event) => { const target = event.target.closest("[data-whatsapp-id]"); if (target) void loadWhatsappConversation(target.dataset.whatsappId); });
document.querySelector("#whatsappConversationDetail").addEventListener("click", async (event) => { const action = event.target.dataset.whatsappAction; if (action) await whatsappAction(action); });
document.querySelector("#whatsappConversationDetail").addEventListener("submit", async (event) => { event.preventDefault(); const form = event.target; const data = new FormData(form); if (form.id === "whatsappReplyForm") { const texto = String(data.get("texto") || "").trim(); if (!texto) return; await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${selectedWhatsappId}/mensagens\`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ texto }) }); } if (form.dataset.whatsappForm === "cliente") { await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${selectedWhatsappId}/cliente\`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "pf", nome: data.get("nome"), telefone: data.get("telefone"), cep: data.get("cep"), logradouro: data.get("logradouro"), numero: data.get("numero"), complemento: data.get("complemento"), bairro: data.get("bairro"), cidade: data.get("cidade"), uf: String(data.get("uf") || "").toUpperCase() }) }); } if (form.dataset.whatsappForm === "os") { await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${selectedWhatsappId}/os\`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ titulo: data.get("titulo"), detalhes: data.get("detalhes"), tipo_servico: "corretiva" }) }); } await loadWhatsappConversation(selectedWhatsappId); await loadWhatsappConversations(); });
`;
