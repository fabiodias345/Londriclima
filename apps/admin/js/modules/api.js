export const apiModule = {
  view: "api",
  summaryId: "api",
  viewId: "apiView"
};

export const apiRoot = `
const localHosts = ["localhost", "127.0.0.1", ""];
const apiBaseUrl = localHosts.includes(window.location.hostname)
  ? "http://localhost:3000/api/v1"
  : window.location.hostname === "191.252.226.11"
    ? \`\${window.location.origin}/api/v1\`
    : "https://api.airmovebr.com.br/api/v1";
const AGENDA_LOOKAHEAD_DAYS = 180;
const OS_STATUS_TABS = {
  abertas: ["aberta"],
  agendadas: ["aberta"],
  em_atendimento: ["em_deslocamento", "em_atendimento"],
  concluidas: ["concluida"],
  canceladas: ["cancelada", "rejeitada"]
};
const AGENDA_OPERATIONAL_STATUSES = ["aberta", "em_deslocamento", "em_atendimento"];
const loginPanel = document.querySelector("#loginPanel");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#loginForm");
const loginStatus = document.querySelector("#loginStatus");
const listStatus = document.querySelector("#listStatus");
const requestList = document.querySelector("#requestList");
const osTabs = document.querySelector("#osTabs");
const osSearchInput = document.querySelector("#osSearchInput");
const newOsShortcutButton = document.querySelector("#newOsShortcutButton");
const osDetailPanel = document.querySelector("#osDetailPanel");
const osDetailTitle = document.querySelector("#osDetailTitle");
const osDetailMeta = document.querySelector("#osDetailMeta");
const osDetailBody = document.querySelector("#osDetailBody");
const closeOsDetailButton = document.querySelector("#closeOsDetailButton");
const pendingCount = document.querySelector("#pendingCount");
const osActiveCount = document.querySelector("#osActiveCount");
const osScheduledCount = document.querySelector("#osScheduledCount");
const osCompletedMonthCount = document.querySelector("#osCompletedMonthCount");
const refreshButton = document.querySelector("#refreshButton");
const logoutButton = document.querySelector("#logoutButton");
const configButton = document.querySelector("#configButton");
const configTabs = document.querySelector("#configTabs");
const configTabButtons = document.querySelectorAll("[data-config-view]");
const navLinks = document.querySelectorAll(".nav-link");
const viewKicker = document.querySelector("#viewKicker");
const viewTitle = document.querySelector("#viewTitle");
const preChamadosSummary = document.querySelector("#preChamadosSummary");
const frotaSummary = document.querySelector("#frotaSummary");
const agendaSummary = document.querySelector("#agendaSummary");
const recorrenciasSummary = document.querySelector("#recorrenciasSummary");
const empresaSummary = document.querySelector("#empresaSummary");
const clientesSummary = document.querySelector("#clientesSummary");
const pmocSummary = document.querySelector("#pmocSummary");
const relatoriosSummary = document.querySelector("#relatoriosSummary");
const relatoriosAvulsosSummary = document.querySelector("#relatoriosAvulsosSummary");
const preChamadosView = document.querySelector("#preChamadosView");
const frotaView = document.querySelector("#frotaView");
const agendaView = document.querySelector("#agendaView");
const recorrenciasView = document.querySelector("#recorrenciasView");
const empresaView = document.querySelector("#empresaView");
const clientesView = document.querySelector("#clientesView");
const engenheirosView = document.querySelector("#engenheirosView");
const tecnicosView = document.querySelector("#tecnicosView");
const equipesView = document.querySelector("#equipesView");
const pmocView = document.querySelector("#pmocView");
const relatoriosView = document.querySelector("#relatoriosView");
const relatoriosAvulsosView = document.querySelector("#relatoriosAvulsosView");
const fleetMap = document.querySelector("#fleetMap");
const fleetTabButtons = document.querySelectorAll("[data-fleet-tab]");
const fleetTabPanels = document.querySelectorAll("[data-fleet-panel]");
const fleetList = document.querySelector("#fleetList");
const fleetStatus = document.querySelector("#fleetStatus");
const vehicleForm = document.querySelector("#vehicleForm");
const vehicleFormStatus = document.querySelector("#vehicleFormStatus");
const vehicleStatus = document.querySelector("#vehicleStatus");
const vehicleList = document.querySelector("#vehicleList");
const resetVehicleFormButton = document.querySelector("#resetVehicleFormButton");
const vehicleCount = document.querySelector("#vehicleCount");
const movingCount = document.querySelector("#movingCount");
const stoppedCount = document.querySelector("#stoppedCount");
const fleetMovingSpeed = document.querySelector("#fleetMovingSpeed");
const fleetStoppedSince = document.querySelector("#fleetStoppedSince");
const fleetTotalKm = document.querySelector("#fleetTotalKm");
const fleetAverageEfficiency = document.querySelector("#fleetAverageEfficiency");
const fuelForm = document.querySelector("#fuelForm");
const fuelVehicleSelect = document.querySelector("#fuelVehicleSelect");
const fuelStatus = document.querySelector("#fuelStatus");
const fuelHistoryStatus = document.querySelector("#fuelHistoryStatus");
const fuelHistoryList = document.querySelector("#fuelHistoryList");
const agendaStatus = document.querySelector("#agendaStatus");
const agendaCalendar = document.querySelector("#agendaCalendar");
const agendaMonthGrid = document.querySelector("#agendaMonthGrid");
const agendaMonthTitle = document.querySelector("#agendaMonthTitle");
const agendaList = document.querySelector("#agendaList");
const agendaSelectedDateTitle = document.querySelector("#agendaSelectedDateTitle");
const agendaSelectedDateMeta = document.querySelector("#agendaSelectedDateMeta");
const agendaPendingList = document.querySelector("#agendaPendingList");
const agendaPrevMonthButton = document.querySelector("#agendaPrevMonthButton");
const agendaNextMonthButton = document.querySelector("#agendaNextMonthButton");
const newAgendaOsButton = document.querySelector("#newAgendaOsButton");
const agendaOsModal = document.querySelector("#agendaOsModal");
const agendaOsForm = document.querySelector("#agendaOsForm");
const agendaOsFormStatus = document.querySelector("#agendaOsFormStatus");
const agendaOsTitle = document.querySelector("#agendaOsTitle");
const agendaOsClientSelect = document.querySelector("#agendaOsClientSelect");
const agendaOsEquipmentSelect = document.querySelector("#agendaOsEquipmentSelect");
const agendaOsServiceTypeSelect = document.querySelector("#agendaOsServiceTypeSelect");
const agendaOsChecklistTypeSelect = document.querySelector("#agendaOsChecklistTypeSelect");
const agendaOsChecklistTypeLabel = document.querySelector("#agendaOsChecklistTypeLabel");
const agendaOsTeamSelect = document.querySelector("#agendaOsTeamSelect");
const agendaOsTechnicianSelect = document.querySelector("#agendaOsTechnicianSelect");
const closeAgendaOsModalButton = document.querySelector("#closeAgendaOsModalButton");
const cancelAgendaOsButton = document.querySelector("#cancelAgendaOsButton");
const agendaCount = document.querySelector("#agendaCount");
const attendanceCount = document.querySelector("#attendanceCount");
const todayCount = document.querySelector("#todayCount");
const recurrenceActiveCount = document.querySelector("#recurrenceActiveCount");
const recurrenceDueCount = document.querySelector("#recurrenceDueCount");
const recurrenceStatus = document.querySelector("#recurrenceStatus");
const recurrenceForm = document.querySelector("#recurrenceForm");
const recurrenceFormStatus = document.querySelector("#recurrenceFormStatus");
const recurrenceClientSelect = document.querySelector("#recurrenceClientSelect");
const recurrenceEquipmentSelect = document.querySelector("#recurrenceEquipmentSelect");
const recurrenceTeamSelect = document.querySelector("#recurrenceTeamSelect");
const recurrenceTechnicianSelect = document.querySelector("#recurrenceTechnicianSelect");
const recurrenceList = document.querySelector("#recurrenceList");
const empresaStatus = document.querySelector("#empresaStatus");
const empresaForm = document.querySelector("#empresaForm");
const empresaFormStatus = document.querySelector("#empresaFormStatus");
const empresaStatusSummary = document.querySelector("#empresaStatusSummary");
const empresaCnpjSummary = document.querySelector("#empresaCnpjSummary");
const empresaContatoSummary = document.querySelector("#empresaContatoSummary");
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
const clientTeamsSelect = document.querySelector("#clientTeamsSelect");
const clientTechnicianSelect = document.querySelector("#clientTechnicianSelect");
const engenheirosStatus = document.querySelector("#engenheirosStatus");
const engenheirosList = document.querySelector("#engenheirosList");
const engineerForm = document.querySelector("#engineerForm");
const engineerFormStatus = document.querySelector("#engineerFormStatus");
const resetEngineerFormButton = document.querySelector("#resetEngineerFormButton");
const tecnicosStatus = document.querySelector("#tecnicosStatus");
const tecnicosList = document.querySelector("#tecnicosList");
const tecnicoForm = document.querySelector("#tecnicoForm");
const tecnicoFormStatus = document.querySelector("#tecnicoFormStatus");
const resetTecnicoFormButton = document.querySelector("#resetTecnicoFormButton");
const equipesStatus = document.querySelector("#equipesStatus");
const equipesList = document.querySelector("#equipesList");
const equipeForm = document.querySelector("#equipeForm");
const equipeFormStatus = document.querySelector("#equipeFormStatus");
const resetEquipeFormButton = document.querySelector("#resetEquipeFormButton");
const equipeClientsSelect = document.querySelector("#equipeClientsSelect");
const equipeMembersList = document.querySelector("#equipeMembersList");
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
const relatoriosAvulsosStatus = document.querySelector("#relatoriosAvulsosStatus");
const relatoriosAvulsosList = document.querySelector("#relatoriosAvulsosList");
const avulsoClientCount = document.querySelector("#avulsoClientCount");
const avulsoReadyCount = document.querySelector("#avulsoReadyCount");
const reportGrid = document.querySelector("#reportGrid");
const reportOsCount = document.querySelector("#reportOsCount");
const reportRevenue = document.querySelector("#reportRevenue");
const reportCollectedRevenue = document.querySelector("#reportCollectedRevenue");
const automationCount = document.querySelector("#automationCount");
const printReportsButton = document.querySelector("#printReportsButton");
const fleetReportStatus = document.querySelector("#fleetReportStatus");
const fleetReportList = document.querySelector("#fleetReportList");
const fleetReportExportButton = document.querySelector("#fleetReportExportButton");

let activeView = "preChamados";
let activeConfigView = "empresa";
let activeOsTab = "solicitacoes";
let selectedOsDetailId = "";
let latestPreChamados = [];
let latestFleetItems = [];
let latestFleetReportItems = [];
let latestVehicleRecords = [];
let latestClients = [];
let latestEngineers = [];
let latestTecnicos = [];
let latestEquipes = [];
let latestAgendaItems = [];
let latestAgendaEquipments = [];
let latestRecurrenceItems = [];
let recurrenceEditingPlanId = "";
let latestReports = null;
let selectedFleetVehicleId = "";
let selectedAgendaDate = "";
let agendaVisibleMonth = getLocalDateKey(new Date()).slice(0, 7);
let agendaEditingOsId = "";
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
    Authorization: \`Bearer \${getToken()}\`
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
    const response = await fetch(\`\${apiBaseUrl}/auth/login\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        login: String(data.get("login") || ""),
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

  if (activeView === "recorrencias") {
    await loadRecorrencias();
    return;
  }

  if (activeView === "empresa") {
    await loadEmpresa();
    return;
  }

  if (activeView === "configuracoes") {
    await loadConfigView();
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

  if (activeView === "tecnicos") {
    await loadTecnicos();
    return;
  }

  if (activeView === "equipes") {
    await loadEquipes();
    return;
  }

  if (activeView === "pmoc") {
    await loadPmoc();
    return;
  }

  if (activeView === "relatoriosAvulsos") {
    await loadRelatoriosAvulsos();
    return;
  }

  if (activeView === "relatorios") {
    await loadRelatorios();
    return;
  }

  await loadOsWorkbench();
}

async function loadConfigView() {
  if (activeConfigView === "tecnicos") {
    await loadTecnicos();
    return;
  }

  if (activeConfigView === "equipes") {
    await loadEquipes();
    return;
  }

  if (activeConfigView === "engenheiros") {
    await loadEngenheiros();
    return;
  }

  await loadEmpresa();
}

async function loadOsWorkbench() {
  await Promise.all([
    loadPreChamados(),
    loadAgendaForOsWorkbench()
  ]);

  setOsTab(activeOsTab);
}

function setActiveView(view) {
  activeView = view;

  for (const link of navLinks) {
    link.classList.toggle("active", link.dataset.view === view);
  }

  configButton?.classList.toggle("active", view === "configuracoes");

  if (view === "configuracoes") {
    setConfigView(activeConfigView);
  }

  const meta = {
    preChamados: ["Operação de O.S.", "O.S."],
    frota: ["Monitoramento operacional", "Localização da frota"],
    agenda: ["Despacho de serviços", "Agenda operacional"],
    recorrencias: ["Planos de atividade", "Recorrências"],
    empresa: ["Cadastro base", "Empresa"],
    clientes: ["Relacionamento", "Clientes e equipamentos"],
    tecnicos: ["Equipe de campo", "Acessos"],
    equipes: ["Despacho flexível", "Equipes por cliente"],
    engenheiros: ["Responsabilidade técnica", "Engenheiros responsáveis"],
    configuracoes: ["Administração", "Configurações"],
    pmoc: ["Conformidade técnica", "PMOC"],
    relatoriosAvulsos: ["Atendimento avulso", "Relatórios diretos ao cliente"],
    relatorios: ["Gestão", "Dashboard"]
  }[view] ?? ["Operação de O.S.", "O.S."];

  viewKicker.textContent = meta[0];
  viewTitle.textContent = meta[1];
  preChamadosSummary.classList.toggle("hidden", view !== "preChamados");
  frotaSummary.classList.toggle("hidden", view !== "frota");
  agendaSummary.classList.toggle("hidden", view !== "agenda");
  recorrenciasSummary.classList.toggle("hidden", view !== "recorrencias");
  empresaSummary.classList.toggle("hidden", view !== "empresa");
  clientesSummary.classList.toggle("hidden", view !== "clientes");
  pmocSummary.classList.toggle("hidden", view !== "pmoc");
  relatoriosSummary.classList.toggle("hidden", view !== "relatorios");
  relatoriosAvulsosSummary.classList.toggle("hidden", view !== "relatoriosAvulsos");
  configTabs.classList.toggle("hidden", view !== "configuracoes");
  preChamadosView.classList.toggle("hidden", view !== "preChamados");
  frotaView.classList.toggle("hidden", view !== "frota");
  agendaView.classList.toggle("hidden", view !== "agenda");
  recorrenciasView.classList.toggle("hidden", view !== "recorrencias");
  empresaView.classList.toggle("hidden", view !== "empresa" && !(view === "configuracoes" && activeConfigView === "empresa"));
  clientesView.classList.toggle("hidden", view !== "clientes");
  engenheirosView.classList.toggle("hidden", view !== "engenheiros" && !(view === "configuracoes" && activeConfigView === "engenheiros"));
  tecnicosView.classList.toggle("hidden", view !== "tecnicos" && !(view === "configuracoes" && activeConfigView === "tecnicos"));
  equipesView.classList.toggle("hidden", view !== "equipes" && !(view === "configuracoes" && activeConfigView === "equipes"));
  pmocView.classList.toggle("hidden", view !== "pmoc");
  relatoriosView.classList.toggle("hidden", view !== "relatorios");
  relatoriosAvulsosView.classList.toggle("hidden", view !== "relatoriosAvulsos");
}

function setConfigView(view) {
  activeConfigView = view;

  for (const button of configTabButtons) {
    button.classList.toggle("active", button.dataset.configView === view);
  }
}

async function loadPreChamados() {
  listStatus.textContent = "Carregando...";

  let response;

  try {
    response = await fetch(\`\${apiBaseUrl}/admin/pre-chamados\`, {
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
  latestPreChamados = result.items || [];
  pendingCount.textContent = result.total;
  listStatus.textContent = result.total === 1 ? "1 solicitacao" : \`\${result.total} solicitacoes\`;
  renderPreChamados(filterOsRequests(latestPreChamados));
}

async function loadAgendaForOsWorkbench() {
  const result = await fetchAdminJson("/admin/agenda", listStatus);

  if (!result) {
    latestAgendaItems = [];
    return;
  }

  latestAgendaItems = result.items || [];
}

async function loadFrota() {
  fleetStatus.textContent = "Carregando...";
  renderFrota([]);

  let response;

  try {
    response = await fetch(\`\${apiBaseUrl}/admin/frota/localizacoes\`, {
      headers: authHeaders()
    });
  } catch {
    fleetStatus.textContent = "API indisponivel.";
    renderFrota([]);
    return;
  }

  if (await handleUnauthorized(response)) {
    return;
  }

  if (!response.ok) {
`;
