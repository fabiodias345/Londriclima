const form = document.querySelector("#bookingForm");
const status = document.querySelector("#formStatus");
const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mainNav = document.querySelector("[data-main-nav]");
const bookingSuccessModal = document.querySelector("#bookingSuccessModal");
const bookingSuccessWhatsApp = document.querySelector("#bookingSuccessWhatsApp");
const bookingSuccessCloseButtons = document.querySelectorAll("[data-booking-success-close]");
const pmocInfoModal = document.querySelector("#pmocInfoModal");
const pmocInfoOpenButton = document.querySelector("[data-pmoc-info-open]");
const pmocInfoCloseButtons = document.querySelectorAll("[data-pmoc-info-close]");
const localHosts = ["localhost", "127.0.0.1", ""];
const apiBaseUrls = localHosts.includes(window.location.hostname)
  ? ["http://localhost:3000/api/v1"]
  : ["https://api.airmovebr.com.br/api/v1"];
const whatsappNumber = "554330673793";

function buildWhatsAppUrl(payload) {
  const lines = [
    "Olá, quero atendimento pela AIRMOVEBR.",
    `Nome: ${payload.nome}`,
    `Telefone: ${payload.telefone}`,
    `Serviço: ${payload.servico}`,
    `Cidade: ${payload.cidade}`,
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

function setPmocInfoModal(isOpen) {
  if (!pmocInfoModal) return;
  pmocInfoModal.classList.toggle("is-open", isOpen);
  pmocInfoModal.setAttribute("aria-hidden", String(!isOpen));
  document.body.classList.toggle("modal-open", isOpen);
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

  const cidade = String(data.get("cidade") || "").trim();
  const payload = {
    nome: String(data.get("nome") || "").trim(),
    telefone: String(data.get("telefone") || "").trim(),
    servico: String(data.get("servico") || "").trim(),
    local: cidade ? `Cidade: ${cidade}` : "A definir no atendimento",
    cidade,
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
pmocInfoOpenButton?.addEventListener("click", () => setPmocInfoModal(true));
pmocInfoCloseButtons.forEach((button) => button.addEventListener("click", () => setPmocInfoModal(false)));
window.addEventListener("scroll", updateHeaderState, { passive: true });
updateHeaderState();
