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

  assert.match(script, /http:\/\/localhost:3000\/api\/v1/);
  assert.match(script, /https:\/\/api\.airmovebr\.com\.br\/api\/v1/);
  assert.match(script, /const apiUrl = `\$\{apiBaseUrl\}\/site\/pre-chamados`/);
  assert.match(script, /method:\s*"POST"/);
  assert.match(script, /"Content-Type":\s*"application\/json"/);
  assert.match(script, /nome:\s*String\(data\.get\("nome"\)/);
  assert.match(script, /telefone:\s*String\(data\.get\("telefone"\)/);
  assert.match(script, /servico:\s*String\(data\.get\("servico"\)/);
  assert.match(script, /local:\s*String\(data\.get\("local"\)/);
});

test("admin autentica, guarda token e protege chamadas administrativas", () => {
  const script = read("apps/admin/script.js");

  assert.match(script, /http:\/\/localhost:3000\/api\/v1/);
  assert.match(script, /https:\/\/api\.airmovebr\.com\.br\/api\/v1/);
  assert.match(script, /\/auth\/login/);
  assert.match(script, /localStorage\.setItem\("airmovebr_access_token"/);
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
  assert.match(html, /id="agendaCalendar"/);
  assert.match(html, /id="agendaSelectedDateTitle"/);
  assert.match(html, /id="agendaList"/);
  assert.match(html, /id="clientesView"/);
  assert.match(html, /name="telefone"[^>]+required/);
  assert.match(html, /id="clientDocumentLabel"/);
  assert.match(html, /id="deleteClientModal"/);
  assert.match(html, /id="confirmDeleteClientButton"/);
  assert.match(html, /id="clientEquipmentPanel"/);
  assert.match(html, /id="equipmentForm"/);
  assert.match(html, /name="codigo_barras"/);
  assert.match(html, /Codigo de barras ou QR Code/);
  assert.match(html, /Ler codigo\/QR/);
  assert.match(html, /name="gas_refrigerante"/);
  assert.match(html, /R-410A/);
  assert.match(html, /id="scanEquipmentCodeButton"/);
  assert.match(html, /name="cep"/);
  assert.match(html, /id="clientCepStatus"/);
  assert.doesNotMatch(html, /assinatura_digitalizada|Assinatura digitalizada/);
  assert.match(html, /id="relatoriosView"/);
  assert.match(script, /async function loadAgenda/);
  assert.match(script, /function renderAgendaCalendar/);
  assert.match(script, /function renderAgendaDay/);
  assert.match(script, /function buildAgendaSlots/);
  assert.match(script, /selectedAgendaDate = button\.dataset\.agendaDate/);
  assert.match(script, /async function loadClientes/);
  assert.match(script, /async function loadRelatorios/);
  assert.match(script, /https:\/\/viacep\.com\.br\/ws\/\$\{cep\}\/json\//);
  assert.match(script, /cep:\s*onlyDigits\(String\(data\.get\("cep"\)/);
  assert.match(script, /clientForm\.elements\.logradouro\.value = address\.logradouro/);
  assert.match(script, /clientForm\.elements\.cidade\.value = address\.localidade/);
  assert.match(script, /clientForm\.elements\.uf\.value = address\.uf/);
  assert.match(script, /function validateClientIdentity/);
  assert.match(script, /Telefone com DDD|Informe telefone com DDD/);
  assert.match(script, /tipo === "pj" \? "CNPJ" : "CPF ou RG"/);
  assert.match(script, /data-action="apagar-cliente"/);
  assert.match(script, /method:\s*"DELETE"/);
  assert.match(script, /\/admin\/clientes\/\$\{selectedEquipmentClientId\}\/equipamentos/);
  assert.match(script, /gas_refrigerante:\s*String\(data\.get\("gas_refrigerante"\)/);
  assert.match(script, /Gas: \$\{escapeHtml\(item\.gas_refrigerante/);
  assert.match(script, /\/admin\/equipamentos\/\$\{equipmentId\}\/renovar-acesso/);
  assert.match(script, /BarcodeDetector/);
  assert.match(script, /qr_code/);
  assert.match(script, /data-action="renovar-acesso-equipamento"/);
});

test("landing possui consulta publica de equipamento protegida por senha", () => {
  const html = read("apps/landing/equipamento.html");
  const script = read("apps/landing/equipamento.js");

  assert.match(html, /id="equipmentAccessForm"/);
  assert.match(html, /name="senha"/);
  assert.match(html, /id="equipmentResultPanel"/);
  assert.match(script, /\/site\/equipamentos\/\$\{encodeURIComponent\(codigo\)\}\/acessar/);
  assert.match(script, /method:\s*"POST"/);
  assert.match(script, /senha/);
  assert.doesNotMatch(script, /telefone|documento|valor/);
});

test("admin possui aba PMOC com cadastro, checklists e itens hospitalares", () => {
  const html = read("apps/admin/index.html");
  const script = read("apps/admin/script.js");
  const styles = read("apps/admin/styles.css");

  assert.match(html, /data-view="pmoc"/);
  assert.match(html, /id="pmocView"/);
  assert.match(html, /id="pmocEquipmentFields"/);
  assert.match(html, /id="pmocChecklist"/);
  assert.match(html, /id="pmocAirQuality"/);
  assert.match(html, /id="pmocDocuments"/);
  assert.match(html, /id="pmocHospital"/);
  assert.match(script, /const pmocEquipmentRegistry/);
  assert.match(script, /Codigo do equipamento/);
  assert.match(script, /Temperatura insuflamento/);
  assert.match(script, /ART ou TRT do responsavel tecnico/);
  assert.match(script, /Pressao diferencial de areas criticas/);
  assert.match(script, /ABNT NBR 7256/);
  assert.match(script, /function loadPmoc/);
  assert.match(script, /function renderPmocGroup/);
  assert.match(styles, /\.pmoc-board/);
  assert.match(styles, /\.pmoc-check/);
});

test("admin separa frota em mapa consumo e abastecimentos", () => {
  const html = read("apps/admin/index.html");
  const script = read("apps/admin/script.js");

  assert.match(html, /data-fleet-tab="mapa"/);
  assert.match(html, /data-fleet-tab="consumo"/);
  assert.match(html, /data-fleet-tab="abastecimentos"/);
  assert.match(html, /id="fleetReportExportButton"/);
  assert.match(html, /id="fleetReportList"/);
  assert.match(html, /id="fuelHistoryList"/);
  assert.match(html, /id="fuelForm"/);
  assert.match(html, /Registrar abastecimento manual/);
  assert.match(script, /function setFleetTab/);
  assert.match(script, /async function loadRelatorioFrota/);
  assert.match(script, /async function submitFuel/);
  assert.match(script, /function openFleetReport/);
});

test("admin mostra todos os veiculos no Leaflet e permite zoom por carro", () => {
  const html = read("apps/admin/index.html");
  const script = read("apps/admin/script.js");
  const styles = read("apps/admin/styles.css");

  assert.match(html, /\.\/vendor\/leaflet\/leaflet\.css/);
  assert.match(html, /\.\/vendor\/leaflet\/leaflet\.js/);
  assert.doesNotMatch(html, /openstreetmap\.org\/export\/embed\.html/);
  assert.match(script, /L\.map\(fleetMap/);
  assert.match(script, /L\.tileLayer\("https:\/\/\{s\}\.tile\.openstreetmap\.org/);
  assert.match(script, /L\.marker\(\[latitude, longitude\]/);
  assert.match(script, /leafletMap\.fitBounds\(fleetMarkerGroup\.getBounds\(\)/);
  assert.match(script, /function focusVehicleOnMap/);
  assert.match(script, /leafletMap\.setView\(marker\.getLatLng\(\), 17/);
  assert.match(script, /selectFleetVehicle\(card\.dataset\.vehicleId\)/);
  assert.match(styles, /\.leaflet-container/);
  assert.doesNotMatch(html, /map-road|Av\. Higienópolis|Av\. Dez de Dezembro|BR-369/);
  assert.doesNotMatch(styles, /\.map-road|\.vehicle-marker/);
});
