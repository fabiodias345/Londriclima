export const authModule = {
  view: "auth",
  summaryId: "loginPanel",
  viewId: "authView"
};

export const authRoot = `
    fleetStatus.textContent = "Nao foi possivel carregar a frota.";
    renderFrota([]);
    return;
  }

  const result = await response.json();

  latestFleetItems = result.items;
  updateFleetSummary(result.items);
  fleetStatus.textContent = result.total === 1 ? "1 veiculo" : \`\${result.total} veiculos\`;
  renderFrota(result.items);
  await Promise.all([
    loadFleetVehicles(),
    loadRelatorioFrota(),
    loadFuelHistory()
  ]);
}

async function loadDispatchOptions() {
  const result = await fetchAdminJson("/admin/opcoes-despacho", listStatus);

  if (!result) {
    dispatchOptions = {
      equipes: [],
      tecnicos: []
    };
    return;
  }

  dispatchOptions = {
    equipes: result.equipes || [],
    tecnicos: result.tecnicos || []
  };
}

async function loadAgenda() {
  agendaStatus.textContent = "Carregando...";
  await Promise.all([
    loadDispatchOptions(),
    loadClientesForAgenda()
  ]);

  const result = await fetchAdminJson("/admin/agenda", agendaStatus);

  if (!result) {
    return;
  }

  const items = result.items || [];
  const operationalItems = items.filter((item) => AGENDA_OPERATIONAL_STATUSES.includes(item.status));
  const today = getLocalDateKey(new Date());

  latestAgendaItems = items;
  agendaCount.textContent = operationalItems.length;
  attendanceCount.textContent = operationalItems.filter((item) => item.status === "em_atendimento").length;
  todayCount.textContent = operationalItems.filter((item) => item.agendada_para && getAgendaItemDateKey(item) === today).length;
  agendaStatus.textContent = operationalItems.length === 1 ? "1 OS aberta" : \`\${operationalItems.length} OS abertas\`;
  renderAgenda(operationalItems);
}

async function loadClientesForAgenda() {
  if (latestClients.length) {
    renderAgendaClientOptions();
    renderRecurrenceClientOptions();
    return latestClients;
  }

  const result = await fetchAdminJson("/admin/clientes", agendaStatus);
  latestClients = result?.items || [];
  renderAgendaClientOptions();
  renderRecurrenceClientOptions();
  return latestClients;
}

async function loadRecorrencias() {
  recurrenceStatus.textContent = "Carregando...";
  if (recurrenceForm instanceof HTMLFormElement && !recurrenceForm.elements.proxima_execucao.value) {
    const today = new Date();
    recurrenceForm.elements.proxima_execucao.value = \`\${getLocalDateKey(today)}T08:00\`;
    recurrenceForm.elements.dia_geracao.value = today.getDate();
  }
  await Promise.all([
    loadDispatchOptions(),
    loadClientesForAgenda()
  ]);
  renderRecurrenceDispatchOptions();

  const result = await fetchAdminJson("/admin/planos-recorrencia", recurrenceStatus);

  if (!result) {
    return;
  }

  latestRecurrenceItems = result.items || [];
  updateRecurrenceSummary(latestRecurrenceItems);
  recurrenceStatus.textContent = result.total === 1 ? "1 plano" : \`\${result.total} planos\`;
  renderRecorrencias(filterRecurrenceItems(latestRecurrenceItems));
}

async function loadClientes() {
  clientesStatus.textContent = "Carregando...";
  await loadEngenheiros(false);
  await loadTecnicos(false);
  await loadEquipes(false);

  const result = await fetchAdminJson("/admin/clientes", clientesStatus);

  if (!result) {
    return;
  }

  const items = result.items || [];

  latestClients = items;
  clientCount.textContent = result.total;
  clientOpenCount.textContent = items.filter((item) => item.os_abertas > 0).length;
  equipmentCount.textContent = items.reduce((total, item) => total + (item.total_equipamentos || 0), 0);
  clientesStatus.textContent = result.total === 1 ? "1 cliente" : \`\${result.total} clientes\`;
  renderClientes(items);
  renderClientTechnicianOptions();
  renderClientTeamOptions();
}

async function loadEmpresa() {
  empresaStatus.textContent = "Carregando...";

  const result = await fetchAdminJson("/admin/empresa", empresaStatus);

  if (!result) {
    return;
  }

  preencherEmpresaForm(result);
  empresaStatusSummary.textContent = formatEmpresaStatus(result.status);
  empresaCnpjSummary.textContent = result.cnpj || "Pendente";
  empresaContatoSummary.textContent = result.contato_principal || result.email || "Pendente";
  empresaStatus.textContent = \`Atualizado em \${formatDateTime(result.atualizado_em)}\`;
}

function preencherEmpresaForm(empresa) {
  const campos = [
    "razao_social",
    "nome_fantasia",
    "cnpj",
    "email",
    "telefone",
    "status",
    "cep",
    "logradouro",
    "numero",
    "complemento",
    "bairro",
    "cidade",
    "uf",
    "inscricao_estadual",
    "inscricao_municipal",
    "responsavel_legal",
    "responsavel_cpf",
    "contato_principal",
    "contato_cargo",
    "observacoes"
  ];

  for (const campo of campos) {
    if (empresaForm?.elements[campo]) {
      empresaForm.elements[campo].value = empresa[campo] || "";
    }
  }
}

function formatEmpresaStatus(status) {
  const labels = {
    ativa: "Ativa",
    suspensa: "Suspensa",
    inativa: "Inativa"
  };

  return labels[status] || "Ativa";
}

async function loadPmoc() {
  pmocStatus.textContent = "Carregando clientes...";
  pmocConversionPanel?.classList.add("hidden");
  selectedPmocClientId = "";
  await loadEngenheiros(false);

  const result = await fetchAdminJson("/admin/clientes", pmocStatus);

  if (!result) {
    return;
  }

  latestClients = result.items || [];
  renderPmocEngineerOptions();
  renderPmocSummary();
  resetPmocSearchResults();
  renderPmocDossiers();
  if (selectedPmocDossierClientId) {
    await openPmocDossier(selectedPmocDossierClientId);
  } else {
    closePmocDossier();
  }
  pmocStatus.textContent = \`\${latestClients.length} clientes na base\`;
}

async function loadEngenheiros(renderList = true) {
  if (renderList) {
    engenheirosStatus.textContent = "Carregando...";
  }

  let response;

  try {
    response = await fetch(\`\${apiBaseUrl}/admin/engenheiros\`, {
      headers: authHeaders()
    });
  } catch {
    if (renderList) {
      engenheirosStatus.textContent = "API indisponivel.";
    }
    return [];
  }

  if (await handleUnauthorized(response)) {
    return [];
  }

  if (!response.ok) {
    if (renderList) {
      engenheirosStatus.textContent = "Nao foi possivel carregar os engenheiros.";
    }
    return [];
  }

  const result = await response.json();
  latestEngineers = result.items || [];
  renderEngineerOptions();

  if (renderList) {
    engenheirosStatus.textContent = result.total === 1 ? "1 engenheiro" : \`\${result.total} engenheiros\`;
    renderEngenheiros(latestEngineers);
  }

  return latestEngineers;
}

async function loadTecnicos(renderList = true) {
  if (renderList) {
    tecnicosStatus.textContent = "Carregando...";
  }

  const result = await fetchAdminJson("/admin/tecnicos", renderList ? tecnicosStatus : null);

  if (!result) {
    latestTecnicos = [];
    return [];
  }

  latestTecnicos = result.items || [];

  if (renderList) {
    tecnicosStatus.textContent = result.total === 1 ? "1 acesso" : \`\${result.total} acessos\`;
    renderTecnicos(latestTecnicos);
  }

  renderEquipeMembersList();
  return latestTecnicos;
}

async function loadEquipes(renderList = true) {
  if (renderList) {
    equipesStatus.textContent = "Carregando...";
    await loadTecnicos(false);
    if (!latestClients.length) {
      const clientsResult = await fetchAdminJson("/admin/clientes", equipesStatus);
      latestClients = clientsResult?.items || [];
    }
  }

  const result = await fetchAdminJson("/admin/equipes", renderList ? equipesStatus : null);

  if (!result) {
    latestEquipes = [];
    return [];
  }

  latestEquipes = result.items || [];

  if (renderList) {
    equipesStatus.textContent = result.total === 1 ? "1 equipe" : \`\${result.total} equipes\`;
    renderEquipeClientOptions();
    renderEquipeMembersList();
    renderEquipes(latestEquipes);
  }

  renderClientTeamOptions();
  return latestEquipes;
}

async function loadClientEquipments(clientId) {
  if (!clientId || !clientEquipmentStatus || !clientEquipmentList) {
    return;
  }

  clientEquipmentStatus.textContent = "Carregando equipamentos...";
  const result = await fetchAdminJson(\`/admin/clientes/\${clientId}/equipamentos\`, clientEquipmentStatus);

  if (!result) {
    return;
  }

  clientEquipmentStatus.textContent =
    result.total === 1 ? "1 equipamento vinculado" : \`\${result.total} equipamentos vinculados\`;
  renderClientEquipments(result.items || []);
}

async function loadFuelHistory() {
  const result = await fetchAdminJson("/admin/frota/abastecimentos", fuelHistoryStatus);

  if (!result) {
    return;
  }

  fuelHistoryStatus.textContent = result.total === 1 ? "1 registro" : \`\${result.total} registros\`;
  renderFuelHistory(result.items || []);
}

async function loadRelatorios() {
  relatoriosStatus.textContent = "Carregando...";

  const result = await fetchAdminJson("/admin/relatorios", relatoriosStatus);

  if (!result) {
    return;
  }

  latestReports = result;
  reportOsCount.textContent = result.total_os;
  reportRevenue.textContent = formatCurrency(result.receita_prevista || 0);
  reportCollectedRevenue.textContent = formatCurrency(result.receita_arrecadada || 0);
  automationCount.textContent = result.automacoes_pendentes;
  relatoriosStatus.textContent = "Atualizado agora";
  renderRelatorios(result);
}

async function loadRelatorioFrota() {
  fleetReportStatus.textContent = "Carregando...";

  const result = await fetchAdminJson("/admin/relatorios/frota", fleetReportStatus);

  if (!result) {
    return;
  }

  fleetReportStatus.textContent = \`\${result.total_veiculos} veiculos · \${formatNumber(result.km_rodados)} km\`;
  latestFleetReportItems = result.items || [];
  updateFleetSummary(latestFleetItems);
  renderRelatorioFrota(latestFleetReportItems);
}

async function loadRelatoriosAvulsos() {
  relatoriosAvulsosStatus.textContent = "Carregando...";

  const result = await fetchAdminJson("/admin/relatorios-avulsos", relatoriosAvulsosStatus);

  if (!result) {
    return;
  }

  avulsoClientCount.textContent = result.total || 0;
  avulsoReadyCount.textContent = result.pendentes || 0;
  relatoriosAvulsosStatus.textContent = result.total === 1 ? "1 cliente avulso" : \`\${result.total || 0} clientes avulsos\`;
  renderRelatoriosAvulsos(result.items || []);
}

async function fetchAdminJson(path, statusElement) {
  let response;

  try {
    response = await fetch(\`\${apiBaseUrl}\${path}\`, {
      headers: authHeaders()
    });
  } catch {
    if (statusElement) {
      statusElement.textContent = "API indisponivel.";
    }
    return null;
  }

  if (await handleUnauthorized(response)) {
    return null;
  }

  if (!response.ok) {
    if (statusElement) {
      statusElement.textContent = "Nao foi possivel carregar os dados.";
    }
`;
