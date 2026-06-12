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
const resetClientFormButton = document.querySelector("#resetClientFormButton");
const clientCount = document.querySelector("#clientCount");
const clientOpenCount = document.querySelector("#clientOpenCount");
const equipmentCount = document.querySelector("#equipmentCount");
const pmocStatus = document.querySelector("#pmocStatus");
const pmocEquipmentCount = document.querySelector("#pmocEquipmentCount");
const pmocMonthlyCount = document.querySelector("#pmocMonthlyCount");
const pmocCriticalCount = document.querySelector("#pmocCriticalCount");
const pmocEquipmentFields = document.querySelector("#pmocEquipmentFields");
const pmocChecklist = document.querySelector("#pmocChecklist");
const pmocAirQuality = document.querySelector("#pmocAirQuality");
const pmocDocuments = document.querySelector("#pmocDocuments");
const pmocHospital = document.querySelector("#pmocHospital");
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
let latestAgendaItems = [];
let selectedFleetVehicleId = "";
let selectedAgendaDate = "";
let activeFleetTab = "mapa";
let leafletMap = null;
let fleetMarkerGroup = null;
let fleetMarkers = new Map();
let pmocRendered = false;
let dispatchOptions = {
  equipes: [],
  tecnicos: []
};

const pmocEquipmentRegistry = [
  "Codigo do equipamento",
  "Localizacao",
  "Marca",
  "Modelo",
  "Capacidade (BTU/h ou TR)",
  "Numero de patrimonio",
  "Tipo: Split, VRF, Chiller, Fan Coil, Cassete etc.",
  "Data de instalacao"
];

const pmocChecklistGroups = [
  {
    title: "Mensal - Filtros",
    cadence: "obrigatorio",
    items: ["Limpeza realizada", "Substituicao necessaria", "Integridade verificada"]
  },
  {
    title: "Mensal - Bandeja de condensado",
    cadence: "obrigatorio",
    items: ["Limpeza", "Ausencia de lodo", "Drenagem funcionando"]
  },
  {
    title: "Mensal - Dreno",
    cadence: "obrigatorio",
    items: ["Sem obstrucao", "Sem vazamentos"]
  },
  {
    title: "Mensal - Serpentinas",
    cadence: "obrigatorio",
    items: ["Limpeza", "Corrosao", "Aletas amassadas"]
  },
  {
    title: "Mensal - Ventiladores",
    cadence: "obrigatorio",
    items: ["Limpeza", "Ruido anormal", "Vibracao"]
  },
  {
    title: "Mensal - Gabinete",
    cadence: "obrigatorio",
    items: ["Limpeza interna", "Limpeza externa", "Vedacao adequada"]
  },
  {
    title: "Mensal - Eletrica",
    cadence: "obrigatorio",
    items: ["Tensao", "Corrente", "Aperto de conexoes", "Disjuntores"]
  },
  {
    title: "Mensal - Refrigeracao",
    cadence: "obrigatorio",
    items: ["Temperatura insuflamento", "Temperatura retorno", "Pressoes", "Vazamento de fluido"]
  },
  {
    title: "Trimestral",
    cadence: "a cada 3 meses",
    items: [
      "Limpeza profunda serpentinas",
      "Higienizacao evaporador",
      "Higienizacao condensador",
      "Verificacao isolamento termico",
      "Verificacao suportes",
      "Verificacao vibracao"
    ]
  },
  {
    title: "Semestral",
    cadence: "a cada 6 meses",
    items: [
      "Desencrustacao serpentinas",
      "Limpeza ventiladores",
      "Balanceamento ventiladores",
      "Revisao eletrica geral",
      "Verificacao motores"
    ]
  },
  {
    title: "Anual",
    cadence: "1 vez ao ano",
    items: [
      "Teste completo de operacao",
      "Avaliacao eficiencia energetica",
      "Revisao geral sistema",
      "Calibracao instrumentos",
      "Atualizacao PMOC"
    ]
  }
];

const pmocAirQualityGroups = [
  {
    title: "Sistemas centrais - Casa de maquinas",
    cadence: "Chiller / Fan Coil / UTA",
    items: ["Limpeza", "Iluminacao", "Acesso restrito"]
  },
  {
    title: "Sistemas centrais - Torres de resfriamento",
    cadence: "quando aplicavel",
    items: ["Limpeza", "Tratamento quimico", "Controle microbiologico"]
  },
  {
    title: "Sistemas centrais - Casa de mistura",
    cadence: "quando aplicavel",
    items: ["Exclusiva do sistema", "Sem armazenamento de materiais"]
  },
  {
    title: "Sistemas centrais - Captacao de ar externo",
    cadence: "quando aplicavel",
    items: ["Sem fontes contaminantes", "Filtros instalados"]
  },
  {
    title: "Renovacao de ar",
    cadence: "conforme projeto",
    items: ["Vazao conforme projeto", "Minimo 27 m3/h/pessoa"]
  },
  {
    title: "Controle da qualidade do ar - RE 09",
    cadence: "monitoramento",
    items: [
      "Temperatura",
      "Umidade relativa",
      "Velocidade do ar",
      "CO2",
      "Fungos",
      "Particulas",
      "Taxa de renovacao de ar"
    ]
  }
];

const pmocDocumentGroups = [
  {
    title: "Documentos obrigatorios",
    cadence: "dossie tecnico",
    items: [
      "ART ou TRT do responsavel tecnico",
      "Relacao completa dos equipamentos",
      "Cronograma de manutencao",
      "Procedimentos de emergencia",
      "Registros das manutencoes",
      "Relatorios de execucao",
      "Laudos de qualidade do ar quando aplicavel",
      "Certificados de calibracao",
      "Treinamentos da equipe"
    ]
  }
];

const pmocHospitalGroups = [
  {
    title: "Hospital / HU",
    cadence: "ANVISA e ABNT NBR 7256",
    items: [
      "Pressao diferencial de areas criticas",
      "Troca de filtros G4/F8/HEPA",
      "Salas cirurgicas",
      "UTIs",
      "Isolamentos",
      "CME",
      "Hemodinamica",
      "Banco de Leite",
      "Laboratorios"
    ],
    note: "Esses ambientes seguem normas especificas da ANVISA e ABNT NBR 7256, alem da Lei do PMOC."
  }
];

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

  if (activeView === "pmoc") {
    loadPmoc();
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

function loadPmoc() {
  const monthlyTotal = pmocChecklistGroups
    .filter((group) => group.title.startsWith("Mensal"))
    .reduce((total, group) => total + group.items.length, 0);

  pmocEquipmentCount.textContent = pmocEquipmentRegistry.length;
  pmocMonthlyCount.textContent = monthlyTotal;
  pmocCriticalCount.textContent = pmocHospitalGroups.reduce((total, group) => total + group.items.length, 0);
  pmocStatus.textContent = "Modelo PMOC pronto para conferencia e futura gravacao por cliente/equipamento.";

  if (pmocRendered) {
    return;
  }

  renderPmocEquipmentFields();
  renderPmocGroups(pmocChecklist, pmocChecklistGroups, "pmoc-periodic");
  renderPmocGroups(pmocAirQuality, pmocAirQualityGroups, "pmoc-air");
  renderPmocGroups(pmocDocuments, pmocDocumentGroups, "pmoc-docs");
  renderPmocGroups(pmocHospital, pmocHospitalGroups, "pmoc-hospital");
  pmocRendered = true;
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

function renderPmocEquipmentFields() {
  pmocEquipmentFields.innerHTML = pmocEquipmentRegistry
    .map(
      (field, index) => `
        <div class="pmoc-field">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${escapeHtml(field)}</strong>
        </div>
      `
    )
    .join("");
}

function renderPmocGroups(container, groups, prefix) {
  container.innerHTML = groups.map((group, groupIndex) => renderPmocGroup(group, `${prefix}-${groupIndex}`)).join("");
}

function renderPmocGroup(group, groupId) {
  const items = group.items
    .map(
      (item, itemIndex) => `
        <label class="pmoc-check">
          <input type="checkbox" name="${groupId}-${itemIndex}" />
          ${escapeHtml(item)}
        </label>
      `
    )
    .join("");
  const note = group.note ? `<p class="pmoc-note">${escapeHtml(group.note)}</p>` : "";

  return `
    <section class="pmoc-group">
      <div class="pmoc-group-title">
        <strong>${escapeHtml(group.title)}</strong>
        <span>${escapeHtml(group.cadence)}</span>
      </div>
      <div class="pmoc-items">${items}</div>
      ${note}
    </section>
  `;
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
    clientFormStatus.textContent = "API indisponivel.";
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
resetClientFormButton?.addEventListener("click", resetClientForm);
fleetReportExportButton?.addEventListener("click", openFleetReport);
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
});

fleetList?.addEventListener("click", (event) => {
  const target = event.target;
  const card = target instanceof Element ? target.closest(".fleet-card") : null;

  if (!(card instanceof HTMLButtonElement) || !card.dataset.vehicleId) {
    return;
  }

  selectFleetVehicle(card.dataset.vehicleId);
});

if (getToken()) {
  showDashboard();
  setActiveView(activeView);
  void loadActiveView();
} else {
  showLogin();
}
