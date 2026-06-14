const localHosts = ["localhost", "127.0.0.1", ""];
const apiBaseUrl = localHosts.includes(window.location.hostname)
  ? "http://localhost:3000/api/v1"
  : "https://api.airmovebr.com.br/api/v1";
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
const pmocSummary = document.querySelector("#pmocSummary");
const relatoriosSummary = document.querySelector("#relatoriosSummary");
const preChamadosView = document.querySelector("#preChamadosView");
const frotaView = document.querySelector("#frotaView");
const agendaView = document.querySelector("#agendaView");
const clientesView = document.querySelector("#clientesView");
const engenheirosView = document.querySelector("#engenheirosView");
const pmocView = document.querySelector("#pmocView");
const relatoriosView = document.querySelector("#relatoriosView");
const fleetMap = document.querySelector("#fleetMap");
const fleetTabButtons = document.querySelectorAll("[data-fleet-tab]");
const fleetTabPanels = document.querySelectorAll("[data-fleet-panel]");
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
const agendaCalendar = document.querySelector("#agendaCalendar");
const agendaList = document.querySelector("#agendaList");
const agendaSelectedDateTitle = document.querySelector("#agendaSelectedDateTitle");
const agendaSelectedDateMeta = document.querySelector("#agendaSelectedDateMeta");
const agendaCount = document.querySelector("#agendaCount");
const attendanceCount = document.querySelector("#attendanceCount");
const todayCount = document.querySelector("#todayCount");
const clientesStatus = document.querySelector("#clientesStatus");
const clientesList = document.querySelector("#clientesList");
const clientForm = document.querySelector("#clientForm");
const clientFormStatus = document.querySelector("#clientFormStatus");
const clientCepStatus = document.querySelector("#clientCepStatus");
const resetClientFormButton = document.querySelector("#resetClientFormButton");
const backToClientsButton = document.querySelector("#backToClientsButton");
const clientDocumentLabel = document.querySelector("#clientDocumentLabel");
const clientDocumentHelp = document.querySelector("#clientDocumentHelp");
const clientEngineerSelect = document.querySelector("#clientEngineerSelect");
const engenheirosStatus = document.querySelector("#engenheirosStatus");
const engenheirosList = document.querySelector("#engenheirosList");
const engineerForm = document.querySelector("#engineerForm");
const engineerFormStatus = document.querySelector("#engineerFormStatus");
const resetEngineerFormButton = document.querySelector("#resetEngineerFormButton");
const deleteClientModal = document.querySelector("#deleteClientModal");
const deleteClientMessage = document.querySelector("#deleteClientMessage");
const confirmDeleteClientButton = document.querySelector("#confirmDeleteClientButton");
const cancelDeleteClientButton = document.querySelector("#cancelDeleteClientButton");
const clientEquipmentPanel = document.querySelector("#clientEquipmentPanel");
const clientEquipmentTitle = document.querySelector("#clientEquipmentTitle");
const clientEquipmentStatus = document.querySelector("#clientEquipmentStatus");
const clientEquipmentList = document.querySelector("#clientEquipmentList");
const equipmentForm = document.querySelector("#equipmentForm");
const equipmentFormStatus = document.querySelector("#equipmentFormStatus");
const scanEquipmentCodeButton = document.querySelector("#scanEquipmentCodeButton");
const stopEquipmentScanButton = document.querySelector("#stopEquipmentScanButton");
const equipmentScannerPanel = document.querySelector("#equipmentScannerPanel");
const equipmentScannerVideo = document.querySelector("#equipmentScannerVideo");
const clientCount = document.querySelector("#clientCount");
const clientOpenCount = document.querySelector("#clientOpenCount");
const equipmentCount = document.querySelector("#equipmentCount");
const pmocClientCount = document.querySelector("#pmocClientCount");
const pmocMachineCount = document.querySelector("#pmocMachineCount");
const pmocPendingCount = document.querySelector("#pmocPendingCount");
const pmocSearchForm = document.querySelector("#pmocSearchForm");
const pmocSearchInput = document.querySelector("#pmocSearchInput");
const pmocHero = document.querySelector("#pmocHero");
const pmocSearchPanel = document.querySelector("#pmocSearchPanel");
const pmocSearchResults = document.querySelector("#pmocSearchResults");
const pmocStatus = document.querySelector("#pmocStatus");
const pmocConversionPanel = document.querySelector("#pmocConversionPanel");
const pmocConversionTitle = document.querySelector("#pmocConversionTitle");
const pmocConversionText = document.querySelector("#pmocConversionText");
const pmocConversionForm = document.querySelector("#pmocConversionForm");
const pmocEngineerSelect = document.querySelector("#pmocEngineerSelect");
const pmocConversionStatus = document.querySelector("#pmocConversionStatus");
const pmocDossierList = document.querySelector("#pmocDossierList");
const pmocDossierPanel = document.querySelector("#pmocDossierPanel");
const pmocDossierDetail = document.querySelector("#pmocDossierDetail");
const pmocDossierTitle = document.querySelector("#pmocDossierTitle");
const pmocDossierMeta = document.querySelector("#pmocDossierMeta");
const pmocBackToClientsButton = document.querySelector("#pmocBackToClientsButton");
const pmocGenerateReportButton = document.querySelector("#pmocGenerateReportButton");
const pmocRequestSignatureButton = document.querySelector("#pmocRequestSignatureButton");
const pmocDossierAlerts = document.querySelector("#pmocDossierAlerts");
const pmocMonthBoard = document.querySelector("#pmocMonthBoard");
const pmocMachineList = document.querySelector("#pmocMachineList");
const relatoriosStatus = document.querySelector("#relatoriosStatus");
const reportGrid = document.querySelector("#reportGrid");
const reportOsCount = document.querySelector("#reportOsCount");
const reportRevenue = document.querySelector("#reportRevenue");
const automationCount = document.querySelector("#automationCount");
const fleetReportStatus = document.querySelector("#fleetReportStatus");
const fleetReportList = document.querySelector("#fleetReportList");
const fleetReportExportButton = document.querySelector("#fleetReportExportButton");

let activeView = "preChamados";
let latestFleetItems = [];
let latestClients = [];
let latestEngineers = [];
let latestAgendaItems = [];
let selectedFleetVehicleId = "";
let selectedAgendaDate = "";
let lastCepLookup = "";
let clientPendingDeleteId = "";
let selectedEquipmentClientId = "";
let selectedPmocClientId = "";
let selectedPmocDossierClientId = "";
let selectedPmocDossierMachines = [];
let equipmentScanStream = null;
let equipmentScanTimer = 0;
let activeFleetTab = "mapa";
let leafletMap = null;
let fleetMarkerGroup = null;
let fleetMarkers = new Map();
let dispatchOptions = {
  equipes: [],
  tecnicos: []
};

function getToken() {
  return localStorage.getItem("airmovebr_access_token");
}

function setToken(token) {
  localStorage.setItem("airmovebr_access_token", token);
}

function clearToken() {
  localStorage.removeItem("airmovebr_access_token");
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
    loginStatus.textContent = "Nao foi possivel conectar na API.";
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

  if (activeView === "engenheiros") {
    await loadEngenheiros();
    return;
  }

  if (activeView === "pmoc") {
    await loadPmoc();
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
    engenheiros: ["Responsabilidade tecnica", "Engenheiros responsaveis"],
    pmoc: ["Conformidade tecnica", "PMOC"],
    relatorios: ["Gestao", "Relatorios do MVP"]
  }[view] ?? ["Operacao comercial", "Pre-chamados do site"];

  viewKicker.textContent = meta[0];
  viewTitle.textContent = meta[1];
  preChamadosSummary.classList.toggle("hidden", view !== "preChamados");
  frotaSummary.classList.toggle("hidden", view !== "frota");
  agendaSummary.classList.toggle("hidden", view !== "agenda");
  clientesSummary.classList.toggle("hidden", view !== "clientes");
  pmocSummary.classList.toggle("hidden", view !== "pmoc");
  relatoriosSummary.classList.toggle("hidden", view !== "relatorios");
  preChamadosView.classList.toggle("hidden", view !== "preChamados");
  frotaView.classList.toggle("hidden", view !== "frota");
  agendaView.classList.toggle("hidden", view !== "agenda");
  clientesView.classList.toggle("hidden", view !== "clientes");
  engenheirosView.classList.toggle("hidden", view !== "engenheiros");
  pmocView.classList.toggle("hidden", view !== "pmoc");
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
    listStatus.textContent = "API indisponivel.";
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
    fleetStatus.textContent = "API indisponivel.";
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
  await loadRelatorioFrota();
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
  const today = getLocalDateKey(new Date());

  latestAgendaItems = items;
  agendaCount.textContent = result.total;
  attendanceCount.textContent = items.filter((item) => item.status === "em_atendimento").length;
  todayCount.textContent = items.filter((item) => getAgendaItemDateKey(item) === today).length;
  agendaStatus.textContent = result.total === 1 ? "1 OS aberta" : `${result.total} OS abertas`;
  renderAgenda(items);
}

async function loadClientes() {
  clientesStatus.textContent = "Carregando...";
  await loadEngenheiros(false);

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

async function loadPmoc() {
  pmocStatus.textContent = "Carregando clientes...";
  pmocConversionPanel?.classList.add("hidden");
  selectedPmocClientId = "";
  await loadEngenheiros(false);

  const result = await fetchAdminJson("/admin/clientes", pmocStatus);

  if (!result) {
    return;
  }

  latestClients = result.items || [];
  renderPmocEngineerOptions();
  renderPmocSummary();
  resetPmocSearchResults();
  renderPmocDossiers();
  if (selectedPmocDossierClientId) {
    await openPmocDossier(selectedPmocDossierClientId);
  } else {
    closePmocDossier();
  }
  pmocStatus.textContent = `${latestClients.length} clientes na base`;
}

async function loadEngenheiros(renderList = true) {
  if (renderList) {
    engenheirosStatus.textContent = "Carregando...";
  }

  let response;

  try {
    response = await fetch(`${apiBaseUrl}/admin/engenheiros`, {
      headers: authHeaders()
    });
  } catch {
    if (renderList) {
      engenheirosStatus.textContent = "API indisponivel.";
    }
    return [];
  }

  if (await handleUnauthorized(response)) {
    return [];
  }

  if (!response.ok) {
    if (renderList) {
      engenheirosStatus.textContent = "Nao foi possivel carregar os engenheiros.";
    }
    return [];
  }

  const result = await response.json();
  latestEngineers = result.items || [];
  renderEngineerOptions();

  if (renderList) {
    engenheirosStatus.textContent = result.total === 1 ? "1 engenheiro" : `${result.total} engenheiros`;
    renderEngenheiros(latestEngineers);
  }

  return latestEngineers;
}

async function loadClientEquipments(clientId) {
  if (!clientId || !clientEquipmentStatus || !clientEquipmentList) {
    return;
  }

  clientEquipmentStatus.textContent = "Carregando equipamentos...";
  const result = await fetchAdminJson(`/admin/clientes/${clientId}/equipamentos`, clientEquipmentStatus);

  if (!result) {
    return;
  }

  clientEquipmentStatus.textContent =
    result.total === 1 ? "1 equipamento vinculado" : `${result.total} equipamentos vinculados`;
  renderClientEquipments(result.items || []);
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
    statusElement.textContent = "API indisponivel.";
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
  ensureFleetMap();
  renderFleetMarkers(items);

  if (!selectedFleetVehicleId || !items.some((item) => item.id === selectedFleetVehicleId)) {
    selectedFleetVehicleId = items.find((item) => item.localizacao)?.id || "";
  }

  for (const item of items) {
    const location = item.localizacao;
    const speed = location?.velocidade_kmh || 0;
    const moving = speed > 0;
    const card = document.createElement("button");

    card.type = "button";
    card.className = `fleet-card ${item.id === selectedFleetVehicleId ? "active" : ""}`;
    card.dataset.vehicleId = item.id;
    card.disabled = !location;
    card.innerHTML = `
      <strong>${escapeHtml(item.nome)}</strong>
      <p>${escapeHtml(item.placa || "Sem placa")} · ${moving ? "em movimento" : "parado"}</p>
      <p>${location ? `${speed} km/h · ${formatDate(location.registrado_em)} · abrir no mapa` : "Sem sinal recente"}</p>
    `;
    fleetList.appendChild(card);
  }

  const selected = items.find((item) => item.id === selectedFleetVehicleId && item.localizacao);

  if (selected) {
    highlightFleetVehicle(selected.id);
  }
}

function renderFuelVehicleOptions(items) {
  if (!fuelVehicleSelect) {
    return;
  }

  fuelVehicleSelect.innerHTML = "";

  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.nome}${item.placa ? ` - ${item.placa}` : ""}`;
    fuelVehicleSelect.appendChild(option);
  }
}

function ensureFleetMap() {
  if (leafletMap || !fleetMap) {
    return;
  }

  if (typeof L === "undefined") {
    fleetMap.innerHTML = '<div class="map-error">Mapa indisponivel. Recarregue a pagina ou verifique os arquivos locais do Leaflet.</div>';
    return;
  }

  leafletMap = L.map(fleetMap, {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([-23.3045, -51.1696], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(leafletMap);

  fleetMarkerGroup = L.featureGroup().addTo(leafletMap);
}

function renderFleetMarkers(items) {
  if (!leafletMap || !fleetMarkerGroup) {
    return;
  }

  fleetMarkerGroup.clearLayers();
  fleetMarkers = new Map();

  for (const item of items) {
    const location = item.localizacao;

    if (!location) {
      continue;
    }

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    const speed = Number(location.velocidade_kmh || 0);
    const marker = L.marker([latitude, longitude], {
      title: item.nome
    }).bindPopup(`<strong>${escapeHtml(item.nome)}</strong><br>${escapeHtml(item.placa || "Sem placa")}<br>${speed} km/h`);

    marker.addTo(fleetMarkerGroup);
    fleetMarkers.set(item.id, marker);
  }

  if (fleetMarkers.size > 1) {
    leafletMap.fitBounds(fleetMarkerGroup.getBounds(), {
      padding: [38, 38],
      maxZoom: 14
    });
  } else if (fleetMarkers.size === 1) {
    const marker = [...fleetMarkers.values()][0];
    leafletMap.setView(marker.getLatLng(), 15);
  }
}

function focusVehicleOnMap(vehicleId) {
  const marker = fleetMarkers.get(vehicleId);

  if (!leafletMap || !marker) {
    return;
  }

  leafletMap.setView(marker.getLatLng(), 17, {
    animate: true
  });
  marker.openPopup();
}

function selectFleetVehicle(vehicleId) {
  const vehicle = latestFleetItems.find((item) => item.id === vehicleId);

  if (!vehicle?.localizacao) {
    return;
  }

  selectedFleetVehicleId = vehicleId;
  focusVehicleOnMap(vehicleId);
  highlightFleetVehicle(vehicleId);
}

function highlightFleetVehicle(vehicleId) {
  for (const card of fleetList.querySelectorAll(".fleet-card")) {
    card.classList.toggle("active", card.dataset.vehicleId === vehicleId);
  }
}

function renderAgenda(items) {
  const calendarDays = buildAgendaCalendarDays(items);
  const preferredDate = pickAgendaDate(calendarDays);

  if (!selectedAgendaDate || !calendarDays.some((day) => day.key === selectedAgendaDate)) {
    selectedAgendaDate = preferredDate;
  }

  renderAgendaCalendar(calendarDays, selectedAgendaDate);
  renderAgendaDay(items, selectedAgendaDate);
}

function buildAgendaCalendarDays(items) {
  const todayKey = getLocalDateKey(new Date());
  const dateKeys = new Set([todayKey]);

  for (const item of items) {
    const dateKey = getAgendaItemDateKey(item);

    if (dateKey) {
      dateKeys.add(dateKey);
    }
  }

  for (let offset = 1; offset <= 6; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    dateKeys.add(getLocalDateKey(date));
  }

  return [...dateKeys]
    .sort()
    .map((dateKey) => ({
      key: dateKey,
      date: parseLocalDateKey(dateKey),
      total: items.filter((item) => getAgendaItemDateKey(item) === dateKey).length
    }));
}

function pickAgendaDate(days) {
  const todayKey = getLocalDateKey(new Date());
  const today = days.find((day) => day.key === todayKey);

  if (today?.total) {
    return today.key;
  }

  const firstBusyDay = days.find((day) => day.total > 0);
  return firstBusyDay?.key || todayKey;
}

function renderAgendaCalendar(days, activeDateKey) {
  agendaCalendar.innerHTML = "";

  for (const day of days) {
    const button = document.createElement("button");
    button.className = "agenda-date-button";
    button.type = "button";
    button.dataset.agendaDate = day.key;
    button.classList.toggle("active", day.key === activeDateKey);
    button.innerHTML = `
      <span>${formatWeekday(day.date)}</span>
      <strong>${formatDayNumber(day.date)}</strong>
      <small>${formatShortMonth(day.date)}</small>
      <em>${day.total === 1 ? "1 OS" : `${day.total} OS`}</em>
    `;
    agendaCalendar.appendChild(button);
  }
}

function renderAgendaDay(items, dateKey) {
  agendaList.innerHTML = "";

  if (!items.length) {
    agendaSelectedDateTitle.textContent = "Sem OS abertas";
    agendaSelectedDateMeta.textContent = "0 servicos";
    agendaList.innerHTML = '<article class="agenda-empty"><strong>Nenhuma OS aberta.</strong><span>A agenda fica pronta quando um pre-chamado for aprovado.</span></article>';
    return;
  }

  const scheduledItems = items
    .filter((item) => item.agendada_para && getAgendaItemDateKey(item) === dateKey)
    .sort((a, b) => new Date(a.agendada_para).getTime() - new Date(b.agendada_para).getTime());
  const unscheduledItems = items.filter((item) => !item.agendada_para);
  const dayDate = parseLocalDateKey(dateKey);

  agendaSelectedDateTitle.textContent = formatLongDate(dayDate);
  agendaSelectedDateMeta.textContent = scheduledItems.length === 1 ? "1 servico marcado" : `${scheduledItems.length} servicos marcados`;

  for (const slot of buildAgendaSlots(scheduledItems)) {
    const row = document.createElement("article");
    row.className = "agenda-slot";
    row.innerHTML = `
      <time datetime="${dateKey}T${slot.hour}:00">${slot.hour}</time>
      <div class="agenda-slot-content">
        ${
          slot.items.length
            ? slot.items.map(renderAgendaServiceCard).join("")
            : '<span class="agenda-free">Livre</span>'
        }
      </div>
    `;
    agendaList.appendChild(row);
  }

  if (unscheduledItems.length) {
    const pending = document.createElement("article");
    pending.className = "agenda-unscheduled";
    pending.innerHTML = `
      <div>
        <strong>Sem horario definido</strong>
        <span>${unscheduledItems.length === 1 ? "1 OS precisa de agendamento" : `${unscheduledItems.length} OS precisam de agendamento`}</span>
      </div>
      <div class="agenda-unscheduled-list">
        ${unscheduledItems.map(renderAgendaServiceCard).join("")}
      </div>
    `;
    agendaList.appendChild(pending);
  }
}

function buildAgendaSlots(items) {
  const hours = Array.from({ length: 12 }, (_, index) => `${String(index + 7).padStart(2, "0")}:00`);

  return hours.map((hour) => ({
    hour,
    items: items.filter((item) => formatAgendaTime(item.agendada_para).startsWith(hour.slice(0, 2)))
  }));
}

function renderAgendaServiceCard(item) {
  return `
    <section class="agenda-service-card">
      <div>
        <strong>${escapeHtml(item.titulo)}</strong>
        <span>${escapeHtml(item.cliente?.nome || "Cliente nao informado")} - ${escapeHtml(formatAddress(item.endereco))}</span>
      </div>
      <div>
        <span class="status-pill">${formatStatus(item.status)}</span>
        <span>${item.agendada_para ? formatAgendaTime(item.agendada_para) : "Definir horario"}</span>
      </div>
      <span>${escapeHtml(item.equipe?.nome || item.tecnico?.nome || "Equipe nao atribuida")}</span>
    </section>
  `;
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
      <div class="data-row-actions">
        <span class="status-pill">${item.os_abertas} abertas</span>
        <button class="secondary-button compact-button" type="button" data-action="editar-cliente" data-id="${item.id}">Editar</button>
        <button class="secondary-button compact-button danger-button" type="button" data-action="apagar-cliente" data-id="${item.id}">Apagar</button>
      </div>
    `;
    clientesList.appendChild(row);
  }
}

function renderPmocSummary() {
  const pmocClients = latestClients.filter((item) => item.pmoc_ativo);
  const pendingClients = pmocClients.filter((item) => !item.engenheiro_responsavel || !item.total_equipamentos);

  pmocClientCount.textContent = pmocClients.length;
  pmocMachineCount.textContent = pmocClients.reduce((total, item) => total + (item.total_equipamentos || 0), 0);
  pmocPendingCount.textContent = pendingClients.length;
}

function renderPmocEngineerOptions(selectedId = "") {
  if (!pmocEngineerSelect) {
    return;
  }

  pmocEngineerSelect.innerHTML = '<option value="">Selecione um engenheiro</option>';

  for (const item of latestEngineers) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.nome} - CREA ${item.crea}`;
    pmocEngineerSelect.appendChild(option);
  }

  if (selectedId) {
    pmocEngineerSelect.value = selectedId;
  }
}

function renderPmocSearchResults(items) {
  pmocSearchPanel?.classList.remove("hidden");
  pmocSearchResults.innerHTML = "";

  if (!items.length) {
    pmocSearchResults.innerHTML = '<article class="pmoc-empty"><strong>Nenhum cliente encontrado.</strong><span>Cadastre o cliente na aba Clientes antes de iniciar PMOC.</span></article>';
    return;
  }

  for (const item of items) {
    const card = document.createElement("article");
    const status = getPmocClientStatus(item);
    card.className = `pmoc-client-card ${item.pmoc_ativo ? "is-active" : "needs-action"}`;
    card.innerHTML = `
      <div>
        <span class="pmoc-status ${status.tone}">${escapeHtml(status.label)}</span>
        <strong>${escapeHtml(item.nome)}</strong>
        <p>${formatPhone(item.telefone)} - ${escapeHtml(item.email || "sem email")}</p>
      </div>
      <div class="pmoc-client-facts">
        <span>${item.total_equipamentos || 0} maquinas</span>
        <span>${item.os_abertas || 0} OS abertas</span>
        <span>${escapeHtml(item.engenheiro_responsavel?.nome || "sem engenheiro")}</span>
      </div>
      <div class="data-row-actions">
        ${
          item.pmoc_ativo
            ? `<button class="secondary-button compact-button" type="button" data-action="pmoc-ver-cliente" data-id="${item.id}">Ver dossie</button>`
            : `<button class="approve-button compact-button" type="button" data-action="pmoc-ativar-cliente" data-id="${item.id}">Adicionar PMOC</button>`
        }
      </div>
    `;
    pmocSearchResults.appendChild(card);
  }
}

function resetPmocSearchResults() {
  pmocSearchPanel?.classList.add("hidden");
  pmocSearchResults.innerHTML = "";
}

function setPmocDossierMode(isOpen) {
  pmocView?.classList.toggle("is-dossier-open", isOpen);
  pmocSummary?.classList.toggle("hidden", isOpen || activeView !== "pmoc");
  pmocHero?.classList.toggle("hidden", isOpen);
  pmocSearchPanel?.classList.toggle("hidden", isOpen || !pmocSearchResults.innerHTML);
  pmocConversionPanel?.classList.add("hidden");
  pmocDossierPanel?.classList.toggle("hidden", isOpen);
  pmocDossierDetail?.classList.toggle("hidden", !isOpen);
}

function closePmocDossier() {
  selectedPmocDossierClientId = "";
  selectedPmocDossierMachines = [];
  resetPmocSearchResults();
  pmocDossierTitle.textContent = "Selecione um cliente PMOC";
  pmocDossierMeta.textContent = "Maquinas, pendencias e preparo do relatorio aparecem aqui.";
  pmocDossierAlerts.innerHTML = "";
  pmocMonthBoard.innerHTML = "";
  pmocMachineList.innerHTML = "";
  pmocGenerateReportButton.disabled = true;
  pmocRequestSignatureButton.disabled = true;
  setPmocDossierMode(false);
}

function renderPmocDossiers() {
  const pmocClients = latestClients.filter((item) => item.pmoc_ativo);
  pmocDossierList.innerHTML = "";

  if (!pmocClients.length) {
    pmocDossierList.innerHTML = '<article class="pmoc-empty"><strong>Nenhum cliente em PMOC.</strong><span>Use a busca acima para adicionar o primeiro cliente.</span></article>';
    return;
  }

  for (const item of pmocClients) {
    const status = getPmocClientStatus(item);
    const row = document.createElement("article");
    row.className = "pmoc-dossier-row";
    row.innerHTML = `
      <div>
        <span class="pmoc-status ${status.tone}">${escapeHtml(status.label)}</span>
        <strong>${escapeHtml(item.nome)}</strong>
        <p>${escapeHtml(formatAddress(item.endereco))}</p>
      </div>
      <div>
        <span>Eng. ${escapeHtml(item.engenheiro_responsavel?.nome || "pendente")}</span>
        <span>${escapeHtml(item.engenheiro_responsavel?.email || "email pendente")}</span>
      </div>
      <div>
        <span>${item.total_equipamentos || 0} maquinas separadas</span>
        <span>${item.os_abertas || 0} OS em andamento</span>
      </div>
      <div class="data-row-actions">
        <button class="secondary-button compact-button" type="button" data-action="pmoc-ver-cliente" data-id="${item.id}">Ver dossie</button>
      </div>
    `;
    pmocDossierList.appendChild(row);
  }
}

async function openPmocDossier(clientId) {
  const client = latestClients.find((item) => item.id === clientId);

  if (!client) {
    return;
  }

  selectedPmocDossierClientId = client.id;
  setPmocDossierMode(true);
  pmocDossierTitle.textContent = client.nome;
  pmocDossierMeta.textContent = "Carregando maquinas do cliente...";
  pmocDossierAlerts.innerHTML = "";
  pmocMonthBoard.innerHTML = "";
  pmocMachineList.innerHTML = '<article class="pmoc-empty"><strong>Carregando maquinas.</strong><span>Buscando equipamentos vinculados a este cliente.</span></article>';
  pmocGenerateReportButton.disabled = true;
  pmocRequestSignatureButton.disabled = true;

  const result = await fetchAdminJson(`/admin/clientes/${client.id}/equipamentos`, pmocDossierMeta);

  if (!result) {
    return;
  }

  const machines = result.items || [];
  selectedPmocDossierMachines = machines;
  pmocDossierMeta.textContent = `${machines.length} maquinas - ${client.os_abertas || 0} OS abertas - ${client.engenheiro_responsavel?.nome || "sem engenheiro"}`;
  pmocGenerateReportButton.disabled = !hasCompletedPmocMaintenance(machines);
  pmocRequestSignatureButton.disabled = !hasCompletedPmocMaintenance(machines) || !client.engenheiro_responsavel;
  renderPmocDossierAlerts(client, machines, null);
  renderPmocMachines(machines);

  const preview = await fetchAdminJson(`/admin/pmoc/clientes/${client.id}/previa`, pmocDossierMeta);

  if (preview) {
    const hasPendingSignature = preview.assinatura_atual?.status === "aguardando_assinatura_engenheiro";
    const hasSignedCurrentMonth = getCurrentPmocMonth(preview)?.relatorio_status === "assinado";
    const isTestClient = isPmocTestClient(client);
    const canRequestSignature = (!hasPendingSignature || isTestClient) && (!hasSignedCurrentMonth || isTestClient) && preview.pronto_para_pdf;
    renderPmocMonths(preview.pmoc_meses || []);
    renderPmocDossierAlerts(client, machines, preview);
    pmocDossierMeta.textContent = `${preview.total_maquinas || machines.length} maquinas - ${preview.total_os_concluidas || 0} OS concluidas - ${client.engenheiro_responsavel?.nome || "sem engenheiro"}`;
    pmocRequestSignatureButton.disabled = !canRequestSignature;
    pmocRequestSignatureButton.textContent = isTestClient
      ? "Solicitar assinatura"
      : hasSignedCurrentMonth
      ? "PMOC enviado"
      : hasPendingSignature
      ? "Assinatura solicitada"
      : "Solicitar assinatura";
  }
}

function getCurrentPmocMonth(preview) {
  const months = preview?.pmoc_meses || [];
  const date = preview?.periodo?.fim ? new Date(preview.periodo.fim) : new Date();
  const number = Number.isNaN(date.getTime()) ? new Date().getMonth() + 1 : date.getUTCMonth() + 1;
  return months.find((month) => month.numero === number) || null;
}

function isPmocTestClient(client) {
  return String(client?.nome || "").trim().toLowerCase() === "cris magnani";
}

function renderPmocDossierAlerts(client, machines, preview) {
  const alerts = getPmocDossierAlerts(client, machines, preview);
  pmocDossierAlerts.innerHTML = "";

  if (!alerts.length) {
    return;
  }

  for (const alert of alerts) {
    const row = document.createElement("article");
    row.className = `pmoc-alert ${alert.tone}`;
    row.innerHTML = `<strong>${escapeHtml(alert.title)}</strong><span>${escapeHtml(alert.text)}</span>`;
    pmocDossierAlerts.appendChild(row);
  }
}

function getPmocDossierAlerts(client, machines, preview) {
  const alerts = [];
  const currentSignature = preview?.assinatura_atual;

  if (currentSignature?.status === "assinado") {
    alerts.push({
      tone: "success",
      title: "PMOC enviado ao cliente",
      text: currentSignature.assinado_em
        ? `Relatorio assinado em ${formatDateTime(currentSignature.assinado_em)}.`
        : "Relatorio assinado e envio final agendado."
    });
  }

  if (currentSignature?.status === "aguardando_assinatura_engenheiro") {
    alerts.push({
      tone: "success",
      title: "Assinatura solicitada ao engenheiro",
      text: currentSignature.assinafy_document_id
        ? `Assinafy recebeu o documento. Status: ${currentSignature.assinafy_status || "aguardando assinatura"}.`
        : "PDF PMOC ja foi gerado e enviado para assinatura do engenheiro."
    });
  }

  if (!client.engenheiro_responsavel) {
    alerts.push({
      tone: "danger",
      title: "Engenheiro pendente",
      text: "Vincule o responsavel tecnico antes de gerar qualquer relatorio PMOC."
    });
  }

  if (!client.email) {
    alerts.push({
      tone: "warning",
      title: "E-mail do cliente pendente",
      text: "O envio final ao cliente depende de um e-mail valido no cadastro."
    });
  }

  if (!machines.length) {
    alerts.push({
      tone: "danger",
      title: "Nenhuma maquina cadastrada",
      text: "Cadastre as maquinas do cliente para manter o dossie separado equipamento por equipamento."
    });
  }

  const machinesWithoutGas = machines.filter((item) => !item.gas_refrigerante).length;

  if (machinesWithoutGas) {
    alerts.push({
      tone: "warning",
      title: "Gas refrigerante pendente",
      text: `${machinesWithoutGas} maquina(s) ainda precisam do gas refrigerante na ficha tecnica ou primeira visita.`
    });
  }

  return alerts;
}

function renderPmocMachines(machines) {
  pmocMachineList.innerHTML = "";

  if (!machines.length) {
    pmocMachineList.innerHTML = '<article class="pmoc-empty"><strong>Sem maquinas neste cliente.</strong><span>Cadastre equipamentos na aba Clientes para iniciar o dossie PMOC.</span></article>';
    return;
  }

  for (const item of machines) {
    const status = getPmocMachineStatus(item);
    const card = document.createElement("article");
    card.className = "pmoc-machine-card";
    card.innerHTML = `
      <div>
        <span class="pmoc-status ${status.tone}">${escapeHtml(status.label)}</span>
        <strong>${escapeHtml([item.tipo, item.marca, item.modelo].filter(Boolean).join(" ") || "Equipamento")}</strong>
        <p>${escapeHtml(item.local_instalacao || "Local nao informado")}</p>
      </div>
      <div class="pmoc-machine-specs">
        <span>Patrimonio: ${escapeHtml(item.patrimonio || "nao informado")}</span>
        <span>Serie: ${escapeHtml(item.numero_serie || "nao informada")}</span>
        <span>Gas: ${escapeHtml(item.gas_refrigerante || "pendente")}</span>
        <span>BTU: ${escapeHtml(item.capacidade_btu || "nao informado")}</span>
      </div>
      <div class="pmoc-machine-specs">
        <span>${item.total_os || 0} OS no historico</span>
        <span>${item.os_abertas || 0} OS abertas</span>
        <span>Atualizado ${formatDateTime(item.atualizado_em)}</span>
      </div>
    `;
    pmocMachineList.appendChild(card);
  }
}

function renderPmocMonths(months) {
  if (!pmocMonthBoard) {
    return;
  }

  if (!months.length) {
    pmocMonthBoard.innerHTML = "";
    return;
  }

  pmocMonthBoard.innerHTML = `
    <div class="pmoc-month-board-header">
      <strong>Controle mensal PMOC</strong>
      <span>Vermelho: falta solicitar. Amarelo: aguardando assinatura. Verde: enviado ao cliente.</span>
    </div>
    <div class="pmoc-month-grid">
      ${months
        .map((month) => {
          const status = getPmocMonthStatus(month);

          return `
            <article class="pmoc-month-card ${status.className}">
              <strong>${escapeHtml(month.mes)}</strong>
              <span>${escapeHtml(status.label)}</span>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function getPmocMonthStatus(month) {
  if (month.relatorio_status === "assinado") {
    return { className: "is-sent", label: "Enviado ao cliente" };
  }

  if (month.relatorio_status === "aguardando_assinatura_engenheiro" || month.assinafy_status === "pending") {
    return { className: "is-waiting-signature", label: "Aguardando assinatura" };
  }

  return { className: "is-pending", label: "Falta solicitar" };
}

function getPmocMachineStatus(machine) {
  const completedCount = Math.max((machine.total_os || 0) - (machine.os_abertas || 0), 0);

  if (!machine.gas_refrigerante) {
    return { label: "Ficha pendente", tone: "warning" };
  }

  if (completedCount > 0 && machine.os_abertas > 0) {
    return { label: "Manutencao + OS aberta", tone: "success" };
  }

  if (completedCount > 0) {
    return { label: "Manutencao registrada", tone: "success" };
  }

  if (machine.os_abertas > 0) {
    return { label: "OS aberta", tone: "danger" };
  }

  return { label: "Sem OS", tone: "warning" };
}

function hasCompletedPmocMaintenance(machines) {
  return machines.some((item) => (item.total_os || 0) > (item.os_abertas || 0));
}

async function openPmocReportPreview() {
  if (!selectedPmocDossierClientId || !hasCompletedPmocMaintenance(selectedPmocDossierMachines)) {
    pmocDossierMeta.textContent = "Selecione um dossie com pelo menos uma OS concluida.";
    return;
  }

  pmocGenerateReportButton.disabled = true;
  pmocGenerateReportButton.textContent = "Gerando PDF...";
  pmocDossierMeta.textContent = "Buscando previa oficial do PMOC...";

  const preview = await fetchAdminJson(`/admin/pmoc/clientes/${selectedPmocDossierClientId}/previa`, pmocDossierMeta);

  pmocGenerateReportButton.disabled = false;
  pmocGenerateReportButton.textContent = "Gerar PDF PMOC";

  if (!preview) {
    return;
  }

  const completedOrders = (preview.maquinas || []).reduce(
    (total, machine) => total + (machine.os_concluidas || []).length,
    0
  );
  const officialCompletedOrders = preview.total_os_concluidas ?? completedOrders;
  pmocDossierMeta.textContent = preview.pronto_para_pdf
    ? `Gerando PDF oficial do PMOC com ${officialCompletedOrders} OS concluidas...`
    : "Gerando PDF oficial do PMOC com pendencias registradas...";

  let response;

  try {
    response = await fetch(`${apiBaseUrl}/admin/pmoc/clientes/${selectedPmocDossierClientId}/pdf`, {
      headers: authHeaders()
    });
  } catch {
    pmocDossierMeta.textContent = "API indisponivel ao gerar PDF.";
    return;
  }

  if (await handleUnauthorized(response)) {
    return;
  }

  if (!response.ok) {
    pmocDossierMeta.textContent = "Nao foi possivel gerar o PDF PMOC.";
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  pmocDossierMeta.textContent = `${preview.total_maquinas || 0} maquinas - PDF oficial gerado no servidor`;
}

async function requestPmocEngineerSignature() {
  if (!selectedPmocDossierClientId) {
    pmocDossierMeta.textContent = "Selecione um dossie PMOC.";
    return;
  }

  pmocRequestSignatureButton.disabled = true;
  pmocRequestSignatureButton.textContent = "Solicitando...";
  pmocDossierMeta.textContent = "Criando fluxo de assinatura do engenheiro...";

  try {
    const response = await fetch(`${apiBaseUrl}/assinaturas/pmoc/clientes/${selectedPmocDossierClientId}/assinafy`, {
      method: "POST",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      pmocDossierMeta.textContent = "Nao foi possivel solicitar assinatura.";
      return;
    }

    const result = await response.json();
    pmocDossierMeta.textContent = result.assinafy_document_id
      ? "Assinatura solicitada ao engenheiro pela Assinafy."
      : "Fluxo de assinatura criado.";
    await openPmocDossier(selectedPmocDossierClientId);
  } catch {
    pmocDossierMeta.textContent = "API indisponivel ao solicitar assinatura.";
  } finally {
    pmocRequestSignatureButton.disabled = false;
    pmocRequestSignatureButton.textContent = "Solicitar assinatura";
  }
}

function getPmocClientStatus(client) {
  if (!client.pmoc_ativo) {
    return { label: "Cliente sem PMOC", tone: "warning" };
  }

  if (!client.engenheiro_responsavel) {
    return { label: "Falta engenheiro", tone: "danger" };
  }

  if (!client.total_equipamentos) {
    return { label: "Falta maquina", tone: "warning" };
  }

  return { label: "Cadastro pronto", tone: "success" };
}

function searchPmocClients(query) {
  const normalized = normalizeSearch(query);

  if (!normalized) {
    return latestClients;
  }

  return latestClients.filter((item) => {
    const content = [
      item.nome,
      item.email,
      item.telefone,
      item.documento,
      item.engenheiro_responsavel?.nome,
      item.engenheiro_responsavel?.crea
    ].map(normalizeSearch).join(" ");

    return content.includes(normalized);
  });
}

function openPmocConversion(clientId) {
  const client = latestClients.find((item) => item.id === clientId);

  if (!client) {
    return;
  }

  if (client.pmoc_ativo) {
    pmocConversionPanel?.classList.add("hidden");
    pmocStatus.textContent = `${client.nome} ja esta no PMOC.`;
    return;
  }

  selectedPmocClientId = client.id;
  pmocConversionTitle.textContent = `${client.nome} esta sem PMOC`;
  pmocConversionText.textContent = "Confirme o engenheiro responsavel para transformar este cliente em PMOC.";
  pmocConversionStatus.textContent = "";
  renderPmocEngineerOptions("");
  pmocConversionPanel?.classList.remove("hidden");
}

async function activatePmocClient(event) {
  event.preventDefault();

  const client = latestClients.find((item) => item.id === selectedPmocClientId);
  const engineerId = pmocEngineerSelect.value;

  if (!client) {
    pmocConversionStatus.textContent = "Selecione um cliente primeiro.";
    return;
  }

  if (!engineerId) {
    pmocConversionStatus.textContent = "Selecione o engenheiro responsavel.";
    return;
  }

  const button = pmocConversionForm.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Adicionando...";
  pmocConversionStatus.textContent = "";

  try {
    const response = await fetch(`${apiBaseUrl}/admin/clientes/${client.id}`, {
      method: "PATCH",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildClientPmocPayload(client, engineerId))
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      pmocConversionStatus.textContent = error.message || "Nao foi possivel adicionar PMOC.";
      return;
    }

    pmocConversionStatus.textContent = "Cliente adicionado ao PMOC.";
    pmocConversionPanel?.classList.add("hidden");
    await loadPmoc();
  } catch {
    pmocConversionStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = "Adicionar PMOC ao cliente";
  }
}

function buildClientPmocPayload(client, engineerId) {
  const address = client.endereco || {};

  return removeEmptyValues({
    tipo: client.tipo || "pf",
    nome: client.nome || "",
    telefone: onlyDigits(client.telefone || ""),
    email: client.email || "",
    documento: client.documento || "",
    pmoc_ativo: true,
    engenheiro_responsavel_id: engineerId,
    cep: onlyDigits(address.cep || ""),
    logradouro: address.logradouro || "",
    numero: address.numero || "",
    bairro: address.bairro || "",
    cidade: address.cidade || "",
    uf: String(address.uf || "").toUpperCase()
  });
}

function renderEngenheiros(items) {
  engenheirosList.innerHTML = "";

  if (!items.length) {
    engenheirosList.innerHTML = '<article class="data-row"><strong>Nenhum engenheiro cadastrado.</strong><span>Cadastre o responsavel tecnico antes de vincular clientes PMOC.</span></article>';
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "data-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.nome)}</strong>
        <span>CREA ${escapeHtml(item.crea)} - CPF ${escapeHtml(item.cpf)}</span>
      </div>
      <div>
        <span>${escapeHtml(item.email)}</span>
        <span>${formatPhone(item.telefone)}</span>
      </div>
      <div class="data-row-actions">
        <button class="secondary-button compact-button" type="button" data-action="editar-engenheiro" data-id="${item.id}">Editar</button>
      </div>
    `;
    engenheirosList.appendChild(row);
  }
}

function renderEngineerOptions(selectedId = clientEngineerSelect?.value || "") {
  if (!clientEngineerSelect) {
    return;
  }

  clientEngineerSelect.innerHTML = '<option value="">Cadastre ou selecione um engenheiro</option>';

  for (const item of latestEngineers) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.nome} - CREA ${item.crea}`;
    clientEngineerSelect.appendChild(option);
  }

  if (selectedId) {
    clientEngineerSelect.value = selectedId;
  }
}

function renderClientEquipments(items) {
  clientEquipmentList.innerHTML = "";

  if (!items.length) {
    clientEquipmentList.innerHTML = '<article class="data-row"><strong>Nenhum equipamento vinculado.</strong><span>Cadastre a primeira maquina deste cliente.</span></article>';
    return;
  }

  for (const item of items) {
    const publicUrl = item.link_publico ? `${window.location.origin}${item.link_publico}` : "";
    const row = document.createElement("article");
    row.className = "data-row equipment-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml([item.tipo, item.marca, item.modelo].filter(Boolean).join(" ") || "Equipamento")}</strong>
        <span>${escapeHtml(item.local_instalacao || "Local nao informado")}</span>
      </div>
      <div>
        <span>Patrimonio: ${escapeHtml(item.patrimonio || "nao informado")}</span>
        <span>Codigo/QR: ${escapeHtml(item.codigo_barras || "nao informado")}</span>
        <span>Gas: ${escapeHtml(item.gas_refrigerante || "pendente da primeira visita")}</span>
        <span>Serie: ${escapeHtml(item.numero_serie || "nao informada")}</span>
      </div>
      <div class="data-row-actions">
        <span class="status-pill">${item.total_os} OS</span>
        <span class="equipment-link">${escapeHtml(publicUrl || "link publico indisponivel")}</span>
        <button class="secondary-button compact-button" type="button" data-action="copiar-link-equipamento" data-link="${escapeHtml(publicUrl)}">Copiar link</button>
        <button class="secondary-button compact-button" type="button" data-action="renovar-acesso-equipamento" data-id="${item.id}">Nova senha</button>
        <button class="secondary-button compact-button danger-button" type="button" data-action="apagar-equipamento" data-id="${item.id}">Apagar</button>
      </div>
    `;
    clientEquipmentList.appendChild(row);
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
    fuelStatus.textContent = "Abastecimento manual registrado.";
    await loadFuelHistory();
    await loadRelatorioFrota();
  } catch {
    fuelStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = "Registrar abastecimento manual";
  }
}

function openFleetReport() {
  const rows = Array.from(fleetReportList.querySelectorAll(".data-row"));
  const historyRows = Array.from(fuelHistoryList.querySelectorAll(".data-row"));
  const reportWindow = window.open("", "_blank", "width=980,height=720");

  if (!reportWindow) {
    fleetReportStatus.textContent = "Permita pop-ups para gerar o relatorio.";
    return;
  }

  const content = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatorio de Frota</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #07151d; }
          h1 { margin: 0 0 8px; }
          .meta { color: #66747b; margin-bottom: 24px; }
          section { margin-top: 24px; }
          article { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; padding: 12px 0; border-bottom: 1px solid #ddd; }
          strong { display: block; margin-bottom: 4px; }
          span { display: block; color: #66747b; }
        </style>
      </head>
      <body>
        <h1>Relatorio de Frota</h1>
        <p class="meta">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
        <section>
          <h2>Consumo por carro</h2>
          ${rows.map((row) => `<article>${row.innerHTML}</article>`).join("") || "<p>Sem dados de consumo.</p>"}
        </section>
        <section>
          <h2>Historico de abastecimentos</h2>
          ${historyRows.map((row) => `<article>${row.innerHTML}</article>`).join("") || "<p>Sem abastecimentos.</p>"}
        </section>
      </body>
    </html>
  `;

  reportWindow.document.open();
  reportWindow.document.write(content);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
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
  const tipo = String(data.get("tipo") || "pf");
  const telefone = onlyDigits(String(data.get("telefone") || ""));
  const documento = String(data.get("documento") || "").trim();
  const validationMessage = validateClientIdentity(tipo, telefone, documento);

  if (validationMessage) {
    clientFormStatus.textContent = validationMessage;
    return;
  }

  const payload = removeEmptyValues({
    tipo,
    nome: String(data.get("nome") || ""),
    telefone,
    email: String(data.get("email") || ""),
    documento,
    pmoc_ativo: data.get("pmoc_ativo") === "on",
    engenheiro_responsavel_id: data.get("pmoc_ativo") === "on" ? String(data.get("engenheiro_responsavel_id") || "") : "",
    cep: onlyDigits(String(data.get("cep") || "")),
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
    clientFormStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = "Salvar cliente";
  }
}

async function submitEngineer(event) {
  event.preventDefault();

  const button = engineerForm.querySelector("button[type='submit']");
  const data = new FormData(engineerForm);
  const engineerId = String(data.get("id") || "");
  const payload = removeEmptyValues({
    nome: String(data.get("nome") || ""),
    cpf: onlyDigits(String(data.get("cpf") || "")),
    crea: String(data.get("crea") || ""),
    email: String(data.get("email") || ""),
    telefone: onlyDigits(String(data.get("telefone") || ""))
  });

  button.disabled = true;
  button.textContent = "Salvando...";
  engineerFormStatus.textContent = "";

  try {
    const response = await fetch(`${apiBaseUrl}/admin/engenheiros${engineerId ? `/${engineerId}` : ""}`, {
      method: engineerId ? "PATCH" : "POST",
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
      engineerFormStatus.textContent = error.message || "Nao foi possivel salvar o engenheiro.";
      return;
    }

    resetEngineerForm();
    engineerFormStatus.textContent = "Engenheiro salvo.";
    await loadEngenheiros();
  } catch {
    engineerFormStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = "Salvar engenheiro";
  }
}

async function submitEquipment(event) {
  event.preventDefault();

  if (!selectedEquipmentClientId) {
    equipmentFormStatus.textContent = "Selecione um cliente antes de cadastrar equipamento.";
    return;
  }

  const button = equipmentForm.querySelector("button[type='submit']");
  const data = new FormData(equipmentForm);
  const payload = removeEmptyValues({
    tipo: String(data.get("tipo") || ""),
    patrimonio: String(data.get("patrimonio") || ""),
    codigo_barras: String(data.get("codigo_barras") || ""),
    marca: String(data.get("marca") || ""),
    modelo: String(data.get("modelo") || ""),
    capacidade_btu: data.get("capacidade_btu") ? Number(data.get("capacidade_btu")) : "",
    gas_refrigerante: String(data.get("gas_refrigerante") || ""),
    numero_serie: String(data.get("numero_serie") || ""),
    local_instalacao: String(data.get("local_instalacao") || ""),
    acesso_publico_ativo: data.get("acesso_publico_ativo") === "on"
  });

  button.disabled = true;
  button.textContent = "Salvando...";
  equipmentFormStatus.textContent = "";

  try {
    const response = await fetch(`${apiBaseUrl}/admin/clientes/${selectedEquipmentClientId}/equipamentos`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      equipmentFormStatus.textContent = result.message || "Nao foi possivel salvar o equipamento.";
      return;
    }

    equipmentForm.reset();
    equipmentForm.elements.acesso_publico_ativo.checked = true;
    equipmentFormStatus.textContent = `Equipamento salvo. Senha do cliente: ${result.senha_publica}`;
    await loadClientEquipments(selectedEquipmentClientId);
    await loadClientes();
  } catch {
    equipmentFormStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = "Salvar equipamento";
  }
}

async function renewEquipmentAccess(equipmentId) {
  if (!equipmentId) {
    return;
  }

  equipmentFormStatus.textContent = "Gerando nova senha...";

  try {
    const response = await fetch(`${apiBaseUrl}/admin/equipamentos/${equipmentId}/renovar-acesso`, {
      method: "POST",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      equipmentFormStatus.textContent = result.message || "Nao foi possivel gerar nova senha.";
      return;
    }

    equipmentFormStatus.textContent = `Nova senha do cliente: ${result.senha_publica}`;
    await loadClientEquipments(selectedEquipmentClientId);
  } catch {
    equipmentFormStatus.textContent = "API indisponivel.";
  }
}

async function deleteEquipment(equipmentId) {
  if (!equipmentId || !selectedEquipmentClientId) {
    return;
  }

  if (!window.confirm("Apagar esta maquina e todo o historico de OS vinculado a ela?")) {
    return;
  }

  equipmentFormStatus.textContent = "Apagando equipamento...";

  try {
    const response = await fetch(`${apiBaseUrl}/admin/equipamentos/${equipmentId}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      equipmentFormStatus.textContent = result.message || "Nao foi possivel apagar o equipamento.";
      return;
    }

    equipmentFormStatus.textContent = `Equipamento apagado. ${result.ordens_removidas || 0} OS removida(s).`;
    await loadClientEquipments(selectedEquipmentClientId);
    await loadClientes();
  } catch {
    equipmentFormStatus.textContent = "API indisponivel.";
  }
}

async function startEquipmentScanner() {
  if (!("BarcodeDetector" in window)) {
    equipmentFormStatus.textContent = "Leitor de codigo/QR indisponivel neste navegador. Digite manualmente.";
    return;
  }

  try {
    equipmentScanStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment"
      }
    });
    equipmentScannerVideo.srcObject = equipmentScanStream;
    await equipmentScannerVideo.play();
    equipmentScannerPanel.classList.remove("hidden");

    const detector = new window.BarcodeDetector({
      formats: ["qr_code", "code_128", "ean_13", "ean_8", "upc_a", "upc_e"]
    });

    equipmentScanTimer = window.setInterval(async () => {
      const codes = await detector.detect(equipmentScannerVideo).catch(() => []);
      const code = codes[0]?.rawValue;

      if (!code) {
        return;
      }

      equipmentForm.elements.codigo_barras.value = code;
      equipmentFormStatus.textContent = "Codigo/QR lido e aplicado ao equipamento.";
      stopEquipmentScanner();
    }, 700);
  } catch {
    equipmentFormStatus.textContent = "Nao foi possivel abrir a camera para leitura.";
  }
}

function stopEquipmentScanner() {
  if (equipmentScanTimer) {
    window.clearInterval(equipmentScanTimer);
    equipmentScanTimer = 0;
  }

  if (equipmentScanStream) {
    for (const track of equipmentScanStream.getTracks()) {
      track.stop();
    }
    equipmentScanStream = null;
  }

  if (equipmentScannerVideo) {
    equipmentScannerVideo.srcObject = null;
  }

  equipmentScannerPanel?.classList.add("hidden");
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function validateClientIdentity(tipo, telefone, documento) {
  if (![10, 11].includes(telefone.length)) {
    return "Informe telefone com DDD. Exemplo: (43) 99999-9999.";
  }

  if (!documento) {
    return tipo === "pj" ? "Informe o CNPJ da empresa." : "Informe CPF ou RG do cliente.";
  }

  if (tipo === "pj" && onlyDigits(documento).length !== 14) {
    return "CNPJ deve ter 14 digitos.";
  }

  return "";
}

function updateClientDocumentCopy() {
  const tipo = clientForm?.elements.tipo?.value || "pf";

  if (clientDocumentLabel) {
    clientDocumentLabel.textContent = tipo === "pj" ? "CNPJ" : "CPF ou RG";
  }

  if (clientDocumentHelp) {
    clientDocumentHelp.textContent =
      tipo === "pj"
        ? "Informe o CNPJ com 14 digitos."
        : "Informe CPF ou RG para identificar o cliente.";
  }

  if (clientForm?.elements.documento instanceof HTMLInputElement) {
    clientForm.elements.documento.placeholder = tipo === "pj" ? "00.000.000/0000-00" : "CPF ou RG";
  }
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function setClientCepStatus(message, state = "") {
  if (!clientCepStatus) {
    return;
  }

  clientCepStatus.textContent = message;
  clientCepStatus.dataset.state = state;
}

function applyCepAddress(address) {
  if (!clientForm) {
    return;
  }

  clientForm.elements.logradouro.value = address.logradouro || "";
  clientForm.elements.bairro.value = address.bairro || "";
  clientForm.elements.cidade.value = address.localidade || "";
  clientForm.elements.uf.value = address.uf || "";
  clientForm.elements.numero.focus();
}

async function lookupClientCep() {
  const cepInput = clientForm?.elements.cep;

  if (!(cepInput instanceof HTMLInputElement)) {
    return;
  }

  cepInput.value = formatCep(cepInput.value);
  const cep = onlyDigits(cepInput.value);

  if (!cep) {
    lastCepLookup = "";
    setClientCepStatus("");
    return;
  }

  if (cep.length < 8) {
    setClientCepStatus("Digite os 8 numeros do CEP.", "warning");
    return;
  }

  if (cep === lastCepLookup) {
    return;
  }

  lastCepLookup = cep;
  setClientCepStatus("Buscando endereco pelo CEP...", "loading");

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (!response.ok) {
      throw new Error("cep_lookup_failed");
    }

    const address = await response.json();

    if (address.erro) {
      setClientCepStatus("CEP nao encontrado. Preencha o endereco manualmente.", "warning");
      return;
    }

    applyCepAddress(address);
    setClientCepStatus("Endereco preenchido. Informe apenas o numero.", "success");
  } catch {
    setClientCepStatus("Nao foi possivel buscar o CEP agora. Preencha manualmente.", "warning");
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
  updateClientDocumentCopy();
  clientForm.elements.nome.value = client.nome || "";
  clientForm.elements.telefone.value = client.telefone || "";
  clientForm.elements.email.value = client.email || "";
  clientForm.elements.documento.value = client.documento || "";
  clientForm.elements.cep.value = formatCep(address.cep || "");
  clientForm.elements.logradouro.value = address.logradouro || "";
  clientForm.elements.numero.value = address.numero || "";
  clientForm.elements.bairro.value = address.bairro || "";
  clientForm.elements.cidade.value = address.cidade || "Londrina";
  clientForm.elements.uf.value = address.uf || "PR";
  clientForm.elements.pmoc_ativo.checked = Boolean(client.pmoc_ativo);
  renderEngineerOptions(client.engenheiro_responsavel?.id || "");
  lastCepLookup = onlyDigits(address.cep || "");
  setClientCepStatus("");
  clientFormStatus.textContent = "Editando cliente selecionado.";
  selectedEquipmentClientId = client.id;
  clientesList.classList.add("hidden");
  backToClientsButton?.classList.remove("hidden");
  clientEquipmentPanel?.classList.remove("hidden");

  if (clientEquipmentTitle) {
    clientEquipmentTitle.textContent = `Equipamentos de ${client.nome}`;
  }

  equipmentFormStatus.textContent = "";
  void loadClientEquipments(client.id);
}

function resetClientForm() {
  clientForm.reset();
  clientForm.elements.id.value = "";
  clientForm.elements.cidade.value = "Londrina";
  clientForm.elements.uf.value = "PR";
  clientForm.elements.pmoc_ativo.checked = false;
  renderEngineerOptions("");
  lastCepLookup = "";
  updateClientDocumentCopy();
  setClientCepStatus("");
  selectedEquipmentClientId = "";
  clientEquipmentPanel?.classList.add("hidden");
  backToClientsButton?.classList.add("hidden");
  clientesList.classList.remove("hidden");
  clientEquipmentList.innerHTML = "";
  clientFormStatus.textContent = "";
}

function fillEngineerForm(engineerId) {
  const engineer = latestEngineers.find((item) => item.id === engineerId);

  if (!engineer) {
    return;
  }

  engineerForm.elements.id.value = engineer.id;
  engineerForm.elements.nome.value = engineer.nome || "";
  engineerForm.elements.cpf.value = engineer.cpf || "";
  engineerForm.elements.crea.value = engineer.crea || "";
  engineerForm.elements.email.value = engineer.email || "";
  engineerForm.elements.telefone.value = engineer.telefone || "";
  engineerFormStatus.textContent = "Editando engenheiro selecionado.";
}

function resetEngineerForm() {
  engineerForm.reset();
  engineerForm.elements.id.value = "";
  engineerFormStatus.textContent = "";
}

function openDeleteClientModal(clientId) {
  const client = latestClients.find((item) => item.id === clientId);

  if (!client || !deleteClientModal) {
    return;
  }

  clientPendingDeleteId = client.id;

  if (deleteClientMessage) {
    deleteClientMessage.textContent = `Tem certeza que deseja apagar ${client.nome}? Esta acao nao pode ser desfeita.`;
  }

  deleteClientModal.classList.remove("hidden");
  confirmDeleteClientButton?.focus();
}

function closeDeleteClientModal() {
  clientPendingDeleteId = "";
  deleteClientModal?.classList.add("hidden");
}

async function confirmDeleteClient() {
  if (!clientPendingDeleteId || !confirmDeleteClientButton) {
    return;
  }

  const clientId = clientPendingDeleteId;
  confirmDeleteClientButton.disabled = true;
  confirmDeleteClientButton.textContent = "Apagando...";

  try {
    const response = await fetch(`${apiBaseUrl}/admin/clientes/${clientId}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      closeDeleteClientModal();
      clientFormStatus.textContent = error.message || "Nao foi possivel apagar o cliente.";
      return;
    }

    if (clientForm.elements.id.value === clientId) {
      resetClientForm();
    }

    closeDeleteClientModal();
    clientFormStatus.textContent = "Cliente apagado.";
    await loadClientes();
  } catch {
    closeDeleteClientModal();
    clientFormStatus.textContent = "API indisponivel.";
  } finally {
    confirmDeleteClientButton.disabled = false;
    confirmDeleteClientButton.textContent = "Sim, apagar";
  }
}

function setFleetTab(tab) {
  activeFleetTab = tab;

  for (const button of fleetTabButtons) {
    button.classList.toggle("active", button.dataset.fleetTab === tab);
  }

  for (const panel of fleetTabPanels) {
    panel.classList.toggle("hidden", panel.dataset.fleetPanel !== tab);
  }

  if (tab === "mapa" && leafletMap) {
    setTimeout(() => {
      leafletMap.invalidateSize();
      if (fleetMarkers.size > 1 && fleetMarkerGroup) {
        leafletMap.fitBounds(fleetMarkerGroup.getBounds(), {
          padding: [38, 38],
          maxZoom: 14
        });
      }
    }, 80);
  }
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

function formatPhone(phone) {
  if (!phone) {
    return "sem telefone";
  }

  return phone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
}

function getAgendaItemDateKey(item) {
  const value = item.agendada_para || item.criada_em;

  if (!value) {
    return "";
  }

  return getLocalDateKey(new Date(value));
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatWeekday(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short"
  }).format(date).replace(".", "");
}

function formatDayNumber(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit"
  }).format(date);
}

function formatShortMonth(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short"
  }).format(date).replace(".", "");
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(date);
}

function formatAgendaTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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
engineerForm?.addEventListener("submit", submitEngineer);
equipmentForm?.addEventListener("submit", submitEquipment);
pmocConversionForm?.addEventListener("submit", activatePmocClient);
resetClientFormButton?.addEventListener("click", resetClientForm);
backToClientsButton?.addEventListener("click", resetClientForm);
resetEngineerFormButton?.addEventListener("click", resetEngineerForm);
fleetReportExportButton?.addEventListener("click", openFleetReport);
pmocBackToClientsButton?.addEventListener("click", closePmocDossier);
pmocGenerateReportButton?.addEventListener("click", openPmocReportPreview);
pmocRequestSignatureButton?.addEventListener("click", requestPmocEngineerSignature);
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

for (const button of fleetTabButtons) {
  button.addEventListener("click", () => {
    setFleetTab(button.dataset.fleetTab || "mapa");
  });
}

pmocSearchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = pmocSearchInput?.value || "";

  if (!normalizeSearch(query)) {
    resetPmocSearchResults();
    pmocConversionPanel?.classList.add("hidden");
    pmocStatus.textContent = "Digite para procurar clientes fora ou dentro do PMOC.";
    return;
  }

  const results = searchPmocClients(query);
  renderPmocSearchResults(results);
  pmocConversionPanel?.classList.add("hidden");
  pmocStatus.textContent = results.length === 1 ? "1 cliente encontrado" : `${results.length} clientes encontrados`;
});

pmocSearchInput?.addEventListener("input", () => {
  if (!normalizeSearch(pmocSearchInput.value)) {
    resetPmocSearchResults();
    pmocConversionPanel?.classList.add("hidden");
    pmocStatus.textContent = "Digite para procurar clientes fora ou dentro do PMOC.";
    return;
  }

  const results = searchPmocClients(pmocSearchInput.value);
  renderPmocSearchResults(results);
  pmocStatus.textContent = results.length === 1 ? "1 cliente encontrado" : `${results.length} clientes encontrados`;
});

pmocSearchResults?.addEventListener("click", (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest("[data-action]") : null;

  if (!(button instanceof HTMLButtonElement) || !button.dataset.id) {
    return;
  }

  if (button.dataset.action === "pmoc-ativar-cliente") {
    openPmocConversion(button.dataset.id);
  }

  if (button.dataset.action === "pmoc-ver-cliente") {
    void openPmocDossier(button.dataset.id);
  }
});

pmocDossierList?.addEventListener("click", (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest("[data-action]") : null;

  if (!(button instanceof HTMLButtonElement) || !button.dataset.id) {
    return;
  }

  if (button.dataset.action === "pmoc-ver-cliente") {
    void openPmocDossier(button.dataset.id);
  }
});

agendaCalendar?.addEventListener("click", (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest(".agenda-date-button") : null;

  if (!(button instanceof HTMLButtonElement) || !button.dataset.agendaDate) {
    return;
  }

  selectedAgendaDate = button.dataset.agendaDate;
  renderAgenda(latestAgendaItems);
});

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

  if (target.dataset.action === "apagar-cliente" && target.dataset.id) {
    openDeleteClientModal(target.dataset.id);
  }
});

engenheirosList?.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.action === "editar-engenheiro" && target.dataset.id) {
    fillEngineerForm(target.dataset.id);
  }
});

clientForm?.elements.tipo?.addEventListener("change", updateClientDocumentCopy);

clientForm?.elements.cep?.addEventListener("input", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  target.value = formatCep(target.value);

  if (onlyDigits(target.value).length === 8) {
    void lookupClientCep();
  } else {
    lastCepLookup = "";
    setClientCepStatus("");
  }
});

clientForm?.elements.cep?.addEventListener("blur", () => {
  void lookupClientCep();
});

cancelDeleteClientButton?.addEventListener("click", closeDeleteClientModal);
confirmDeleteClientButton?.addEventListener("click", () => {
  void confirmDeleteClient();
});

deleteClientModal?.addEventListener("click", (event) => {
  if (event.target === deleteClientModal) {
    closeDeleteClientModal();
  }
});

clientEquipmentList?.addEventListener("click", async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.action === "renovar-acesso-equipamento" && target.dataset.id) {
    await renewEquipmentAccess(target.dataset.id);
  }

  if (target.dataset.action === "apagar-equipamento" && target.dataset.id) {
    await deleteEquipment(target.dataset.id);
  }

  if (target.dataset.action === "copiar-link-equipamento" && target.dataset.link) {
    await navigator.clipboard.writeText(target.dataset.link);
    equipmentFormStatus.textContent = "Link publico copiado.";
  }
});

scanEquipmentCodeButton?.addEventListener("click", () => {
  void startEquipmentScanner();
});

stopEquipmentScanButton?.addEventListener("click", stopEquipmentScanner);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !deleteClientModal?.classList.contains("hidden")) {
    closeDeleteClientModal();
  }

  if (event.key === "Escape" && !equipmentScannerPanel?.classList.contains("hidden")) {
    stopEquipmentScanner();
  }
});

fleetList?.addEventListener("click", (event) => {
  const target = event.target;
  const card = target instanceof Element ? target.closest(".fleet-card") : null;

  if (!(card instanceof HTMLButtonElement) || !card.dataset.vehicleId) {
    return;
  }

  selectFleetVehicle(card.dataset.vehicleId);
});

updateClientDocumentCopy();

if (getToken()) {
  showDashboard();
  setActiveView(activeView);
  void loadActiveView();
} else {
  showLogin();
}
