export const domModule = {
  view: "dom",
  summaryId: "dashboard",
  viewId: "domView"
};

export const domRoot = `
    if (await handleUnauthorized(response)) {
      return;
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      equipmentFormStatus.textContent = result.message || "Nao foi possivel apagar o equipamento.";
      return;
    }

    equipmentFormStatus.textContent = \`Equipamento apagado. \${result.ordens_removidas || 0} OS removida(s).\`;
    await loadClientEquipments(selectedEquipmentClientId);
    await loadClientes();
  } catch {
    equipmentFormStatus.textContent = "API indisponivel.";
  }
}

async function startEquipmentScanner() {
  if (!("BarcodeDetector" in window)) {
    equipmentFormStatus.textContent = "Leitor de codigo/QR indisponivel neste navegador. Digite manualmente.";
    return;
  }

  try {
    equipmentScanStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment"
      }
    });
    equipmentScannerVideo.srcObject = equipmentScanStream;
    await equipmentScannerVideo.play();
    equipmentScannerPanel.classList.remove("hidden");

    const detector = new window.BarcodeDetector({
      formats: ["qr_code", "code_128", "ean_13", "ean_8", "upc_a", "upc_e"]
    });

    equipmentScanTimer = window.setInterval(async () => {
      const codes = await detector.detect(equipmentScannerVideo).catch(() => []);
      const code = codes[0]?.rawValue;

      if (!code) {
        return;
      }

      equipmentForm.elements.codigo_barras.value = code;
      equipmentFormStatus.textContent = "Codigo/QR lido e aplicado ao equipamento.";
      stopEquipmentScanner();
    }, 700);
  } catch {
    equipmentFormStatus.textContent = "Nao foi possivel abrir a camera para leitura.";
  }
}

function stopEquipmentScanner() {
  if (equipmentScanTimer) {
    window.clearInterval(equipmentScanTimer);
    equipmentScanTimer = 0;
  }

  if (equipmentScanStream) {
    for (const track of equipmentScanStream.getTracks()) {
      track.stop();
    }
    equipmentScanStream = null;
  }

  if (equipmentScannerVideo) {
    equipmentScannerVideo.srcObject = null;
  }

  equipmentScannerPanel?.classList.add("hidden");
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function validateClientIdentity(tipo, telefone, documento) {
  if (![10, 11].includes(telefone.length)) {
    return "Informe telefone com DDD. Exemplo: (43) 99999-9999.";
  }

  if (!documento) {
    return tipo === "pj" ? "Informe o CNPJ da empresa." : "Informe CPF ou RG do cliente.";
  }

  if (tipo === "pj" && onlyDigits(documento).length !== 14) {
    return "CNPJ deve ter 14 digitos.";
  }

  return "";
}

function updateClientDocumentCopy() {
  const tipo = clientForm?.elements.tipo?.value || "pf";

  if (clientDocumentLabel) {
    clientDocumentLabel.textContent = tipo === "pj" ? "CNPJ" : "CPF ou RG";
  }

  if (clientDocumentHelp) {
    clientDocumentHelp.textContent =
      tipo === "pj"
        ? "Informe o CNPJ com 14 digitos."
        : "Informe CPF ou RG para identificar o cliente.";
  }

  if (clientForm?.elements.documento instanceof HTMLInputElement) {
    clientForm.elements.documento.placeholder = tipo === "pj" ? "00.000.000/0000-00" : "CPF ou RG";
  }
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return \`\${digits.slice(0, 5)}-\${digits.slice(5)}\`;
}

function setClientCepStatus(message, state = "") {
  if (!clientCepStatus) {
    return;
  }

  clientCepStatus.textContent = message;
  clientCepStatus.dataset.state = state;
}

function applyCepAddress(address) {
  if (!clientForm) {
    return;
  }

  clientForm.elements.logradouro.value = address.logradouro || "";
  clientForm.elements.bairro.value = address.bairro || "";
  clientForm.elements.cidade.value = address.localidade || "";
  clientForm.elements.uf.value = address.uf || "";
  clientForm.elements.numero.focus();
}

async function lookupClientCep() {
  const cepInput = clientForm?.elements.cep;

  if (!(cepInput instanceof HTMLInputElement)) {
    return;
  }

  cepInput.value = formatCep(cepInput.value);
  const cep = onlyDigits(cepInput.value);

  if (!cep) {
    lastCepLookup = "";
    setClientCepStatus("");
    return;
  }

  if (cep.length < 8) {
    setClientCepStatus("Digite os 8 numeros do CEP.", "warning");
    return;
  }

  if (cep === lastCepLookup) {
    return;
  }

  lastCepLookup = cep;
  setClientCepStatus("Buscando endereco pelo CEP...", "loading");

  try {
    const response = await fetch(\`https://viacep.com.br/ws/\${cep}/json/\`);

    if (!response.ok) {
      throw new Error("cep_lookup_failed");
    }

    const address = await response.json();

    if (address.erro) {
      setClientCepStatus("CEP nao encontrado. Preencha o endereco manualmente.", "warning");
      return;
    }

    applyCepAddress(address);
    setClientCepStatus("Endereco preenchido. Informe apenas o numero.", "success");
  } catch {
    setClientCepStatus("Nao foi possivel buscar o CEP agora. Preencha manualmente.", "warning");
  }
}

function fillClientForm(clientId) {
  const client = latestClients.find((item) => item.id === clientId);

  if (!client) {
    return;
  }

  const address = client.endereco || {};
  clientForm.elements.id.value = client.id;
  clientForm.elements.tipo.value = client.tipo || "pf";
  updateClientDocumentCopy();
  clientForm.elements.nome.value = client.nome || "";
  clientForm.elements.telefone.value = client.telefone || "";
  clientForm.elements.email.value = client.email || "";
  clientForm.elements.documento.value = client.documento || "";
  clientForm.elements.cep.value = formatCep(address.cep || "");
  clientForm.elements.logradouro.value = address.logradouro || "";
  clientForm.elements.numero.value = address.numero || "";
  clientForm.elements.bairro.value = address.bairro || "";
  clientForm.elements.cidade.value = address.cidade || "Londrina";
  clientForm.elements.uf.value = address.uf || "PR";
  clientForm.elements.pmoc_ativo.checked = Boolean(client.pmoc_ativo);
  renderEngineerOptions(client.engenheiro_responsavel?.id || "");
  renderClientTeamOptions((client.equipes || []).map((equipe) => equipe.id));
  lastCepLookup = onlyDigits(address.cep || "");
  setClientCepStatus("");
  clientFormStatus.textContent = "Editando cliente selecionado.";
  selectedEquipmentClientId = client.id;
  clientesList.classList.add("hidden");
  backToClientsButton?.classList.remove("hidden");
  clientEquipmentPanel?.classList.remove("hidden");

  if (clientEquipmentTitle) {
    clientEquipmentTitle.textContent = \`Equipamentos de \${client.nome}\`;
  }

  equipmentFormStatus.textContent = "";
  void loadClientEquipments(client.id);
}

function resetClientForm() {
  clientForm.reset();
  clientForm.elements.id.value = "";
  clientForm.elements.cidade.value = "Londrina";
  clientForm.elements.uf.value = "PR";
  clientForm.elements.pmoc_ativo.checked = false;
  renderEngineerOptions("");
  renderClientTeamOptions([]);
  lastCepLookup = "";
  updateClientDocumentCopy();
  setClientCepStatus("");
  selectedEquipmentClientId = "";
  clientEquipmentPanel?.classList.add("hidden");
  backToClientsButton?.classList.add("hidden");
  clientesList.classList.remove("hidden");
  clientEquipmentList.innerHTML = "";
  clientFormStatus.textContent = "";
}

function fillTecnicoForm(tecnicoId) {
  const tecnico = latestTecnicos.find((item) => item.id === tecnicoId);

  if (!tecnico) {
    return;
  }

  tecnicoForm.elements.id.value = tecnico.id;
  tecnicoForm.elements.nome.value = tecnico.nome || "";
  tecnicoForm.elements.email.value = tecnico.email || "";
  tecnicoForm.elements.telefone.value = tecnico.telefone || "";
  tecnicoForm.elements.role.value = tecnico.role || "tecnico";
  tecnicoForm.elements.senha.value = "";
  tecnicoFormStatus.textContent = "Editando tecnico selecionado.";
}

function resetTecnicoForm() {
  tecnicoForm.reset();
  tecnicoForm.elements.id.value = "";
  tecnicoForm.elements.role.value = "tecnico";
  tecnicoFormStatus.textContent = "";
}

function fillEquipeForm(equipeId) {
  const equipe = latestEquipes.find((item) => item.id === equipeId);

  if (!equipe) {
    return;
  }

  equipeForm.elements.id.value = equipe.id;
  equipeForm.elements.nome.value = equipe.nome || "";
  renderEquipeClientOptions((equipe.clientes || []).map((cliente) => cliente.id));
  renderEquipeMembersList((equipe.membros || []).map((membro) => ({
    usuario_id: membro.usuario.id,
    funcao: membro.funcao
  })));
  equipeFormStatus.textContent = "Editando equipe selecionada.";
}

function resetEquipeForm() {
  equipeForm.reset();
  equipeForm.elements.id.value = "";
  renderEquipeClientOptions([]);
  renderEquipeMembersList([]);
  equipeFormStatus.textContent = "";
}

function fillEngineerForm(engineerId) {
  const engineer = latestEngineers.find((item) => item.id === engineerId);

  if (!engineer) {
    return;
  }

  engineerForm.elements.id.value = engineer.id;
  engineerForm.elements.nome.value = engineer.nome || "";
  engineerForm.elements.cpf.value = engineer.cpf || "";
  engineerForm.elements.crea.value = engineer.crea || "";
  engineerForm.elements.email.value = engineer.email || "";
  engineerForm.elements.telefone.value = engineer.telefone || "";
  engineerFormStatus.textContent = "Editando engenheiro selecionado.";
}

function resetEngineerForm() {
  engineerForm.reset();
  engineerForm.elements.id.value = "";
  engineerFormStatus.textContent = "";
}

async function deleteEngineer(engineerId) {
  const engineer = latestEngineers.find((item) => item.id === engineerId);
  const name = engineer?.nome || "este engenheiro";

  if (!window.confirm(\`Apagar \${name}? Clientes vinculados ficarao sem engenheiro responsavel.\`)) {
    return;
  }

  engenheirosStatus.textContent = "Apagando engenheiro...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/engenheiros/\${engineerId}\`, {
      method: "DELETE",
      headers: {
        Authorization: \`Bearer \${getToken()}\`
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Nao foi possivel apagar o engenheiro.");
    }

    if (engineerForm?.elements.id.value === engineerId) {
      resetEngineerForm();
    }

    engenheirosStatus.textContent = "Engenheiro apagado.";
    await loadEngenheiros();
    await loadClientes(false);
  } catch (error) {
    engenheirosStatus.textContent = error.message || "API indisponivel.";
  }
}

function openDeleteClientModal(clientId) {
  const client = latestClients.find((item) => item.id === clientId);

  if (!client || !deleteClientModal) {
    return;
  }

  clientPendingDeleteId = client.id;

  if (deleteClientMessage) {
    deleteClientMessage.textContent = \`Tem certeza que deseja apagar \${client.nome}? Esta acao nao pode ser desfeita.\`;
  }

  deleteClientModal.classList.remove("hidden");
  confirmDeleteClientButton?.focus();
}

function closeDeleteClientModal() {
  clientPendingDeleteId = "";
  deleteClientModal?.classList.add("hidden");
}
`;
