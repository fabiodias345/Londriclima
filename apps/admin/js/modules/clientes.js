export const clientesModule = {
  view: "clientes",
  summaryId: "clientesSummary",
  viewId: "clientesView"
};

export const clientesRoot = `

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "data-row";
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml(item.nome)}</strong>
        <span>CREA \${escapeHtml(item.crea)} - CPF \${escapeHtml(item.cpf)}</span>
      </div>
      <div>
        <span>\${escapeHtml(item.email)}</span>
        <span>\${formatPhone(item.telefone)}</span>
      </div>
      <div class="data-row-actions">
        <button class="secondary-button compact-button" type="button" data-action="editar-engenheiro" data-id="\${item.id}">Editar</button>
        <button class="danger-button compact-button" type="button" data-action="apagar-engenheiro" data-id="\${item.id}">Apagar</button>
      </div>
    \`;
    engenheirosList.appendChild(row);
  }
}

function renderTecnicos(items) {
  tecnicosList.innerHTML = "";

  if (!items.length) {
    tecnicosList.innerHTML = '<article class="data-row"><strong>Nenhum tecnico cadastrado.</strong><span>Cadastre tecnicos e auxiliares para liberar login no app.</span></article>';
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "data-row";
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml(item.nome)}</strong>
        <span>\${escapeHtml(item.role === "auxiliar" ? "Auxiliar" : "Tecnico")}</span>
      </div>
      <div>
        <span>\${escapeHtml(item.email)}</span>
        <span>\${formatPhone(item.telefone)}</span>
      </div>
      <div class="data-row-actions">
        <button class="secondary-button compact-button" type="button" data-action="editar-tecnico" data-id="\${item.id}">Editar</button>
        <button class="danger-button compact-button" type="button" data-action="apagar-tecnico" data-id="\${item.id}">Apagar</button>
      </div>
    \`;
    tecnicosList.appendChild(row);
  }
}

function renderEquipes(items) {
  equipesList.innerHTML = "";

  if (!items.length) {
    equipesList.innerHTML = '<article class="data-row"><strong>Nenhuma equipe cadastrada.</strong><span>Crie equipes por cliente ou use responsaveis avulsos na OS.</span></article>';
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "data-row";
    const membros = item.membros.map((membro) => \`\${membro.usuario.nome} (\${formatTeamRole(membro.funcao)})\`).join(", ");
    const clientes = item.clientes.map((cliente) => cliente.nome).join(", ");
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml(item.nome)}</strong>
        <span>\${escapeHtml(clientes || "sem cliente fixo")}</span>
      </div>
      <div>
        <span>\${escapeHtml(membros || "sem membros")}</span>
      </div>
      <div class="data-row-actions">
        <button class="secondary-button compact-button" type="button" data-action="editar-equipe" data-id="\${item.id}">Editar</button>
        <button class="danger-button compact-button" type="button" data-action="apagar-equipe" data-id="\${item.id}">Apagar</button>
      </div>
    \`;
    equipesList.appendChild(row);
  }
}

function renderClientTeamOptions(selectedIds = getSelectedValues(clientTeamsSelect)) {
  if (!clientTeamsSelect) {
    return;
  }

  clientTeamsSelect.innerHTML = latestEquipes
    .map((item) => \`<option value="\${item.id}" \${selectedIds.includes(item.id) ? "selected" : ""}>\${escapeHtml(item.nome)}</option>\`)
    .join("");
}

function renderEquipeClientOptions(selectedIds = getSelectedValues(equipeClientsSelect)) {
  if (!equipeClientsSelect) {
    return;
  }

  equipeClientsSelect.innerHTML = latestClients
    .map((item) => \`<option value="\${item.id}" \${selectedIds.includes(item.id) ? "selected" : ""}>\${escapeHtml(item.nome)}</option>\`)
    .join("");
}

function renderEquipeMembersList(selectedMembers = []) {
  if (!equipeMembersList) {
    return;
  }

  if (!latestTecnicos.length) {
    equipeMembersList.innerHTML = '<span>Cadastre tecnicos e auxiliares antes de montar equipes.</span>';
    return;
  }

  equipeMembersList.innerHTML = latestTecnicos.map((tecnico) => {
    const selected = selectedMembers.find((membro) => membro.usuario_id === tecnico.id);
    const funcao = selected?.funcao || (tecnico.role === "auxiliar" ? "auxiliar" : "tecnico");

    return \`
      <label class="team-member-option">
        <input name="membro_usuario_id" type="checkbox" value="\${tecnico.id}" \${selected ? "checked" : ""} />
        <span>\${escapeHtml(tecnico.nome)} - \${escapeHtml(tecnico.role === "auxiliar" ? "Auxiliar" : "Tecnico")}</span>
        <select name="membro_funcao_\${tecnico.id}">
          <option value="lider" \${funcao === "lider" ? "selected" : ""}>Lider</option>
          <option value="tecnico" \${funcao === "tecnico" ? "selected" : ""}>Tecnico</option>
          <option value="auxiliar" \${funcao === "auxiliar" ? "selected" : ""}>Auxiliar</option>
        </select>
      </label>
    \`;
  }).join("");
}

function formatTeamRole(role) {
  return {
    lider: "lider",
    tecnico: "tecnico",
    auxiliar: "auxiliar"
  }[role] || "tecnico";
}

function renderEngineerOptions(selectedId = clientEngineerSelect?.value || "") {
  if (!clientEngineerSelect) {
    return;
  }

  clientEngineerSelect.innerHTML = '<option value="">Cadastre ou selecione um engenheiro</option>';

  for (const item of latestEngineers) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = \`\${item.nome} - CREA \${item.crea}\`;
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
    const publicUrl = item.link_publico ? \`\${window.location.origin}\${item.link_publico}\` : "";
    const row = document.createElement("article");
    row.className = "data-row equipment-row";
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml([item.tipo, item.marca, item.modelo].filter(Boolean).join(" ") || "Equipamento")}</strong>
        <span>\${escapeHtml(item.local_instalacao || "Local nao informado")}</span>
      </div>
      <div>
        <span>Patrimonio: \${escapeHtml(item.patrimonio || "nao informado")}</span>
        <span>Codigo/QR: \${escapeHtml(item.codigo_barras || "nao informado")}</span>
        <span>Gas: \${escapeHtml(item.gas_refrigerante || "pendente da primeira visita")}</span>
        <span>Serie: \${escapeHtml(item.numero_serie || "nao informada")}</span>
      </div>
      <div class="data-row-actions">
        <span class="status-pill">\${item.total_os} OS</span>
        <span class="equipment-link">\${escapeHtml(publicUrl || "link publico indisponivel")}</span>
        <button class="secondary-button compact-button" type="button" data-action="copiar-link-equipamento" data-link="\${escapeHtml(publicUrl)}">Copiar link</button>
        <button class="secondary-button compact-button" type="button" data-action="renovar-acesso-equipamento" data-id="\${item.id}">Nova senha</button>
        <button class="secondary-button compact-button danger-button" type="button" data-action="apagar-equipamento" data-id="\${item.id}">Apagar</button>
      </div>
    \`;
    clientEquipmentList.appendChild(row);
  }
}

function renderRelatorios(result) {
  reportGrid.innerHTML = \`
    <article class="report-card report-card-total">
      <span>Clientes cadastrados</span>
      <strong>\${result.clientes}</strong>
    </article>
    <article class="report-card report-card-total">
      <span>Veiculos ativos</span>
      <strong>\${result.veiculos_ativos}</strong>
    </article>
    \${renderPeriodMetric("Manutencoes", result.manutencoes)}
    \${renderPeriodMetric("KM da frota", result.frota?.km_rodados_periodo, "km")}
    \${renderPeriodMetric("Pre-chamados", result.pre_chamados)}
    \${renderPeriodMetric("OS abertas", result.os_abertas)}
    \${renderPeriodMetric("Em atendimento", result.em_atendimento)}
    \${renderPeriodMetric("Concluidas", result.concluidas)}
  \`;
}

function renderPeriodMetric(title, metric = {}, suffix = "") {
  const formatValue = (value) => \`\${formatNumber(value || 0)}\${suffix ? \` \${suffix}\` : ""}\`;

  return \`
    <article class="report-card report-period-card">
      <span>\${escapeHtml(title)}</span>
      <div class="period-metric">
        <strong>\${formatValue(metric.dia)}</strong>
        <small>Dia</small>
      </div>
      <div class="period-breakdown">
        <span><b>\${formatValue(metric.mes)}</b> Mes</span>
        <span><b>\${formatValue(metric.ano)}</b> Ano</span>
      </div>
    </article>
  \`;
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
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml(item.nome)}</strong>
        <span>\${escapeHtml(item.placa || "Sem placa")} · \${item.abastecimentos} abastecimentos</span>
      </div>
      <div>
        <span>\${formatNumber(item.km_rodados)} km · \${formatNumber(item.litros)} L</span>
        <span>\${item.km_por_litro ? \`\${formatNumber(item.km_por_litro)} km/L\` : "km/L pendente"}</span>
      </div>
      <div>
        <span>\${formatCurrency(item.valor_total)}</span>
        <span>\${item.custo_por_km ? \`\${formatCurrency(item.custo_por_km)} / km\` : "custo/km pendente"}</span>
      </div>
    \`;
    fleetReportList.appendChild(row);
  }
}

function renderRelatoriosAvulsos(items) {
  relatoriosAvulsosList.innerHTML = "";

  if (!items.length) {
    relatoriosAvulsosList.innerHTML = '<article class="data-row"><strong>Sem clientes avulsos.</strong><span>Clientes com PMOC ativo ficam no menu PMOC.</span></article>';
    return;
  }

  for (const item of items) {
    const status = item.pronto_para_envio
      ? { label: "Pronto para envio", tone: "success" }
      : { label: "Aguardando OS concluida", tone: "warning" };
    const row = document.createElement("article");
    row.className = "data-row avulso-row";
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml(item.nome)}</strong>
        <span>\${escapeHtml(item.email || "E-mail pendente")} · \${escapeHtml(item.telefone || "sem telefone")}</span>
      </div>
      <div>
        <span>\${item.total_maquinas || 0} maquina(s) · \${item.total_os_concluidas || 0} OS concluida(s)</span>
        <span class="pmoc-status \${status.tone}">\${escapeHtml(status.label)}</span>
      </div>
      <div class="data-row-actions">
        <button class="secondary-button compact-button" type="button" data-action="avulso-pdf" data-id="\${item.id}">PDF</button>
        <button class="approve-button compact-button" type="button" data-action="avulso-enviar" data-id="\${item.id}" \${item.pronto_para_envio ? "" : "disabled"}>Enviar</button>
      </div>
    \`;
    relatoriosAvulsosList.appendChild(row);
  }
}

async function openRelatorioAvulsoPdf(clientId) {
  relatoriosAvulsosStatus.textContent = "Gerando PDF...";

  let response;

  try {
    response = await fetch(\`\${apiBaseUrl}/admin/relatorios-avulsos/clientes/\${clientId}/pdf\`, {
      headers: authHeaders()
    });
  } catch {
    relatoriosAvulsosStatus.textContent = "API indisponivel ao gerar PDF.";
    return;
  }

  if (await handleUnauthorized(response)) {
    return;
  }

  if (!response.ok) {
    relatoriosAvulsosStatus.textContent = "Nao foi possivel gerar o PDF.";
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  relatoriosAvulsosStatus.textContent = "PDF gerado no servidor.";
}

async function enviarRelatorioAvulso(clientId, button) {
  button.disabled = true;
  button.textContent = "Enviando...";
  relatoriosAvulsosStatus.textContent = "Agendando envio ao cliente...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/relatorios-avulsos/clientes/\${clientId}/enviar\`, {
      method: "POST",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      relatoriosAvulsosStatus.textContent = "Nao foi possivel enviar o relatorio.";
      return;
    }

    relatoriosAvulsosStatus.textContent = "Relatorio agendado para envio ao cliente.";
    await loadRelatoriosAvulsos();
  } catch {
    relatoriosAvulsosStatus.textContent = "API indisponivel ao enviar relatorio.";
  } finally {
    button.disabled = false;
    button.textContent = "Enviar";
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
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml(item.veiculo?.nome || "Veiculo")}</strong>
        <span>\${escapeHtml(item.veiculo?.placa || "Sem placa")} · \${formatDateTime(item.abastecido_em)}</span>
      </div>
      <div>
        <span>\${formatNumber(item.odometro_km)} km · \${formatNumber(item.litros)} L</span>
        <span>\${formatCurrency(item.preco_por_litro)} / L</span>
      </div>
      <div>
        <span>\${formatCurrency(item.valor_total)}</span>
        <span>\${escapeHtml(item.posto || "posto nao informado")}</span>
      </div>
    \`;
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
    const response = await fetch(\`\${apiBaseUrl}/admin/frota/abastecimentos\`, {
      method: "POST",
      headers: {
`;
