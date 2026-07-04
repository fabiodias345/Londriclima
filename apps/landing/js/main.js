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
  : Array.from(new Set([`${window.location.origin}/api/v1`, "http://191.252.226.11/api/v1"]));
const whatsappNumber = "5543999990000";

const testimonials = [
  {
    text: "A Clima do Brasil organizou nossa manutenção preventiva e nos entregou relatórios claros para auditoria.",
    author: "Gestor administrativo",
    role: "Cliente corporativo"
  },
  {
    text: "O atendimento técnico foi rápido, limpo e documentado. Hoje temos previsibilidade nos equipamentos.",
    author: "Coordenação de operações",
    role: "Empresa de Londrina"
  },
  {
    text: "A locação resolveu nossa demanda sem compra de equipamento e com manutenção incluída.",
    author: "Produtor de eventos",
    role: "Operação temporária"
  }
];

let testimonialIndex = 0;

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

function initRevealAnimation() {
  const elements = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  elements.forEach((element) => observer.observe(element));
}

function renderTestimonial() {
  const current = testimonials[testimonialIndex];
  const text = document.querySelector("[data-testimonial-text]");
  const author = document.querySelector("[data-testimonial-author]");
  const role = document.querySelector("[data-testimonial-role]");

  if (!current || !text || !author || !role) {
    return;
  }

  text.textContent = `"${current.text}"`;
  author.textContent = current.author;
  role.textContent = current.role;
}

function moveTestimonial(direction) {
  testimonialIndex = (testimonialIndex + direction + testimonials.length) % testimonials.length;
  renderTestimonial();
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function setBookingCepStatus(message, state = "") {
  if (!bookingCepStatus) {
    return;
  }

  bookingCepStatus.textContent = message;
  bookingCepStatus.dataset.state = state;
}

function buildLocalFromAddress(payload) {
  return [
    [payload.logradouro, payload.numero].filter(Boolean).join(", "),
    payload.complemento,
    payload.bairro,
    [payload.cidade, payload.uf].filter(Boolean).join("/")
  ]
    .filter(Boolean)
    .join(" - ");
}

function buildWhatsAppUrl(payload) {
  const lines = [
    "Olá, quero atendimento imediato pela Clima do Brasil.",
    `Nome: ${payload.nome}`,
    `Telefone: ${payload.telefone}`,
    `Serviço: ${payload.servico}`,
    `Endereço: ${payload.local}`,
    payload.detalhes ? `Detalhes: ${payload.detalhes}` : ""
  ].filter(Boolean);

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function openBookingSuccessModal(payload) {
  if (!bookingSuccessModal) {
    return;
  }

  if (bookingSuccessWhatsApp instanceof HTMLAnchorElement) {
    bookingSuccessWhatsApp.href = buildWhatsAppUrl(payload);
  }

  bookingSuccessModal.classList.add("is-open");
  bookingSuccessModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

async function postPreChamado(payload) {
  let lastError = new Error("Falha ao registrar pre-chamado.");

  for (const apiBaseUrl of apiBaseUrls) {
    try {
      const response = await fetch(`${apiBaseUrl}/site/pre-chamados`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return response;
      }

      lastError = new Error(`Falha ao registrar pre-chamado: ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
    }
  }

  throw lastError;
}

function closeBookingSuccessModal() {
  if (!bookingSuccessModal) {
    return;
  }

  bookingSuccessModal.classList.remove("is-open");
  bookingSuccessModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function lookupBookingCep() {
  const cepInput = form?.elements.cep;

  if (!(cepInput instanceof HTMLInputElement)) {
    return;
  }

  cepInput.value = formatCep(cepInput.value);
  const cep = onlyDigits(cepInput.value);

  if (!cep) {
    setBookingCepStatus("");
    return;
  }

  if (cep.length < 8) {
    setBookingCepStatus("Digite os 8 numeros do CEP.", "warning");
    return;
  }

  setBookingCepStatus("Buscando endereco pelo CEP...", "loading");

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (!response.ok) {
      throw new Error("cep_lookup_failed");
    }

    const address = await response.json();

    if (address.erro) {
      setBookingCepStatus("CEP nao encontrado. Preencha o endereco manualmente.", "warning");
      return;
    }

    form.elements.logradouro.value = address.logradouro || "";
    form.elements.bairro.value = address.bairro || "";
    form.elements.cidade.value = address.localidade || "Londrina";
    form.elements.uf.value = address.uf || "PR";
    setBookingCepStatus("Endereco preenchido pelo CEP. Informe apenas o numero.", "success");
    form.elements.numero?.focus();
  } catch {
    setBookingCepStatus("Nao foi possivel buscar o CEP agora. Preencha manualmente.", "warning");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const submitButton = form.querySelector("button[type='submit']");
  const email = String(data.get("email") || "").trim();
  const mensagem = String(data.get("mensagem") || "").trim();
  const addressPayload = {
    cep: onlyDigits(String(data.get("cep") || "")),
    logradouro: String(data.get("logradouro") || "").trim(),
    numero: String(data.get("numero") || "").trim(),
    complemento: String(data.get("complemento") || "").trim(),
    bairro: String(data.get("bairro") || "").trim(),
    cidade: String(data.get("cidade") || "").trim(),
    uf: String(data.get("uf") || "").trim().toUpperCase()
  };
  const payload = {
    nome: String(data.get("nome") || "").trim(),
    telefone: String(data.get("telefone") || "").trim(),
    servico: String(data.get("servico") || "").trim(),
    local: buildLocalFromAddress(addressPayload),
    ...addressPayload,
    detalhes: [email ? `Email: ${email}` : "", mensagem].filter(Boolean).join("\n")
  };

  status.className = "form-status";
  status.textContent = "Enviando solicitação...";
  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";

  try {
    const response = await postPreChamado(payload);
    const result = await response.json();
    status.classList.add("success");
    status.textContent = `${result.mensagem} Protocolo: ${result.pre_chamado_id.slice(0, 8)}.`;
    openBookingSuccessModal(payload);
    form.reset();
    setBookingCepStatus("");
  } catch {
    status.classList.add("error");
    status.textContent = "Nao foi possivel registrar a solicitacao agora. Tente novamente em instantes.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Enviar solicitação";
  }
});

menuToggle?.addEventListener("click", toggleMenu);
mainNav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    closeMenu();
  }
});
window.addEventListener("scroll", updateHeaderState, { passive: true });
document.querySelector("[data-testimonial-prev]")?.addEventListener("click", () => moveTestimonial(-1));
document.querySelector("[data-testimonial-next]")?.addEventListener("click", () => moveTestimonial(1));
bookingSuccessCloseButtons.forEach((button) => button.addEventListener("click", closeBookingSuccessModal));
form?.elements.cep?.addEventListener("input", (event) => {
  if (event.target instanceof HTMLInputElement) {
    event.target.value = formatCep(event.target.value);
  }
});
form?.elements.cep?.addEventListener("blur", lookupBookingCep);

setInterval(() => moveTestimonial(1), 7000);
updateHeaderState();
initRevealAnimation();
renderTestimonial();
