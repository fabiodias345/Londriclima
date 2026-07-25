export const sessionModule = { view: "session", summaryId: "", viewId: "" };

export const sessionRoot = `
const SESSION_SUSPENSION_LIMIT_MS = 15 * 60 * 1000;
const SESSION_REFRESH_MARGIN_MS = 3 * 60 * 1000;
const SESSION_CHECK_INTERVAL_MS = 60 * 1000;
let sessionRefreshTimer = 0;
let sessionRefreshInFlight = null;

function getToken() { return localStorage.getItem("airmovebr_access_token"); }
function getRefreshToken() { return localStorage.getItem("airmovebr_refresh_token"); }
function setToken(token) { localStorage.setItem("airmovebr_access_token", token); }
function clearToken() {
  localStorage.removeItem("airmovebr_access_token");
  localStorage.removeItem("airmovebr_refresh_token");
  localStorage.removeItem("airmovebr_session_suspended_at");
  if (sessionRefreshTimer) window.clearInterval(sessionRefreshTimer);
  sessionRefreshTimer = 0;
}
function authHeaders() { return { Authorization: \`Bearer \${getToken()}\` }; }
function expiracaoToken() {
  try { return JSON.parse(atob(String(getToken() || "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000; } catch { return 0; }
}
function aplicarSessao(resultado) {
  setToken(resultado.access_token);
  localStorage.setItem("airmovebr_refresh_token", resultado.refresh_token);
  localStorage.removeItem("airmovebr_session_suspended_at");
  sincronizarRenovacaoSessao();
}
async function renovarSessaoVisivel() {
  if (document.hidden || !getRefreshToken()) return false;
  if (sessionRefreshInFlight) return sessionRefreshInFlight;
  sessionRefreshInFlight = fetch(\`\${apiBaseUrl}/auth/refresh\`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: getRefreshToken() }) })
    .then(async (response) => {
      if (!response.ok) throw new Error("refresh invalido");
      aplicarSessao(await response.json());
      return true;
    })
    .catch(() => false)
    .finally(() => { sessionRefreshInFlight = null; });
  return sessionRefreshInFlight;
}
function encerrarSessaoSuspensa() {
  clearToken();
  showLogin();
  loginStatus.textContent = "Sessão expirada após 15 minutos com a tela em suspensão.";
}
async function verificarSessaoVisivel() {
  if (!getToken() || document.hidden) return;
  if (expiracaoToken() - Date.now() <= SESSION_REFRESH_MARGIN_MS && !(await renovarSessaoVisivel())) encerrarSessaoSuspensa();
}
function sincronizarRenovacaoSessao() {
  if (sessionRefreshTimer) window.clearInterval(sessionRefreshTimer);
  if (!getToken()) return;
  sessionRefreshTimer = window.setInterval(() => void verificarSessaoVisivel(), SESSION_CHECK_INTERVAL_MS);
}
["pointerdown", "keydown", "input", "focusin"].forEach((type) => document.addEventListener(type, () => void verificarSessaoVisivel(), true));
document.addEventListener("visibilitychange", () => {
  if (!getToken()) return;
  if (document.hidden) { localStorage.setItem("airmovebr_session_suspended_at", String(Date.now())); return; }
  const suspendedAt = Number(localStorage.getItem("airmovebr_session_suspended_at") || 0);
  localStorage.removeItem("airmovebr_session_suspended_at");
  if (suspendedAt && Date.now() - suspendedAt >= SESSION_SUSPENSION_LIMIT_MS) { encerrarSessaoSuspensa(); return; }
  void verificarSessaoVisivel();
});
sincronizarRenovacaoSessao();
`;