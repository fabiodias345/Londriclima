export const whatsappModule = {
  view: "whatsapp",
  summaryId: "whatsappSummary",
  viewId: "whatsappView"
};

export const whatsappRoot = `
const whatsappNav = document.createElement("button");
whatsappNav.className = "nav-link";
whatsappNav.type = "button";
whatsappNav.dataset.view = "whatsapp";
whatsappNav.textContent = "Conversas WhatsApp";
document.querySelector(".nav-group")?.append(whatsappNav);

const whatsappSummary = document.createElement("section");
whatsappSummary.className = "summary-grid hidden";
whatsappSummary.id = "whatsappSummary";
whatsappSummary.innerHTML = '<article class="os-summary-card os-summary-green"><span>Conversas abertas</span><strong id="whatsappOpenCount">0</strong><small>Bot e atendimento humano</small></article>';
document.querySelector("#dashboard")?.insertBefore(whatsappSummary, document.querySelector("#preChamadosSummary"));

const whatsappView = document.createElement("section");
whatsappView.className = "worklist hidden";
whatsappView.id = "whatsappView";
whatsappView.innerHTML = \`
  <div class="worklist-heading"><div><span class="kicker">Atendimento digital</span><h2>Conversas WhatsApp</h2></div><button class="refresh-button compact-button" id="whatsappRefreshButton" type="button">Atualizar</button></div>
  <div class="os-workbench-grid"><div><p class="status" id="whatsappListStatus">Carregando...</p><div class="request-list" id="whatsappConversationList"></div></div><aside class="os-detail-panel" id="whatsappConversationDetail"><p class="status">Selecione uma conversa.</p></aside></div>
\`;
document.querySelector("#dashboard")?.append(whatsappView);

let whatsappConversations = [];
let selectedWhatsappId = "";

function hideWhatsappView() {
  whatsappView.classList.add("hidden");
  whatsappSummary.classList.add("hidden");
}

function showWhatsappView() {
  document.querySelectorAll("[id$='View'], [id$='Summary']").forEach((element) => element.classList.add("hidden"));
  document.querySelectorAll(".nav-link").forEach((element) => element.classList.toggle("active", element === whatsappNav));
  viewKicker.textContent = "Atendimento digital";
  viewTitle.textContent = "Conversas WhatsApp";
  whatsappView.classList.remove("hidden");
  whatsappSummary.classList.remove("hidden");
  void loadWhatsappConversations();
}

async function loadWhatsappConversations() {
  const status = document.querySelector("#whatsappListStatus");
  status.textContent = "Carregando...";
  const response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas\`, { headers: authHeaders() });
  if (await handleUnauthorized(response)) return;
  if (!response.ok) { status.textContent = "Nao foi possivel carregar as conversas."; return; }
  const result = await response.json();
  whatsappConversations = result.items || [];
  document.querySelector("#whatsappOpenCount").textContent = whatsappConversations.filter((item) => item.status !== "encerrada").length;
  status.textContent = whatsappConversations.length ? \`\${whatsappConversations.length} conversa(s)\` : "Nenhuma conversa recebida.";
  renderWhatsappConversations();
}

function renderWhatsappConversations() {
  const list = document.querySelector("#whatsappConversationList");
  list.innerHTML = whatsappConversations.map((item) => {
    const last = item.mensagens?.[0]?.texto || "Sem mensagens";
    return \`<button class="os-compact-card" type="button" data-whatsapp-id="\${item.id}"><strong>\${item.nomeContato || item.telefone}</strong><span>\${item.status === "humano" ? "Atendimento humano" : "Bot"}</span><small>\${last.slice(0, 90)}</small></button>\`;
  }).join("");
}

async function loadWhatsappConversation(id) {
  const response = await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${id}\`, { headers: authHeaders() });
  if (!response.ok) return;
  const conversa = await response.json();
  selectedWhatsappId = id;
  const detail = document.querySelector("#whatsappConversationDetail");
  detail.innerHTML = \`<h3>\${conversa.nomeContato || conversa.telefone}</h3><p class="status">Status: \${conversa.status}</p><div class="whatsapp-thread">\${conversa.mensagens.map((item) => \`<p class="whatsapp-message whatsapp-message-\${item.direcao}"><small>\${item.direcao === "entrada" ? "Cliente" : "AIRMOVEBR"}</small>\${item.texto}</p>\`).join("")}</div><button class="secondary-button" data-whatsapp-action="assumir">Assumir atendimento</button><form id="whatsappReplyForm"><textarea name="texto" rows="3" placeholder="Responder ao cliente"></textarea><button type="submit">Enviar resposta</button></form>\`;
}

whatsappNav.addEventListener("click", (event) => { event.stopImmediatePropagation(); showWhatsappView(); });
document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => { if (link !== whatsappNav) hideWhatsappView(); }));
document.querySelector("#whatsappRefreshButton").addEventListener("click", () => void loadWhatsappConversations());
document.querySelector("#whatsappConversationList").addEventListener("click", (event) => { const target = event.target.closest("[data-whatsapp-id]"); if (target) void loadWhatsappConversation(target.dataset.whatsappId); });
document.querySelector("#whatsappConversationDetail").addEventListener("click", async (event) => { if (event.target.dataset.whatsappAction !== "assumir") return; await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${selectedWhatsappId}/assumir\`, { method: "PATCH", headers: authHeaders() }); await loadWhatsappConversation(selectedWhatsappId); });
document.querySelector("#whatsappConversationDetail").addEventListener("submit", async (event) => { if (event.target.id !== "whatsappReplyForm") return; event.preventDefault(); const texto = String(new FormData(event.target).get("texto") || "").trim(); if (!texto) return; await fetch(\`\${apiBaseUrl}/admin/whatsapp/conversas/\${selectedWhatsappId}/mensagens\`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ texto }) }); await loadWhatsappConversation(selectedWhatsappId); });
`;
