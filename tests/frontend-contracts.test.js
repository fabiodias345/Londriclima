const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("landing envia pre-chamado publico para a API com JSON", () => {
  const script = read("apps/landing/script.js");

  assert.match(script, /http:\/\/localhost:3000\/api\/v1\/site\/pre-chamados/);
  assert.match(script, /method:\s*"POST"/);
  assert.match(script, /"Content-Type":\s*"application\/json"/);
  assert.match(script, /nome:\s*String\(data\.get\("nome"\)/);
  assert.match(script, /telefone:\s*String\(data\.get\("telefone"\)/);
  assert.match(script, /servico:\s*String\(data\.get\("servico"\)/);
  assert.match(script, /local:\s*String\(data\.get\("local"\)/);
});

test("admin autentica, guarda token e protege chamadas administrativas", () => {
  const script = read("apps/admin/script.js");

  assert.match(script, /const apiBaseUrl = "http:\/\/localhost:3000\/api\/v1"/);
  assert.match(script, /\/auth\/login/);
  assert.match(script, /localStorage\.setItem\("londriclima_access_token"/);
  assert.match(script, /Authorization:\s*`Bearer \$\{getToken\(\)\}`/);
  assert.match(script, /\/admin\/pre-chamados/);
  assert.match(script, /\/admin\/frota\/localizacoes/);
  assert.match(script, /\/admin\/agenda/);
  assert.match(script, /\/admin\/clientes/);
  assert.match(script, /\/admin\/relatorios/);
  assert.match(script, /\/admin\/frota\/abastecimentos/);
  assert.match(script, /\/admin\/relatorios\/frota/);
  assert.match(script, /response\.status !== 401/);
});

test("admin possui views funcionais para agenda clientes e relatorios", () => {
  const html = read("apps/admin/index.html");
  const script = read("apps/admin/script.js");

  assert.match(html, /data-view="agenda"/);
  assert.match(html, /data-view="clientes"/);
  assert.match(html, /data-view="relatorios"/);
  assert.match(html, /id="agendaView"/);
  assert.match(html, /id="clientesView"/);
  assert.match(html, /id="relatoriosView"/);
  assert.match(script, /async function loadAgenda/);
  assert.match(script, /async function loadClientes/);
  assert.match(script, /async function loadRelatorios/);
});

test("admin possui lancamento e relatorio de abastecimento da frota", () => {
  const html = read("apps/admin/index.html");
  const script = read("apps/admin/script.js");

  assert.match(html, /id="fuelForm"/);
  assert.match(html, /name="odometro_km"/);
  assert.match(html, /name="litros"/);
  assert.match(html, /name="valor_total"/);
  assert.match(html, /id="fleetReportList"/);
  assert.match(script, /async function submitFuel/);
  assert.match(script, /async function loadRelatorioFrota/);
});

test("admin usa OpenStreetMap com fallback operacional local para a frota", () => {
  const html = read("apps/admin/index.html");
  const script = read("apps/admin/script.js");
  const styles = read("apps/admin/styles.css");

  assert.doesNotMatch(html, /leaflet/i);
  assert.doesNotMatch(script, /tile\.openstreetmap\.org|L\.map|L\.marker/);
  assert.match(html, /openstreetmap\.org\/export\/embed\.html/);
  assert.match(script, /toMapPosition\(location\.latitude, location\.longitude\)/);
  assert.match(styles, /\.osm-map/);
  assert.match(styles, /\.map-grid/);
  assert.match(styles, /\.vehicle-marker/);
});
