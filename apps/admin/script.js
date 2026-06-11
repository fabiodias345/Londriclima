const apiBaseUrl = "http://localhost:3000/api/v1";
const loginPanel = document.querySelector("#loginPanel");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#loginForm");
const loginStatus = document.querySelector("#loginStatus");
const listStatus = document.querySelector("#listStatus");
const requestList = document.querySelector("#requestList");
const pendingCount = document.querySelector("#pendingCount");
const refreshButton = document.querySelector("#refreshButton");
const logoutButton = document.querySelector("#logoutButton");
const navLinks = document.querySelectorAll(".nav-link");
const viewKicker = document.querySelector("#viewKicker");
const viewTitle = document.querySelector("#viewTitle");
const preChamadosSummary = document.querySelector("#preChamadosSummary");
const frotaSummary = document.querySelector("#frotaSummary");
const agendaSummary = document.querySelector("#agendaSummary");
const clientesSummary = document.querySelector("#clientesSummary");
const relatoriosSummary = document.querySelector("#relatoriosSummary");
const preChamadosView = document.querySelector("#preChamadosView");
const frotaView = document.querySelector("#frotaView");
const agendaView = document.querySelector("#agendaView");
const clientesView = document.querySelector("#clientesView");
const relatoriosView = document.querySelector("#relatoriosView");
const fleetMap = document.querySelector("#fleetMap");
const fleetList = document.querySelector("#fleetList");
const fleetStatus = document.querySelector("#fleetStatus");
const vehicleCount = document.querySelector("#vehicleCount");
const movingCount = document.querySelector("#movingCount");
const fuelForm = document.querySelector("#fuelForm");
const fuelVehicleSelect = document.querySelector("#fuelVehicleSelect");
const fuelStatus = document.querySelector("#fuelStatus");
const fuelHistoryStatus = document.querySelector("#fuelHistoryStatus");
const fuelHistoryList = document.querySelector("#fuelHistoryList");
const agendaStatus = document.querySelector("#agendaStatus");
const agendaList = document.querySelector("#agendaList");
const agendaCount = document.querySelector("#agendaCount");
const attendanceCount = document.querySelector("#attendanceCount");
const todayCount = document.querySelector("#todayCount");
const clientesStatus = document.querySelector("#clientesStatus");
const clientesList = document.querySelector("#clientesList");
const clientForm = document.querySelector("#clientForm");
const clientFormStatus = document.querySelector("#clientFormStatus");
const resetClientFormButton = document.querySelector("#resetClientFormButton");
const clientCount = document.querySelector("#clientCount");
const clientOpenCount = document.querySelector("#clientOpenCount");
const equipmentCount = document.querySelector("#equipmentCount");
const relatoriosStatus = document.querySelector("#relatoriosStatus");
const reportGrid = document.querySelector("#reportGrid");
const reportOsCount = document.querySelector("#reportOsCount");
const reportRevenue = document.querySelector("#reportRevenue");
const automationCount = document.querySelector("#automationCount");
const fleetReportStatus = document.querySelector("#fleetReportStatus");
const fleetReportList = document.querySelector("#fleetReportList");

let activeView = "preChamados";
let latestFleetItems = [];
let latestClients = [];
let dispatchOptions = {
  equipes: [],
  tecnicos: []
};

const mapBounds = {
  minLat: -23.38,
  maxLat: -23.25,
  minLng: -51.24,
  maxLng: -51.08
};

function getToken() {
  return localStorage.getItem("londriclima_access_token");
}

function setToken(token) {
  localStorage.setItem("londriclima_access_token", token);
}

function clearToken() {
  localStorage.removeItem("londriclima_access_token");
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`
  };
}

function showDashboard() {
  loginPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");
}

function showLogin() {
  dashboard.classList.add("hidden");
  loginPanel.classList.remove("hidden");
}

async function login(event) {
  event.preventDefault();
  loginStatus.textContent = "";
  const submitButton = loginForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Entrando...";

  const data = new FormData(loginForm);

  try {
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: String(data.get("email") || ""),
        senha: String(data.get("senha") || "")
      })
    });

    if (!response.ok) {
      loginStatus.textContent = "Login invalido ou API indisponivel.";
      return;
    }

    const result = await response.json();
    setToken(result.access_token);
    showDashboard();
    await loadActiveView();
  } catch {
    loginStatus.textContent = "Nao foi possivel conectar na API em localhost:3000.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Entrar";
  }
}

async function loadActiveView() {
  if (activeView === "frota") {
    await loadFrota();
    return;
  }

  if (activeView === "agenda") {
    await loadAgenda();
    return;
  }

  if (activeView === "clientes") {
    await loadClientes();
    return;
  }

  if (activeView === "relatorios") {
    await loadRelatorios();
    return;
  }

  await loadPreChamados();
}

function setActiveView(view) {
  activeView = view;

  for (const link of navLinks) {
    link.classList.toggle("active", link.dataset.view === view);
  }

  const meta = {
    preChamados: ["Operacao comercial", "Pre-chamados do site"],
    frota: ["Monitoramento operacional", "Localizacao da frota"],
    agenda: ["Despacho de servicos", "Agenda operacional"],
    clientes: ["Relacionamento", "Clientes e equipamentos"],
    relatorios: ["Gestao", "Relatorios do MVP"]
  }[view] ?? ["Operacao comercial", "Pre-chamados do site"];

  viewKicker.textContent = meta[0];
  viewTitle.textContent = meta[1];
  preChamadosSummary.classList.toggle("hidden", view !== "preChamados");
  frotaSummary.classList.toggle("hidden", view !== "frota");
  agendaSummary.classList.toggle("hidden", view !== "agenda");
  clientesSummary.classList.toggle("hidden", view !== "clientes");
  relatoriosSummary.classList.toggle("hidden", view !== "relatorios");
  preChamadosView.classList.toggle("hidden", view !== "preChamados");
  frotaView.classList.toggle("hidden", view !== "frota");
  agendaView.classList.toggle("hidden", view !== "agenda");
  clientesView.classList.toggle("hidden", view !== "clientes");
  relatoriosView.classList.toggle("hidden", view !== "relatorios");
}

async function loadPreChamados() {
  listStatus.textContent = "Carregando...";

  let response;

  try {
    response = await fetch(`${apiBaseUrl}/admin/pre-chamados`, {
      headers: authHeaders()
    });
  } catch {
    listStatus.textContent = "API local indisponivel em localhost:3000.";
    return;
  }

  if (await handleUnauthorized(response)) {
    return;
  }

  if (!response.ok) {
    listStatus.textContent = "Nao foi possivel carregar os pre-chamados.";
    return;
  }

  const result = await response.json();
  await loadDispatchOptions();
  pendingCount.textContent = result.total;
  listStatus.textContent = result.total === 1 ? "1 pendente" : `${result.total} pendentes`;
  renderPreChamados(result.items);
}

async function loadFrota() {
  fleetStatus.textContent = "Carregando...";

  let response;

  try {
    response = await fetch(`${apiBaseUrl}/admin/frota/localizacoes`, {
      headers: authHeaders()
    });
  } catch {
    fleetStatus.textContent = "API local indisponivel em localhost:3000.";
    return;
  }

  if (await handleUnauthorized(response)) {
    return;
  }

  if (!response.ok) {
    fleetStatus.textContent = "Nao foi possivel carregar a frota.";
    return;
  }

  const result = await response.json();
  const moving = result.items.filter((item) => (item.localizacao?.velocidade_kmh || 0) > 0).length;

  latestFleetItems = result.items;
  vehicleCount.textContent = result.total;
  movingCount.textContent = moving;
  fleetStatus.textContent = result.total === 1 ? "1 veiculo" : `${result.total} veiculos`;
  renderFrota(result.items);
  renderFuelVehicleOptions(result.items);
  await loadFuelHistory();
}

async function loadDispatchOptions() {
  const result = await fetchAdminJson("/admin/opcoes-despacho", listStatus);

  if (!result) {
    dispatchOptions = {
      equipes: [],
      tecnicos: []
    };
    return;
  }

  dispatchOptions = {
    equipes: result.equipes || [],
    tecnicos: result.tecnicos || []
  };
}

async function loadAgenda() {
  agendaStatus.textContent = "Carregando...";

  const result = await fetchAdminJson("/admin/agenda", agendaStatus);

  if (!result) {
    return;
  }

  const items = result.items || [];
  const today = new Date().toISOString().slice(0, 10);

  agendaCount.textContent = result.total;
  attendanceCount.textContent = items.filter((item) => item.status === "em_atendimento").length;
  todayCount.textContent = items.filter((item) => (item.agendada_para || item.criada_em || "").startsWith(today)).length;
  agendaStatus.textContent = result.total === 1 ? "1 OS aberta" : `${result.total} OS abertas`;
  renderAgenda(items);
}

async function loadClientes() {
  clientesStatus.textContent = "Carregando...";

  const result = await fetchAdminJson("/admin/clientes", clientesStatus);

  if (!result) {
    return;
  }

  const items = result.items || [];

  latestClients = items;
  clientCount.textContent = result.total;
  clientOpenCount.textContent = items.filter((item) => item.os_abertas > 0).length;
  equipmentCount.textContent = items.reduce((total, item) => total + (item.total_equipamentos || 0), 0);
  clientesStatus.textContent = result.total === 1 ? "1 cliente" : `${result.total} clientes`;
  renderClientes(items);
}

async function loadFuelHistory() {
  const result = await fetchAdminJson("/admin/frota/abastecimentos", fuelHistoryStatus);

  if (!result) {
    return;
  }

  fuelHistoryStatus.textContent = result.total === 1 ? "1 registro" : `${result.total} registros`;
  renderFuelHistory(result.items || []);
}

async function loadRelatorios() {
  relatoriosStatus.textContent = "Carregando...";

  const result = await fetchAdminJson("/admin/relatorios", relatoriosStatus);

  if (!result) {
    return;
  }

  reportOsCount.textContent = result.total_os;
  reportRevenue.textContent = formatCurrency(result.receita_prevista || 0);
  automationCount.textContent = result.automacoes_pendentes;
  relatoriosStatus.textContent = "Atualizado agora";
  renderRelatorios(result);
  await loadRelatorioFrota();
}

async function loadRelatorioFrota() {
  fleetReportStatus.textContent = "Carregando...";

  const result = await fetchAdminJson("/admin/relatorios/frota", fleetReportStatus);

  if (!result) {
    return;
  }

  fleetReportStatus.textContent = `${result.total_veiculos} veiculos · ${formatNumber(result.km_rodados)} km`;
  renderRelatorioFrota(result.items || []);
}

async function fetchAdminJson(path, statusElement) {
  let response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: authHeaders()
    });
  } catch {
    statusElement.textContent = "API local indisponivel em localhost:3000.";
    return null;
  }

  if (await handleUnauthorized(response)) {
    return null;
  }

  if (!response.ok) {
    statusElement.textContent = "Nao foi possivel carregar os dados.";
    return null;
  }

  return response.json();
}

async function handleUnauthorized(response) {
  if (response.status !== 401) {
    return false;
  }

  clearToken();
  showLogin();
  loginStatus.textContent = "Sessao expirada. Entre novamente.";
  return true;
}

function renderPreChamados(items) {
  requestList.innerHTML = "";

  if (!items.length) {
    requestList.innerHTML = '<article class="request-card"><p class="request-title">Nenhum pre-chamado pendente.</p></article>';
    return;
  }

  for (const item of items) {
    const card = document.createElement("article");
    card.className = "request-card";
    card.innerHTML = `
      <div>
        <p class="request-title">${escapeHtml(item.titulo)}</p>
        <p class="request-meta">${escapeHtml(item.cliente.nome)} · ${formatPhone(item.cliente.telefone)}</p>
      </div>
      <div>
        <p class="request-details">${escapeHtml(item.detalhes || "Sem detalhes")}</p>
        <p class="request-meta">${escapeHtml(formatAddress(item.endereco))}</p>
      </div>
      <form class="dispatch-form" data-id="${item.id}">
        <label>
          Agenda
          <input name="agendada_para" type="datetime-local" />
        </label>
        <label>
          Equipe
          <select name="equipe_id">
            <option value="">Sem equipe</option>
            ${renderOptions(dispatchOptions.equipes)}
          </select>
        </label>
        <label>
          Tecnico
          <select name="tecnico_id">
            <option value="">Sem tecnico</option>
            ${renderOptions(dispatchOptions.tecnicos)}
          </select>
        </label>
        <label>
          Valor previsto
          <input name="valor_cobrado" type="number" min="0" step="0.01" placeholder="350,00" />
        </label>
        <div class="request-actions">
          <button class="approve-button" type="submit">Aprovar e agendar</button>
          <button class="reject-button" type="button" data-action="rejeitar" data-id="${item.id}">Rejeitar</button>
        </div>
      </form>
    `;
    requestList.appendChild(card);
  }
}

function renderFrota(items) {
  fleetList.innerHTML = "";
  fleetMap.querySelectorAll(".vehicle-marker").forEach((marker) => marker.remove());

  for (const item of items) {
    const location = item.localizacao;
    const speed = location?.velocidade_kmh || 0;
    const moving = speed > 0;
    const card = document.createElement("article");

    card.className = "fleet-card";
    card.innerHTML = `
      <strong>${escapeHtml(item.nome)}</strong>
      <p>${escapeHtml(item.placa || "Sem placa")} · ${moving ? "em movimento" : "parado"}</p>
      <p>${location ? `${speed} km/h · ${formatDate(location.registrado_em)}` : "Sem sinal recente"}</p>
    `;
    fleetList.appendChild(card);

    if (!location) {
      continue;
    }

    const position = toMapPosition(location.latitude, location.longitude);
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = `vehicle-marker ${moving ? "" : "idle"}`;
    marker.style.left = `${position.x}%`;
    marker.style.top = `${position.y}%`;
    marker.innerHTML = `<strong>${escapeHtml(item.nome)}</strong><span>${speed} km/h</span>`;
    marker.title = `${item.nome} - ${speed} km/h - ${formatDate(location.registrado_em)}`;
    fleetMap.appendChild(marker);
  }
}

function renderFuelVehicleOptions(items) {
  fuelVehicleSelect.innerHTML = "";

  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.nome}${item.placa ? ` - ${item.placa}` : ""}`;
    fuelVehicleSelect.appendChild(option);
  }
}

function renderAgenda(items) {
  agendaList.innerHTML = "";

  if (!items.length) {
    agendaList.innerHTML = '<article class="data-row"><strong>Nenhuma OS aberta.</strong><span>A agenda fica pronta quando um pre-chamado for aprovado.</span></article>';
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "data-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.titulo)}</strong>
        <span>${escapeHtml(item.cliente?.nome || "Cliente nao informado")} · ${formatAddress(item.endereco)}</span>
      </div>
      <div>
        <span class="status-pill">${formatStatus(item.status)}</span>
        <span>${item.agendada_para ? formatDateTime(item.agendada_para) : "Sem horario definido"}</span>
      </div>
      <div>
        <span>${escapeHtml(item.equipe?.nome || item.tecnico?.nome || "Equipe nao atribuida")}</span>
      </div>
    `;
    agendaList.appendChild(row);
  }
}

function renderClientes(items) {
  clientesList.innerHTML = "";

  if (!items.length) {
    clientesList.innerHTML = '<article class="data-row"><strong>Nenhum cliente cadastrado.</strong><span>Novos clientes entram pelo site ou pelo painel.</span></article>';
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "data-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.nome)}</strong>
        <span>${formatPhone(item.telefone)} · ${escapeHtml(item.email || "sem email")}</span>
      </div>
      <div>
        <span>${escapeHtml(formatAddress(item.endereco))}</span>
        <span>${item.total_equipamentos} equipamentos · ${item.total_os} OS</span>
      </div>
      <div>
        <span class="status-pill">${item.os_abertas} abertas</span>
        <button class="secondary-button compact-button" type="button" data-action="editar-cliente" data-id="${item.id}">Editar</button>
      </div>
    `;
    clientesList.appendChild(row);
  }
}

function renderRelatorios(result) {
  const statuses = result.por_status || {};

  reportGrid.innerHTML = `
    <article>
      <span>Clientes cadastrados</span>
      <strong>${result.clientes}</strong>
    </article>
    <article>
      <span>Veiculos ativos</span>
      <strong>${result.veiculos_ativos}</strong>
    </article>
    <article>
      <span>Pre-chamados</span>
      <strong>${statuses.pre_chamado || 0}</strong>
    </article>
    <article>
      <span>OS abertas</span>
      <strong>${statuses.aberta || 0}</strong>
    </article>
    <article>
      <span>Em atendimento</span>
      <strong>${statuses.em_atendimento || 0}</strong>
    </article>
    <article>
      <span>Concluidas</span>
      <strong>${statuses.concluida || 0}</strong>
    </article>
  `;
}

function renderRelatorioFrota(items) {
  fleetReportList.innerHTML = "";

  if (!items.length) {
    fleetReportList.innerHTML = '<article class="data-row"><strong>Sem abastecimentos.</strong><span>Registre pelo menos dois abastecimentos por carro para calcular km/l.</span></article>';
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "data-row fuel-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.nome)}</strong>
        <span>${escapeHtml(item.placa || "Sem placa")} · ${item.abastecimentos} abastecimentos</span>
      </div>
      <div>
        <span>${formatNumber(item.km_rodados)} km · ${formatNumber(item.litros)} L</span>
        <span>${item.km_por_litro ? `${formatNumber(item.km_por_litro)} km/L` : "km/L pendente"}</span>
      </div>
      <div>
        <span>${formatCurrency(item.valor_total)}</span>
        <span>${item.custo_por_km ? `${formatCurrency(item.custo_por_km)} / km` : "custo/km pendente"}</span>
      </div>
    `;
    fleetReportList.appendChild(row);
  }
}

function renderFuelHistory(items) {
  fuelHistoryList.innerHTML = "";

  if (!items.length) {
    fuelHistoryList.innerHTML = '<article class="data-row"><strong>Nenhum abastecimento registrado.</strong><span>Use o formulario acima para iniciar o historico.</span></article>';
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "data-row fuel-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.veiculo?.nome || "Veiculo")}</strong>
        <span>${escapeHtml(item.veiculo?.placa || "Sem placa")} · ${formatDateTime(item.abastecido_em)}</span>
      </div>
      <div>
        <span>${formatNumber(item.odometro_km)} km · ${formatNumber(item.litros)} L</span>
        <span>${formatCurrency(item.preco_por_litro)} / L</span>
      </div>
      <div>
        <span>${formatCurrency(item.valor_total)}</span>
        <span>${escapeHtml(item.posto || "posto nao informado")}</span>
      </div>
    `;
    fuelHistoryList.appendChild(row);
  }
}

async function submitFuel(event) {
  event.preventDefault();
  fuelStatus.textContent = "";
  const button = fuelForm.querySelector("button[type='submit']");
  const data = new FormData(fuelForm);

  button.disabled = true;
  button.textContent = "Registrando...";

  try {
    const response = await fetch(`${apiBaseUrl}/admin/frota/abastecimentos`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        veiculo_id: String(data.get("veiculo_id") || ""),
        odometro_km: Number(data.get("odometro_km") || 0),
        litros: Number(data.get("litros") || 0),
        valor_total: Number(data.get("valor_total") || 0),
        abastecido_em: new Date().toISOString(),
        posto: String(data.get("posto") || "")
      })
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      fuelStatus.textContent = error.message || "Nao foi possivel registrar abastecimento.";
      return;
    }

    fuelForm.reset();
    renderFuelVehicleOptions(latestFleetItems);
    fuelStatus.textContent = "Abastecimento registrado.";
    await loadFuelHistory();
    if (activeView === "relatorios") {
      await loadRelatorioFrota();
    }
  } catch {
    fuelStatus.textContent = "API local indisponivel em localhost:3000.";
  } finally {
    button.disabled = false;
    button.textContent = "Registrar abastecimento";
  }
}

async function updatePreChamado(osId, action, payload = null) {
  const options = {
    method: "PATCH",
    headers: authHeaders()
  };

  if (payload) {
    options.headers = {
      ...options.headers,
      "Content-Type": "application/json"
    };
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(`${apiBaseUrl}/admin/pre-chamados/${osId}/${action}`, options);

  if (!response.ok) {
    listStatus.textContent = "Nao foi possivel atualizar o pre-chamado.";
    return;
  }

  await loadPreChamados();
}

async function submitClient(event) {
  event.preventDefault();
  const button = clientForm.querySelector("button[type='submit']");
  const data = new FormData(clientForm);
  const clientId = String(data.get("id") || "");
  const payload = removeEmptyValues({
    tipo: String(data.get("tipo") || "pf"),
    nome: String(data.get("nome") || ""),
    telefone: String(data.get("telefone") || ""),
    email: String(data.get("email") || ""),
    documento: String(data.get("documento") || ""),
    logradouro: String(data.get("logradouro") || ""),
    numero: String(data.get("numero") || ""),
    bairro: String(data.get("bairro") || ""),
    cidade: String(data.get("cidade") || ""),
    uf: String(data.get("uf") || "").toUpperCase()
  });

  button.disabled = true;
  button.textContent = "Salvando...";
  clientFormStatus.textContent = "";

  try {
    const response = await fetch(`${apiBaseUrl}/admin/clientes${clientId ? `/${clientId}` : ""}`, {
      method: clientId ? "PATCH" : "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      clientFormStatus.textContent = error.message || "Nao foi possivel salvar o cliente.";
      return;
    }

    resetClientForm();
    clientFormStatus.textContent = "Cliente salvo.";
    await loadClientes();
  } catch {
    clientFormStatus.textContent = "API local indisponivel em localhost:3000.";
  } finally {
    button.disabled = false;
    button.textContent = "Salvar cliente";
  }
}

function fillClientForm(clientId) {
  const client = latestClients.find((item) => item.id === clientId);

  if (!client) {
    return;
  }

  const address = client.endereco || {};
  clientForm.elements.id.value = client.id;
  clientForm.elements.tipo.value = client.tipo || "pf";
  clientForm.elements.nome.value = client.nome || "";
  clientForm.elements.telefone.value = client.telefone || "";
  clientForm.elements.email.value = client.email || "";
  clientForm.elements.documento.value = client.documento || "";
  clientForm.elements.logradouro.value = address.logradouro || "";
  clientForm.elements.numero.value = address.numero || "";
  clientForm.elements.bairro.value = address.bairro || "";
  clientForm.elements.cidade.value = address.cidade || "Londrina";
  clientForm.elements.uf.value = address.uf || "PR";
  clientFormStatus.textContent = "Editando cliente selecionado.";
}

function resetClientForm() {
  clientForm.reset();
  clientForm.elements.id.value = "";
  clientForm.elements.cidade.value = "Londrina";
  clientForm.elements.uf.value = "PR";
  clientFormStatus.textContent = "";
}

function renderOptions(items) {
  return items
    .map((item) => `<option value="${item.id}">${escapeHtml(item.nome)}</option>`)
    .join("");
}

function removeEmptyValues(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => String(value ?? "").trim() !== "")
  );
}

function formatAddress(address) {
  if (!address) {
    return "Endereco nao informado";
  }

  return [address.bairro, address.cidade, address.uf].filter(Boolean).join(", ");
}

function toMapPosition(latitude, longitude) {
  const x = ((longitude - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
  const y = 100 - ((latitude - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * 100;

  return {
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(92, Math.max(8, y))
  };
}

function formatPhone(phone) {
  if (!phone) {
    return "sem telefone";
  }

  return phone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1
  }).format(value || 0);
}

function formatStatus(status) {
  const labels = {
    pre_chamado: "pre-chamado",
    aberta: "aberta",
    em_deslocamento: "em deslocamento",
    em_atendimento: "em atendimento",
    concluida: "concluida",
    cancelada: "cancelada",
    rejeitada: "rejeitada"
  };

  return labels[status] || status;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loginForm?.addEventListener("submit", login);
fuelForm?.addEventListener("submit", submitFuel);
clientForm?.addEventListener("submit", submitClient);
resetClientFormButton?.addEventListener("click", resetClientForm);
refreshButton?.addEventListener("click", loadActiveView);
logoutButton?.addEventListener("click", () => {
  clearToken();
  showLogin();
});

for (const link of navLinks) {
  link.addEventListener("click", async () => {
    setActiveView(link.dataset.view || "preChamados");
    await loadActiveView();
  });
}

requestList?.addEventListener("click", async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const osId = target.dataset.id;
  const action = target.dataset.action;

  if (!osId || !action) {
    return;
  }

  target.disabled = true;
  await updatePreChamado(osId, action);
});

requestList?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const osId = form.dataset.id;

  if (!osId) {
    return;
  }

  const data = new FormData(form);
  const payload = {
    agendada_para: data.get("agendada_para")
      ? new Date(String(data.get("agendada_para"))).toISOString()
      : undefined,
    equipe_id: String(data.get("equipe_id") || "") || undefined,
    tecnico_id: String(data.get("tecnico_id") || "") || undefined,
    valor_cobrado: data.get("valor_cobrado") ? Number(data.get("valor_cobrado")) : undefined
  };
  const button = form.querySelector("button[type='submit']");

  button.disabled = true;
  await updatePreChamado(osId, "aprovar", payload);
});

clientesList?.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.action === "editar-cliente" && target.dataset.id) {
    fillClientForm(target.dataset.id);
  }
});

if (getToken()) {
  showDashboard();
  setActiveView(activeView);
  void loadActiveView();
} else {
  showLogin();
}
