const localHosts = ["localhost", "127.0.0.1", ""];
const apiBaseUrl = localHosts.includes(window.location.hostname)
  ? "http://localhost:3000/api/v1"
  : "https://api.airmovebr.com.br/api/v1";

const form = document.querySelector("#equipmentAccessForm");
const status = document.querySelector("#equipmentAccessStatus");
const codeInput = document.querySelector("#equipmentCodeInput");
const resultPanel = document.querySelector("#equipmentResultPanel");
const resultTitle = document.querySelector("#equipmentResultTitle");
const resultMeta = document.querySelector("#equipmentResultMeta");
const maintenanceStatus = document.querySelector("#equipmentMaintenanceStatus");
const maintenanceDate = document.querySelector("#equipmentMaintenanceDate");
const historyList = document.querySelector("#equipmentHistoryList");

const params = new URLSearchParams(window.location.search);
const initialCode = params.get("codigo") || "";

if (initialCode) {
  codeInput.value = initialCode;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const codigo = String(data.get("codigo") || "").trim();
  const senha = String(data.get("senha") || "").trim();
  const button = form.querySelector("button[type='submit']");

  status.textContent = "Consultando equipamento...";
  button.disabled = true;
  button.textContent = "Consultando...";

  try {
    const response = await fetch(`${apiBaseUrl}/site/equipamentos/${encodeURIComponent(codigo)}/acessar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        senha
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      status.textContent = result.message || "Nao foi possivel consultar este equipamento.";
      resultPanel.classList.add("hidden");
      return;
    }

    status.textContent = "";
    renderEquipment(result);
  } catch {
    status.textContent = "API indisponivel. Tente novamente em instantes.";
  } finally {
    button.disabled = false;
    button.textContent = "Consultar";
  }
});

function renderEquipment(result) {
  const equipment = result.equipamento || {};
  const maintenance = result.manutencao || {};
  const title = [equipment.tipo, equipment.marca, equipment.modelo].filter(Boolean).join(" ");

  resultTitle.textContent = title || "Equipamento";
  resultMeta.textContent = [
    result.cliente?.nome,
    equipment.local_instalacao,
    equipment.numero_serie ? `Serie ${equipment.numero_serie}` : ""
  ]
    .filter(Boolean)
    .join(" · ");
  maintenanceStatus.textContent = formatStatus(maintenance.status || "sem_historico");
  maintenanceDate.textContent = maintenance.ultima_atualizacao
    ? `Ultima atualizacao: ${formatDate(maintenance.ultima_atualizacao)}`
    : "Ainda sem manutencoes registradas.";

  historyList.innerHTML = "";

  if (!result.historico?.length) {
    historyList.innerHTML = '<article class="history-row"><strong>Sem historico liberado.</strong><span>As manutencoes futuras aparecerao aqui.</span></article>';
  } else {
    for (const item of result.historico) {
      const row = document.createElement("article");
      row.className = "history-row";
      row.innerHTML = `
        <strong>${escapeHtml(item.titulo || "Manutencao")}</strong>
        <span>${escapeHtml(formatStatus(item.status))} · ${escapeHtml(formatDate(item.atualizada_em))}</span>
      `;
      historyList.appendChild(row);
    }
  }

  resultPanel.classList.remove("hidden");
}

function formatStatus(statusValue) {
  const labels = {
    pre_chamado: "Pre-chamado",
    rejeitada: "Rejeitada",
    aberta: "Aberta",
    em_deslocamento: "Tecnico em deslocamento",
    em_atendimento: "Em atendimento",
    cancelada: "Cancelada",
    concluida: "Concluida",
    sem_historico: "Sem historico"
  };

  return labels[statusValue] || statusValue || "-";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
