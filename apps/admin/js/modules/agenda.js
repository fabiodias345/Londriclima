export const agendaModule = {
  view: "agenda",
  summaryId: "agendaSummary",
  viewId: "agendaView"
};

export const agendaRoot = `
    \`;
    agendaList.appendChild(row);
  }

  if (unscheduledItems.length) {
    const pending = document.createElement("article");
    pending.className = "agenda-unscheduled";
    pending.innerHTML = \`
      <div>
        <strong>Sem horario definido</strong>
        <span>\${unscheduledItems.length === 1 ? "1 OS precisa de agendamento" : \`\${unscheduledItems.length} OS precisam de agendamento\`}</span>
      </div>
      <div class="agenda-unscheduled-list">
        \${unscheduledItems.map(renderAgendaServiceCard).join("")}
      </div>
    \`;
    agendaList.appendChild(pending);
  }
}

function buildAgendaSlots(items) {
  const hours = Array.from({ length: 12 }, (_, index) => \`\${String(index + 7).padStart(2, "0")}:00\`);

  return hours.map((hour) => ({
    hour,
    items: items.filter((item) => formatAgendaTime(item.agendada_para).startsWith(hour.slice(0, 2)))
  }));
}

function renderAgendaServiceCard(item) {
  return \`
    <section class="agenda-service-card \${getAgendaStatusClass(item.status)}">
      <div>
        <strong>\${escapeHtml(item.titulo)}</strong>
        <span>\${escapeHtml(item.cliente?.nome || "Cliente não informado")} - \${escapeHtml(formatAddress(item.endereco))}</span>
      </div>
      <div>
        <span class="status-pill">\${formatStatus(item.status)}</span>
        <span>\${item.agendada_para ? formatAgendaTime(item.agendada_para) : "Definir horario"}</span>
      </div>
      <div>
        <span>\${escapeHtml(formatRecurrenceCalendar(item.calendario))}</span>
        <span>\${escapeHtml(item.equipamento ? formatAgendaEquipment(item.equipamento) : "Todos os equipamentos do cliente")}</span>
        <span>\${escapeHtml(item.equipe?.nome || item.tecnico?.nome || "Equipe nao atribuida")}</span>
      </div>
      <button class="secondary-button compact-button" type="button" data-action="editar-agenda-os" data-id="\${item.id}">Editar</button>
    </section>
  \`;
}

function renderRecorrencias(items) {
  if (!recurrenceList) {
    return;
  }

  if (!items.length) {
    recurrenceList.innerHTML = '<article class="agenda-empty"><strong>Nenhum plano recorrente.</strong><span>Cadastre uma rotina para gerar OS futuras com poucos cliques.</span></article>';
    return;
  }

  recurrenceList.innerHTML = items.map(renderRecurrenceCard).join("");
}

function renderRecurrenceCard(item) {
  const due = item.ativo && new Date(item.proxima_execucao).getTime() <= Date.now();

  return \`
    <article class="recurrence-card \${due ? "due" : ""}">
      <div>
        <strong>\${escapeHtml(item.titulo)}</strong>
        <span>\${escapeHtml(item.cliente?.nome || "Cliente não informado")} - \${formatRecurrenceFrequency(item.frequencia)}</span>
        <span>\${escapeHtml(item.equipamento ? formatAgendaEquipment(item.equipamento) : "Todos os equipamentos do cliente")}</span>
      </div>
      <div>
        <span>Proxima OS</span>
        <strong>\${formatDateTime(item.proxima_execucao)}</strong>
      </div>
      <div>
        <span>Responsavel</span>
        <strong>\${escapeHtml(item.equipe?.nome || item.tecnico?.nome || "Definir na agenda")}</strong>
      </div>
      <div class="request-actions">
        <button class="secondary-button compact-button" type="button" data-action="editar-recorrencia" data-id="\${item.id}">Editar</button>
        <button class="secondary-button compact-button danger-button" type="button" data-action="apagar-recorrencia" data-id="\${item.id}">Apagar</button>
        <button class="secondary-button compact-button" type="button" data-action="gerar-recorrencia-os" data-id="\${item.id}">Gerar OS</button>
      </div>
    </article>
  \`;
}

function formatRecurrenceFrequency(value) {
  return {
    mensal: "Mensal",
    trimestral: "Trimestral",
    semestral: "Semestral",
    anual: "Anual"
  }[value] || value;
}

function formatRecurrenceCalendar(calendar) {
  const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const items = labels
    .map((label, index) => {
      const value = calendar?.[String(index + 1)];
      return value && value !== "nenhum" ? \`\${label}: \${formatRecurrenceFrequency(value)}\` : "";
    })
    .filter(Boolean);
  return items.length ? items.join(" | ") : "Calendario nao configurado";
}

async function generateRecurrenceOs(planId) {
  recurrenceStatus.textContent = "Gerando OS...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/planos-recorrencia/\${planId}/gerar-os\`, {
      method: "POST",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      recurrenceStatus.textContent = error.message || "Nao foi possivel gerar a OS.";
      return;
    }

    await loadRecorrencias();
    if (activeView === "agenda") {
      await loadAgenda();
    }
  } catch {
    recurrenceStatus.textContent = "API indisponivel.";
  }
}

function getAgendaStatusClass(status) {
  return \`status-\${String(status || "aberta").replace(/[^a-z_]/g, "")}\`;
}

function formatAgendaEquipment(equipment) {
  return [
    equipment.patrimonio,
    equipment.local_instalacao || equipment.localInstalacao,
    equipment.marca && equipment.modelo ? \`\${equipment.marca} \${equipment.modelo}\` : equipment.marca || equipment.modelo
  ].filter(Boolean).join(" - ");
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
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml(item.nome)}</strong>
        <span>\${formatPhone(item.telefone)} · \${escapeHtml(item.email || "sem email")}</span>
      </div>
      <div>
        <span>\${escapeHtml(formatAddress(item.endereco))}</span>
        <span>\${item.total_equipamentos} equipamentos · \${item.total_os} OS</span>
        <span>ART PMOC: \${escapeHtml(item.pmoc_art_numero || "nao informada")}</span>
      </div>
      <div class="data-row-actions">
        <span class="status-pill">\${item.os_abertas} abertas</span>
        <button class="secondary-button compact-button" type="button" data-action="editar-art-cliente" data-id="\${item.id}">ART</button>
        <button class="secondary-button compact-button" type="button" data-action="editar-cliente" data-id="\${item.id}">Editar</button>
        <button class="secondary-button compact-button danger-button" type="button" data-action="apagar-cliente" data-id="\${item.id}">Apagar</button>
      </div>
    \`;
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

async function updateClientArt(clientId) {
  const client = latestClients.find((item) => item.id === clientId);

  if (!client) {
    return;
  }

  const artNumero = window.prompt("Numero da ART anual PMOC", client.pmoc_art_numero || "1720263699262");

  if (artNumero === null) {
    return;
  }

  const payload = removeEmptyValues({
    tipo: client.tipo || "pf",
    nome: client.nome || "",
    telefone: onlyDigits(client.telefone || ""),
    email: client.email || "",
    documento: client.tipo === "pj" ? onlyDigits(client.documento || "") : client.documento || "",
    pmoc_ativo: Boolean(client.pmoc_ativo),
    pmoc_art_numero: String(artNumero || "").trim(),
    engenheiro_responsavel_id: client.pmoc_ativo ? client.engenheiro_responsavel?.id || "" : "",
    tecnico_responsavel_id: client.tecnico_responsavel?.id || "",
    equipe_ids: (client.equipes || []).map((equipe) => equipe.id),
    cep: onlyDigits(client.endereco?.cep || ""),
    logradouro: client.endereco?.logradouro || "",
    numero: client.endereco?.numero || "",
    bairro: client.endereco?.bairro || "",
    cidade: client.endereco?.cidade || "Londrina",
    uf: client.endereco?.uf || "PR"
  });

  clientFormStatus.textContent = "Salvando ART do cliente...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/clientes/\${client.id}\`, {
      method: "PATCH",
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
      clientFormStatus.textContent = error.message || "Nao foi possivel salvar a ART.";
      return;
    }

    clientFormStatus.textContent = "ART salva.";
    await loadClientes();
  } catch {
    clientFormStatus.textContent = "API indisponivel.";
  }
}

function renderPmocEngineerOptions(selectedId = "") {
  if (!pmocEngineerSelect) {
    return;
  }

  pmocEngineerSelect.innerHTML = '<option value="">Selecione um engenheiro</option>';

  for (const item of latestEngineers) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = \`\${item.nome} - CREA \${item.crea}\`;
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
    card.className = \`pmoc-client-card \${item.pmoc_ativo ? "is-active" : "needs-action"}\`;
    card.innerHTML = \`
      <div>
        <span class="pmoc-status \${status.tone}">\${escapeHtml(status.label)}</span>
        <strong>\${escapeHtml(item.nome)}</strong>
        <p>\${formatPhone(item.telefone)} - \${escapeHtml(item.email || "sem email")}</p>
      </div>
      <div class="pmoc-client-facts">
        <span>\${item.total_equipamentos || 0} maquinas</span>
        <span>\${item.os_abertas || 0} OS abertas</span>
        <span>\${escapeHtml(item.engenheiro_responsavel?.nome || "sem engenheiro")}</span>
      </div>
      <div class="data-row-actions">
        \${
          item.pmoc_ativo
            ? \`<button class="secondary-button compact-button" type="button" data-action="pmoc-ver-cliente" data-id="\${item.id}">Ver dossie</button>\`
            : \`<button class="approve-button compact-button" type="button" data-action="pmoc-ativar-cliente" data-id="\${item.id}">Adicionar PMOC</button>\`
        }
      </div>
    \`;
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
    row.innerHTML = \`
      <div>
        <span class="pmoc-status \${status.tone}">\${escapeHtml(status.label)}</span>
        <strong>\${escapeHtml(item.nome)}</strong>
        <p>\${escapeHtml(formatAddress(item.endereco))}</p>
      </div>
      <div>
        <span>Eng. \${escapeHtml(item.engenheiro_responsavel?.nome || "pendente")}</span>
        <span>\${escapeHtml(item.engenheiro_responsavel?.email || "email pendente")}</span>
      </div>
      <div>
        <span>\${item.total_equipamentos || 0} maquinas separadas</span>
        <span>\${item.os_abertas || 0} OS em andamento</span>
      </div>
      <div class="data-row-actions">
        <button class="secondary-button compact-button" type="button" data-action="pmoc-ver-cliente" data-id="\${item.id}">Ver dossie</button>
      </div>
    \`;
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

  const result = await fetchAdminJson(\`/admin/clientes/\${client.id}/equipamentos\`, pmocDossierMeta);

  if (!result) {
    return;
  }

  const machines = result.items || [];
  selectedPmocDossierMachines = machines;
  pmocDossierMeta.textContent = \`\${machines.length} maquinas - \${client.os_abertas || 0} OS abertas - \${client.engenheiro_responsavel?.nome || "sem engenheiro"}\`;
  pmocGenerateReportButton.disabled = !hasCompletedPmocMaintenance(machines);
  pmocRequestSignatureButton.disabled = !hasCompletedPmocMaintenance(machines) || !client.engenheiro_responsavel;
  renderPmocDossierAlerts(client, machines, null);
  renderPmocMachines(machines);

  const preview = await fetchAdminJson(\`/admin/pmoc/clientes/\${client.id}/previa\`, pmocDossierMeta);

  if (preview) {
    const hasPendingSignature = preview.assinatura_atual?.status === "aguardando_assinatura_engenheiro";
    const hasDeliveredCurrentMonth = getCurrentPmocMonth(preview)?.email_entregue === true;
    const isTestClient = isPmocTestClient(client);
    const canRequestSignature = (!hasDeliveredCurrentMonth || isTestClient) && preview.pronto_para_pdf;
    renderPmocMonths(preview.pmoc_meses || []);
    renderPmocDossierAlerts(client, machines, preview);
    pmocDossierMeta.textContent = \`\${preview.total_maquinas || machines.length} maquinas - \${preview.total_os_concluidas || 0} OS concluidas - \${client.engenheiro_responsavel?.nome || "sem engenheiro"}\`;
    pmocRequestSignatureButton.disabled = !canRequestSignature;
    pmocRequestSignatureButton.textContent = isTestClient
      ? "Solicitar assinatura"
      : hasDeliveredCurrentMonth
      ? "PMOC enviado"
      : hasPendingSignature
      ? "Reenviar assinatura"
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
    row.className = \`pmoc-alert \${alert.tone}\`;
    row.innerHTML = \`<strong>\${escapeHtml(alert.title)}</strong><span>\${escapeHtml(alert.text)}</span>\`;
    pmocDossierAlerts.appendChild(row);
  }
}

function getPmocDossierAlerts(client, machines, preview) {
  const alerts = [];
  const currentSignature = preview?.assinatura_atual;

  if (currentSignature?.status === "assinado" && currentSignature.email_entregue) {
    alerts.push({
      tone: "success",
      title: "PMOC enviado ao cliente",
      text: currentSignature.assinado_em
        ? \`Relatorio assinado em \${formatDateTime(currentSignature.assinado_em)}.\`
        : "Relatorio assinado e envio final agendado."
    });
  }

  if (currentSignature?.status === "assinado" && !currentSignature.email_entregue) {
    alerts.push({
`;
