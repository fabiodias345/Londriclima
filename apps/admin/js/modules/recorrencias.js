export const recorrenciasModule = {
  view: "recorrencias",
  summaryId: "recorrenciasSummary",
  viewId: "recorrenciasView"
};

export const recorrenciasRoot = `
      tone: "warning",
      title: "E-mail do cliente pendente",
      text: "Relatório assinado, mas ainda sem confirmação de entrega do e-mail final ao cliente."
    });
  }

  if (currentSignature?.status === "aguardando_assinatura_engenheiro") {
    alerts.push({
      tone: "success",
      title: "Assinatura solicitada ao engenheiro",
      text: currentSignature.assinafy_document_id
        ? \`Assinafy recebeu o documento. Status: \${currentSignature.assinafy_status || "aguardando assinatura"}.\`
        : "PDF PMOC já foi gerado e enviado para assinatura do engenheiro."
    });
  }

  if (!client.engenheiro_responsavel) {
    alerts.push({
      tone: "danger",
      title: "Engenheiro pendente",
      text: "Vincule o responsável técnico antes de gerar qualquer relatório PMOC."
    });
  }

  if (!client.email) {
    alerts.push({
      tone: "warning",
      title: "E-mail do cliente pendente",
      text: "O envio final ao cliente depende de um e-mail válido no cadastro."
    });
  }

  if (!machines.length) {
    alerts.push({
      tone: "danger",
      title: "Nenhuma máquina cadastrada",
      text: "Cadastre as máquinas do cliente para manter o dossiê separado equipamento por equipamento."
    });
  }

  const machinesWithoutGas = machines.filter((item) => !item.gas_refrigerante).length;

  if (machinesWithoutGas) {
    alerts.push({
      tone: "warning",
      title: "Gás refrigerante pendente",
      text: \`\${machinesWithoutGas} máquina(s) ainda precisam do gás refrigerante na ficha técnica ou primeira visita.\`
    });
  }

  return alerts;
}

function renderPmocMachines(machines) {
  pmocMachineList.innerHTML = "";

  if (!machines.length) {
    pmocMachineList.innerHTML = '<article class="pmoc-empty"><strong>Sem máquinas neste cliente.</strong><span>Cadastre equipamentos na aba Clientes para iniciar o dossiê PMOC.</span></article>';
    return;
  }

  for (const item of machines) {
    const status = getPmocMachineStatus(item);
    const card = document.createElement("article");
    card.className = "pmoc-machine-card";
    card.innerHTML = \`
      <div>
        <span class="pmoc-status \${status.tone}">\${escapeHtml(status.label)}</span>
        <strong>\${escapeHtml([item.tipo, item.marca, item.modelo].filter(Boolean).join(" ") || "Equipamento")}</strong>
        <p>\${escapeHtml(item.local_instalacao || "Local não informado")}</p>
      </div>
      <div class="pmoc-machine-specs">
        <span>Patrimônio: \${escapeHtml(item.patrimonio || "não informado")}</span>
        <span>Série: \${escapeHtml(item.numero_serie || "não informada")}</span>
        <span>Gás: \${escapeHtml(item.gas_refrigerante || "pendente")}</span>
        <span>BTU: \${escapeHtml(item.capacidade_btu || "não informado")}</span>
      </div>
      <div class="pmoc-machine-specs">
        <span>\${item.total_os || 0} OS no histórico</span>
        <span>\${item.os_abertas || 0} OS abertas</span>
        <span>Atualizado \${formatDateTime(item.atualizado_em)}</span>
      </div>
    \`;
    pmocMachineList.appendChild(card);
  }
}

function renderPmocMonths(months) {
  if (!pmocMonthBoard) {
    return;
  }

  if (!months.length) {
    pmocMonthBoard.innerHTML = "";
    return;
  }

  pmocMonthBoard.innerHTML = \`
    <div class="pmoc-month-board-header">
      <strong>Controle mensal PMOC</strong>
      <span>Vermelho: falta solicitar. Amarelo: aguardando assinatura. Verde: enviado ao cliente.</span>
    </div>
    <div class="pmoc-month-grid">
      \${months
        .map((month) => {
          const status = getPmocMonthStatus(month);

          return \`
            <article class="pmoc-month-card \${status.className}">
              <strong>\${escapeHtml(month.mes)}</strong>
              <span>\${escapeHtml(status.label)}</span>
            </article>
          \`;
        })
        .join("")}
    </div>
  \`;
}

function getPmocMonthStatus(month) {
  if (month.email_entregue) {
    return { className: "is-sent", label: "Enviado ao cliente" };
  }

  if (month.relatorio_status === "assinado") {
    return { className: "is-waiting-signature", label: "E-mail pendente" };
  }

  if (month.relatorio_status === "aguardando_assinatura_engenheiro" || month.assinafy_status === "pending") {
    return { className: "is-waiting-signature", label: "Aguardando assinatura" };
  }

  return { className: "is-pending", label: "Falta solicitar" };
}

function getPmocMachineStatus(machine) {
  const completedCount = Math.max((machine.total_os || 0) - (machine.os_abertas || 0), 0);

  if (!machine.gas_refrigerante) {
    return { label: "Ficha pendente", tone: "warning" };
  }

  if (completedCount > 0 && machine.os_abertas > 0) {
    return { label: "Manutencao + OS aberta", tone: "success" };
  }

  if (completedCount > 0) {
    return { label: "Manutencao registrada", tone: "success" };
  }

  if (machine.os_abertas > 0) {
    return { label: "OS aberta", tone: "danger" };
  }

  return { label: "Sem OS", tone: "warning" };
}

function hasCompletedPmocMaintenance(machines) {
  return machines.some((item) => (item.total_os || 0) > (item.os_abertas || 0));
}

async function openPmocReportPreview() {
  if (!selectedPmocDossierClientId || !hasCompletedPmocMaintenance(selectedPmocDossierMachines)) {
    pmocDossierMeta.textContent = "Selecione um dossie com pelo menos uma OS concluida.";
    return;
  }

  pmocGenerateReportButton.disabled = true;
  pmocGenerateReportButton.textContent = "Gerando PDF...";
  pmocDossierMeta.textContent = "Buscando previa oficial do PMOC...";

  const preview = await fetchAdminJson(\`/admin/pmoc/clientes/\${selectedPmocDossierClientId}/previa\`, pmocDossierMeta);

  pmocGenerateReportButton.disabled = false;
  pmocGenerateReportButton.textContent = "Gerar PDF PMOC";

  if (!preview) {
    return;
  }

  const completedOrders = (preview.maquinas || []).reduce(
    (total, machine) => total + (machine.os_concluidas || []).length,
    0
  );
  const officialCompletedOrders = preview.total_os_concluidas ?? completedOrders;
  pmocDossierMeta.textContent = preview.pronto_para_pdf
    ? \`Gerando PDF oficial do PMOC com \${officialCompletedOrders} OS concluidas...\`
    : "Gerando PDF oficial do PMOC com pendencias registradas...";

  let response;

  try {
    response = await fetch(\`\${apiBaseUrl}/admin/pmoc/clientes/\${selectedPmocDossierClientId}/pdf\`, {
      headers: authHeaders()
    });
  } catch {
    pmocDossierMeta.textContent = "API indisponivel ao gerar PDF.";
    return;
  }

  if (await handleUnauthorized(response)) {
    return;
  }

  if (!response.ok) {
    pmocDossierMeta.textContent = "Nao foi possivel gerar o PDF PMOC.";
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  pmocDossierMeta.textContent = \`\${preview.total_maquinas || 0} maquinas - PDF oficial gerado no servidor\`;
}

async function requestPmocEngineerSignature() {
  if (!selectedPmocDossierClientId) {
    pmocDossierMeta.textContent = "Selecione um dossie PMOC.";
    return;
  }

  pmocRequestSignatureButton.disabled = true;
  pmocRequestSignatureButton.textContent = "Solicitando...";
  pmocDossierMeta.textContent = "Criando fluxo de assinatura do engenheiro...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/assinaturas/pmoc/clientes/\${selectedPmocDossierClientId}/assinafy\`, {
      method: "POST",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      pmocDossierMeta.textContent = "Nao foi possivel solicitar assinatura.";
      return;
    }

    const result = await response.json();
    pmocDossierMeta.textContent = result.assinafy_document_id
      ? "Assinatura solicitada ao engenheiro pela Assinafy."
      : "Fluxo de assinatura criado.";
    await openPmocDossier(selectedPmocDossierClientId);
  } catch {
    pmocDossierMeta.textContent = "API indisponivel ao solicitar assinatura.";
  } finally {
    pmocRequestSignatureButton.disabled = false;
    pmocRequestSignatureButton.textContent = "Solicitar assinatura";
  }
}

function getPmocClientStatus(client) {
  if (!client.pmoc_ativo) {
    return { label: "Cliente sem PMOC", tone: "warning" };
  }

  if (!client.engenheiro_responsavel) {
    return { label: "Falta engenheiro", tone: "danger" };
  }

  if (!client.total_equipamentos) {
    return { label: "Falta maquina", tone: "warning" };
  }

  return { label: "Cadastro pronto", tone: "success" };
}

function searchPmocClients(query) {
  const normalized = normalizeSearch(query);

  if (!normalized) {
    return latestClients;
  }

  return latestClients.filter((item) => {
    const content = [
      item.nome,
      item.email,
      item.telefone,
      item.documento,
      item.engenheiro_responsavel?.nome,
      item.engenheiro_responsavel?.crea
    ].map(normalizeSearch).join(" ");

    return content.includes(normalized);
  });
}

function openPmocConversion(clientId) {
  const client = latestClients.find((item) => item.id === clientId);

  if (!client) {
    return;
  }

  if (client.pmoc_ativo) {
    pmocConversionPanel?.classList.add("hidden");
    pmocStatus.textContent = \`\${client.nome} ja esta no PMOC.\`;
    return;
  }

  selectedPmocClientId = client.id;
  pmocConversionTitle.textContent = \`\${client.nome} esta sem PMOC\`;
  pmocConversionText.textContent = "Confirme o engenheiro responsavel para transformar este cliente em PMOC.";
  pmocConversionStatus.textContent = "";
  renderPmocEngineerOptions("");
  pmocConversionPanel?.classList.remove("hidden");
}

async function activatePmocClient(event) {
  event.preventDefault();

  const client = latestClients.find((item) => item.id === selectedPmocClientId);
  const engineerId = pmocEngineerSelect.value;

  if (!client) {
    pmocConversionStatus.textContent = "Selecione um cliente primeiro.";
    return;
  }

  if (!engineerId) {
    pmocConversionStatus.textContent = "Selecione o engenheiro responsavel.";
    return;
  }

  const button = pmocConversionForm.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Adicionando...";
  pmocConversionStatus.textContent = "";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/clientes/\${client.id}\`, {
      method: "PATCH",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildClientPmocPayload(client, engineerId))
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      pmocConversionStatus.textContent = error.message || "Nao foi possivel adicionar PMOC.";
      return;
    }

    pmocConversionStatus.textContent = "Cliente adicionado ao PMOC.";
    pmocConversionPanel?.classList.add("hidden");
    await loadPmoc();
  } catch {
    pmocConversionStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = "Adicionar PMOC ao cliente";
  }
}

function buildClientPmocPayload(client, engineerId) {
  const address = client.endereco || {};

  return removeEmptyValues({
    tipo: client.tipo || "pf",
    nome: client.nome || "",
    telefone: onlyDigits(client.telefone || ""),
    email: client.email || "",
    documento: client.documento || "",
    pmoc_ativo: true,
    engenheiro_responsavel_id: engineerId,
    tecnico_responsavel_id: client.tecnico_responsavel?.id || "",
    equipe_ids: (client.equipes || []).map((equipe) => equipe.id),
    cep: onlyDigits(address.cep || ""),
    logradouro: address.logradouro || "",
    numero: address.numero || "",
    bairro: address.bairro || "",
    cidade: address.cidade || "",
    uf: String(address.uf || "").toUpperCase()
  });
}

function renderEngenheiros(items) {
  engenheirosList.innerHTML = "";

  if (!items.length) {
    engenheirosList.innerHTML = '<article class="data-row"><strong>Nenhum engenheiro cadastrado.</strong><span>Cadastre o responsavel tecnico antes de vincular clientes PMOC.</span></article>';
    return;
  }
`;
