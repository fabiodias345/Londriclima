export const eventosModule = {
  view: "eventos",
  summaryId: "adminEvents",
  viewId: "eventosView"
};

export const eventsRoot = `
async function confirmDeleteClient() {
  if (!clientPendingDeleteId || !confirmDeleteClientButton) {
    return;
  }

  const clientId = clientPendingDeleteId;
  confirmDeleteClientButton.disabled = true;
  confirmDeleteClientButton.textContent = "Apagando...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/clientes/\${clientId}\`, {
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

function setOsTab(tab) {
  activeOsTab = tab;
  closeOsDetail();
  updateOsSummaryCards();
  updateOsTabCounts();

  for (const button of osTabs?.querySelectorAll("[data-os-tab]") || []) {
    button.classList.toggle("active", button.dataset.osTab === tab);
  }

  if (tab === "solicitacoes") {
    renderPreChamados(filterOsRequests(latestPreChamados));
    return;
  }

  renderOsAgendaItems(filterOsAgendaItems(latestAgendaItems));
}

function updateOsSummaryCards() {
  if (pendingCount) {
    pendingCount.textContent = latestPreChamados.length;
  }

  if (osActiveCount) {
    osActiveCount.textContent = latestAgendaItems.filter((item) => ["em_deslocamento", "em_atendimento"].includes(item.status)).length;
  }

  if (osScheduledCount) {
    osScheduledCount.textContent = latestAgendaItems.filter((item) => item.status === "aberta" && item.agendada_para).length;
  }

  if (osCompletedMonthCount) {
    const now = new Date();
    osCompletedMonthCount.textContent = latestAgendaItems.filter((item) => {
      if (item.status !== "concluida") return false;
      const date = new Date(item.eventos?.at(-1)?.registrado_em || item.agendada_para || item.criada_em);
      return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
  }
}

function updateOsTabCounts() {
  for (const badge of osTabs?.querySelectorAll("[data-os-count]") || []) {
    badge.className = "os-count-badge";
    badge.textContent = getOsTabCount(badge.dataset.osCount || "");
  }
}

function getOsTabCount(tab) {
  if (tab === "solicitacoes") {
    return latestPreChamados.length;
  }

  return filterOsAgendaItemsByTab(latestAgendaItems, tab).length;
}

function getOsTabLabel(tab) {
  const labels = {
    solicitacoes: "Solicitações",
    abertas: "O.S. abertas",
    agendadas: "O.S. agendadas",
    em_atendimento: "O.S. em atendimento",
    concluidas: "O.S. concluídas",
    canceladas: "O.S. canceladas"
  };

  return labels[tab] || "O.S.";
}

function filterOsRequests(items) {
  const query = normalizeSearch(osSearchInput?.value || "");

  if (activeOsTab !== "solicitacoes") {
    return [];
  }

  if (!query) {
    return items;
  }

  return items.filter((item) => normalizeSearch([
    item.titulo,
    item.cliente?.nome,
    item.cliente?.telefone,
    item.detalhes,
    formatAddress(item.endereco)
  ].filter(Boolean).join(" ")).includes(query));
}

function filterOsAgendaItems(items) {
  const query = normalizeSearch(osSearchInput?.value || "");
  const tabItems = filterOsAgendaItemsByTab(items, activeOsTab);

  return tabItems.filter((item) => {
    const text = normalizeSearch([
      item.titulo,
      item.cliente?.nome,
      item.equipamento ? formatAgendaEquipment(item.equipamento) : "",
      item.equipe?.nome,
      item.tecnico?.nome,
      formatAddress(item.endereco),
      formatStatus(item.status)
    ].filter(Boolean).join(" "));

    return !query || text.includes(query);
  });
}

function filterOsAgendaItemsByTab(items, tab) {
  const statuses = OS_STATUS_TABS[tab] || [];
  let filtered = items.filter((item) => statuses.includes(item.status));

  if (tab === "agendadas") {
    filtered = filtered.filter((item) => item.agendada_para);
  }

  return filtered;
}

function renderOsAgendaItems(items) {
  requestList.innerHTML = "";
  listStatus.textContent = items.length === 1 ? "1 O.S." : \`\${items.length} O.S.\`;

  if (!items.length) {
    requestList.innerHTML = \`
      <article class="request-card os-empty-state os-compact-empty">
        <p class="request-title">Nenhuma \${getOsTabLabel(activeOsTab).toLowerCase()}.</p>
        <p class="request-details">Use Nova O.S. ou ajuste a busca para encontrar outra etapa.</p>
        <button class="secondary-button compact-button" type="button" data-action="os-open-new">Nova O.S.</button>
      </article>
    \`;
    return;
  }

  for (const item of items) {
    const card = document.createElement("article");
    card.className = "request-card os-real-card os-compact-card";
    card.setAttribute("data-action", "ver-os-detalhe");
    card.dataset.id = item.id;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.classList.toggle("is-selected", selectedOsDetailId === item.id);
    card.innerHTML = renderOsCard(item);
    requestList.appendChild(card);
  }
}

function renderOsCard(item) {
  return \`
    <div class="os-list-row">
      <div class="os-list-main">
        <p class="request-title">\${escapeHtml(item.titulo)}</p>
        <p class="request-meta">\${escapeHtml(item.cliente?.nome || "Cliente nao informado")}</p>
        <p class="request-details">\${escapeHtml(formatAddress(item.endereco))}</p>
      </div>
      <div class="os-card-status">
        <strong>\${escapeHtml(formatStatus(item.status))}</strong>
        <em>\${getOsNextAction(item)}</em>
      </div>
      <div class="os-card-grid os-compact-meta">
        \${renderOsCompactMeta(item)}
      </div>
    </div>
  \`;
}

function renderOsCompactMeta(item) {
  return \`
    <span><strong>Equipamentos</strong>\${escapeHtml(renderOsEquipmentTarget(item))}</span>
    <span><strong>Responsavel</strong>\${escapeHtml(item.equipe?.nome || item.tecnico?.nome || "Nao atribuido")}</span>
    <span><strong>Data/hora</strong>\${item.agendada_para ? formatDateTime(item.agendada_para) : "Sem horario"}</span>
  \`;
}

function openOsDetail(osId) {
  selectedOsDetailId = osId;
  const item = latestAgendaItems.find((agendaItem) => agendaItem.id === osId);

  if (!item) {
    return;
  }

  renderOsDetail(item);
  osDetailPanel?.classList.add("is-open");
  markSelectedOsCard(osId);
}

function closeOsDetail() {
  selectedOsDetailId = "";
  osDetailPanel?.classList.remove("is-open");

  if (osDetailTitle) {
    osDetailTitle.textContent = "Selecione uma O.S.";
  }

  if (osDetailMeta) {
    osDetailMeta.textContent = "Clique em uma O.S. para ver dados e proxima acao.";
  }

  if (osDetailBody) {
    osDetailBody.innerHTML = '<p class="request-details">Nenhuma O.S. selecionada.</p>';
  }

  markSelectedOsCard("");
}

function markSelectedOsCard(osId) {
  for (const card of requestList?.querySelectorAll(".os-compact-card") || []) {
    card.classList.toggle("is-selected", card.dataset.id === osId);
  }
}

function renderOsDetail(item) {
  const primaryAction = getOsPrimaryAction(item);

  if (!osDetailTitle || !osDetailMeta || !osDetailBody) {
    return;
  }

  osDetailTitle.textContent = item.titulo || "O.S.";
  osDetailMeta.textContent = \`\${formatStatus(item.status)} - \${item.cliente?.nome || "Cliente nao informado"}\`;
  osDetailBody.innerHTML = \`
    <div class="os-detail-facts">
      <span><strong>Cliente</strong>\${escapeHtml(item.cliente?.nome || "Nao informado")}</span>
      <span><strong>Equipamentos</strong>\${escapeHtml(renderOsEquipmentTarget(item))}</span>
      <span><strong>Responsável</strong>\${escapeHtml(item.equipe?.nome || item.tecnico?.nome || "Não atribuído")}</span>
      <span><strong>Status</strong>\${escapeHtml(formatStatus(item.status))}</span>
      <span><strong>Data/hora</strong>\${item.agendada_para ? formatDateTime(item.agendada_para) : "Sem horário"}</span>
      <span><strong>Endereço</strong>\${escapeHtml(formatAddress(item.endereco))}</span>
    </div>
    <p class="request-details">\${escapeHtml(item.detalhes || "Sem detalhes")}</p>
    <div class="os-detail-sections">
      \${renderOsDispatchSummary(item)}
      \${renderOsTechnicianAppSummary(item)}
      \${renderOsTimeline(item)}
      \${renderOsExecutionSummary(item)}
      \${renderOsEvidenceSummary(item)}
    </div>
    <div class="request-actions">
      <button class="approve-button compact-button os-primary-action \${getAgendaStatusClass(item.status)}" type="button" data-action="\${primaryAction.action}" data-id="\${item.id}">\${primaryAction.label}</button>
      <button class="secondary-button compact-button" type="button" data-action="editar-agenda-os" data-id="\${item.id}">Editar O.S.</button>
      <button class="secondary-button compact-button danger-button" type="button" data-action="apagar-agenda-os" data-id="\${item.id}">Apagar O.S.</button>
    </div>
  \`;
}

function renderOsTechnicianAppSummary(item) {
  const hasResponsible = Boolean(item.equipe?.id || item.tecnico?.id);
  const hasSchedule = Boolean(item.agendada_para);
  const hasClientAddress = Boolean(item.cliente?.id && item.endereco);
  const appStatus = ["aberta", "em_deslocamento", "em_atendimento"].includes(item.status);
  const isDone = item.status === "concluida";
  const ready = (appStatus && hasResponsible && hasSchedule && hasClientAddress) || isDone;
  const machineLabel = renderOsEquipmentTarget(item);
  const checklistLabel = formatChecklistTipo(item.checklist_tipo);
  const serviceLabel = formatOsServiceType(item);
  const readinessText = isDone
    ? "O.S. concluida no app"
    : ready
      ? "Pronta para conferir no celular"
      : "Complete o despacho para liberar no app";
  const statusText = isDone ? "Concluida no app" : appStatus ? "Compativel com app" : "Fora do fluxo do app";
  const actionText = isDone ? "Ver execucao" : ready ? "Conferir no app" : "Corrigir despacho";

  return \`
    <section class="os-detail-section os-app-summary">
      <h4>App do tecnico</h4>
      <div class="os-app-readiness \${ready ? "ready" : "blocked"}">
        <strong>Aparece no app</strong>
        <span>\${readinessText}</span>
      </div>
      <div class="os-execution-summary">
        <span><strong>Status da O.S.</strong>\${statusText}</span>
        <span><strong>Responsavel atribuido</strong>\${escapeHtml(item.equipe?.nome || item.tecnico?.nome || "Nao atribuido")}</span>
        <span><strong>Cliente e endereco</strong>\${hasClientAddress ? escapeHtml(formatAddress(item.endereco)) : "Cliente/endereco incompleto"}</span>
        <span><strong>Maquinas disponiveis</strong>\${escapeHtml(machineLabel)}</span>
        <span><strong>Tipo de servico</strong>\${escapeHtml(serviceLabel)}</span>
        <span><strong>Checklist do app</strong>\${escapeHtml(checklistLabel)}</span>
      </div>
      <div class="request-actions">
        <button class="secondary-button compact-button" type="button" data-action="editar-agenda-os" data-id="\${item.id}">\${actionText}</button>
      </div>
    </section>
  \`;
}

function renderOsEquipmentTarget(item) {
  return item.equipamento
    ? formatAgendaEquipment(item.equipamento)
    : "Todos os equipamentos do cliente";
}

function renderOsDispatchSummary(item) {
  const responsible = item.equipe?.nome || item.tecnico?.nome || "Nao atribuido";
  const hasResponsible = Boolean(item.equipe?.id || item.tecnico?.id);
  const hasSchedule = Boolean(item.agendada_para);
  const ready = hasResponsible && hasSchedule;
  const status = ready
    ? "Pronta para aparecer no app do tecnico"
    : !hasResponsible
      ? "Tecnico ou equipe obrigatorio"
      : "Data/hora obrigatoria";

  return \`
    <section class="os-detail-section os-dispatch-summary">
      <h4>Despacho</h4>
      <div class="os-execution-summary">
        <span><strong>Destino</strong>\${escapeHtml(responsible)}</span>
        <span><strong>Horario</strong>\${item.agendada_para ? formatDateTime(item.agendada_para) : "Sem horario"}</span>
        <span class="os-dispatch-status \${ready ? "ready" : "blocked"}"><strong>Status de envio</strong>\${status}</span>
      </div>
      <div class="request-actions">
        <button class="secondary-button compact-button" type="button" data-action="editar-agenda-os" data-id="\${item.id}">\${ready ? "Editar despacho" : "Corrigir despacho"}</button>
      </div>
    </section>
  \`;
}

function formatChecklistTipo(value) {
  return {
    mensal: "Mensal",
    trimestral: "Trimestral",
    semestral: "Semestral",
    anual: "Anual"
  }[value] || "Mensal";
}

function formatOsServiceType(item) {
  if (item.tipo_servico === "corretiva") {
    return "Corretiva";
  }
  if (item.tipo_servico === "instalacao") {
    return "Instalação";
  }

  return "Preventiva " + formatChecklistTipo(item.checklist_tipo).toLowerCase();
}

function renderOsTimeline(item) {
  const realEvents = renderOsRealEvents(item);

  if (realEvents) {
    return realEvents;
  }

  const equipmentProgress = getOsEquipmentProgress(item);
  const pendingCount = equipmentProgress.filter((equipment) => equipment.status_execucao !== "feito").length;
  const steps = [
    { label: "Criada", active: true, meta: item.criada_em ? formatDateTime(item.criada_em) : "Registro inicial" },
    { label: "Agendada", active: Boolean(item.agendada_para), meta: item.agendada_para ? formatDateTime(item.agendada_para) : "Sem horario" },
    { label: "Em atendimento", active: ["em_deslocamento", "em_atendimento", "concluida"].includes(item.status), meta: formatStatus(item.status) },
    {
      label: "Concluida",
      active: item.status === "concluida",
      meta: item.status === "concluida"
        ? "Finalizada"
        : pendingCount > 0
          ? \`Pendente: \${pendingCount} equipamento(s)\`
          : "Todos equipamentos concluidos"
    }
  ];

  return \`
    <section class="os-detail-section">
      <h4>Historico da O.S.</h4>
      <ol class="os-timeline">
        \${steps.map((step) => \`
          <li class="\${step.active ? "is-active" : ""}">
            <strong>\${step.label}</strong>
            <span>\${escapeHtml(step.meta)}</span>
          </li>
        \`).join("")}
      </ol>
      \${renderOsEquipmentProgress(item)}
    </section>
  \`;
}

function renderOsRealEvents(item) {
  const events = Array.isArray(item.eventos) ? item.eventos : [];

  if (!events.length) {
    return "";
  }

  return \`
    <section class="os-detail-section">
      <h4>Historico da O.S.</h4>
      <ol class="os-timeline os-real-events">
        \${events.map((event) => \`
          <li class="is-active">
            <strong>\${escapeHtml(formatOsEventAction(event.acao))}</strong>
            <span>\${escapeHtml(formatOsEventMeta(event))}</span>
          </li>
        \`).join("")}
      </ol>
      \${renderOsEquipmentProgress(item)}
    </section>
  \`;
}

function formatOsEventAction(action) {
  return {
    criar_pre_chamado: "Pre-chamado criado",
    aprovar: "O.S. aprovada",
    rejeitar: "O.S. rejeitada",
    iniciar_rota: "Rota iniciada",
    iniciar_atendimento: "Atendimento iniciado",
    cheguei_cliente: "Chegada ao cliente",
    cancelar: "O.S. cancelada",
    finalizar: "O.S. concluida"
  }[action] || "Evento registrado";
}

function formatOsEventMeta(event) {
  const parts = [
    event.registrado_em ? formatDateTime(event.registrado_em) : "Sem data",
    event.usuario?.nome,
    event.status_anterior && event.status_novo
      ? \`\${formatStatus(event.status_anterior)} -> \${formatStatus(event.status_novo)}\`
      : event.status_novo
        ? formatStatus(event.status_novo)
        : "",
    event.latitude !== null && event.latitude !== undefined && event.longitude !== null && event.longitude !== undefined
      ? \`GPS \${Number(event.latitude).toFixed(6)}, \${Number(event.longitude).toFixed(6)}\`
      : ""
  ].filter(Boolean);

  return parts.join(" - ");
}

function getOsEquipmentProgress(item) {
  const equipmentsById = new Map();

  if (Array.isArray(item.equipamentos) && item.equipamentos.length) {
    for (const equipment of item.equipamentos) {
      equipmentsById.set(equipment.id || formatOsEquipmentQr(equipment), equipment);
    }
  }

  if (Array.isArray(item.equipamentos_executados) && item.equipamentos_executados.length) {
    for (const equipment of item.equipamentos_executados) {
      equipmentsById.set(equipment.id || formatOsEquipmentQr(equipment), {
        ...equipment,
        status_execucao: "feito"
      });
    }
  }

  if (!equipmentsById.size && item.equipamento) {
    equipmentsById.set(item.equipamento.id || formatOsEquipmentQr(item.equipamento), {
      ...item.equipamento,
      status_execucao: item.status === "concluida" ? "feito" : "pendente"
    });
  }

  return [...equipmentsById.values()];
}

function renderOsEquipmentProgress(item) {
  const equipments = getOsEquipmentProgress(item);

  if (!equipments.length) {
    return "";
  }

  return \`
    <div class="os-equipment-progress">
      <strong>Equipamentos da O.S.</strong>
      \${equipments.map((equipment) => \`
        <span class="\${equipment.status_execucao === "feito" ? "is-done" : ""}">
          \${equipment.status_execucao === "feito" ? "[x]" : "[ ]"}
          \${escapeHtml(formatOsEquipmentQr(equipment))}
        </span>
      \`).join("")}
    </div>
  \`;
}

function formatOsEquipmentQr(equipment) {
  return equipment.patrimonio || equipment.codigo_qr || equipment.qr_code || equipment.id || "Sem QR";
}

function renderOsExecutionSummary(item) {
  const responsible = item.equipe?.nome || item.tecnico?.nome || "Nao atribuido";
  const checklist = item.checklist;
  const checklistStatus = checklist
    ? \`Checklist salvo - \${formatDateTime(checklist.atualizado_em)}\`
    : "Checklist ainda nao sincronizado";
  const signatureStatus = item.assinatura
    ? \`Assinatura registrada - \${escapeHtml(item.assinatura.nome_responsavel || "Responsavel nao informado")}\`
    : "Assinatura nao sincronizada";

  return \`
    <section class="os-detail-section">
      <h4>Execucao</h4>
      <div class="os-execution-summary">
        <span><strong>Responsavel</strong>\${escapeHtml(responsible)}</span>
        <span><strong>Checklist</strong>\${escapeHtml(checklistStatus)}</span>
        <span><strong>Assinatura</strong>\${signatureStatus}</span>
        <span><strong>Observacao</strong>\${escapeHtml(item.observacao_execucao || item.detalhes || "Sem observacao")}</span>
      </div>
    </section>
  \`;
}

function renderOsEvidenceSummary(item) {
  const evidences = item.evidencias || [];

  if (!evidences.length) {
    return \`
      <section class="os-detail-section">
        <h4>Evidencias</h4>
        <div class="os-evidence-grid">
          <span>Fotos ainda nao sincronizadas</span>
        </div>
      </section>
    \`;
  }

  return \`
    <section class="os-detail-section">
      <h4>Evidencias</h4>
      <div class="os-evidence-grid">
        \${evidences.map((evidence) => \`<span>\${escapeHtml(evidence.descricao || evidence.tipo || "Foto")} - \${escapeHtml(evidence.criada_em ? formatDateTime(evidence.criada_em) : "sem data")}</span>\`).join("")}
      </div>
    </section>
  \`;
}

function getOsPrimaryAction(item) {
  if (item.status === "aberta" && !item.agendada_para) {
    return { label: "Agendar / atribuir tecnico", action: "editar-agenda-os" };
  }

  if (item.status === "aberta") {
    return { label: "Editar agenda", action: "editar-agenda-os" };
  }

  if (item.status === "em_deslocamento") {
    return { label: "Acompanhar", action: "editar-agenda-os" };
  }

  if (item.status === "em_atendimento") {
    return { label: "Ver execucao", action: "editar-agenda-os" };
  }

  if (item.status === "concluida") {
    return { label: "Ver historico", action: "editar-agenda-os" };
  }

  if (item.status === "cancelada" || item.status === "rejeitada") {
    return { label: "Revisar motivo", action: "editar-agenda-os" };
  }

  return { label: "Editar O.S.", action: "editar-agenda-os" };
}

function getOsNextAction(item) {
  const actions = {
    aberta: item.agendada_para ? "Acompanhar agenda" : "Definir horario",
    em_deslocamento: "Acompanhar tecnico",
    em_atendimento: "Aguardar finalizacao",
    concluida: "Ver historico",
    cancelada: "Revisar motivo",
    rejeitada: "Revisar solicitacao"
  };

  return actions[item.status] || "Atualizar O.S.";
}

function renderOptions(items) {
  return items
    .map((item) => \`<option value="\${item.id}">\${escapeHtml(item.nome)}</option>\`)
    .join("");
}

async function deleteTecnico(tecnicoId) {
  tecnicoFormStatus.textContent = "Removendo acesso...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/tecnicos/\${tecnicoId}\`, {
      method: "DELETE",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      tecnicoFormStatus.textContent = error.message || "Nao foi possivel apagar o acesso.";
      return;
    }

    if (tecnicoForm.elements.id.value === tecnicoId) {
      resetTecnicoForm();
    }

    tecnicoFormStatus.textContent = "Acesso removido.";
    await loadTecnicos();
  } catch {
    tecnicoFormStatus.textContent = "API indisponivel.";
  }
}

async function deleteEquipe(equipeId) {
  equipeFormStatus.textContent = "Removendo equipe...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/equipes/\${equipeId}\`, {
      method: "DELETE",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      equipeFormStatus.textContent = error.message || "Nao foi possivel apagar a equipe.";
      return;
    }

    if (equipeForm.elements.id.value === equipeId) {
      resetEquipeForm();
    }

    equipeFormStatus.textContent = "Equipe removida.";
    await loadEquipes();
  } catch {
    equipeFormStatus.textContent = "API indisponivel.";
  }
}

async function deleteAgendaOs(osId, button = null) {
  const item = latestAgendaItems.find((agendaItem) => agendaItem.id === osId);
  const title = item?.titulo || "esta O.S.";

  if (!window.confirm(\`Apagar \${title}? Esta acao nao pode ser desfeita.\`)) {
    return;
  }

  if (button) {
    button.disabled = true;
  }

  listStatus.textContent = "Apagando O.S...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/agenda/ordens/\${osId}\`, {
      method: "DELETE",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      listStatus.textContent = error.message || "Nao foi possivel apagar a O.S.";
      return;
    }

    closeOsDetail();
    listStatus.textContent = "O.S. apagada.";
    await loadAgenda();
  } catch {
    listStatus.textContent = "API indisponivel.";
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

function getSelectedValues(select) {
  if (!select) {
    return [];
  }

  return [...select.selectedOptions].map((option) => option.value).filter(Boolean);
}

function removeEmptyValues(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => String(value ?? "").trim() !== "")
  );
}

function formatAddress(address) {
  if (!address) {
    return "Endereço não informado";
  }

  return [address.bairro, address.cidade, address.uf].filter(Boolean).join(", ");
}

function formatPhone(phone) {
  if (!phone) {
    return "sem telefone";
  }

  const digits = onlyDigits(String(phone));

  if (digits.length === 10) {
    return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 6) + "-" + digits.slice(6);
  }

  if (digits.length === 11) {
    return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
  }

  return phone;
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

  return \`\${year}-\${month}-\${day}\`;
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

function formatInputDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return \`\${year}-\${month}-\${day}T\${hour}:\${minute}\`;
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
vehicleForm?.addEventListener("submit", submitVehicle);
fuelForm?.addEventListener("submit", submitFuel);
empresaForm?.addEventListener("submit", submitEmpresa);
clientForm?.addEventListener("submit", submitClient);
tecnicoForm?.addEventListener("submit", submitTecnico);
equipeForm?.addEventListener("submit", submitEquipe);
engineerForm?.addEventListener("submit", submitEngineer);
equipmentForm?.addEventListener("submit", submitEquipment);
pmocConversionForm?.addEventListener("submit", activatePmocClient);
resetClientFormButton?.addEventListener("click", resetClientForm);
backToClientsButton?.addEventListener("click", resetClientForm);
resetTecnicoFormButton?.addEventListener("click", resetTecnicoForm);
resetEquipeFormButton?.addEventListener("click", resetEquipeForm);
resetEngineerFormButton?.addEventListener("click", resetEngineerForm);
resetVehicleFormButton?.addEventListener("click", resetVehicleForm);
printReportsButton?.addEventListener("click", openReportsPrint);
fleetReportExportButton?.addEventListener("click", openFleetReport);
pmocBackToClientsButton?.addEventListener("click", closePmocDossier);
pmocGenerateReportButton?.addEventListener("click", openPmocReportPreview);
pmocRequestSignatureButton?.addEventListener("click", requestPmocEngineerSignature);
recurrenceForm?.addEventListener("submit", submitRecurrence);
refreshButton?.addEventListener("click", loadActiveView);
configButton?.addEventListener("click", async () => {
  setActiveView("configuracoes");
  await loadActiveView();
});
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

for (const button of configTabButtons) {
  button.addEventListener("click", async () => {
    setConfigView(button.dataset.configView || "empresa");
    setActiveView("configuracoes");
    await loadActiveView();
  });
}

for (const button of fleetTabButtons) {
  button.addEventListener("click", () => {
    setFleetTab(button.dataset.fleetTab || "mapa");
  });
}

vehicleList?.addEventListener("click", (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest("[data-action]") : null;

  if (!button) {
    return;
  }

  const vehicleId = button.dataset.id || "";

  if (button.dataset.action === "editar-veiculo") {
    fillVehicleForm(vehicleId);
  }

  if (button.dataset.action === "apagar-veiculo") {
    void deleteVehicle(vehicleId);
  }
});

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
`;
