export const recurrenceUiModule = {
  view: "recorrencias",
  summaryId: "recurrenceUi",
  viewId: "recurrenceUi"
};

export const recurrenceUiRoot = `
const RECURRENCE_MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function renderRecorrencias(items) {
  if (!recurrenceList) {
    return;
  }

  if (!items.length) {
    const empty = '<article class="agenda-empty"><strong>Nenhum plano recorrente.</strong><span>Cadastre uma rotina para gerar OS futuras com poucos cliques.</span></article>';
    recurrenceList.innerHTML = empty;
    renderRecurrenceCalendarBoard(items);
    return;
  }

  recurrenceList.innerHTML = items.map(renderRecurrenceCard).join("");
  renderRecurrenceCalendarBoard(items);
}

function renderRecurrenceCard(item) {
  const due = item.ativo && new Date(item.proxima_execucao).getTime() <= Date.now();

  return \`
    <article class="recurrence-card recurrence-client-card \${due ? "due" : ""}">
      <div>
        <strong>\${escapeHtml(item.cliente?.nome || "Cliente nao informado")}</strong>
        <span>\${escapeHtml(item.titulo)}</span>
        <span>\${escapeHtml(item.equipamento ? formatAgendaEquipment(item.equipamento) : "Todos os equipamentos do cliente")}</span>
        <span>Responsavel: \${escapeHtml(item.equipe?.nome || item.tecnico?.nome || "Definir na agenda")}</span>
      </div>
      <div class="recurrence-month-strip">
        \${renderRecurrenceMonthCells(item)}
      </div>
      <div class="request-actions">
        <button class="secondary-button compact-button" type="button" data-action="editar-recorrencia" data-id="\${item.id}">Editar</button>
        <button class="secondary-button compact-button danger-button" type="button" data-action="apagar-recorrencia" data-id="\${item.id}">Apagar</button>
        <button class="secondary-button compact-button" type="button" data-action="gerar-recorrencia-os" data-id="\${item.id}">Gerar OS</button>
      </div>
    </article>
  \`;
}

function renderRecurrenceCalendarBoard(items) {
  const board = document.querySelector("#recurrenceCalendarBoard");

  if (!board) {
    return;
  }

  if (!items.length) {
    board.innerHTML = '<article class="agenda-empty"><strong>Nenhum calendario recorrente.</strong><span>Os meses aparecem depois que houver planos salvos.</span></article>';
    return;
  }

  board.innerHTML = \`
    <div class="recurrence-legend">
      <span>Cinza: sem recorrencia</span><span>Vermelho: falta gerar</span><span>Azul: enviado ao tecnico</span>
      <span>Verde: tecnico finalizou</span><span>Roxo: engenheiro</span><span>Dourado: cliente</span>
    </div>
    \${items.map((item) => \`
      <article class="recurrence-calendar-row">
        <div>
          <strong>\${escapeHtml(item.cliente?.nome || "Cliente nao informado")}</strong>
          <span>\${escapeHtml(item.titulo)} - \${escapeHtml(item.equipe?.nome || item.tecnico?.nome || "sem responsavel")}</span>
        </div>
        <div class="recurrence-calendar-grid">\${renderRecurrenceMonthCells(item)}</div>
      </article>
    \`).join("")}
  \`;
}

function renderRecurrenceMonthCells(item) {
  return RECURRENCE_MONTHS.map((label, index) => {
    const status = getRecurrenceMonthStatus(item, index + 1);
    return \`<article class="recurrence-month-cell \${status.className}"><strong>\${label}</strong><span>\${status.label}</span></article>\`;
  }).join("");
}

function getRecurrenceMonthStatus(item, month) {
  const planned = Boolean(item.calendario?.[String(month)] && item.calendario[String(month)] !== "nenhum");
  const order = item.ultima_os || {};
  const orderDate = order.agendada_para ? new Date(order.agendada_para) : null;
  const sameOrderMonth = orderDate && !Number.isNaN(orderDate.getTime()) && orderDate.getMonth() + 1 === month;
  const nextDate = item.proxima_execucao ? new Date(item.proxima_execucao) : null;
  const due = nextDate && !Number.isNaN(nextDate.getTime()) && nextDate.getMonth() + 1 === month && nextDate.getTime() <= Date.now();

  if (sameOrderMonth && (order.email_cliente_enviado_em || order.enviado_cliente_em || order.email_entregue)) {
    return { className: "is-client-sent", label: "Cliente" };
  }

  if (sameOrderMonth && (order.engenheiro_encaminhado_em || order.enviado_engenheiro_em || order.assinafy_document_id)) {
    return { className: "is-engineer-sent", label: "Engenheiro" };
  }

  if (sameOrderMonth && order.status === "concluida") {
    return { className: "is-technician-done", label: "Finalizada" };
  }

  if (sameOrderMonth) {
    return { className: "is-generated", label: "Tecnico" };
  }

  if (planned && due) {
    return { className: "is-missing", label: "Gerar" };
  }

  return { className: planned ? "is-planned" : "is-empty", label: planned ? "Previsto" : "Sem" };
}

function setRecurrenceTab(tab) {
  document.querySelectorAll("[data-recurrence-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.recurrenceTab === tab);
  });
  document.querySelectorAll("[data-recurrence-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.recurrencePanel !== tab);
  });
}
`;
