const form = document.querySelector("#bookingForm");
const status = document.querySelector("#formStatus");
const apiUrl = "http://localhost:3000/api/v1/site/pre-chamados";

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const payload = {
    nome: String(data.get("nome") || ""),
    telefone: String(data.get("telefone") || ""),
    servico: String(data.get("servico") || ""),
    local: String(data.get("local") || ""),
    detalhes: String(data.get("detalhes") || "")
  };

  status.textContent = "Enviando solicitacao...";

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
    status.textContent = `${result.mensagem} Protocolo: ${result.pre_chamado_id.slice(0, 8)}.`;
    form.reset();
  } catch {
    status.textContent =
      "Solicitacao simulada para apresentacao. Com a API ligada, ela vira pre-chamado no painel.";
  }
});
