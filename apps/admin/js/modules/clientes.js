export const clientesModule = {
  view: "clientes",
  summaryId: "clientesSummary",
  viewId: "clientesView"
};

export const clientesRoot = `

function renderEngenheiros(items) {
  engenheirosList.innerHTML = "";

  if (!items.length) {
    engenheirosList.innerHTML = '<article class="data-row"><strong>Nenhum engenheiro cadastrado.</strong><span>Cadastre o responsável técnico antes de vincular clientes PMOC.</span></article>';
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "data-row team-summary-card";
    const documento = item.documentos?.[0];
    const cadastroStatus = item.primeiro_acesso_pendente
      ? "Cadastro inicial pendente"
      : "Cadastro concluido" + (item.primeiro_acesso_em ? " em " + new Date(item.primeiro_acesso_em).toLocaleDateString("pt-BR") : "");
    const documentoBotao = documento
      ? '<button class="secondary-button compact-button" type="button" data-action="baixar-documento-funcionario" data-id="' + escapeHtml(item.id) + '" data-documento-id="' + escapeHtml(documento.id) + '">Termo assinado</button>'
      : "";
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml(item.nome)}</strong>
        <span>CREA \${escapeHtml(item.crea)} - CPF \${escapeHtml(item.cpf)}</span>
      </div>
      <div>
        <span>Login: \${escapeHtml(item.login || "pendente")}</span>
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
    tecnicosList.innerHTML = '<article class="data-row"><strong>Nenhum acesso cadastrado.</strong><span>Cadastre admins, tecnicos e auxiliares para liberar login.</span></article>';
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "data-row";
    const documento = item.documentos?.[0];
    const cadastroStatus = item.primeiro_acesso_pendente
      ? "Cadastro inicial pendente"
      : "Cadastro concluido" + (item.primeiro_acesso_em ? " em " + new Date(item.primeiro_acesso_em).toLocaleDateString("pt-BR") : "");
    const documentoBotao = documento
      ? '<button class="secondary-button compact-button" type="button" data-action="baixar-documento-funcionario" data-id="' + escapeHtml(item.id) + '" data-documento-id="' + escapeHtml(documento.id) + '">Termo assinado</button>'
      : "";
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml(item.nome)}</strong>
        <span>\${escapeHtml(formatAccessRole(item.role))}</span>
      </div>
      <div>
        <span>Login: \${escapeHtml(item.login || "pendente")}</span>
        <span>\${escapeHtml(item.email)}</span>
        <span>\${formatPhone(item.telefone)}</span>
        <span>\${escapeHtml(cadastroStatus)}</span>
      </div>
      <div class="data-row-actions">
        \${documentoBotao}
        <button class="secondary-button compact-button" type="button" data-action="editar-tecnico" data-id="\${item.id}">Editar</button>
        <button class="danger-button compact-button" type="button" data-action="apagar-tecnico" data-id="\${item.id}">Apagar</button>
      </div>
    \`;
    tecnicosList.appendChild(row);
  }
}

async function downloadFuncionarioDocumento(tecnicoId, documentoId) {
  tecnicosStatus.textContent = "Baixando documento...";
  const response = await fetch(\`\${apiBaseUrl}/admin/tecnicos/\${tecnicoId}/documentos/\${documentoId}\`, {
    headers: { Authorization: \`Bearer \${getToken()}\` }
  });
  if (!response.ok) {
    tecnicosStatus.textContent = "Nao foi possivel baixar o documento.";
    return;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "termo-responsabilidade-funcionario.pdf";
  link.click();
  URL.revokeObjectURL(url);
  tecnicosStatus.textContent = "Documento baixado.";
}

function renderTechnicianInvites(items) {
  technicianInvitesList.innerHTML = "";
  if (!items.length) {
    technicianInvitesList.innerHTML = '<article class="data-row"><span>Nenhum convite gerado.</span></article>';
    return;
  }
  for (const item of items) {
    const row = document.createElement("article");
    row.className = "data-row";
    const labels = { pendente: "Pendente", utilizado: "Utilizado", vencido: "Vencido", cancelado: "Cancelado" };
    const roleLabel = item.role === "auxiliar" ? "Auxiliar" : "TÃ©cnico";
    const tecnico = item.tecnico
      ? '<span>Cadastro: ' + escapeHtml(item.tecnico.nome) + ' (' + escapeHtml(item.tecnico.login || "") + ')</span>'
      : "";
    const cancelar = item.estado === "pendente"
      ? '<button class="danger-button compact-button" type="button" data-action="cancelar-convite-tecnico" data-id="' + escapeHtml(item.id) + '">Cancelar</button>'
      : "";
    row.innerHTML = '<div><strong>Convite final ' + escapeHtml(item.codigo_sufixo) + '</strong>'
      + '<span>' + escapeHtml(roleLabel) + ' - ' + escapeHtml(labels[item.estado] || item.estado) + ' - vence em ' + new Date(item.expira_em).toLocaleString("pt-BR") + '</span>'
      + tecnico + '</div><div class="data-row-actions">' + cancelar + '</div>';
    technicianInvitesList.appendChild(row);
  }
}

async function loadTechnicianInvites() {
  const result = await fetchAdminJson("/admin/convites-tecnico", technicianInviteStatus);
  latestTechnicianInvites = result?.items || [];
  renderTechnicianInvites(latestTechnicianInvites);
}

async function generateTechnicianInvite() {
  generateTechnicianInviteButton.disabled = true;
  technicianInviteStatus.textContent = "Gerando convite...";
  const role = technicianInviteRole?.value === "auxiliar" ? "auxiliar" : "tecnico";
  const roleLabel = role === "auxiliar" ? "Auxiliar" : "TÃ©cnico";
  try {
    const response = await fetch(apiBaseUrl + "/admin/convites-tecnico", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    if (await handleUnauthorized(response)) return;
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      technicianInviteStatus.textContent = result.message || "Nao foi possivel gerar o convite.";
      return;
    }
    generatedTechnicianInviteCode.textContent = result.codigo;
    generatedTechnicianInviteId = result.id;
    generatedTechnicianInviteExpiry.textContent = "Valido ate " + new Date(result.expira_em).toLocaleString("pt-BR");
    generatedTechnicianInvite.classList.remove("hidden");
    technicianInviteStatus.textContent = "Convite de " + roleLabel + " gerado. Copie o codigo ou encaminhe por email.";
    await loadTechnicianInvites();
  } catch {
    technicianInviteStatus.textContent = "API indisponivel.";
  } finally {
    generateTechnicianInviteButton.disabled = false;
  }
}

async function cancelTechnicianInvite(inviteId) {
  const response = await fetch(apiBaseUrl + "/admin/convites-tecnico/" + inviteId, { method: "DELETE", headers: authHeaders() });
  if (await handleUnauthorized(response)) return;
  const result = await response.json().catch(() => ({}));
  technicianInviteStatus.textContent = response.ok ? "Convite cancelado." : (result.message || "Nao foi possivel cancelar.");
  await loadTechnicianInvites();
}

async function copyTechnicianInvite() {
  const codigo = generatedTechnicianInviteCode.textContent || "";
  if (!codigo) return;
  await navigator.clipboard.writeText(codigo);
  technicianInviteStatus.textContent = "Codigo copiado.";
}

async function sendTechnicianInviteEmail(event) {
  event.preventDefault();
  if (!generatedTechnicianInviteId || !generatedTechnicianInviteCode.textContent) {
    technicianInviteStatus.textContent = "Gere um convite antes de enviar.";
    return;
  }
  const button = technicianInviteEmailForm.querySelector("button[type='submit']");
  const email = String(new FormData(technicianInviteEmailForm).get("email") || "").trim();
  button.disabled = true;
  button.textContent = "Enviando...";
  technicianInviteStatus.textContent = "Enviando convite por email...";
  try {
    const response = await fetch(apiBaseUrl + "/admin/convites-tecnico/" + generatedTechnicianInviteId + "/email", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, codigo: generatedTechnicianInviteCode.textContent })
    });
    if (await handleUnauthorized(response)) return;
    const result = await response.json().catch(() => ({}));
    technicianInviteStatus.textContent = response.ok
      ? "Convite enviado para " + email + "."
      : (result.message || "Nao foi possivel enviar o email. O codigo continua disponivel.");
  } catch {
    technicianInviteStatus.textContent = "API indisponivel. O codigo continua disponivel para copia.";
  } finally {
    button.disabled = false;
    button.textContent = "Enviar convite";
  }
}

function renderEquipes(items) {
  equipesList.innerHTML = "";

  if (!items.length) {
    equipesList.innerHTML = '<article class="team-empty-state"><strong>Nenhuma equipe cadastrada.</strong><span>Crie a primeira equipe para organizar o despacho.</span></article>';
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "team-card";
    row.innerHTML = \`
      <strong>\${escapeHtml(item.nome)}</strong>
      <div class="team-card-meta">
        <span class="team-count-badge">👥 \${item.membros.length} \${item.membros.length === 1 ? "técnico" : "técnicos"}</span>
        <span class="team-count-badge">🏢 \${item.clientes.length} \${item.clientes.length === 1 ? "cliente" : "clientes"}</span>
      </div>
      <div class="team-card-actions">
        <button type="button" data-action="editar-equipe" data-id="\${item.id}">Editar</button>
        <button class="danger-button" type="button" data-action="apagar-equipe" data-id="\${item.id}">Apagar</button>
      </div>
    \`;
    equipesList.appendChild(row);
  }
}

function renderClientTeamOptions(selectedIds = getSelectedValues(clientTeamsSelect)) {
  if (!clientTeamsSelect) {
    return;
  }

  clientTeamsSelect.innerHTML = '<option value="">Selecione</option>';

  for (const item of latestEquipes) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.nome;
    option.selected = selectedIds.includes(item.id);
    clientTeamsSelect.appendChild(option);
  }
}

function renderClientTechnicianOptions(selectedId = clientTechnicianSelect?.value || "") {
  if (!clientTechnicianSelect) {
    return;
  }

  clientTechnicianSelect.innerHTML = '<option value="">Selecione</option>';

  for (const item of latestTecnicos) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.role === "auxiliar" ? \`\${item.nome} - Auxiliar\` : item.nome;
    clientTechnicianSelect.appendChild(option);
  }

  if (selectedId) {
    clientTechnicianSelect.value = selectedId;
  }
}

function renderEquipeClientOptions(selectedIds = getSelectedValues(equipeClientsSelect)) {
  if (!equipeClientsSelect) {
    return;
  }

  equipeClientsSelect.innerHTML = latestClients
    .map((item) => \`<option value="\${item.id}" \${selectedIds.includes(item.id) ? "selected" : ""}>\${escapeHtml(item.nome)}</option>\`)
    .join("");
}

function getSelectedEquipeMembers() {
  if (!equipeMembersList) {
    return [];
  }

  return [...equipeMembersList.querySelectorAll('input[name="membro_usuario_id"]:checked')].map((input) => ({
    usuario_id: input.value,
    funcao: String(equipeMembersList.querySelector(\`input[name="membro_funcao_\${input.value}"]\`)?.value || "tecnico")
  }));
}

function renderEquipeMembersList(selectedMembers = getSelectedEquipeMembers()) {
  if (!equipeMembersList) {
    return;
  }

  const search = String(equipeMemberSearchInput?.value || "").trim().toLowerCase();
  const operacionais = latestTecnicos
    .filter((tecnico) => tecnico.role === "tecnico" || tecnico.role === "auxiliar")
    .filter((tecnico) => !search || tecnico.nome.toLowerCase().includes(search));

  if (!operacionais.length) {
    equipeMembersList.innerHTML = '<span>Nenhum técnico encontrado.</span>';
    return;
  }

  equipeMembersList.innerHTML = operacionais.map((tecnico) => {
    const selected = selectedMembers.find((membro) => membro.usuario_id === tecnico.id);
    const funcao = selected?.funcao || (tecnico.role === "auxiliar" ? "auxiliar" : "tecnico");
    const label = funcao === "lider" ? "Líder" : formatAccessRole(tecnico.role);

    return \`
      <label class="team-member-option">
        <input name="membro_usuario_id" type="checkbox" value="\${tecnico.id}" \${selected ? "checked" : ""} />
        <input name="membro_funcao_\${tecnico.id}" type="hidden" value="\${funcao}" />
        <span>\${escapeHtml(tecnico.nome)}</span>
        <strong class="team-role-badge team-role-\${escapeHtml(funcao === "lider" ? "lider" : tecnico.role)}">\${escapeHtml(label)}</strong>
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

function formatAccessRole(role) {
  return {
    admin: "Admin",
    tecnico: "Tecnico",
    auxiliar: "Auxiliar"
  }[role] || "Tecnico";
}

function renderEngineerOptions(selectedId = clientEngineerSelect?.value || "") {
  if (!clientEngineerSelect) {
    return;
  }

  clientEngineerSelect.innerHTML = '<option value="">Selecione</option>';

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
        <span>\${escapeHtml(item.local_instalacao || "Local nÃ£o informado")}</span>
      </div>
      <div>
        <span>Categoria: \${escapeHtml(formatServiceCategoryLabel(getEquipmentCategory(item)))}</span>
        <span>PatrimÃ´nio: \${escapeHtml(item.patrimonio || "nÃ£o informado")}</span>
        <span>Código/QR: \${escapeHtml(item.codigo_barras || "não informado")}</span>
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
      <span>VeÃ­culos ativos</span>
      <strong>\${result.veiculos_ativos}</strong>
    </article>
    \${renderPeriodMetric("Manutencoes", result.manutencoes)}
    \${renderPeriodMetric("KM da frota", result.frota?.km_rodados_periodo, "km")}
    \${renderPeriodMetric("Pre-chamados", result.pre_chamados)}
    \${renderPeriodMetric("OS abertas", result.os_abertas)}
    \${renderPeriodMetric("Em atendimento", result.em_atendimento)}
    \${renderPeriodMetric("ConcluÃ­das", result.concluidas)}
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
    row.className = "data-row fuel-row fleet-report-row";
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml(item.nome)}</strong>
        <span>\${escapeHtml(item.placa || "Sem placa")} Â· \${item.abastecimentos} abastecimentos</span>
      </div>
      <div>
        <span>\${formatNumber(item.km_rodados)} km Â· \${formatNumber(item.litros)} L</span>
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
    const ultimoEnvio = item.ultimo_envio
      ? \`Ãšltimo envio: \${formatRelatorioAvulsoDateTime(item.ultimo_envio.enviado_em)} - \${escapeHtml(item.ultimo_envio.email || item.email || "e-mail nÃ£o informado")}\`
      : "Ainda nao enviado";
    const sendLabel = item.ultimo_envio ? "Reenviar relatorio" : "Enviar";
    const row = document.createElement("article");
    row.className = "data-row avulso-row";
    row.innerHTML = \`
      <div>
        <strong>\${escapeHtml(item.nome)}</strong>
        <span>\${escapeHtml(item.email || "E-mail pendente")} Â· \${escapeHtml(item.telefone || "sem telefone")}</span>
      </div>
      <div>
        <span>\${item.total_maquinas || 0} maquina(s) Â· \${item.total_os_concluidas || 0} OS concluida(s)</span>
        <span class="pmoc-status \${status.tone}">\${escapeHtml(status.label)}</span>
        <span>\${ultimoEnvio}</span>
      </div>
      <div class="data-row-actions">
        <button class="secondary-button compact-button" type="button" data-action="avulso-pdf" data-id="\${item.id}">PDF</button>
        <button class="approve-button compact-button" type="button" data-action="avulso-enviar" data-id="\${item.id}" data-default-label="\${sendLabel}" data-last-sent="\${item.ultimo_envio?.enviado_em || ""}" data-last-email="\${escapeHtml(item.ultimo_envio?.email || item.email || "")}" \${item.pronto_para_envio ? "" : "disabled"}>\${sendLabel}</button>
        <button class="secondary-button compact-button danger-button" type="button" data-action="avulso-apagar" data-id="\${item.id}">Apagar relatorio</button>
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
  if (button.dataset.lastSent) {
    const confirmado = window.confirm(
      \`Este relatorio ja foi enviado em \${formatRelatorioAvulsoDateTime(button.dataset.lastSent)} para \${button.dataset.lastEmail || "o cliente"}. Deseja enviar novamente?\`
    );

    if (!confirmado) {
      return;
    }
  }

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
    button.textContent = button.dataset.defaultLabel || "Enviar";
  }
}

function formatRelatorioAvulsoDateTime(value) {
  if (!value) {
    return "data nao informada";
  }

  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

async function apagarRelatorioAvulso(clientId, button) {
  const confirmado = window.confirm("Apagar relatorio avulso gerado para este cliente?");

  if (!confirmado) {
    return;
  }

  button.disabled = true;
  button.textContent = "Apagando...";
  relatoriosAvulsosStatus.textContent = "Apagando relatorio avulso...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/relatorios-avulsos/clientes/\${clientId}\`, {
      method: "DELETE",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      relatoriosAvulsosStatus.textContent = "Nao foi possivel apagar o relatorio.";
      return;
    }

    const result = await response.json().catch(() => ({}));
    relatoriosAvulsosStatus.textContent = \`\${result.relatorios_apagados || 0} relatorio(s) apagado(s).\`;
    await loadRelatoriosAvulsos();
  } catch {
    relatoriosAvulsosStatus.textContent = "API indisponivel ao apagar relatorio.";
  } finally {
    button.disabled = false;
    button.textContent = "Apagar relatorio";
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
        <span>\${escapeHtml(item.veiculo?.placa || "Sem placa")} Â· \${formatDateTime(item.abastecido_em)}</span>
      </div>
      <div>
        <span>\${formatNumber(item.odometro_km)} km Â· \${formatNumber(item.litros)} L</span>
        <span>\${formatCurrency(item.preco_por_litro)} / L</span>
      </div>
      <div>
        <span>\${formatCurrency(item.valor_total)}</span>
        <span>\${escapeHtml(item.posto || "posto nÃ£o informado")}</span>
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

