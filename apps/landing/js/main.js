const form = document.querySelector("#bookingForm");
const status = document.querySelector("#formStatus");
const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mainNav = document.querySelector("[data-main-nav]");
const bookingCepStatus = document.querySelector("#bookingCepStatus");
const bookingSuccessModal = document.querySelector("#bookingSuccessModal");
const bookingSuccessWhatsApp = document.querySelector("#bookingSuccessWhatsApp");
const bookingSuccessCloseButtons = document.querySelectorAll("[data-booking-success-close]");
const localHosts = ["localhost", "127.0.0.1", ""];
const apiBaseUrls = localHosts.includes(window.location.hostname)
  ? ["http://localhost:3000/api/v1"]
  : ["https://api.airmovebr.com.br/api/v1"];
const whatsappNumber = "554330673793";

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function setBookingCepStatus(message, state = "") {
  if (!bookingCepStatus) return;
  bookingCepStatus.textContent = message;
  bookingCepStatus.dataset.state = state;
}

function buildLocalFromAddress(payload) {
  return [
    [payload.logradouro, payload.numero].filter(Boolean).join(", "),
    payload.bairro,
    [payload.cidade, payload.uf].filter(Boolean).join("/")
  ]
    .filter(Boolean)
    .join(" - ");
}

function buildWhatsAppUrl(payload) {
  const lines = [
    "Olá, quero atendimento pela AIRMOVEBR.",
    `Nome: ${payload.nome}`,
    `Telefone: ${payload.telefone}`,
    `Serviço: ${payload.servico}`,
    `Endereço: ${payload.local}`,
    payload.detalhes ? `Detalhes: ${payload.detalhes}` : ""
  ].filter(Boolean);
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  mainNav?.classList.remove("is-open");
  menuToggle?.setAttribute("aria-expanded", "false");
}

function toggleMenu() {
  const isOpen = mainNav?.classList.toggle("is-open");
  document.body.classList.toggle("menu-open", Boolean(isOpen));
  menuToggle?.setAttribute("aria-expanded", String(Boolean(isOpen)));
}

function updateHeaderState() {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
}

function openBookingSuccessModal(payload) {
  if (!bookingSuccessModal) return;
  if (bookingSuccessWhatsApp instanceof HTMLAnchorElement) {
    bookingSuccessWhatsApp.href = buildWhatsAppUrl(payload);
  }
  bookingSuccessModal.classList.add("is-open");
  bookingSuccessModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeBookingSuccessModal() {
  if (!bookingSuccessModal) return;
  bookingSuccessModal.classList.remove("is-open");
  bookingSuccessModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function lookupBookingCep() {
  const cepInput = form?.elements.cep;
  if (!(cepInput instanceof HTMLInputElement)) return;

  cepInput.value = formatCep(cepInput.value);
  const cep = onlyDigits(cepInput.value);
  if (!cep) return setBookingCepStatus("");
  if (cep.length < 8) return setBookingCepStatus("Digite os 8 números do CEP.", "warning");

  setBookingCepStatus("Buscando endereço pelo CEP...", "loading");
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const address = response.ok ? await response.json() : { erro: true };
    if (address.erro) throw new Error("cep_not_found");
    form.elements.logradouro.value = address.logradouro || "";
    form.elements.bairro.value = address.bairro || "";
    form.elements.cidade.value = address.localidade || "Londrina";
    form.elements.uf.value = address.uf || "PR";
    setBookingCepStatus("Endereço preenchido. Informe apenas o número.", "success");
    form.elements.numero?.focus();
  } catch {
    setBookingCepStatus("CEP não encontrado. Preencha o endereço manualmente.", "warning");
  }
}

async function postPreChamado(payload) {
  const response = await fetch(`${apiBaseUrls[0]}/site/pre-chamados`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`pre_chamado_${response.status}`);
  return response;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const submitButton = form.querySelector("button[type='submit']");
  if (!(submitButton instanceof HTMLButtonElement) || !status) return;

  const addressPayload = {
    cep: onlyDigits(String(data.get("cep") || "")),
    logradouro: String(data.get("logradouro") || "").trim(),
    numero: String(data.get("numero") || "").trim(),
    bairro: String(data.get("bairro") || "").trim(),
    cidade: String(data.get("cidade") || "").trim(),
    uf: String(data.get("uf") || "").trim().toUpperCase()
  };
  const payload = {
    nome: String(data.get("nome") || "").trim(),
    telefone: String(data.get("telefone") || "").trim(),
    servico: String(data.get("servico") || "").trim(),
    local: buildLocalFromAddress(addressPayload) || "A definir no atendimento",
    ...addressPayload,
    detalhes: String(data.get("mensagem") || "").trim()
  };

  status.className = "form-status";
  status.textContent = "Enviando solicitação...";
  submitButton.disabled = true;
  try {
    const response = await postPreChamado(payload);
    const result = await response.json();
    status.classList.add("success");
    status.textContent = `${result.mensagem} Protocolo: ${result.pre_chamado_id.slice(0, 8)}.`;
    openBookingSuccessModal(payload);
    form.reset();
    form.elements.cidade.value = "Londrina";
    form.elements.uf.value = "PR";
    setBookingCepStatus("");
  } catch {
    status.classList.add("error");
    status.textContent = "Não foi possível registrar a solicitação agora. Tente novamente ou fale pelo WhatsApp.";
  } finally {
    submitButton.disabled = false;
  }
});

menuToggle?.addEventListener("click", toggleMenu);
mainNav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) closeMenu();
});
bookingSuccessCloseButtons.forEach((button) => button.addEventListener("click", closeBookingSuccessModal));
form?.elements.cep?.addEventListener("input", (event) => {
  if (event.target instanceof HTMLInputElement) event.target.value = formatCep(event.target.value);
});
form?.elements.cep?.addEventListener("blur", lookupBookingCep);
window.addEventListener("scroll", updateHeaderState, { passive: true });
updateHeaderState();
