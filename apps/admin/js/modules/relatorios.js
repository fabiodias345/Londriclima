export const relatoriosModule = {
  view: "relatorios",
  summaryId: "relatoriosSummary",
  viewId: "relatoriosView"
};

export const relatoriosRoot = `
    recurrenceFormStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
  }
}

async function submitClient(event) {
  event.preventDefault();
  const button = clientForm.querySelector("button[type='submit']");
  const data = new FormData(clientForm);
  const clientId = String(data.get("id") || "");
  const tipo = String(data.get("tipo") || "pf");
  const telefone = onlyDigits(String(data.get("telefone") || ""));
  const rawDocumento = String(data.get("documento") || "").trim();
  const documento = tipo === "pj" ? onlyDigits(rawDocumento) : rawDocumento;
  const validationMessage = validateClientIdentity(tipo, telefone, documento);

  if (validationMessage) {
    clientFormStatus.textContent = validationMessage;
    return;
  }

  const payload = removeEmptyValues({
    tipo,
    nome: String(data.get("nome") || ""),
    telefone,
    email: String(data.get("email") || ""),
    documento,
    pmoc_ativo: data.get("pmoc_ativo") === "on",
    pmoc_art_numero: data.get("pmoc_ativo") === "on" ? String(data.get("pmoc_art_numero") || "") : "",
    engenheiro_responsavel_id: data.get("pmoc_ativo") === "on" ? String(data.get("engenheiro_responsavel_id") || "") : "",
    tecnico_responsavel_id: String(data.get("tecnico_responsavel_id") || ""),
    equipe_ids: data.getAll("equipe_ids").map(String).filter(Boolean),
    cep: onlyDigits(String(data.get("cep") || "")),
    logradouro: String(data.get("logradouro") || ""),
    numero: String(data.get("numero") || ""),
    bairro: String(data.get("bairro") || ""),
    cidade: String(data.get("cidade") || ""),
    uf: String(data.get("uf") || "").toUpperCase()
  });

  button.disabled = true;
  button.textContent = "Salvando...";
  clientFormStatus.textContent = "";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/clientes\${clientId ? \`/\${clientId}\` : ""}\`, {
      method: clientId ? "PATCH" : "POST",
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
      clientFormStatus.textContent = error.message || "Nao foi possivel salvar o cliente.";
      return;
    }

    resetClientForm();
    clientFormStatus.textContent = "Cliente salvo.";
    await loadClientes();
  } catch {
    clientFormStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = "Salvar cliente";
  }
}

async function submitTecnico(event) {
  event.preventDefault();
  const button = tecnicoForm.querySelector("button[type='submit']");
  const data = new FormData(tecnicoForm);
  const tecnicoId = String(data.get("id") || "");
  const payload = removeEmptyValues({
    nome: String(data.get("nome") || ""),
    email: String(data.get("email") || ""),
    telefone: onlyDigits(String(data.get("telefone") || "")),
    role: String(data.get("role") || "tecnico"),
    senha: String(data.get("senha") || "")
  });

  button.disabled = true;
  button.textContent = "Salvando...";
  tecnicoFormStatus.textContent = "";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/tecnicos\${tecnicoId ? \`/\${tecnicoId}\` : ""}\`, {
      method: tecnicoId ? "PATCH" : "POST",
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
      tecnicoFormStatus.textContent = error.message || "Nao foi possivel salvar o tecnico.";
      return;
    }

    resetTecnicoForm();
    tecnicoFormStatus.textContent = "Tecnico salvo.";
    await loadTecnicos();
  } catch {
    tecnicoFormStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = "Salvar tecnico";
  }
}

async function submitEquipe(event) {
  event.preventDefault();
  const button = equipeForm.querySelector("button[type='submit']");
  const data = new FormData(equipeForm);
  const equipeId = String(data.get("id") || "");
  const membros = data.getAll("membro_usuario_id").map(String).map((usuarioId) => ({
    usuario_id: usuarioId,
    funcao: String(data.get(\`membro_funcao_\${usuarioId}\`) || "tecnico")
  }));
  const payload = {
    nome: String(data.get("nome") || ""),
    cliente_ids: data.getAll("cliente_ids").map(String).filter(Boolean),
    membros
  };

  button.disabled = true;
  button.textContent = "Salvando...";
  equipeFormStatus.textContent = "";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/equipes\${equipeId ? \`/\${equipeId}\` : ""}\`, {
      method: equipeId ? "PATCH" : "POST",
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
      equipeFormStatus.textContent = error.message || "Nao foi possivel salvar a equipe.";
      return;
    }

    resetEquipeForm();
    equipeFormStatus.textContent = "Equipe salva.";
    await loadEquipes();
  } catch {
    equipeFormStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = "Salvar equipe";
  }
}

async function submitEmpresa(event) {
  event.preventDefault();
  const button = empresaForm.querySelector("button[type='submit']");
  const data = new FormData(empresaForm);
  const payload = removeEmptyValues({
    razao_social: String(data.get("razao_social") || ""),
    nome_fantasia: String(data.get("nome_fantasia") || ""),
    cnpj: onlyDigits(String(data.get("cnpj") || "")),
    email: String(data.get("email") || ""),
    telefone: onlyDigits(String(data.get("telefone") || "")),
    status: String(data.get("status") || "ativa"),
    cep: onlyDigits(String(data.get("cep") || "")),
    logradouro: String(data.get("logradouro") || ""),
    numero: String(data.get("numero") || ""),
    complemento: String(data.get("complemento") || ""),
    bairro: String(data.get("bairro") || ""),
    cidade: String(data.get("cidade") || ""),
    uf: String(data.get("uf") || "").toUpperCase(),
    inscricao_estadual: String(data.get("inscricao_estadual") || ""),
    inscricao_municipal: String(data.get("inscricao_municipal") || ""),
    responsavel_legal: String(data.get("responsavel_legal") || ""),
    responsavel_cpf: onlyDigits(String(data.get("responsavel_cpf") || "")),
    contato_principal: String(data.get("contato_principal") || ""),
    contato_cargo: String(data.get("contato_cargo") || ""),
    observacoes: String(data.get("observacoes") || "")
  });

  button.disabled = true;
  button.textContent = "Salvando...";
  empresaFormStatus.textContent = "";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/empresa\`, {
      method: "PATCH",
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
      empresaFormStatus.textContent = error.message || "Nao foi possivel salvar a empresa.";
      return;
    }

    empresaFormStatus.textContent = "Empresa salva.";
    await loadEmpresa();
  } catch {
    empresaFormStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = "Salvar empresa";
  }
}

async function submitEngineer(event) {
  event.preventDefault();

  const button = engineerForm.querySelector("button[type='submit']");
  const data = new FormData(engineerForm);
  const engineerId = String(data.get("id") || "");
  const payload = removeEmptyValues({
    nome: String(data.get("nome") || ""),
    cpf: onlyDigits(String(data.get("cpf") || "")),
    crea: String(data.get("crea") || ""),
    email: String(data.get("email") || ""),
    telefone: onlyDigits(String(data.get("telefone") || ""))
  });

  button.disabled = true;
  button.textContent = "Salvando...";
  engineerFormStatus.textContent = "";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/engenheiros\${engineerId ? \`/\${engineerId}\` : ""}\`, {
      method: engineerId ? "PATCH" : "POST",
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
      engineerFormStatus.textContent = error.message || "Nao foi possivel salvar o engenheiro.";
      return;
    }

    resetEngineerForm();
    engineerFormStatus.textContent = "Engenheiro salvo.";
    await loadEngenheiros();
  } catch {
    engineerFormStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = "Salvar engenheiro";
  }
}

async function submitEquipment(event) {
  event.preventDefault();

  if (!selectedEquipmentClientId) {
    equipmentFormStatus.textContent = "Selecione um cliente antes de cadastrar equipamento.";
    return;
  }

  const button = equipmentForm.querySelector("button[type='submit']");
  const data = new FormData(equipmentForm);
  const payload = removeEmptyValues({
    tipo: String(data.get("tipo") || ""),
    patrimonio: String(data.get("patrimonio") || ""),
    codigo_barras: String(data.get("codigo_barras") || ""),
    marca: String(data.get("marca") || ""),
    modelo: String(data.get("modelo") || ""),
    capacidade_btu: data.get("capacidade_btu") ? Number(data.get("capacidade_btu")) : "",
    gas_refrigerante: String(data.get("gas_refrigerante") || ""),
    numero_serie: String(data.get("numero_serie") || ""),
    local_instalacao: String(data.get("local_instalacao") || ""),
    acesso_publico_ativo: data.get("acesso_publico_ativo") === "on"
  });

  button.disabled = true;
  button.textContent = "Salvando...";
  equipmentFormStatus.textContent = "";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/clientes/\${selectedEquipmentClientId}/equipamentos\`, {
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

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      equipmentFormStatus.textContent = result.message || "Nao foi possivel salvar o equipamento.";
      return;
    }

    equipmentForm.reset();
    equipmentForm.elements.acesso_publico_ativo.checked = true;
    equipmentFormStatus.textContent = \`Equipamento salvo. Senha do cliente: \${result.senha_publica}\`;
    await loadClientEquipments(selectedEquipmentClientId);
    await loadClientes();
  } catch {
    equipmentFormStatus.textContent = "API indisponivel.";
  } finally {
    button.disabled = false;
    button.textContent = "Salvar equipamento";
  }
}

async function renewEquipmentAccess(equipmentId) {
  if (!equipmentId) {
    return;
  }

  equipmentFormStatus.textContent = "Gerando nova senha...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/equipamentos/\${equipmentId}/renovar-acesso\`, {
      method: "POST",
      headers: authHeaders()
    });

    if (await handleUnauthorized(response)) {
      return;
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      equipmentFormStatus.textContent = result.message || "Nao foi possivel gerar nova senha.";
      return;
    }

    equipmentFormStatus.textContent = \`Nova senha do cliente: \${result.senha_publica}\`;
    await loadClientEquipments(selectedEquipmentClientId);
  } catch {
    equipmentFormStatus.textContent = "API indisponivel.";
  }
}

async function deleteEquipment(equipmentId) {
  if (!equipmentId || !selectedEquipmentClientId) {
    return;
  }

  if (!window.confirm("Apagar esta maquina e todo o historico de OS vinculado a ela?")) {
    return;
  }

  equipmentFormStatus.textContent = "Apagando equipamento...";

  try {
    const response = await fetch(\`\${apiBaseUrl}/admin/equipamentos/\${equipmentId}\`, {
      method: "DELETE",
      headers: authHeaders()
    });
`;
