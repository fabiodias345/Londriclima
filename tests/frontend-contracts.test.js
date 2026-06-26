const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function readAdminJs() {
  const modulesRoot = join(root, "apps/admin/js/modules");
  const files = [
    "apps/admin/script.js",
    "apps/admin/js/main.js",
    ...readdirSync(modulesRoot, { recursive: true })
      .filter((file) => String(file).endsWith(".js"))
      .map((file) => `apps/admin/js/modules/${String(file).replace(/\\/g, "/")}`)
      .sort()
  ];

  return files
    .map((file) => read(file).replace(/\\`/g, "`").replace(/\\\$\{/g, "${"))
    .join("\n");
}

function readAdminCss() {
  const styles = read("apps/admin/styles.css");
  const imports = [...styles.matchAll(/@import "\.\/([^"]+)";/g)].map((match) => `apps/admin/${match[1]}`);

  return [styles, ...imports.map((file) => read(file))].join("\n");
}

function assertFileExists(relativePath) {
  assert.doesNotThrow(() => read(relativePath), `${relativePath} deve existir`);
}

test("landing envia pre-chamado publico para a API com JSON", () => {
  const script = read("apps/landing/script.js");

  assert.match(script, /http:\/\/localhost:3000\/api\/v1/);
  assert.match(script, /http:\/\/191\.252\.226\.11\/api\/v1/);
  assert.match(script, /`\$\{window\.location\.origin\}\/api\/v1`/);
  assert.match(script, /const apiBaseUrls = /);
  assert.match(script, /async function postPreChamado/);
  assert.match(script, /for \(const apiBaseUrl of apiBaseUrls\)/);
  assert.match(script, /fetch\(`\$\{apiBaseUrl\}\/site\/pre-chamados`/);
  assert.match(script, /method:\s*"POST"/);
  assert.match(script, /"Content-Type":\s*"application\/json"/);
  assert.match(script, /nome:\s*String\(data\.get\("nome"\)/);
  assert.match(script, /telefone:\s*String\(data\.get\("telefone"\)/);
  assert.match(script, /servico:\s*String\(data\.get\("servico"\)/);
  assert.match(script, /cep:\s*onlyDigits\(String\(data\.get\("cep"\)/);
  assert.match(script, /logradouro:\s*String\(data\.get\("logradouro"\)/);
  assert.match(script, /numero:\s*String\(data\.get\("numero"\)/);
  assert.match(script, /bairro:\s*String\(data\.get\("bairro"\)/);
  assert.match(script, /cidade:\s*String\(data\.get\("cidade"\)/);
  assert.match(script, /uf:\s*String\(data\.get\("uf"\)/);
  assert.doesNotMatch(script, /Enviar pelo WhatsApp/);
  assert.doesNotMatch(script, /buildWhatsAppMessage/);
});

test("landing mostra modal de sucesso com opcao imediata pelo WhatsApp", () => {
  const html = read("apps/landing/index.html");
  const script = read("apps/landing/script.js");
  const styles = read("apps/landing/css/style.css");

  assert.match(html, /id="bookingSuccessModal"/);
  assert.match(html, /\.\/js\/main\.js\?v=/);
  assert.match(html, /Em breve, um de nossos especialistas entrará em contato/);
  assert.match(html, /Se preferir um atendimento imediato/);
  assert.match(html, /id="bookingSuccessWhatsApp"/);
  assert.match(html, /data-booking-success-close/);
  assert.match(script, /function openBookingSuccessModal/);
  assert.match(script, /bookingSuccessModal\.classList\.add\("is-open"\)/);
  assert.match(script, /bookingSuccessWhatsApp\.href = buildWhatsAppUrl/);
  assert.match(styles, /\.booking-modal\.is-open/);
});

test("landing possui formulario de pre-chamado com CEP e limpeza de ar-condicionado", () => {
  const html = read("apps/landing/index.html");
  const script = read("apps/landing/script.js");

  assert.doesNotMatch(html, /Londriclima/i);
  assert.match(html, /AIRMOVEBR: climatiza/);
  assert.match(html, /novo padr/);
  assert.match(html, /Limpeza de ar-condicionado/);
  assert.match(html, /\.\/assets\/services\/pmoc-plataforma\.png/);
  assert.match(html, /\.\/assets\/services\/locacao-ar-condicionado\.png/);
  assert.doesNotMatch(html, /photo-1450101499163-c8848c66ca85/);
  assert.doesNotMatch(html, /photo-1521791136064-7986c2920216/);
  assert.match(html, /name="cep"/);
  assert.match(html, /name="logradouro"/);
  assert.match(html, /name="numero"/);
  assert.match(html, /name="complemento"/);
  assert.match(html, /name="bairro"/);
  assert.match(html, /name="cidade"/);
  assert.match(html, /name="uf"/);
  assert.match(html, /id="bookingCepStatus"/);
  assert.match(script, /https:\/\/viacep\.com\.br\/ws\/\$\{cep\}\/json\//);
  assert.match(script, /bookingCepStatus/);
  assert.match(script, /form\.elements\.logradouro\.value = address\.logradouro/);
  assert.match(script, /form\.elements\.bairro\.value = address\.bairro/);
  assert.match(script, /form\.elements\.cidade\.value = address\.localidade/);
  assert.match(script, /form\.elements\.uf\.value = address\.uf/);
});

test("admin autentica, guarda token e protege chamadas administrativas", () => {
  const script = readAdminJs();
  const html = read("apps/admin/index.html");
  const main = read("apps/admin/js/main.js");

  assert.match(html, /<script type="module" src="\.\/js\/main\.js\?v=20260621-phone"><\/script>/);
  assert.doesNotMatch(main, /import "\.\.\/script\.js"/);
  assert.match(main, /adminModules/);
  assertFileExists("apps/admin/js/modules/api.js");
  assertFileExists("apps/admin/js/modules/ui/dom.js");
  assertFileExists("apps/admin/js/modules/auth.js");
  assertFileExists("apps/admin/js/modules/agenda.js");
  assertFileExists("apps/admin/js/modules/recorrencias.js");
  assertFileExists("apps/admin/js/modules/frota.js");
  assertFileExists("apps/admin/js/modules/clientes.js");
  assertFileExists("apps/admin/js/modules/pmoc.js");

  assert.match(script, /http:\/\/localhost:3000\/api\/v1/);
  assert.match(script, /https:\/\/api\.airmovebr\.com\.br\/api\/v1/);
  assert.match(script, /\/auth\/login/);
  assert.match(script, /localStorage\.setItem\("airmovebr_access_token"/);
  assert.match(script, /Authorization:\s*`Bearer \$\{getToken\(\)\}`/);
  assert.match(script, /\/admin\/pre-chamados/);
  assert.match(script, /\/admin\/frota\/localizacoes/);
  assert.match(script, /\/admin\/agenda/);
  assert.match(script, /\/admin\/planos-recorrencia/);
  assert.match(script, /\/admin\/empresa/);
  assert.match(script, /\/admin\/clientes/);
  assert.match(script, /\/admin\/relatorios/);
  assert.match(script, /\/admin\/relatorios-avulsos/);
  assert.match(script, /\/admin\/frota\/abastecimentos/);
  assert.match(script, /\/admin\/relatorios\/frota/);
  assert.match(script, /\/admin\/engenheiros\/\$\{engineerId\}/);
  assert.match(script, /response\.status !== 401/);
});

test("admin possui views funcionais para agenda clientes e relatorios", () => {
  const html = read("apps/admin/index.html");
  const script = readAdminJs();
  const agendaModule = read("apps/admin/js/modules/agenda.js");
  const recorrenciasModule = read("apps/admin/js/modules/recorrencias.js");
  const clientesModule = read("apps/admin/js/modules/clientes.js");

  assert.match(html, /data-view="agenda"/);
  assert.match(html, /data-view="recorrencias"/);
  assert.match(html, /data-view="clientes"/);
  assert.doesNotMatch(html, /<button class="nav-link" type="button" data-view="empresa">/);
  assert.doesNotMatch(html, /<button class="nav-link" type="button" data-view="tecnicos">/);
  assert.doesNotMatch(html, /<button class="nav-link" type="button" data-view="equipes">/);
  assert.doesNotMatch(html, /<button class="nav-link" type="button" data-view="engenheiros">/);
  assert.match(html, /id="configButton"/);
  assert.match(html, /id="configTabs"/);
  assert.ok(html.indexOf('id="configTabs"') < html.indexOf('id="preChamadosSummary"'));
  assert.match(html, /data-config-view="empresa"/);
  assert.match(html, /data-config-view="tecnicos"/);
  assert.match(html, /data-config-view="equipes"/);
  assert.match(html, /data-config-view="engenheiros"/);
  assert.match(html, /data-view="relatorios"/);
  assert.match(html, /data-view="relatoriosAvulsos"/);
  assert.match(html, /id="agendaView"/);
  assert.match(html, /id="newAgendaOsButton"/);
  assert.match(html, /id="agendaCalendar"/);
  assert.match(html, /id="agendaPendingList"/);
  assert.match(html, /id="agendaSelectedDateTitle"/);
  assert.match(html, /id="agendaList"/);
  assert.match(html, /id="agendaOsModal"/);
  assert.match(html, /id="agendaOsForm"/);
  assert.match(html, /name="cliente_id"/);
  assert.match(html, /name="tipo_servico"/);
  assert.match(html, /name="checklist_tipo"/);
  assert.match(html, /Preventiva/);
  assert.match(html, /Corretiva/);
  assert.match(html, /name="agendada_para"/);
  assert.match(html, /name="tecnico_id"/);
  assert.match(html, /id="recorrenciasView"/);
  assert.match(html, /id="recurrenceForm"/);
  assert.match(html, /id="recurrenceList"/);
  assert.match(html, /name="frequencia"/);
  assert.match(html, /name="proxima_execucao"/);
  assert.match(html, /id="clientesView"/);
  assert.match(html, /id="empresaView"/);
  assert.match(html, /id="empresaForm"/);
  assert.match(html, /name="razao_social"/);
  assert.match(html, /name="nome_fantasia"/);
  assert.match(html, /name="inscricao_estadual"/);
  assert.match(html, /name="responsavel_legal"/);
  assert.match(html, /name="telefone"[^>]+required/);
  assert.match(html, /id="clientDocumentLabel"/);
  assert.match(html, /id="deleteClientModal"/);
  assert.match(html, /id="confirmDeleteClientButton"/);
  assert.match(html, /id="clientEquipmentPanel"/);
  assert.match(html, /id="equipmentForm"/);
  assert.match(html, /name="codigo_barras"/);
  assert.match(html, /Código de barras ou QR Code/);
  assert.match(html, /Ler codigo\/QR/);
  assert.match(html, /name="gas_refrigerante"/);
  assert.match(html, /R-410A/);
  assert.match(html, /id="scanEquipmentCodeButton"/);
  assert.match(html, /name="cep"/);
  assert.match(html, /id="clientCepStatus"/);
  assert.doesNotMatch(html, /assinatura_digitalizada|Assinatura digitalizada/);
  assert.match(html, /id="relatoriosView"/);
  assert.match(html, /id="printReportsButton"/);
  assert.match(html, /id="relatoriosAvulsosView"/);
  assert.match(html, /id="relatoriosAvulsosList"/);
  assert.match(script, /async function loadAgenda/);
  assert.match(agendaModule, /view:\s*"agenda"/);
  assert.match(agendaModule, /summaryId:\s*"agendaSummary"/);
  assert.match(script, /async function submitAgendaOs/);
  assert.match(script, /function openAgendaOsModal/);
  assert.match(script, /function syncAgendaOsServiceFields/);
  assert.match(script, /tipo_servico:\s*String\(data\.get\("tipo_servico"\) \|\| "preventiva"\)/);
  assert.match(script, /checklist_tipo:\s*String\(data\.get\("checklist_tipo"\) \|\| "mensal"\)/);
  assert.match(script, /function renderAgendaMonthGrid/);
  assert.match(script, /function renderAgendaCalendar/);
  assert.match(script, /function renderAgendaDay/);
  assert.match(script, /function renderAgendaPendingList/);
  assert.match(script, /function getAgendaStatusClass/);
  assert.match(script, /function buildAgendaSlots/);
  assert.match(script, /\/admin\/agenda\/ordens/);
  assert.match(script, /\/admin\/agenda\/ordens\/\$\{agendaEditingOsId\}/);
  assert.match(script, /async function loadRecorrencias/);
  assert.match(recorrenciasModule, /view:\s*"recorrencias"/);
  assert.match(script, /async function submitRecurrence/);
  assert.match(script, /function renderRecorrencias/);
  assert.match(script, /function renderRecurrenceCard/);
  assert.match(script, /data-action="editar-recorrencia"/);
  assert.match(script, /data-action="apagar-recorrencia"/);
  assert.match(script, /function editRecurrence/);
  assert.match(script, /async function deleteRecurrence/);
  assert.match(script, /Todos os equipamentos/);
  assert.match(script, /equipamento_id:\s*String\(data\.get\("equipamento_id"\) \|\| ""\)/);
  assert.match(script, /function generateRecurrenceOs/);
  assert.match(script, /\/admin\/planos-recorrencia\/\$\{planId\}\/gerar-os/);
  assert.match(script, /const AGENDA_LOOKAHEAD_DAYS = 180/);
  assert.match(script, /offset <= AGENDA_LOOKAHEAD_DAYS/);
  assert.match(script, /selectedAgendaDate = button\.dataset\.agendaDate/);
  assert.match(script, /async function loadEmpresa/);
  assert.match(script, /async function submitEmpresa/);
  assert.match(script, /let activeConfigView = "empresa"/);
  assert.match(script, /async function loadConfigView/);
  assert.match(script, /function setConfigView/);
  assert.match(script, /configButton\?\.addEventListener/);
  assert.match(script, /configTabButtons/);
  assert.match(script, /fetch\(`\$\{apiBaseUrl\}\/admin\/empresa`/);
  assert.match(script, /async function loadClientes/);
  assert.match(clientesModule, /view:\s*"clientes"/);
  assert.match(script, /async function loadRelatorios/);
  assert.match(script, /function renderPeriodMetric/);
  assert.match(script, /function openReportsPrint/);
  assert.match(script, /printReportsButton\?\.addEventListener\("click", openReportsPrint\)/);
  assert.match(script, /Receita arrecadada/);
  assert.match(script, /async function loadRelatoriosAvulsos/);
  assert.match(script, /openRelatorioAvulsoPdf/);
  assert.match(script, /enviarRelatorioAvulso/);
  assert.match(script, /apagarRelatorioAvulso/);
  assert.match(script, /\/admin\/relatorios-avulsos\/clientes\/\$\{clientId\}\/pdf/);
  assert.match(script, /\/admin\/relatorios-avulsos\/clientes\/\$\{clientId\}\/enviar/);
  assert.match(script, /\/admin\/relatorios-avulsos\/clientes\/\$\{clientId\}/);
  assert.match(script, /data-action="avulso-apagar"/);
  assert.match(script, /Apagar relatorio/);
  assert.match(script, /https:\/\/viacep\.com\.br\/ws\/\$\{cep\}\/json\//);
  assert.match(script, /cep:\s*onlyDigits\(String\(data\.get\("cep"\)/);
  assert.match(script, /clientForm\.elements\.logradouro\.value = address\.logradouro/);
  assert.match(script, /clientForm\.elements\.cidade\.value = address\.localidade/);
  assert.match(script, /clientForm\.elements\.uf\.value = address\.uf/);
  assert.match(script, /function validateClientIdentity/);
  assert.match(script, /Telefone com DDD|Informe telefone com DDD/);
  assert.match(script, /const rawDocumento = String\(data\.get\("documento"\) \|\| ""\)\.trim\(\)/);
  assert.match(script, /const documento = tipo === "pj" \? onlyDigits\(rawDocumento\) : rawDocumento/);
  assert.match(script, /function formatPhoneInput/);
  assert.match(script, /Array\.from\(String\(value \|\| ""\)\)/);
  assert.match(script, /char >= "0" && char <= "9"/);
  assert.match(script, /\(43\) 3348-9760 ou \(43\) 99999-9999/);
  assert.match(script, /digits\.length <= 10/);
  assert.match(script, /digits\.slice\(2, 6\)/);
  assert.match(script, /digits\.slice\(2, 7\)/);
  assert.match(script, /tipo === "pj" \? "CNPJ" : "CPF ou RG"/);
  assert.match(script, /data-action="apagar-cliente"/);
  assert.match(script, /data-action="apagar-engenheiro"/);
  assert.match(script, /async function deleteEngineer/);
  assert.match(script, /method:\s*"DELETE"/);
  assert.match(script, /\/admin\/clientes\/\$\{selectedEquipmentClientId\}\/equipamentos/);
  assert.match(script, /gas_refrigerante:\s*String\(data\.get\("gas_refrigerante"\)/);
  assert.match(script, /Gas: \$\{escapeHtml\(item\.gas_refrigerante/);
  assert.match(script, /\/admin\/equipamentos\/\$\{equipmentId\}\/renovar-acesso/);
  assert.match(script, /\/admin\/equipamentos\/\$\{equipmentId\}/);
  assert.match(script, /BarcodeDetector/);
  assert.match(script, /qr_code/);
  assert.match(script, /data-action="renovar-acesso-equipamento"/);
  assert.match(script, /data-action="apagar-equipamento"/);
  assert.match(html, /id="backToClientsButton"/);
  assert.match(script, /backToClientsButton\?\.classList\.remove\("hidden"\)/);
  assert.match(script, /backToClientsButton\?\.classList\.add\("hidden"\)/);
  assert.match(script, /backToClientsButton\?\.addEventListener\("click", resetClientForm\)/);
  assert.match(script, /clientesList\.classList\.add\("hidden"\)/);
  assert.match(script, /clientesList\.classList\.remove\("hidden"\)/);
});

test("admin organiza O.S. como fichario operacional", () => {
  const html = read("apps/admin/index.html");
  const script = readAdminJs();
  const styles = readAdminCss();

  assert.match(html, /data-view="preChamados">O\.S\./);
  assert.doesNotMatch(html, /data-view="preChamados">Pre-chamados/);
  assert.match(html, /id="osTabs"/);
  assert.match(html, /data-os-tab="solicitacoes"/);
  assert.match(html, /data-os-tab="abertas"/);
  assert.match(html, /data-os-tab="agendadas"/);
  assert.match(html, /data-os-tab="em_atendimento"/);
  assert.match(html, /data-os-tab="concluidas"/);
  assert.match(html, /data-os-tab="canceladas"/);
  assert.match(html, /id="newOsShortcutButton"/);
  assert.match(html, /id="osSearchInput"/);
  assert.match(html, /id="viewTitle">O\.S\./);
  assert.match(html, /id="viewKicker">Operação de O\.S\./);
  assert.match(html, /Solicitações/);
  assert.match(html, /Abertas/);
  assert.match(html, /Agendadas/);
  assert.match(html, /Em atendimento/);
  assert.match(html, /Concluídas/);
  assert.match(html, /Canceladas/);
  assert.match(script, /function setOsTab/);
  assert.match(script, /function filterOsRequests/);
  assert.match(script, /data-action="os-open-new"/);
  assert.match(script, /Proxima acao/);
  assert.match(script, /Converter em O\.S\./);
  assert.match(styles, /\.os-workbench/);
  assert.match(styles, /\.os-tabs/);
  assert.match(styles, /\.os-toolbar/);
});

test("admin alimenta abas de O.S. com dados reais da agenda", () => {
  const script = readAdminJs();
  const styles = readAdminCss();

  assert.match(script, /async function loadOsWorkbench/);
  assert.match(script, /fetchAdminJson\("\/admin\/agenda", listStatus\)/);
  assert.match(script, /function filterOsAgendaItems/);
  assert.match(script, /function renderOsAgendaItems/);
  assert.match(script, /const OS_STATUS_TABS = /);
  assert.match(script, /abertas:\s*\["aberta"\]/);
  assert.match(script, /agendadas:\s*\["aberta"\]/);
  assert.match(script, /em_atendimento:\s*\["em_deslocamento", "em_atendimento"\]/);
  assert.match(script, /concluidas:\s*\["concluida"\]/);
  assert.match(script, /canceladas:\s*\["cancelada", "rejeitada"\]/);
  assert.match(script, /const AGENDA_OPERATIONAL_STATUSES = \["aberta", "em_deslocamento", "em_atendimento"\]/);
  assert.match(script, /latestAgendaItems = items/);
  assert.match(script, /renderAgenda\(operationalItems\)/);
  assert.match(script, /renderOsCard/);
  assert.match(script, /data-action="editar-agenda-os"/);
  assert.match(script, /Equipamento/);
  assert.match(script, /Responsavel/);
  assert.match(script, /Data\/hora/);
  assert.match(script, /filterOsAgendaItems\(latestAgendaItems\)/);
  assert.match(styles, /\.os-real-card/);
  assert.match(styles, /\.os-card-grid/);
});

test("admin abre detalhe lateral da O.S. com acoes por status", () => {
  const html = read("apps/admin/index.html");
  const script = readAdminJs();
  const styles = readAdminCss();

  assert.match(html, /id="osDetailPanel"/);
  assert.match(html, /id="osDetailTitle"/);
  assert.match(html, /id="osDetailMeta"/);
  assert.match(html, /id="osDetailBody"/);
  assert.match(html, /id="closeOsDetailButton"/);
  assert.match(script, /let selectedOsDetailId = ""/);
  assert.match(script, /function openOsDetail/);
  assert.match(script, /function closeOsDetail/);
  assert.match(script, /function renderOsDetail/);
  assert.match(script, /function getOsPrimaryAction/);
  assert.match(script, /setAttribute\("data-action", "ver-os-detalhe"\)|data-action="ver-os-detalhe"/);
  assert.match(script, /Agendar \/ atribuir tecnico/);
  assert.match(script, /Editar agenda/);
  assert.match(script, /Acompanhar/);
  assert.match(script, /Ver execucao/);
  assert.match(script, /Ver historico/);
  assert.match(script, /Revisar motivo/);
  assert.match(script, /data-action="apagar-agenda-os"/);
  assert.match(script, /async function deleteAgendaOs/);
  assert.match(styles, /\.os-detail-panel/);
  assert.match(styles, /\.os-detail-panel\.is-open/);
  assert.match(styles, /\.os-detail-facts/);
});

test("admin detalhe da O.S. prepara historico execucao e evidencias", () => {
  const script = readAdminJs();
  const styles = readAdminCss();

  assert.match(script, /function renderOsTimeline/);
  assert.match(script, /function renderOsRealEvents/);
  assert.match(script, /function formatOsEventAction/);
  assert.match(script, /item\.eventos/);
  assert.match(script, /status_anterior/);
  assert.match(script, /status_novo/);
  assert.match(script, /GPS/);
  assert.match(script, /function renderOsEquipmentProgress/);
  assert.match(script, /function getOsEquipmentProgress/);
  assert.match(script, /equipamentos_executados/);
  assert.match(script, /equipmentsById/);
  assert.match(script, /function formatOsEquipmentQr/);
  assert.match(script, /function renderOsExecutionSummary/);
  assert.match(script, /function renderOsEvidenceSummary/);
  assert.match(script, /Historico da O\.S\./);
  assert.match(script, /Equipamentos da O\.S\./);
  assert.match(script, /status_execucao/);
  assert.match(script, /Execucao/);
  assert.match(script, /Evidencias/);
  assert.match(script, /Criada/);
  assert.match(script, /Agendada/);
  assert.match(script, /Em atendimento/);
  assert.match(script, /Concluida/);
  assert.match(script, /Checklist ainda nao sincronizado/);
  assert.match(script, /Checklist salvo/);
  assert.match(script, /Assinatura registrada/);
  assert.match(script, /Fotos ainda nao sincronizadas/);
  assert.match(styles, /\.os-detail-sections/);
  assert.match(styles, /\.os-timeline/);
  assert.match(styles, /\.os-evidence-grid/);
}
);

test("admin usa layout de fichario compacto para lista e detalhe de O.S.", () => {
  const html = read("apps/admin/index.html");
  const script = readAdminJs();
  const styles = readAdminCss();

  assert.match(html, /class="admin-top-actions"/);
  assert.match(html, /class="os-summary-card/);
  assert.match(html, /id="osActiveCount"/);
  assert.match(html, /id="osScheduledCount"/);
  assert.match(html, /id="osCompletedMonthCount"/);
  assert.match(html, /data-os-count="em_atendimento"/);
  assert.match(html, /data-action="os-toggle-filters"/);
  assert.match(html, /data-action="os-exportar"/);
  assert.match(script, /className = "request-card os-real-card os-compact-card"/);
  assert.match(script, /setAttribute\("data-action", "ver-os-detalhe"\)|data-action="ver-os-detalhe"/);
  assert.match(script, /renderOsCompactMeta/);
  assert.match(script, /updateOsSummaryCards/);
  assert.match(script, /updateOsTabCounts/);
  assert.match(script, /function getOsTabCount/);
  assert.match(html, /class="os-count-badge"/);
  assert.match(script, /os-list-row/);
  assert.match(script, /request-card os-empty-state os-compact-empty/);
  assert.doesNotMatch(script, /renderOsCard[\s\S]*data-action="editar-agenda-os"[\s\S]*function openOsDetail/);
  assert.match(styles, /\.os-workbench-grid/);
  assert.match(styles, /\.os-page-shell/);
  assert.match(styles, /\.admin-top-actions/);
  assert.match(styles, /\.os-summary-card/);
  assert.match(styles, /\.os-count-badge/);
  assert.match(styles, /\.os-list-row/);
  assert.match(styles, /\.os-compact-card/);
  assert.match(styles, /\.os-compact-card\.is-selected/);
  assert.match(styles, /\.os-detail-panel/);
  assert.match(styles, /position: sticky/);
});

test("admin mostra despacho da O.S. sem etapa manual redundante", () => {
  const script = readAdminJs();
  const styles = readAdminCss();

  assert.match(script, /function renderOsDispatchSummary/);
  assert.match(script, /Despacho/);
  assert.match(script, /Editar despacho/);
  assert.match(script, /Corrigir despacho/);
  assert.doesNotMatch(script, /Enviar para campo/);
  assert.doesNotMatch(script, /data-action="enviar-os-campo"/);
  assert.match(script, /Tecnico ou equipe obrigatorio/);
  assert.match(script, /Data\/hora obrigatoria/);
  assert.match(styles, /\.os-dispatch-summary/);
  assert.match(styles, /\.os-dispatch-status/);
});

test("admin nao oferece checklist ou recorrencia anual operacional", () => {
  const html = read("apps/admin/index.html");
  const agendaScript = read("apps/admin/js/modules/agenda.js");
  const eventosScript = read("apps/admin/js/modules/eventos.js");

  assert.doesNotMatch(html, /<option value="anual">Anual<\/option>/);
  assert.doesNotMatch(agendaScript, /anual:\s*"Anual"/);
  assert.doesNotMatch(eventosScript, /anual:\s*"Anual"/);
});

test("admin mostra prontidao da O.S. para o app do tecnico", () => {
  const script = readAdminJs();
  const styles = readAdminCss();

  assert.match(script, /function renderOsTechnicianAppSummary/);
  assert.match(script, /function renderOsEquipmentTarget/);
  assert.match(script, /App do tecnico/);
  assert.match(script, /Aparece no app/);
  assert.match(script, /Responsavel atribuido/);
  assert.match(script, /Cliente e endereco/);
  assert.match(script, /Maquinas disponiveis/);
  assert.match(script, /Todos os equipamentos do cliente/);
  assert.doesNotMatch(script, /const ready = appStatus && hasResponsible && hasSchedule && hasClientAddress && hasMachine/);
  assert.match(script, /Checklist do app/);
  assert.match(script, /Conferir no app/);
  assert.match(script, /Complete o despacho para liberar no app/);
  assert.match(script, /O\.S\. concluida no app/);
  assert.match(script, /Ver execucao/);
  assert.match(styles, /\.os-app-summary/);
  assert.match(styles, /\.os-app-readiness/);
});

test("admin gerencia tecnicos equipes e responsaveis flexiveis por OS", () => {
  const html = read("apps/admin/index.html");
  const script = readAdminJs();

  assert.match(html, /data-config-view="tecnicos"/);
  assert.match(html, /data-config-view="equipes"/);
  assert.match(html, /id="tecnicosView"/);
  assert.match(html, /id="tecnicoForm"/);
  assert.match(html, /name="senha"/);
  assert.match(html, /Email \/ login\s*<input name="email" type="text" required \/>/);
  assert.doesNotMatch(html, /Email \/ login\s*<input name="email" type="email" required \/>/);
  assert.match(html, /id="equipesView"/);
  assert.match(html, /id="equipeForm"/);
  assert.match(html, /id="equipeMembersList"/);
  assert.match(html, /name="equipe_ids"/);
  assert.doesNotMatch(html, /id="clientTeamsSelect"[^>]*multiple/);
  assert.doesNotMatch(html, /id="clientTeamsSelect"[^>]*size="4"/);
  assert.match(html, /Responsaveis pelo cliente/);
  assert.match(html, /id="clientTechnicianSelect"/);
  assert.match(html, /name="tecnico_responsavel_id"/);
  assert.doesNotMatch(html, /Cadastre ou selecione um engenheiro/);
  assert.match(script, /async function loadTecnicos/);
  assert.match(script, /\/admin\/tecnicos/);
  assert.match(script, /async function loadEquipes/);
  assert.match(script, /\/admin\/equipes/);
  assert.match(script, /function renderEquipeMembersList/);
  assert.match(script, /function renderClientTechnicianOptions/);
  assert.match(script, /usuario_ids:\s*data\.getAll\("usuario_ids"\)/);
  assert.match(script, /equipe_ids:\s*data\.getAll\("equipe_ids"\)/);
  assert.match(script, /tecnico_responsavel_id:\s*String\(data\.get\("tecnico_responsavel_id"\)/);
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

test("landing possui assinatura publica de PMOC por token", () => {
  const html = read("apps/landing/assinatura-pmoc.html");
  const script = read("apps/landing/assinatura-pmoc.js");

  assert.match(html, /id="pmocSignaturePanel"/);
  assert.match(html, /id="pmocSignatureStatus"/);
  assert.match(html, /id="pmocSignedPdfInput"/);
  assert.match(html, /type="file"/);
  assert.match(html, /accept="application\/pdf"/);
  assert.match(html, /id="pmocSignatureConfirmButton"/);
  assert.match(script, /URLSearchParams\(window\.location\.search\)/);
  assert.match(script, /\/site\/pmoc\/assinaturas\/\$\{encodeURIComponent\(token\)\}/);
  assert.match(script, /\/site\/pmoc\/assinaturas\/\$\{encodeURIComponent\(token\)\}\/confirmar/);
  assert.match(script, /method:\s*"POST"/);
  assert.match(script, /pdf_assinado_base64/);
  assert.match(script, /FileReader/);
  assert.match(script, /pdf_hash/);
});

test("admin possui triagem PMOC por cliente e conversao com engenheiro", () => {
  const html = read("apps/admin/index.html");
  const script = readAdminJs();
  const styles = readAdminCss();
  const pmocModule = read("apps/admin/js/modules/pmoc.js");

  assert.match(html, /data-view="pmoc"/);
  assert.match(html, /id="pmocView"/);
  assert.match(html, /id="pmocSearchForm"/);
  assert.match(html, /id="pmocSearchInput"/);
  assert.match(html, /id="pmocHero"/);
  assert.match(html, /id="pmocSearchPanel"/);
  assert.match(html, /class="pmoc-grid hidden" id="pmocSearchPanel"/);
  assert.match(html, /id="pmocSearchResults"/);
  assert.match(html, /id="pmocConversionPanel"/);
  assert.match(html, /id="pmocEngineerSelect"/);
  assert.match(html, /id="pmocDossierPanel"/);
  assert.match(html, /id="pmocDossierList"/);
  assert.match(html, /id="pmocDossierDetail"/);
  assert.match(html, /id="pmocMonthBoard"/);
  assert.match(html, /id="pmocBackToClientsButton"/);
  assert.match(html, /Voltar para clientes/);
  assert.match(html, /id="pmocMachineList"/);
  assert.match(html, /id="pmocGenerateReportButton"[^>]*disabled/);
  assert.match(html, /id="pmocRequestSignatureButton"[^>]*disabled/);
  assert.match(script, /function loadPmoc/);
  assert.match(pmocModule, /view:\s*"pmoc"/);
  assert.match(pmocModule, /summaryId:\s*"pmocSummary"/);
  assert.match(script, /function searchPmocClients/);
  assert.match(script, /function resetPmocSearchResults/);
  assert.match(script, /function openPmocConversion/);
  assert.match(script, /function activatePmocClient/);
  assert.match(script, /function setPmocDossierMode/);
  assert.match(script, /function openPmocDossier/);
  assert.match(script, /function closePmocDossier/);
  assert.match(script, /function renderPmocMachines/);
  assert.match(script, /function renderPmocMonths/);
  assert.match(script, /pmoc_meses/);
  assert.match(script, /is-sent/);
  assert.match(script, /is-pending/);
  assert.match(script, /function openPmocReportPreview/);
  assert.match(script, /hasCompletedPmocMaintenance/);
  assert.match(script, /function getCurrentPmocMonth/);
  assert.match(script, /hasDeliveredCurrentMonth/);
  assert.match(script, /email_entregue/);
  assert.match(script, /function isPmocTestClient/);
  assert.match(script, /cris magnani/);
  assert.match(script, /isPmocTestClient\(client\)/);
  assert.match(script, /PMOC enviado/);
  assert.match(script, /pmocGenerateReportButton\?\.addEventListener\("click", openPmocReportPreview\)/);
  assert.match(script, /pmocBackToClientsButton\?\.addEventListener\("click", closePmocDossier\)/);
  assert.match(script, /pmocDossierPanel\?\.classList\.toggle\("hidden", isOpen\)/);
  assert.match(script, /pmocHero\?\.classList\.toggle\("hidden", isOpen\)/);
  assert.match(script, /\/admin\/clientes\/\$\{client\.id\}\/equipamentos/);
  assert.match(script, /\/admin\/pmoc\/clientes\/\$\{selectedPmocDossierClientId\}\/previa/);
  assert.match(script, /\/admin\/pmoc\/clientes\/\$\{selectedPmocDossierClientId\}\/pdf/);
  assert.match(script, /\/assinaturas\/pmoc\/clientes\/\$\{selectedPmocDossierClientId\}\/assinafy/);
  assert.match(script, /assinafy_document_id/);
  assert.match(script, /canRequestSignature/);
  assert.match(script, /Reenviar assinatura/);
  assert.doesNotMatch(script, /\(!hasPendingSignature \|\| isTestClient\)/);
  assert.doesNotMatch(script, /token_assinatura/);
  assert.match(script, /pronto_para_pdf/);
  assert.match(script, /total_os_concluidas/);
  assert.match(script, /os_concluidas/);
  assert.match(script, /pmoc_ativo:\s*true/);
  assert.match(script, /engenheiro_responsavel_id:\s*engineerId/);
  assert.match(styles, /\.pmoc-hero/);
  assert.match(styles, /\.pmoc-client-card/);
  assert.match(styles, /\.pmoc-dossier-row/);
  assert.match(styles, /\.pmoc-dossier-detail/);
  assert.match(styles, /\.pmoc-workspace\.is-dossier-open/);
  assert.match(styles, /\.pmoc-month-grid/);
  assert.match(styles, /\.pmoc-month-card\.is-sent/);
  assert.match(styles, /\.pmoc-month-card\.is-pending/);
  assert.match(styles, /\.pmoc-month-card\.is-waiting-signature/);
  assert.match(script, /getPmocMonthStatus/);
  assert.match(script, /Aguardando assinatura/);
  assert.match(script, /Enviado ao cliente/);
  assert.match(styles, /\.pmoc-machine-card/);
  assert.doesNotMatch(html, /id="pmocEquipmentFields"/);
  assert.doesNotMatch(html, /id="pmocChecklist"/);
  assert.doesNotMatch(html, /id="pmocAirQuality"/);
  assert.doesNotMatch(html, /id="pmocDocuments"/);
  assert.doesNotMatch(html, /id="pmocHospital"/);
  assert.doesNotMatch(script, /const pmocEquipmentRegistry/);
  assert.doesNotMatch(script, /function renderPmocGroup/);
  assert.doesNotMatch(styles, /\.pmoc-board/);
  assert.doesNotMatch(styles, /\.pmoc-check/);
});

test("admin separa frota em mapa consumo e abastecimentos", () => {
  const html = read("apps/admin/index.html");
  const script = readAdminJs();
  const frotaModule = read("apps/admin/js/modules/frota.js");

  assert.match(html, /data-fleet-tab="mapa"/);
  assert.match(html, /data-fleet-tab="veiculos"/);
  assert.match(html, /data-fleet-tab="consumo"/);
  assert.match(html, /data-fleet-tab="abastecimentos"/);
  assert.match(html, /id="vehicleForm"/);
  assert.match(html, /id="vehicleList"/);
  assert.match(html, /Numero IMEI do rastreador/);
  assert.match(html, /name="rastreador_imei"[^>]+required/);
  assert.match(html, /Cadastrar veiculo/);
  assert.match(html, /id="fleetReportExportButton"/);
  assert.match(html, /id="fleetReportList"/);
  assert.match(html, /id="fuelHistoryList"/);
  assert.match(html, /id="fuelForm"/);
  assert.match(html, /Registrar abastecimento manual/);
  assert.match(script, /function setFleetTab/);
  assert.match(frotaModule, /view:\s*"frota"/);
  assert.match(script, /async function loadFleetVehicles/);
  assert.match(script, /async function submitVehicle/);
  assert.match(script, /async function deleteVehicle/);
  assert.match(script, /\/admin\/frota\/veiculos/);
  assert.match(script, /async function loadRelatorioFrota/);
  assert.match(script, /async function submitFuel/);
  assert.match(script, /function openFleetReport/);
});

test("admin mostra todos os veiculos no Leaflet e permite zoom por carro", () => {
  const html = read("apps/admin/index.html");
  const script = readAdminJs();
  const styles = readAdminCss();

  assert.match(html, /\.\/vendor\/leaflet\/leaflet\.css/);
  assert.match(html, /\.\/vendor\/leaflet\/leaflet\.js/);
  assert.match(styles, /@import "\.\/css\/base\.css"/);
  assert.match(styles, /@import "\.\/css\/layout\.css"/);
  assert.match(styles, /@import "\.\/css\/agenda\.css"/);
  assert.match(styles, /@import "\.\/css\/frota\.css"/);
  assert.match(styles, /@import "\.\/css\/clientes\.css"/);
  assert.match(styles, /@import "\.\/css\/relatorios\.css"/);
  assert.match(styles, /@import "\.\/css\/pmoc\.css"/);
  assert.match(styles, /@import "\.\/css\/responsive\.css"/);
  assertFileExists("apps/admin/css/base.css");
  assertFileExists("apps/admin/css/layout.css");
  assertFileExists("apps/admin/css/agenda.css");
  assertFileExists("apps/admin/css/frota.css");
  assertFileExists("apps/admin/css/clientes.css");
  assertFileExists("apps/admin/css/relatorios.css");
  assertFileExists("apps/admin/css/pmoc.css");
  assertFileExists("apps/admin/css/responsive.css");
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

test("admin usa layout operacional escuro para frota", () => {
  const html = read("apps/admin/index.html");
  const script = readAdminJs();
  const styles = readAdminCss();

  assert.match(html, /class="summary-grid fleet-summary-grid hidden" id="frotaSummary"/);
  assert.match(html, /id="fleetTotalKm"/);
  assert.match(html, /id="fleetAverageEfficiency"/);
  assert.match(html, /class="fleet-shell hidden" id="frotaView"/);
  assert.match(html, /class="fleet-map-stage"/);
  assert.match(html, /class="fleet-map-legend"/);
  assert.match(html, /fleet-monitor-panel/);
  assert.match(script, /function updateFleetSummary/);
  assert.match(script, /function getFleetTotalKm/);
  assert.match(script, /function getFleetAverageEfficiency/);
  assert.match(script, /renderFrota\(\[\]\)/);
  assert.match(script, /fleet-empty-state/);
  assert.match(script, /O mapa nao usa chave/);
  assert.match(script, /fleet-card-status/);
  assert.match(script, /fleet-card-actions/);
  assert.match(script, /fleet-report-row/);
  assert.match(styles, /\.fleet-shell/);
  assert.match(styles, /\.fleet-summary-grid/);
  assert.match(styles, /\.fleet-stat-card/);
  assert.match(styles, /\.fleet-map-stage/);
  assert.match(styles, /\.fleet-monitor-panel/);
  assert.match(styles, /\.fleet-empty-state/);
  assert.match(styles, /\.fleet-report-row/);
});
