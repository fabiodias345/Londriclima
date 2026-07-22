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
whatsappSummary.innerHTML = '<article class="os-summary-card os-summary-green"><span>Aguardando atendente</span><strong id="whatsappOpenCount">0</strong><small>TransferÃƒÂªncias do Bolt</small></article>';
document.querySelector("#dashboard")?.insertBefore(whatsappSummary, document.querySelector("#preChamadosSummary"));

const whatsappView = document.createElement("section");
whatsappView.className = "worklist hidden whatsapp-workspace";
whatsappView.id = "whatsappView";
whatsappView.innerHTML = \`
  <div class="whatsapp-page-header">
    <div><span class="kicker">Central de atendimento</span><h2>Conversas WhatsApp</h2><p>Organize as solicitaÃƒÂ§ÃƒÂµes e responda seus clientes em um sÃƒÂ³ lugar.</p></div>
    <button class="refresh-button compact-button" id="whatsappRefreshButton" type="button">Atualizar</button>
  </div>
  <div class="whatsapp-inbox" role="region" aria-label="Central de conversas WhatsApp">
    <aside class="whatsapp-inbox-list">
      <div class="whatsapp-list-head"><div><strong>Caixa de entrada</strong><span class="whatsapp-list-count" id="whatsappListStatus">Carregando...</span></div><button class="whatsapp-icon-button" type="button" aria-label="Pesquisar conversas">Ã¢Å’â€¢</button></div>
      <label class="whatsapp-search"><span class="sr-only">Pesquisar conversa</span><input id="whatsappSearchInput" type="search" placeholder="Pesquisar nome ou telefone" autocomplete="off" /></label>
      <div class="whatsapp-filters" role="tablist" aria-label="Filtro de conversas"><button class="is-active" type="button" data-whatsapp-filter="todas">Todas</button><button type="button" data-whatsapp-filter="pendentes">Pendentes <span id="whatsappPendingBadge">0</span></button><button type="button" data-whatsapp-filter="minhas">Minhas</button></div>
      <div class="whatsapp-conversation-list" id="whatsappConversationList"></div>
    </aside>
    <section class="whatsapp-conversation-detail" id="whatsappConversationDetail"><div class="whatsapp-empty-state"><span class="whatsapp-empty-icon">Ã¢â€”Å’</span><strong>Selecione uma conversa</strong><p>As mensagens e os dados do cliente aparecerÃƒÂ£o aqui.</p></div></section>
  </div>\`;
document.querySelector("#dashboard")?.append(whatsappView);

let whatsappConversations = [];
let selectedWhatsappId = "";
let whatsappRefreshTimer = 0;
let whatsappEventAbort = null;
let lastWhatsappEvent = "";

function esc(value) { const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML; }
function hideWhatsappView() { whatsappView.classList.add("hidden"); whatsappSummary.classList.add("hidden"); window.clearInterval(whatsappRefreshTimer); whatsappEventAbort?.abort(); }
function showWhatsappView() { document.querySelectorAll("[id$='View'], [id$='Summary']").forEach((e) => e.classList.add("hidden")); document.querySelectorAll(".nav-link").forEach((e) => e.classList.toggle("active", e === whatsappNav)); viewKicker.textContent = "Atendimento digital"; viewTitle.textContent = "Conversas WhatsApp"; whatsappView.classList.remove("hidden"); whatsappSummary.classList.remove("hidden"); void loadWhatsappConversations(); whatsappRefreshTimer = window.setInterval(() => void loadWhatsappConversations(), 5000); void connectWhatsappEvents(); }

async function loadWhatsappConversations() {
  const status = document.querySelector("#whatsappListStatus");
  const response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas\`, { headers: authHeaders() });
  if (await handleUnauthorized(response)) return;
  if (!response.ok) { status.textContent = "NÃƒÂ£o foi possÃƒÂ­vel carregar."; return; }
  const result = await response.json(); whatsappConversations = result.items || [];
  const pendingCount = result.pendentes ?? whatsappConversations.filter((item) => item.status === "humano" && !item.atribuidoUsuarioId).length;
  document.querySelector("#whatsappOpenCount").textContent = pendingCount;
  document.querySelector("#whatsappPendingBadge").textContent = pendingCount;
  status.textContent = whatsappConversations.length ? \`\${whatsappConversations.length} conversas\` : "Nenhuma conversa"; renderWhatsappConversations();
}

function renderWhatsappConversations() {
  const list = document.querySelector("#whatsappConversationList");
  const query = String(document.querySelector("#whatsappSearchInput")?.value || "").toLowerCase().trim();
  const filter = document.querySelector("[data-whatsapp-filter].is-active")?.dataset.whatsappFilter || "todas";
  const items = whatsappConversations.filter((item) => { const pending = item.status === "humano" && !item.atribuidoUsuarioId; const mine = item.atribuidoUsuarioId; const text = \`\${item.nomeContato || ""} \${item.telefone || ""}\`.toLowerCase(); return (!query || text.includes(query)) && (filter === "todas" || (filter === "pendentes" && pending) || (filter === "minhas" && mine)); });
  list.innerHTML = items.length ? items.map((item) => { const last = item.mensagens?.[0]?.texto || "Sem mensagens"; const pending = item.status === "humano" && !item.atribuidoUsuarioId; return \`<button class="whatsapp-conversation-card \${pending ? "is-pending" : ""} \${selectedWhatsappId === item.id ? "is-selected" : ""}" type="button" data-whatsapp-id="\${esc(item.id)}"><span class="whatsapp-avatar">\${esc((item.nomeContato || item.telefone || "?").slice(0, 1).toUpperCase())}</span><span class="whatsapp-conversation-copy"><strong>\${esc(item.nomeContato || item.telefone)}</strong><small>\${esc(last.slice(0, 78))}</small><em>\${pending ? "Aguardando atendente" : item.status === "humano" ? \`Com \${esc(item.atribuidoUsuario?.nome || "atendente")}\` : item.status === "encerrada" ? "Encerrada" : "Bolt"}</em></span><span class="whatsapp-conversation-time">\${pending ? "Novo" : ""}</span></button>\`; }).join("") : \`<div class="whatsapp-list-empty">Nenhuma conversa encontrada.</div>\`;
}

async function loadWhatsappConversation(id) {
  const response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${id}\`, { headers: authHeaders() }); if (!response.ok) return;
  const conversa = await response.json(); selectedWhatsappId = id; void fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${id}/ler\`, { method: "PATCH", headers: authHeaders() });
  const pending = conversa.status === "humano" && !conversa.atribuidoUsuarioId;
  const action = conversa.status === "encerrada" ? \`<button class="secondary-button" data-whatsapp-action="reabrir">Reabrir conversa</button>\` : pending ? \`<button class="whatsapp-primary-action" data-whatsapp-action="assumir">Assumir atendimento</button>\` : \`<button class="secondary-button" data-whatsapp-action="liberar">Liberar para fila</button><button class="danger-button" data-whatsapp-action="encerrar">Encerrar</button>\`;
  const clientData = conversa.cliente ? \`<div class="whatsapp-linked-client"><span>Cliente vinculado</span><strong>\${esc(conversa.cliente.nome)}</strong></div>\` : \`<form data-whatsapp-form="cliente" class="whatsapp-context-form"><h4>Criar cliente</h4><input name="nome" placeholder="Nome completo" required><input name="cidade" placeholder="Cidade"><input name="bairro" placeholder="Bairro"><button type="submit">Criar cliente</button></form>\`;
  document.querySelector("#whatsappConversationDetail").innerHTML = \`<header class="whatsapp-detail-header"><div class="whatsapp-detail-person"><span class="whatsapp-avatar whatsapp-avatar-large">\${esc((conversa.nomeContato || conversa.telefone || "?").slice(0, 1).toUpperCase())}</span><div><h3>\${esc(conversa.nomeContato || conversa.telefone)}</h3><p>\${esc(conversa.telefone || "Sem telefone")} Ã‚Â· \${conversa.status === "encerrada" ? "Conversa encerrada" : conversa.atribuidoUsuario ? \`Atendimento com \${esc(conversa.atribuidoUsuario.nome)}\` : "Aguardando atendente"}</p></div></div><div class="whatsapp-detail-actions">\${action}</div></header><div class="whatsapp-detail-body"><div class="whatsapp-thread-wrap"><div class="whatsapp-thread-heading"><strong>HistÃƒÂ³rico da conversa</strong><span>\${conversa.mensagens.length} mensagens</span></div><div class="whatsapp-thread">\${conversa.mensagens.map((item) => \`<div class="whatsapp-message whatsapp-message-\${item.direcao}"><small>\${item.direcao === "entrada" ? "Cliente" : "AIRMOVEBR"} Ã‚Â· \${esc(item.criadoEm || "")}</small><p>\${esc(item.texto)}</p></div>\`).join("")}</div><form class="whatsapp-reply-form" id="whatsappReplyForm"><textarea name="texto" rows="2" placeholder="Escreva uma resposta..." required></textarea><div><span>Enter para enviar</span><button type="submit">Enviar resposta</button></div></form></div><aside class="whatsapp-context"><div class="whatsapp-context-heading"><span>Contexto</span><strong>Dados do cliente</strong></div><dl><div><dt>Nome</dt><dd>\${esc(conversa.nomeContato || conversa.telefone)}</dd></div><div><dt>Telefone</dt><dd>\${esc(conversa.telefone || "NÃƒÂ£o informado")}</dd></div><div><dt>ServiÃƒÂ§o</dt><dd>\${esc(conversa.dados?.servico || conversa.dados?.tipo_servico || "NÃƒÂ£o informado")}</dd></div><div><dt>Local</dt><dd>\${esc(conversa.dados?.local || conversa.dados?.cidade || "NÃƒÂ£o informado")}</dd></div></dl>\${clientData}<form data-whatsapp-form="os" class="whatsapp-context-form"><h4>Criar O.S.</h4><input name="titulo" placeholder="TÃƒÂ­tulo da O.S." required><textarea name="detalhes" rows="3" placeholder="Detalhes do serviÃƒÂ§o"></textarea><button type="submit">Criar O.S.</button></form></aside></div>\`;
  renderWhatsappConversations();
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
document.querySelector("#whatsappConversationDetail").addEventListener("submit", async (event) => { event.preventDefault(); const form = event.target; const data = new FormData(form); if (form.id === "whatsappReplyForm") { const texto = String(data.get("texto") || "").trim(); if (!texto) return; await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${selectedWhatsappId}/mensagens\`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ texto }) }); } if (form.dataset.whatsappForm === "cliente") { await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${selectedWhatsappId}/cliente\`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "pf", nome: data.get("nome"), telefone: "", cidade: data.get("cidade"), bairro: data.get("bairro") }) }); } if (form.dataset.whatsappForm === "os") { await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${selectedWhatsappId}/os\`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ titulo: data.get("titulo"), detalhes: data.get("detalhes"), tipo_servico: "corretiva" }) }); } await loadWhatsappConversation(selectedWhatsappId); await loadWhatsappConversations(); });
`;
