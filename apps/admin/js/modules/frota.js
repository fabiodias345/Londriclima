export const frotaModule = {
  view: "frota",
  summaryId: "frotaSummary",
  viewId: "frotaView"
};

export const frotaRoot = `
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
    card.innerHTML = \`
      <div>
        <p class="request-title">\${escapeHtml(item.titulo)}</p>
        <p class="request-meta">\${escapeHtml(item.cliente.nome)} · \${formatPhone(item.cliente.telefone)}</p>
      </div>
      <div>
        <p class="request-details">\${escapeHtml(item.detalhes || "Sem detalhes")}</p>
        <p class="request-meta">\${escapeHtml(formatAddress(item.endereco))}</p>
      </div>
      <form class="dispatch-form" data-id="\${item.id}">
        <label>
          Agenda
          <input name="agendada_para" type="datetime-local" />
        </label>
        <label>
          Equipes
          <select name="equipe_ids" multiple size="3">
            \${renderOptions(dispatchOptions.equipes)}
          </select>
        </label>
        <label>
          Tecnicos / auxiliares
          <select name="usuario_ids" multiple size="3">
            \${renderOptions(dispatchOptions.tecnicos)}
          </select>
        </label>
        <label>
          Valor previsto
          <input name="valor_cobrado" type="number" min="0" step="0.01" placeholder="350,00" />
        </label>
        <div class="request-actions">
          <button class="approve-button" type="submit">Aprovar e agendar</button>
          <button class="reject-button" type="button" data-action="rejeitar" data-id="\${item.id}">Rejeitar</button>
        </div>
      </form>
    \`;
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
    card.className = \`fleet-card \${item.id === selectedFleetVehicleId ? "active" : ""}\`;
    card.dataset.vehicleId = item.id;
    card.disabled = !location;
    card.innerHTML = \`
      <strong>\${escapeHtml(item.nome)}</strong>
      <p>\${escapeHtml(item.placa || "Sem placa")} · \${moving ? "em movimento" : "parado"}</p>
      <p>\${location ? \`\${speed} km/h · \${formatDate(location.registrado_em)} · abrir no mapa\` : "Sem sinal recente"}</p>
    \`;
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
    option.textContent = \`\${item.nome}\${item.placa ? \` - \${item.placa}\` : ""}\`;
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
    }).bindPopup(\`<strong>\${escapeHtml(item.nome)}</strong><br>\${escapeHtml(item.placa || "Sem placa")}<br>\${speed} km/h\`);

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

async function loadFleetVehicles() {
  vehicleStatus.textContent = "Carregando...";
  const result = await fetchAdminJson("/admin/frota/veiculos", vehicleStatus);

  if (!result) {
    return;
  }

  latestVehicleRecords = result.items || [];
  vehicleStatus.textContent = result.total === 1 ? "1 veiculo cadastrado" : \`\${result.total} veiculos cadastrados\`;
  renderVehicleList(latestVehicleRecords);
  renderFuelVehicleOptions(latestVehicleRecords);
}

function renderVehicleList(items) {
  vehicleList.innerHTML = "";

  if (!items.length) {
    vehicleList.innerHTML = '<article class="data-row vehicle-empty"><span>Nenhum veiculo cadastrado.</span></article>';
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "data-row vehicle-row";
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml(item.nome)}</strong>
        <span>\${escapeHtml(item.placa || "Sem placa")}</span>
      </div>
      <div>
        <span>Rastreador</span>
        <strong>\${escapeHtml(item.rastreador_imei || "Nao informado")}</strong>
      </div>
      <div class="vehicle-actions">
        <button class="secondary-button compact-button" type="button" data-action="editar-veiculo" data-id="\${item.id}">Editar</button>
        <button class="danger-button compact-button" type="button" data-action="apagar-veiculo" data-id="\${item.id}">Excluir</button>
      </div>
    \`;
    vehicleList.appendChild(row);
  }
}

function fillVehicleForm(vehicleId) {
  const vehicle = latestVehicleRecords.find((item) => item.id === vehicleId);

  if (!vehicle) {
    return;
  }

  vehicleForm.elements.id.value = vehicle.id;
  vehicleForm.elements.nome.value = vehicle.nome || "";
  vehicleForm.elements.placa.value = vehicle.placa || "";
  vehicleForm.elements.rastreador_imei.value = vehicle.rastreador_imei || "";
  vehicleForm.querySelector("button[type='submit']").textContent = "Salvar veiculo";
  resetVehicleFormButton.classList.remove("hidden");
  vehicleFormStatus.textContent = "Editando veiculo selecionado.";
  vehicleForm.elements.nome.focus();
}

function resetVehicleForm() {
  vehicleForm.reset();
  vehicleForm.elements.id.value = "";
  vehicleForm.querySelector("button[type='submit']").textContent = "Cadastrar veiculo";
  resetVehicleFormButton.classList.add("hidden");
  vehicleFormStatus.textContent = "";
}

async function submitVehicle(event) {
  event.preventDefault();
  const data = new FormData(vehicleForm);
  const vehicleId = String(data.get("id") || "");
  const button = vehicleForm.querySelector("button[type='submit']");
  const payload = {
    nome: String(data.get("nome") || "").trim(),
    placa: String(data.get("placa") || "").trim(),
    rastreador_imei: String(data.get("rastreador_imei") || "").trim()
  };

  button.disabled = true;
  button.textContent = vehicleId ? "Salvando..." : "Cadastrando...";
  vehicleFormStatus.textContent = "";

  try {
    const response = await fetch(
      vehicleId
        ? \`\${apiBaseUrl}/admin/frota/veiculos/\${vehicleId}\`
        : \`\${apiBaseUrl}/admin/frota/veiculos\`,
      {
        method: vehicleId ? "PATCH" : "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      vehicleFormStatus.textContent = error.message || "Nao foi possivel salvar o veiculo.";
      return;
    }

    resetVehicleForm();
    await loadFrota();
    vehicleFormStatus.textContent = vehicleId ? "Veiculo atualizado." : "Veiculo cadastrado.";
  } catch {
    vehicleFormStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = vehicleForm.elements.id.value ? "Salvar veiculo" : "Cadastrar veiculo";
  }
}

async function deleteVehicle(vehicleId) {
  const vehicle = latestVehicleRecords.find((item) => item.id === vehicleId);

  if (!vehicle || !window.confirm(\`Excluir \${vehicle.nome} da frota?\`)) {
    return;
  }

  vehicleFormStatus.textContent = "Excluindo veiculo...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/frota/veiculos/\${vehicleId}\`, {
      method: "DELETE",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      vehicleFormStatus.textContent = error.message || "Nao foi possivel excluir o veiculo.";
      return;
    }

    if (vehicleForm.elements.id.value === vehicleId) {
      resetVehicleForm();
    }

    await loadFrota();
    vehicleFormStatus.textContent = "Veiculo excluido.";
  } catch {
    vehicleFormStatus.textContent = "API indisponivel.";
  }
}

function renderAgenda(items) {
  const calendarDays = buildAgendaCalendarDays(items);
  const preferredDate = pickAgendaDate(calendarDays);

  if (!selectedAgendaDate || !calendarDays.some((day) => day.key === selectedAgendaDate)) {
    selectedAgendaDate = preferredDate;
  }

  agendaVisibleMonth = selectedAgendaDate.slice(0, 7);
  renderAgendaCalendar(calendarDays, selectedAgendaDate);
  renderAgendaMonthGrid(items, selectedAgendaDate);
  renderAgendaPendingList(items);
  renderAgendaDay(items, selectedAgendaDate);
}

function buildAgendaCalendarDays(items) {
  const todayKey = getLocalDateKey(new Date());
  const dateKeys = new Set([todayKey]);

  for (const item of items) {
    const dateKey = item.agendada_para ? getAgendaItemDateKey(item) : "";

    if (dateKey) {
      dateKeys.add(dateKey);
    }
  }

  for (let offset = 1; offset <= AGENDA_LOOKAHEAD_DAYS; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    dateKeys.add(getLocalDateKey(date));
  }

  return [...dateKeys]
    .sort()
    .map((dateKey) => ({
      key: dateKey,
      date: parseLocalDateKey(dateKey),
      total: items.filter((item) => item.agendada_para && getAgendaItemDateKey(item) === dateKey).length
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

  for (const day of days.filter((item) => item.key.slice(0, 7) === agendaVisibleMonth)) {
    const button = document.createElement("button");
    button.className = "agenda-date-button";
    button.type = "button";
    button.dataset.agendaDate = day.key;
    button.classList.toggle("active", day.key === activeDateKey);
    button.innerHTML = \`
      <span>\${formatWeekday(day.date)}</span>
      <strong>\${formatDayNumber(day.date)}</strong>
      <small>\${formatShortMonth(day.date)}</small>
      <em>\${day.total === 1 ? "1 OS" : \`\${day.total} OS\`}</em>
    \`;
    agendaCalendar.appendChild(button);
  }
}

function renderAgendaMonthGrid(items, activeDateKey) {
  if (!agendaMonthGrid) {
    return;
  }

  agendaMonthGrid.innerHTML = "";
  const [year, month] = agendaVisibleMonth.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  const monthLabel = firstDay.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });

  if (agendaMonthTitle) {
    agendaMonthTitle.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  }

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateKey = getLocalDateKey(date);
    const dayItems = items
      .filter((item) => item.agendada_para && getAgendaItemDateKey(item) === dateKey)
      .sort((a, b) => (a.agendada_para || "").localeCompare(b.agendada_para || ""));
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "agenda-month-cell";
    cell.dataset.agendaDate = dateKey;
    cell.classList.toggle("outside", date.getMonth() !== month - 1);
    cell.classList.toggle("active", dateKey === activeDateKey);
    cell.innerHTML = \`
      <span class="agenda-month-day">\${date.getDate()}</span>
      <div class="agenda-month-services">
        \${dayItems.slice(0, 3).map(renderAgendaMonthCard).join("")}
        \${dayItems.length > 3 ? \`<em>Ver mais (+\${dayItems.length - 3})</em>\` : ""}
      </div>
    \`;
    agendaMonthGrid.appendChild(cell);
  }
}

function renderAgendaMonthCard(item) {
  return \`
    <strong class="\${getAgendaStatusClass(item.status)}">
      \${item.agendada_para ? formatAgendaTime(item.agendada_para) : "--:--"} - \${escapeHtml(item.cliente?.nome || item.titulo)}
    </strong>
  \`;
}

function renderAgendaPendingList(items) {
  if (!agendaPendingList) {
    return;
  }

  const pendingItems = items
    .filter((item) => !item.agendada_para || !item.equipe && !item.tecnico)
    .slice(0, 8);

  if (!pendingItems.length) {
    agendaPendingList.innerHTML = '<article class="agenda-pending-empty">Nenhuma pendencia operacional.</article>';
    return;
  }

  agendaPendingList.innerHTML = pendingItems.map((item) => \`
    <button class="agenda-pending-card" type="button" data-action="editar-agenda-os" data-id="\${item.id}">
      <strong>\${escapeHtml(item.titulo)}</strong>
      <span>\${item.agendada_para ? "Sem equipe" : "Sem horario"}</span>
    </button>
  \`).join("");
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
  agendaSelectedDateMeta.textContent = scheduledItems.length === 1 ? "1 servico marcado" : \`\${scheduledItems.length} servicos marcados\`;

  for (const slot of buildAgendaSlots(scheduledItems)) {
    const row = document.createElement("article");
    row.className = "agenda-slot";
    row.innerHTML = \`
      <time datetime="\${dateKey}T\${slot.hour}:00">\${slot.hour}</time>
      <div class="agenda-slot-content">
        \${
          slot.items.length
            ? slot.items.map(renderAgendaServiceCard).join("")
            : '<span class="agenda-free">Livre</span>'
        }
      </div>
`;
