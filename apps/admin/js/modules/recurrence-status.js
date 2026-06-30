export const recurrenceStatusRoot = `
const RECURRENCE_TECHNICIAN_STATUSES = new Set(["aberta", "em_deslocamento", "em_atendimento"]);

function getRecurrenceDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function getCurrentMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function isBeforeCurrentMonth(date) {
  return Boolean(date && date < getCurrentMonthStart());
}

function isRecurrenceDue(item) {
  const nextDate = getRecurrenceDate(item.proxima_execucao);
  return Boolean(item.ativo && nextDate && nextDate.getTime() <= Date.now());
}

function hasUnfinishedPreviousOrder(item) {
  const order = item.ultima_os || {};
  const orderDate = getRecurrenceDate(order.agendada_para);
  return Boolean(orderDate && isBeforeCurrentMonth(orderDate) && order.status !== "concluida");
}

function isRecurrenceGenerating(item) {
  const nextDate = getRecurrenceDate(item.proxima_execucao);
  return Boolean(
    item.ativo
      && !hasUnfinishedPreviousOrder(item)
      && (generatingRecurrencePlanIds.has(item.id) || (isRecurrenceDue(item) && !isBeforeCurrentMonth(nextDate)))
  );
}

function isRecurrenceExpired(item) {
  const nextDate = getRecurrenceDate(item.proxima_execucao);
  const missedPreviousSchedule = item.ativo && nextDate && isBeforeCurrentMonth(nextDate);
  return Boolean(hasUnfinishedPreviousOrder(item) || (!isRecurrenceGenerating(item) && missedPreviousSchedule));
}

function isRecurrenceSentToTechnician(item) {
  return !isRecurrenceGenerating(item) && RECURRENCE_TECHNICIAN_STATUSES.has(item.ultima_os?.status || "");
}

function isRecurrenceDone(item) {
  return item.ultima_os?.status === "concluida";
}

function updateRecurrenceSummary(items) {
  const counts = {
    ativos: items.filter((item) => item.ativo).length,
    gerando: items.filter(isRecurrenceGenerating).length,
    tecnico: items.filter(isRecurrenceSentToTechnician).length,
    vencidos: items.filter(isRecurrenceExpired).length,
    finalizados: items.filter(isRecurrenceDone).length
  };

  recurrenceActiveCount.textContent = counts.ativos;
  recurrenceGeneratingCount.textContent = counts.gerando;
  recurrenceTechnicianCount.textContent = counts.tecnico;
  recurrenceDueCount.textContent = counts.vencidos;
  recurrenceDoneCount.textContent = counts.finalizados;
  updateRecurrenceFilterButtons();
}

function filterRecurrenceItems(items) {
  const filters = {
    ativos: (item) => item.ativo,
    gerando: isRecurrenceGenerating,
    tecnico: isRecurrenceSentToTechnician,
    vencidos: isRecurrenceExpired,
    finalizados: isRecurrenceDone
  };
  const filter = filters[activeRecurrenceFilter];

  return filter ? items.filter(filter) : items;
}

function setRecurrenceFilter(filter) {
  activeRecurrenceFilter = activeRecurrenceFilter === filter ? "" : filter;
  updateRecurrenceFilterButtons();
  renderRecorrencias(filterRecurrenceItems(latestRecurrenceItems));
}

function updateRecurrenceFilterButtons() {
  for (const button of recurrenceFilterButtons) {
    button.classList.toggle("is-active", button.dataset.recurrenceFilter === activeRecurrenceFilter);
  }
}

function renderRecorrencias(items) {
  if (!recurrenceList) {
    return;
  }

  if (!items.length) {
    recurrenceList.innerHTML = activeRecurrenceFilter
      ? '<article class="agenda-empty"><strong>Nenhum plano neste filtro.</strong><span>Toque no filtro ativo para voltar a lista completa.</span></article>'
      : '<article class="agenda-empty"><strong>Nenhum plano recorrente.</strong><span>Cadastre uma rotina para gerar OS futuras com poucos cliques.</span></article>';
    return;
  }

  recurrenceList.innerHTML = items.map(renderRecurrenceCard).join("");
}

function renderRecurrenceCard(item) {
  const generating = isRecurrenceGenerating(item);
  const expired = isRecurrenceExpired(item);

  return \`
    <article class="recurrence-card \${expired ? "due" : ""} \${generating ? "is-generating" : ""}">
      <div>
        <strong>\${escapeHtml(item.titulo)}</strong>
        <span>\${escapeHtml(item.cliente?.nome || "Cliente não informado")}</span>
        <span>\${escapeHtml(formatRecurrenceCalendar(item.calendario))}</span>
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
        <button class="secondary-button compact-button recurrence-generate-button \${expired ? "is-due" : "is-muted"}" type="button" data-action="gerar-recorrencia-os" data-id="\${item.id}">\${generating ? "Gerando O.S." : "Gerar OS"}</button>
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
  generatingRecurrencePlanIds.add(planId);
  updateRecurrenceSummary(latestRecurrenceItems);
  renderRecorrencias(filterRecurrenceItems(latestRecurrenceItems));
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
  } finally {
    generatingRecurrencePlanIds.delete(planId);
    updateRecurrenceSummary(latestRecurrenceItems);
    renderRecorrencias(filterRecurrenceItems(latestRecurrenceItems));
  }
}
`;
