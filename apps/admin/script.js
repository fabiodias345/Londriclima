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
const preChamadosView = document.querySelector("#preChamadosView");
const frotaView = document.querySelector("#frotaView");
const fleetMap = document.querySelector("#fleetMap");
const fleetList = document.querySelector("#fleetList");
const fleetStatus = document.querySelector("#fleetStatus");
const vehicleCount = document.querySelector("#vehicleCount");
const movingCount = document.querySelector("#movingCount");

let activeView = "preChamados";

const mapBounds = {
  minLat: -23.36,
  maxLat: -23.27,
  minLng: -51.22,
  maxLng: -51.10
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

  const data = new FormData(loginForm);
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
}

async function loadActiveView() {
  if (activeView === "frota") {
    await loadFrota();
    return;
  }

  await loadPreChamados();
}

function setActiveView(view) {
  activeView = view;

  for (const link of navLinks) {
    link.classList.toggle("active", link.dataset.view === view);
  }

  const isFrota = view === "frota";
  viewKicker.textContent = isFrota ? "Monitoramento operacional" : "Operacao comercial";
  viewTitle.textContent = isFrota ? "Localizacao da frota" : "Pre-chamados do site";
  preChamadosSummary.classList.toggle("hidden", isFrota);
  preChamadosView.classList.toggle("hidden", isFrota);
  frotaSummary.classList.toggle("hidden", !isFrota);
  frotaView.classList.toggle("hidden", !isFrota);
}

async function loadPreChamados() {
  listStatus.textContent = "Carregando...";

  const response = await fetch(`${apiBaseUrl}/admin/pre-chamados`, {
    headers: authHeaders()
  });

  if (await handleUnauthorized(response)) {
    return;
  }

  if (!response.ok) {
    listStatus.textContent = "Nao foi possivel carregar os pre-chamados.";
    return;
  }

  const result = await response.json();
  pendingCount.textContent = result.total;
  listStatus.textContent = result.total === 1 ? "1 pendente" : `${result.total} pendentes`;
  renderPreChamados(result.items);
}

async function loadFrota() {
  fleetStatus.textContent = "Carregando...";

  const response = await fetch(`${apiBaseUrl}/admin/frota/localizacoes`, {
    headers: authHeaders()
  });

  if (await handleUnauthorized(response)) {
    return;
  }

  if (!response.ok) {
    fleetStatus.textContent = "Nao foi possivel carregar a frota.";
    return;
  }

  const result = await response.json();
  const moving = result.items.filter((item) => (item.localizacao?.velocidade_kmh || 0) > 0).length;

  vehicleCount.textContent = result.total;
  movingCount.textContent = moving;
  fleetStatus.textContent = result.total === 1 ? "1 veiculo" : `${result.total} veiculos`;
  renderFrota(result.items);
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
      <div class="request-actions">
        <button class="approve-button" type="button" data-action="aprovar" data-id="${item.id}">Aprovar</button>
        <button class="reject-button" type="button" data-action="rejeitar" data-id="${item.id}">Rejeitar</button>
      </div>
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

    const marker = document.createElement("div");
    const position = toMapPosition(location.latitude, location.longitude);

    marker.className = `vehicle-marker ${moving ? "" : "idle"}`;
    marker.style.left = `${position.x}%`;
    marker.style.top = `${position.y}%`;
    marker.innerHTML = `<strong>${escapeHtml(item.nome)}</strong><span>${speed} km/h</span>`;
    fleetMap.appendChild(marker);
  }
}

async function updatePreChamado(osId, action) {
  const response = await fetch(`${apiBaseUrl}/admin/pre-chamados/${osId}/${action}`, {
    method: "PATCH",
    headers: authHeaders()
  });

  if (!response.ok) {
    listStatus.textContent = "Nao foi possivel atualizar o pre-chamado.";
    return;
  }

  await loadPreChamados();
}

function toMapPosition(latitude, longitude) {
  const x = ((longitude - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
  const y = 100 - ((latitude - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * 100;

  return {
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(92, Math.max(8, y))
  };
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

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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

if (getToken()) {
  showDashboard();
  setActiveView(activeView);
  void loadActiveView();
} else {
  showLogin();
}
