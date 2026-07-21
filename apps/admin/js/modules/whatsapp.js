export const whatsappModule = { view: "whatsapp", summaryId: "whatsappSummary", viewId: "whatsappView" };

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
whatsappSummary.innerHTML = '<article class="os-summary-card os-summary-green"><span>Aguardando atendente</span><strong id="whatsappOpenCount">0</strong><small>Transferencias do Bolt</small></article>';
document.querySelector("#dashboard")?.insertBefore(whatsappSummary, document.querySelector("#preChamadosSummary"));

const whatsappView = document.createElement("section");
whatsappView.className = "worklist hidden";
whatsappView.id = "whatsappView";
whatsappView.innerHTML = '<div class="worklist-heading"><div><span class="kicker">Atendimento digital</span><h2>Conversas WhatsApp</h2></div><button class="refresh-button compact-button" id="whatsappRefreshButton" type="button">Atualizar</button></div><div class="whatsapp-workbench"><section class="whatsapp-queue"><p class="status" id="whatsappListStatus">Carregando...</p><div class="request-list" id="whatsappConversationList"></div></section><aside class="os-detail-panel" id="whatsappConversationDetail"><p class="status">Selecione uma conversa para ver o histórico completo.</p></aside></div>';
document.querySelector("#dashboard")?.append(whatsappView);

let whatsappConversations = [];
let selectedWhatsappId = "";
let whatsappRefreshTimer = 0;
let whatsappEventAbort = null;
let lastWhatsappEvent = "";

function esc(value) { const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML; }
function hideWhatsappView() { whatsappView.classList.add("hidden"); whatsappSummary.classList.add("hidden"); window.clearInterval(whatsappRefreshTimer); whatsappEventAbort?.abort(); }
function showWhatsappView() { document.querySelectorAll("[id$='View'], [id$='Summary']").forEach((element) => element.classList.add("hidden")); document.querySelectorAll(".nav-link").forEach((element) => element.classList.toggle("active", element === whatsappNav)); viewKicker.textContent = "Atendimento digital"; viewTitle.textContent = "Conversas WhatsApp"; whatsappView.classList.remove("hidden"); whatsappSummary.classList.remove("hidden"); void loadWhatsappConversations(); whatsappRefreshTimer = window.setInterval(() => void loadWhatsappConversations(), 5000); void connectWhatsappEvents(); }

async function loadWhatsappConversations() {
  const status = document.querySelector("#whatsappListStatus");
  const response = await fetch(apiBaseUrl + "/admin/whatsapp/conversas", { headers: authHeaders() });
  if (await handleUnauthorized(response)) return;
  if (!response.ok) { status.textContent = "Nao foi possivel carregar as conversas."; return; }
  const result = await response.json();
  whatsappConversations = result.items || [];
  document.querySelector("#whatsappOpenCount").textContent = result.pendentes ?? whatsappConversations.filter((item) => item.status === "humano" && !item.atribuidoUsuarioId).length;
  status.textContent = whatsappConversations.length ? whatsappConversations.length + " conversa(s)" : "Nenhuma conversa recebida.";
  renderWhatsappConversations();
  if (selectedWhatsappId && whatsappConversations.some((item) => item.id === selectedWhatsappId)) void loadWhatsappConversation(selectedWhatsappId);
}

function renderWhatsappConversations() {
  const list = document.querySelector("#whatsappConversationList");
  list.innerHTML = whatsappConversations.map((item) => {
    const last = item.mensagens?.[0]?.texto || "Sem mensagens";
    const pending = item.status === "humano" && !item.atribuidoUsuarioId;
    const status = pending ? "Aguardando atendente" : item.status === "humano" ? "Atendimento: " + (item.atribuidoUsuario?.nome || "humano") : item.status === "encerrada" ? "Encerrada" : "Bolt";
    return '<button class="os-compact-card ' + (pending ? "os-card-attention " : "") + (item.id === selectedWhatsappId ? "is-selected" : "") + '" type="button" data-whatsapp-id="' + esc(item.id) + '"><strong>' + esc(item.nomeContato || item.telefone) + '</strong><span>' + status + '</span><small>' + esc(last.slice(0, 90)) + '</small></button>';
  }).join("");
}

async function loadWhatsappConversation(id) {
  const response = await fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + id, { headers: authHeaders() });
  if (!response.ok) { document.querySelector("#whatsappConversationDetail").innerHTML = '<p class="status">Nao foi possivel abrir esta conversa.</p>'; return; }
  const conversa = await response.json();
  selectedWhatsappId = id;
  void fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + id + "/ler", { method: "PATCH", headers: authHeaders() });
  const pending = conversa.status === "humano" && !conversa.atribuidoUsuarioId;
  const action = conversa.status === "encerrada" ? '<button class="secondary-button" data-whatsapp-action="reabrir">Reabrir</button>' : pending ? '<button class="secondary-button" data-whatsapp-action="assumir">Assumir atendimento</button>' : '<button class="secondary-button" data-whatsapp-action="liberar">Liberar para fila</button><button class="secondary-button" data-whatsapp-action="encerrar">Encerrar</button>';
  const messages = (conversa.mensagens || []).map((item) => '<article class="whatsapp-message whatsapp-message-' + item.direcao + '"><small>' + (item.direcao === "entrada" ? "Cliente" : "AIRMOVEBR") + ' · ' + new Date(item.criadoEm).toLocaleString("pt-BR") + '</small><span>' + esc(item.texto) + '</span></article>').join("") || '<p class="status">Esta conversa ainda nao tem mensagens.</p>';
  const dados = conversa.atendimento?.dados || {};
  const campos = [["Nome", dados.nome], ["Telefone", conversa.telefone], ["Servico", dados.servico], ["Local", dados.cidade_bairro], ["Detalhes", dados.detalhes], ...Object.entries(dados.campos_extra || {})].filter(([, valor]) => valor).map(([rotulo, valor]) => '<div><small>' + esc(String(rotulo).replaceAll("_", " ")) + '</small><strong>' + esc(valor) + '</strong></div>').join("") || '<p class="status">O cliente ainda nao informou dados de qualificacao.</p>';
  const previa = conversa.atendimento?.previaOs || {};
  const links = conversa.cliente ? '<p>Cliente vinculado: <strong>' + esc(conversa.cliente.nome) + '</strong></p>' : '<form data-whatsapp-form="cliente"><h4>Criar cliente</h4><input name="nome" value="' + esc(dados.nome || conversa.nomeContato || "") + '" required><input name="cidade" value="' + esc(dados.cidade_bairro || "") + '" placeholder="Cidade e bairro"><button type="submit">Criar cliente</button></form>';
  const orderForm = conversa.ordemServico ? '<p>O.S. vinculada: <strong>' + esc(conversa.ordemServico.titulo) + '</strong></p>' : '<form data-whatsapp-form="os"><h4>Criar O.S. com os dados da conversa</h4><input name="titulo" value="' + esc(previa.titulo || "") + '" required><textarea name="detalhes" required>' + esc(previa.detalhes || "") + '</textarea><input name="tipo_servico" type="hidden" value="' + esc(previa.tipoServico || "corretiva") + '"><button type="submit">Criar O.S. vinculada</button></form>';
  const reply = conversa.status === "humano" && conversa.atribuidoUsuarioId ? '<form id="whatsappReplyForm"><textarea name="texto" rows="3" placeholder="Responder ao cliente" required></textarea><button type="submit">Enviar resposta</button></form>' : '<p class="status">Assuma o atendimento para responder e impedir respostas do Bolt.</p>';
  const panel = document.querySelector("#whatsappConversationDetail");
  panel.classList.add("is-open");
  panel.innerHTML = '<header class="os-detail-header"><div><h3>' + esc(conversa.nomeContato || conversa.telefone) + '</h3><p>' + esc(conversa.telefone) + ' · ' + esc(conversa.status) + '</p></div><div class="whatsapp-actions">' + action + '</div></header><div class="whatsapp-central"><section><h4>Conversa completa</h4><div class="whatsapp-thread">' + messages + '</div>' + reply + '</section><aside><h4>Dados do cliente</h4><div class="whatsapp-data">' + campos + '</div><div class="whatsapp-links">' + links + orderForm + '</div></aside></div>';
}

async function connectWhatsappEvents() {
  whatsappEventAbort?.abort();
  whatsappEventAbort = new AbortController();
  try { const response = await fetch(apiBaseUrl + "/admin/whatsapp/eventos", { headers: { ...authHeaders(), Accept: "text/event-stream" }, signal: whatsappEventAbort.signal }); if (!response.ok || !response.body) return; const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; while (true) { const part = await reader.read(); if (part.done) break; buffer += decoder.decode(part.value, { stream: true }); const blocks = buffer.split(String.fromCharCode(10) + String.fromCharCode(10)); buffer = blocks.pop() || ""; for (const block of blocks) { const line = block.split(String.fromCharCode(10)).find((item) => item.startsWith("data:")); if (!line) continue; const event = JSON.parse(line.slice(5)); if (event.tipo === "transferida_humano" && lastWhatsappEvent !== event.conversaId) { lastWhatsappEvent = event.conversaId; if (window.Notification?.permission === "granted") new Notification("WhatsApp aguardando atendente"); } void loadWhatsappConversations(); if (selectedWhatsappId === event.conversaId) void loadWhatsappConversation(selectedWhatsappId); } } } catch { /* polling continua ativo */ }
}

async function whatsappAction(action) { const path = action === "assumir" ? "assumir" : action === "liberar" ? "liberar" : action === "reabrir" ? "reabrir" : "encerrar"; const method = action === "encerrar" || action === "reabrir" ? "POST" : "PATCH"; await fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + selectedWhatsappId + "/" + path, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: action === "encerrar" ? JSON.stringify({ motivo: "concluido" }) : undefined }); await loadWhatsappConversation(selectedWhatsappId); await loadWhatsappConversations(); }

whatsappNav.addEventListener("click", (event) => { event.stopImmediatePropagation(); showWhatsappView(); });
document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => { if (link !== whatsappNav) hideWhatsappView(); }));
document.querySelector("#whatsappRefreshButton").addEventListener("click", () => void loadWhatsappConversations());
document.querySelector("#whatsappConversationList").addEventListener("click", (event) => { const target = event.target.closest("[data-whatsapp-id]"); if (target) void loadWhatsappConversation(target.dataset.whatsappId); });
document.querySelector("#whatsappConversationDetail").addEventListener("click", async (event) => { const action = event.target.dataset.whatsappAction; if (action) await whatsappAction(action); });
document.querySelector("#whatsappConversationDetail").addEventListener("submit", async (event) => { event.preventDefault(); const form = event.target; const data = new FormData(form); let response; if (form.id === "whatsappReplyForm") { const texto = String(data.get("texto") || "").trim(); if (!texto) return; response = await fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + selectedWhatsappId + "/mensagens", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ texto }) }); } if (form.dataset.whatsappForm === "cliente") response = await fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + selectedWhatsappId + "/cliente", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "pf", nome: data.get("nome"), telefone: "", cidade: data.get("cidade"), bairro: "" }) }); if (form.dataset.whatsappForm === "os") response = await fetch(apiBaseUrl + "/admin/whatsapp/conversas/" + selectedWhatsappId + "/os", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ titulo: data.get("titulo"), detalhes: data.get("detalhes"), tipo_servico: data.get("tipo_servico") }) }); if (response && !response.ok) { const error = await response.json().catch(() => ({})); window.alert(error.message || "Nao foi possivel concluir a acao."); return; } await loadWhatsappConversation(selectedWhatsappId); await loadWhatsappConversations(); });
`;
