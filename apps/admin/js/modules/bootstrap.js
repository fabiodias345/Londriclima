export const bootstrapModule = {
  view: "bootstrap",
  summaryId: "adminBootstrap",
  viewId: "bootstrapView"
};

export const bootstrapRoot = `
  renderPmocSearchResults(results);
  pmocConversionPanel?.classList.add("hidden");
  pmocStatus.textContent = results.length === 1 ? "1 cliente encontrado" : \`\${results.length} clientes encontrados\`;
});

pmocSearchInput?.addEventListener("input", () => {
  if (!normalizeSearch(pmocSearchInput.value)) {
    resetPmocSearchResults();
    pmocConversionPanel?.classList.add("hidden");
    pmocStatus.textContent = "Digite para procurar clientes fora ou dentro do PMOC.";
    return;
  }

  const results = searchPmocClients(pmocSearchInput.value);
  renderPmocSearchResults(results);
  pmocStatus.textContent = results.length === 1 ? "1 cliente encontrado" : \`\${results.length} clientes encontrados\`;
});

pmocSearchResults?.addEventListener("click", (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest("[data-action]") : null;

  if (!(button instanceof HTMLButtonElement) || !button.dataset.id) {
    return;
  }

  if (button.dataset.action === "pmoc-ativar-cliente") {
    openPmocConversion(button.dataset.id);
  }

  if (button.dataset.action === "pmoc-ver-cliente") {
    void openPmocDossier(button.dataset.id);
  }
});

pmocDossierList?.addEventListener("click", (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest("[data-action]") : null;

  if (!(button instanceof HTMLButtonElement) || !button.dataset.id) {
    return;
  }

  if (button.dataset.action === "pmoc-ver-cliente") {
    void openPmocDossier(button.dataset.id);
  }
});

relatoriosAvulsosList?.addEventListener("click", (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest("[data-action]") : null;

  if (!(button instanceof HTMLButtonElement) || !button.dataset.id) {
    return;
  }

  if (button.dataset.action === "avulso-pdf") {
    void openRelatorioAvulsoPdf(button.dataset.id);
  }

  if (button.dataset.action === "avulso-enviar") {
    void enviarRelatorioAvulso(button.dataset.id, button);
  }
});

agendaCalendar?.addEventListener("click", (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest(".agenda-date-button") : null;

  if (!(button instanceof HTMLButtonElement) || !button.dataset.agendaDate) {
    return;
  }

  selectedAgendaDate = button.dataset.agendaDate;
  renderAgenda(latestAgendaItems);
});

agendaMonthGrid?.addEventListener("click", (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest(".agenda-month-cell") : null;

  if (!(button instanceof HTMLButtonElement) || !button.dataset.agendaDate) {
    return;
  }

  selectedAgendaDate = button.dataset.agendaDate;
  agendaVisibleMonth = selectedAgendaDate.slice(0, 7);
  renderAgenda(latestAgendaItems);
});

agendaPendingList?.addEventListener("click", (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest("[data-action='editar-agenda-os']") : null;

  if (!(button instanceof HTMLButtonElement) || !button.dataset.id) {
    return;
  }

  void openAgendaOsModal(button.dataset.id);
});

agendaList?.addEventListener("click", (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest("[data-action='editar-agenda-os']") : null;

  if (!(button instanceof HTMLButtonElement) || !button.dataset.id) {
    return;
  }

  void openAgendaOsModal(button.dataset.id);
});

agendaPrevMonthButton?.addEventListener("click", () => {
  const [year, month] = agendaVisibleMonth.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  agendaVisibleMonth = getLocalDateKey(date).slice(0, 7);
  selectedAgendaDate = getLocalDateKey(date);
  renderAgenda(latestAgendaItems);
});

agendaNextMonthButton?.addEventListener("click", () => {
  const [year, month] = agendaVisibleMonth.split("-").map(Number);
  const date = new Date(year, month, 1);
  agendaVisibleMonth = getLocalDateKey(date).slice(0, 7);
  selectedAgendaDate = getLocalDateKey(date);
  renderAgenda(latestAgendaItems);
});

newAgendaOsButton?.addEventListener("click", () => {
  void openAgendaOsModal();
});

closeAgendaOsModalButton?.addEventListener("click", closeAgendaOsModal);
cancelAgendaOsButton?.addEventListener("click", closeAgendaOsModal);
agendaOsForm?.addEventListener("submit", submitAgendaOs);
agendaOsClientSelect?.addEventListener("change", () => {
  void loadAgendaEquipments(agendaOsClientSelect.value);
});
recurrenceClientSelect?.addEventListener("change", () => {
  void loadRecurrenceEquipments(recurrenceClientSelect.value);
});
recurrenceList?.addEventListener("click", (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest("[data-action='gerar-recorrencia-os']") : null;

  if (!(button instanceof HTMLButtonElement) || !button.dataset.id) {
    return;
  }

  void generateRecurrenceOs(button.dataset.id);
});

requestList?.addEventListener("click", async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const osId = target.dataset.id;
  const action = target.dataset.action;

  if (!osId || !action) {
    return;
  }

  target.disabled = true;
  await updatePreChamado(osId, action);
});

requestList?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const osId = form.dataset.id;

  if (!osId) {
    return;
  }

  const data = new FormData(form);
  const payload = {
    agendada_para: data.get("agendada_para")
      ? new Date(String(data.get("agendada_para"))).toISOString()
      : undefined,
    equipe_ids: data.getAll("equipe_ids").map(String).filter(Boolean),
    usuario_ids: data.getAll("usuario_ids").map(String).filter(Boolean),
    valor_cobrado: data.get("valor_cobrado") ? Number(data.get("valor_cobrado")) : undefined
  };
  const button = form.querySelector("button[type='submit']");

  button.disabled = true;
  await updatePreChamado(osId, "aprovar", payload);
});

clientesList?.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.action === "editar-cliente" && target.dataset.id) {
    fillClientForm(target.dataset.id);
  }

  if (target.dataset.action === "apagar-cliente" && target.dataset.id) {
    openDeleteClientModal(target.dataset.id);
  }
});

engenheirosList?.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.action === "editar-engenheiro" && target.dataset.id) {
    fillEngineerForm(target.dataset.id);
  }

  if (target.dataset.action === "apagar-engenheiro" && target.dataset.id) {
    void deleteEngineer(target.dataset.id);
  }
});

tecnicosList?.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.action === "editar-tecnico" && target.dataset.id) {
    fillTecnicoForm(target.dataset.id);
  }

  if (target.dataset.action === "apagar-tecnico" && target.dataset.id) {
    void deleteTecnico(target.dataset.id);
  }
});

equipesList?.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.action === "editar-equipe" && target.dataset.id) {
    fillEquipeForm(target.dataset.id);
  }

  if (target.dataset.action === "apagar-equipe" && target.dataset.id) {
    void deleteEquipe(target.dataset.id);
  }
});

clientForm?.elements.tipo?.addEventListener("change", updateClientDocumentCopy);

clientForm?.elements.cep?.addEventListener("input", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  target.value = formatCep(target.value);

  if (onlyDigits(target.value).length === 8) {
    void lookupClientCep();
  } else {
    lastCepLookup = "";
    setClientCepStatus("");
  }
});

clientForm?.elements.cep?.addEventListener("blur", () => {
  void lookupClientCep();
});

cancelDeleteClientButton?.addEventListener("click", closeDeleteClientModal);
confirmDeleteClientButton?.addEventListener("click", () => {
  void confirmDeleteClient();
});

deleteClientModal?.addEventListener("click", (event) => {
  if (event.target === deleteClientModal) {
    closeDeleteClientModal();
  }
});

clientEquipmentList?.addEventListener("click", async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.action === "renovar-acesso-equipamento" && target.dataset.id) {
    await renewEquipmentAccess(target.dataset.id);
  }

  if (target.dataset.action === "apagar-equipamento" && target.dataset.id) {
    await deleteEquipment(target.dataset.id);
  }

  if (target.dataset.action === "copiar-link-equipamento" && target.dataset.link) {
    await navigator.clipboard.writeText(target.dataset.link);
    equipmentFormStatus.textContent = "Link publico copiado.";
  }
});

scanEquipmentCodeButton?.addEventListener("click", () => {
  void startEquipmentScanner();
});

stopEquipmentScanButton?.addEventListener("click", stopEquipmentScanner);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !deleteClientModal?.classList.contains("hidden")) {
    closeDeleteClientModal();
  }

  if (event.key === "Escape" && !equipmentScannerPanel?.classList.contains("hidden")) {
    stopEquipmentScanner();
  }
});

fleetList?.addEventListener("click", (event) => {
  const target = event.target;
  const card = target instanceof Element ? target.closest(".fleet-card") : null;

  if (!(card instanceof HTMLButtonElement) || !card.dataset.vehicleId) {
    return;
  }

  selectFleetVehicle(card.dataset.vehicleId);
});

updateClientDocumentCopy();

if (getToken()) {
  showDashboard();
  setActiveView(activeView);
  void loadActiveView();
} else {
  showLogin();
}
`;
