const localHosts = ["localhost", "127.0.0.1", ""];
const apiBaseUrl = localHosts.includes(window.location.hostname)
  ? "http://localhost:3000/api/v1"
  : "https://api.airmovebr.com.br/api/v1";

const params = new URLSearchParams(window.location.search);
const token = String(params.get("token") || "").trim();
const intro = document.querySelector("#pmocSignatureIntro");
const statusMessage = document.querySelector("#pmocSignatureStatus");
const confirmButton = document.querySelector("#pmocSignatureConfirmButton");
const signedPdfInput = document.querySelector("#pmocSignedPdfInput");
const resultPanel = document.querySelector("#pmocSignatureResultPanel");
const clientName = document.querySelector("#pmocSignatureClient");
const engineerMeta = document.querySelector("#pmocSignatureEngineer");
const reportStatus = document.querySelector("#pmocSignatureReportStatus");
const reportHash = document.querySelector("#pmocSignatureHash");

if (!token) {
  statusMessage.textContent = "Token de assinatura nao informado.";
} else {
  carregarAssinatura();
}

confirmButton?.addEventListener("click", async () => {
  const file = signedPdfInput?.files?.[0];

  if (!file) {
    statusMessage.textContent = "Selecione o PDF assinado no Gov.br.";
    return;
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    statusMessage.textContent = "Envie somente arquivo PDF.";
    return;
  }

  confirmButton.disabled = true;
  signedPdfInput.disabled = true;
  confirmButton.textContent = "Enviando...";
  statusMessage.textContent = "Enviando PDF assinado...";

  try {
    const pdfAssinadoBase64 = await lerArquivoBase64(file);
    const response = await fetch(`${apiBaseUrl}/site/pmoc/assinaturas/${encodeURIComponent(token)}/confirmar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pdf_assinado_base64: pdfAssinadoBase64,
        pdf_assinado_filename: file.name
      })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      statusMessage.textContent = result.message || "Nao foi possivel confirmar a assinatura.";
      confirmButton.disabled = false;
      signedPdfInput.disabled = false;
      confirmButton.textContent = "Enviar PDF assinado";
      return;
    }

    statusMessage.textContent = result.email_agendado
      ? "Assinatura registrada e envio ao cliente agendado."
      : "Assinatura registrada.";
    confirmButton.textContent = "PDF assinado enviado";
    renderAssinatura(result);
  } catch {
    statusMessage.textContent = "API indisponivel. Tente novamente em instantes.";
    confirmButton.disabled = false;
    signedPdfInput.disabled = false;
    confirmButton.textContent = "Enviar PDF assinado";
  }
});

async function carregarAssinatura() {
  statusMessage.textContent = "Consultando relatorio PMOC...";

  try {
    const response = await fetch(`${apiBaseUrl}/site/pmoc/assinaturas/${encodeURIComponent(token)}`);
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      statusMessage.textContent = result.message || "Relatorio PMOC nao encontrado.";
      return;
    }

    renderAssinatura(result);
    statusMessage.textContent = "";
    confirmButton.disabled = result.status === "assinado";
    signedPdfInput.disabled = result.status === "assinado";
    confirmButton.textContent = result.status === "assinado" ? "PDF assinado enviado" : "Enviar PDF assinado";
  } catch {
    statusMessage.textContent = "API indisponivel. Tente novamente em instantes.";
  }
}

function renderAssinatura(result) {
  intro.textContent = result.status === "assinado"
    ? "Este relatorio PMOC ja foi assinado."
    : "Baixe o PDF recebido por e-mail, assine no Gov.br e envie o arquivo assinado nesta pagina.";
  clientName.textContent = result.cliente?.nome || "Cliente";
  engineerMeta.textContent = [
    result.engenheiro_responsavel?.nome,
    result.engenheiro_responsavel?.crea
  ].filter(Boolean).join(" - ");
  reportStatus.textContent = formatStatus(result.status);
  reportHash.textContent = result.pdf_hash ? `Hash PDF: ${result.pdf_hash}` : "Hash PDF indisponivel";
  resultPanel.classList.remove("hidden");
}

function lerArquivoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.replace(/^data:application\/pdf;base64,/i, ""));
    };
    reader.onerror = () => reject(new Error("Falha ao ler PDF."));
    reader.readAsDataURL(file);
  });
}

function formatStatus(statusValue) {
  const labels = {
    gerado: "Gerado",
    aguardando_assinatura_engenheiro: "Aguardando assinatura",
    assinado: "Assinado",
    cancelado: "Cancelado"
  };

  return labels[statusValue] || statusValue || "-";
}
