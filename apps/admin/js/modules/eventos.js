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

function renderOptions(items) {
  return items
    .map((item) => \`<option value="\${item.id}">\${escapeHtml(item.nome)}</option>\`)
    .join("");
}

async function deleteTecnico(tecnicoId) {
  tecnicoFormStatus.textContent = "Removendo tecnico...";

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
      tecnicoFormStatus.textContent = error.message || "Nao foi possivel apagar o tecnico.";
      return;
    }

    if (tecnicoForm.elements.id.value === tecnicoId) {
      resetTecnicoForm();
    }

    tecnicoFormStatus.textContent = "Tecnico removido.";
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
    return "Endereco nao informado";
  }

  return [address.bairro, address.cidade, address.uf].filter(Boolean).join(", ");
}

function formatPhone(phone) {
  if (!phone) {
    return "sem telefone";
  }

  const digits = onlyDigits(String(phone));

  if (digits.length === 10) {
    return digits.replace(/^(\\d{2})(\\d{4})(\\d{4})$/, "($1) $2-$3");
  }

  if (digits.length === 11) {
    return digits.replace(/^(\\d{2})(\\d{5})(\\d{4})$/, "($1) $2-$3");
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
