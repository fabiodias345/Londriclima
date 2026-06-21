export const pmocModule = {
  view: "pmoc",
  summaryId: "pmocSummary",
  viewId: "pmocView"
};

export const pmocRoot = `
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

function openReportsPrint() {
  if (!latestReports) {
    relatoriosStatus.textContent = "Carregue os relatorios antes de imprimir.";
    return;
  }

  const reportWindow = window.open("", "_blank", "width=980,height=720");

  if (!reportWindow) {
    relatoriosStatus.textContent = "Permita pop-ups para imprimir o relatorio.";
    return;
  }

  const cards = Array.from(reportGrid.querySelectorAll(".report-card"));
  const content = \`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatorio Operacional</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #07151d; }
          h1 { margin: 0 0 8px; }
          .meta { color: #66747b; margin-bottom: 24px; }
          .totals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .total, article { border: 1px solid #d8e1e5; padding: 14px; }
          .total span, article span, small { color: #66747b; font-weight: 700; }
          .total strong { display: block; margin-top: 6px; font-size: 22px; }
          section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          article strong { font-size: 24px; }
          .period-breakdown { display: flex; gap: 16px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <h1>Relatorio Operacional</h1>
        <p class="meta">Gerado em \${new Date().toLocaleString("pt-BR")}</p>
        <div class="totals">
          <div class="total"><span>Total de chamadas</span><strong>\${latestReports.total_os || 0}</strong></div>
          <div class="total"><span>Receita prevista</span><strong>\${formatCurrency(latestReports.receita_prevista || 0)}</strong></div>
          <div class="total"><span>Receita arrecadada</span><strong>\${formatCurrency(latestReports.receita_arrecadada || 0)}</strong></div>
          <div class="total"><span>Automações</span><strong>\${latestReports.automacoes_pendentes || 0}</strong></div>
        </div>
        <section>
          \${cards.map((card) => \`<article>\${card.innerHTML}</article>\`).join("")}
        </section>
      </body>
    </html>
  \`;

  reportWindow.document.open();
  reportWindow.document.write(content);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
}

function openFleetReport() {
  const rows = Array.from(fleetReportList.querySelectorAll(".data-row"));
  const historyRows = Array.from(fuelHistoryList.querySelectorAll(".data-row"));
  const reportWindow = window.open("", "_blank", "width=980,height=720");

  if (!reportWindow) {
    fleetReportStatus.textContent = "Permita pop-ups para gerar o relatorio.";
    return;
  }

  const content = \`
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
        <p class="meta">Gerado em \${new Date().toLocaleString("pt-BR")}</p>
        <section>
          <h2>Consumo por carro</h2>
          \${rows.map((row) => \`<article>\${row.innerHTML}</article>\`).join("") || "<p>Sem dados de consumo.</p>"}
        </section>
        <section>
          <h2>Historico de abastecimentos</h2>
          \${historyRows.map((row) => \`<article>\${row.innerHTML}</article>\`).join("") || "<p>Sem abastecimentos.</p>"}
        </section>
      </body>
    </html>
  \`;

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

  const response = await fetch(\`\${apiBaseUrl}/admin/pre-chamados/\${osId}/\${action}\`, options);

  if (!response.ok) {
    listStatus.textContent = "Nao foi possivel atualizar o pre-chamado.";
    return;
  }

  await loadPreChamados();
}

function renderAgendaClientOptions() {
  if (!agendaOsClientSelect) {
    return;
  }

  agendaOsClientSelect.innerHTML = '<option value="">Selecione um cliente</option>' + renderOptions(latestClients);
  renderAgendaDispatchOptions();
}

function renderRecurrenceClientOptions() {
  if (!recurrenceClientSelect) {
    return;
  }

  recurrenceClientSelect.innerHTML = '<option value="">Selecione um cliente</option>' + renderOptions(latestClients);
}

function renderAgendaDispatchOptions() {
  if (agendaOsTeamSelect) {
    agendaOsTeamSelect.innerHTML = '<option value="">Sem equipe</option>' + renderOptions(dispatchOptions.equipes);
  }

  if (agendaOsTechnicianSelect) {
    agendaOsTechnicianSelect.innerHTML = '<option value="">Sem tecnico</option>' + renderOptions(dispatchOptions.tecnicos);
  }
}

function renderRecurrenceDispatchOptions() {
  if (recurrenceTeamSelect) {
    recurrenceTeamSelect.innerHTML = '<option value="">Sem equipe</option>' + renderOptions(dispatchOptions.equipes);
  }

  if (recurrenceTechnicianSelect) {
    recurrenceTechnicianSelect.innerHTML = '<option value="">Sem tecnico</option>' + renderOptions(dispatchOptions.tecnicos);
  }
}

async function loadAgendaEquipments(clientId, selectedEquipmentId = "") {
  if (!agendaOsEquipmentSelect) {
    return;
  }

  agendaOsEquipmentSelect.innerHTML = '<option value="">Carregando equipamentos...</option>';
  latestAgendaEquipments = [];

  if (!clientId) {
    agendaOsEquipmentSelect.innerHTML = '<option value="">Sem equipamento definido</option>';
    return;
  }

  const result = await fetchAdminJson(\`/admin/clientes/\${clientId}/equipamentos\`, agendaOsFormStatus);
  latestAgendaEquipments = result?.items || [];
  agendaOsEquipmentSelect.innerHTML =
    '<option value="">Sem equipamento definido</option>' +
    latestAgendaEquipments
      .map((item) => \`<option value="\${item.id}">\${escapeHtml(formatAgendaEquipment(item))}</option>\`)
      .join("");
  agendaOsEquipmentSelect.value = selectedEquipmentId;
}

async function loadRecurrenceEquipments(clientId) {
  if (!recurrenceEquipmentSelect) {
    return;
  }

  recurrenceEquipmentSelect.innerHTML = '<option value="">Carregando equipamentos...</option>';

  if (!clientId) {
    recurrenceEquipmentSelect.innerHTML = '<option value="">Todos os equipamentos</option>';
    return;
  }

  const result = await fetchAdminJson(\`/admin/clientes/\${clientId}/equipamentos\`, recurrenceFormStatus);
  recurrenceEquipmentSelect.innerHTML =
    '<option value="">Todos os equipamentos</option>' +
    (result?.items || [])
      .map((item) => \`<option value="\${item.id}">\${escapeHtml(formatAgendaEquipment(item))}</option>\`)
      .join("");
}

async function openAgendaOsModal(osId = "") {
  agendaEditingOsId = osId;
  agendaOsForm?.reset();
  agendaOsFormStatus.textContent = "";
  await loadClientesForAgenda();
  renderAgendaDispatchOptions();

  const item = latestAgendaItems.find((agendaItem) => agendaItem.id === osId);

  if (agendaOsTitle) {
    agendaOsTitle.textContent = item ? \`Editar \${item.titulo}\` : "Nova OS";
  }

  if (item) {
    agendaOsForm.elements.cliente_id.value = item.cliente?.id || "";
    agendaOsForm.elements.titulo.value = item.titulo || "";
    agendaOsForm.elements.detalhes.value = item.detalhes || "";
    agendaOsForm.elements.agendada_para.value = formatInputDateTime(item.agendada_para);
    agendaOsForm.elements.equipe_id.value = item.equipe?.id || "";
    agendaOsForm.elements.tecnico_id.value = item.tecnico?.id || "";
    agendaOsForm.elements.valor_cobrado.value = item.valor_cobrado || "";
    await loadAgendaEquipments(item.cliente?.id || "", item.equipamento?.id || "");
  } else {
    agendaOsForm.elements.agendada_para.value = \`\${selectedAgendaDate || getLocalDateKey(new Date())}T08:00\`;
    await loadAgendaEquipments("");
  }

  agendaOsModal?.classList.remove("hidden");
}

function closeAgendaOsModal() {
  agendaEditingOsId = "";
  agendaOsModal?.classList.add("hidden");
}

async function submitAgendaOs(event) {
  event.preventDefault();

  if (!(agendaOsForm instanceof HTMLFormElement)) {
    return;
  }

  const button = agendaOsForm.querySelector("button[type='submit']");
  const data = new FormData(agendaOsForm);
  const payload = removeEmptyValues({
    cliente_id: String(data.get("cliente_id") || ""),
    equipamento_id: String(data.get("equipamento_id") || ""),
    equipe_id: String(data.get("equipe_id") || ""),
    tecnico_id: String(data.get("tecnico_id") || ""),
    titulo: String(data.get("titulo") || ""),
    detalhes: String(data.get("detalhes") || ""),
    agendada_para: data.get("agendada_para")
      ? new Date(String(data.get("agendada_para"))).toISOString()
      : "",
    valor_cobrado: data.get("valor_cobrado") ? Number(data.get("valor_cobrado")) : undefined
  });
  const path = agendaEditingOsId
    ? \`/admin/agenda/ordens/\${agendaEditingOsId}\`
    : "/admin/agenda/ordens";
  const method = agendaEditingOsId ? "PATCH" : "POST";

  button.disabled = true;
  agendaOsFormStatus.textContent = "Salvando OS...";

  try {
    const response = await fetch(\`\${apiBaseUrl}\${path}\`, {
      method,
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
      agendaOsFormStatus.textContent = error.message || "Nao foi possivel salvar a OS.";
      return;
    }

    closeAgendaOsModal();
    await loadAgenda();
  } catch {
    agendaOsFormStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
  }
}

async function submitRecurrence(event) {
  event.preventDefault();

  if (!(recurrenceForm instanceof HTMLFormElement)) {
    return;
  }

  const button = recurrenceForm.querySelector("button[type='submit']");
  const data = new FormData(recurrenceForm);
  const payload = removeEmptyValues({
    cliente_id: String(data.get("cliente_id") || ""),
    equipamento_id: String(data.get("equipamento_id") || ""),
    equipe_id: String(data.get("equipe_id") || ""),
    tecnico_id: String(data.get("tecnico_id") || ""),
    titulo: String(data.get("titulo") || ""),
    detalhes: String(data.get("detalhes") || ""),
    frequencia: String(data.get("frequencia") || "mensal"),
    proxima_execucao: data.get("proxima_execucao")
      ? new Date(String(data.get("proxima_execucao"))).toISOString()
      : "",
    valor_cobrado: data.get("valor_cobrado") ? Number(data.get("valor_cobrado")) : undefined,
    ativo: true
  });

  button.disabled = true;
  recurrenceFormStatus.textContent = "Salvando plano...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/planos-recorrencia\`, {
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

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      recurrenceFormStatus.textContent = error.message || "Nao foi possivel salvar o plano.";
      return;
    }

    recurrenceForm.reset();
    recurrenceForm.elements.titulo.value = "PMOC preventivo";
    recurrenceForm.elements.proxima_execucao.value = \`\${getLocalDateKey(new Date())}T08:00\`;
    await loadRecorrencias();
    recurrenceFormStatus.textContent = "Plano salvo.";
  } catch {
`;
