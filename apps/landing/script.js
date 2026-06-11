const form = document.querySelector("#bookingForm");
const status = document.querySelector("#formStatus");
const localHosts = ["localhost", "127.0.0.1", ""];
const apiBaseUrl = localHosts.includes(window.location.hostname)
  ? "http://localhost:3000/api/v1"
  : "https://api.airmovebr.com.br/api/v1";
const apiUrl = `${apiBaseUrl}/site/pre-chamados`;

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const submitButton = form.querySelector("button[type='submit']");
  const payload = {
    nome: String(data.get("nome") || ""),
    telefone: String(data.get("telefone") || ""),
    servico: String(data.get("servico") || ""),
    local: String(data.get("local") || ""),
    detalhes: String(data.get("detalhes") || "")
  };

  status.className = "form-status";
  status.textContent = "Enviando solicitacao...";
  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Falha ao registrar pre-chamado.");
    }

    const result = await response.json();
    status.classList.add("success");
    status.textContent = `${result.mensagem} Protocolo: ${result.pre_chamado_id.slice(0, 8)}.`;
    form.reset();
  } catch {
    status.classList.add("error");
    status.textContent = "Nao foi possivel conectar na API. Tente novamente em instantes.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Enviar pre-chamado";
  }
});
