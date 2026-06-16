const form = document.querySelector("#bookingForm");
const status = document.querySelector("#formStatus");
const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mainNav = document.querySelector("[data-main-nav]");
const localHosts = ["localhost", "127.0.0.1", ""];
const apiBaseUrl = localHosts.includes(window.location.hostname)
  ? "http://localhost:3000/api/v1"
  : "https://api.airmovebr.com.br/api/v1";
const apiUrl = `${apiBaseUrl}/site/pre-chamados`;
const whatsappNumber = "5543999990000";

const testimonials = [
  {
    text: "A AIRMOVEBR organizou nossa manutenção preventiva e nos entregou relatórios claros para auditoria.",
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

function buildWhatsAppMessage(payload) {
  const lines = [
    "Olá, quero agendar uma visita técnica pela AIRMOVEBR.",
    `Nome: ${payload.nome}`,
    `Telefone: ${payload.telefone}`,
    `Serviço: ${payload.servico}`,
    `Local: ${payload.local}`,
    payload.email ? `Email: ${payload.email}` : "",
    payload.mensagem ? `Mensagem: ${payload.mensagem}` : ""
  ].filter(Boolean);

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const submitButton = form.querySelector("button[type='submit']");
  const email = String(data.get("email") || "").trim();
  const mensagem = String(data.get("mensagem") || "").trim();
  const payload = {
    nome: String(data.get("nome") || "").trim(),
    telefone: String(data.get("telefone") || "").trim(),
    servico: String(data.get("servico") || "").trim(),
    local: String(data.get("local") || "").trim(),
    detalhes: [email ? `Email: ${email}` : "", mensagem].filter(Boolean).join("\n")
  };

  status.className = "form-status";
  status.textContent = "Enviando solicitação...";
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
    const whatsappUrl = buildWhatsAppMessage({
      ...payload,
      email,
      mensagem
    });
    status.classList.add("error");
    status.innerHTML = `Não foi possível conectar na API. <a href="${whatsappUrl}" target="_blank" rel="noreferrer">Enviar pelo WhatsApp</a>.`;
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

setInterval(() => moveTestimonial(1), 7000);
updateHeaderState();
initRevealAnimation();
renderTestimonial();
