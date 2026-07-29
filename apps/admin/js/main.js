import { apiModule, apiRoot } from "./modules/api.js?v=20260725-login";
import { authModule, authRoot } from "./modules/auth.js?v=20260704-access";
import { sessionModule, sessionRoot } from "./modules/session.js?v=20260725-session";
import { agendaModule, agendaRoot } from "./modules/agenda.js?v=20260704-access";
import { recurrenceUiModule } from "./modules/recurrence-ui.js?v=20260704-access";
import { recurrenceStatusRoot } from "./modules/recurrence-status.js?v=20260704-access";
import { clientesModule, clientesRoot } from "./modules/clientes.js?v=20260704-access";
import { frotaModule, frotaRoot } from "./modules/frota.js?v=20260704-access";
import { pmocModule, pmocRoot } from "./modules/pmoc.js?v=20260704-access";
import { recorrenciasModule, recorrenciasRoot } from "./modules/recorrencias.js?v=20260704-access";
import { relatoriosModule, relatoriosRoot } from "./modules/relatorios.js?v=20260704-access";
import { domModule, domRoot } from "./modules/ui/dom.js?v=20260704-access";
import { eventosModule, eventsRoot } from "./modules/eventos.js?v=20260704-access";
import { bootstrapModule, bootstrapRoot } from "./modules/bootstrap.js?v=20260704-access";
import { tecnicoFotoModule, tecnicoFotoRoot } from "./modules/tecnico-foto.js?v=20260706-tecnico-foto";
import { whatsappModule, whatsappRoot } from "./modules/whatsapp.js?v=20260729-ai-copilot-phase4";
import { comercialModule, comercialRoot } from "./modules/comercial.js?v=20260723-comercial";

export const adminModules = {
  api: apiModule,
  auth: authModule,
  session: sessionModule,
  agenda: agendaModule,
  recurrenceUi: recurrenceUiModule,
  clientes: clientesModule,
  frota: frotaModule,
  pmoc: pmocModule,
  recorrencias: recorrenciasModule,
  relatorios: relatoriosModule,
  dom: domModule,
  eventos: eventosModule,
  bootstrap: bootstrapModule,
  tecnicoFoto: tecnicoFotoModule,
  whatsapp: whatsappModule,
  comercial: comercialModule
};

const adminSources = [
  recurrenceStatusRoot,
  apiRoot,
  sessionRoot,
  authRoot,
  frotaRoot,
  agendaRoot,
  recorrenciasRoot,
  clientesRoot,
  pmocRoot,
  relatoriosRoot,
  domRoot,
  tecnicoFotoRoot,
  whatsappRoot,
  comercialRoot,
  eventsRoot,
  bootstrapRoot
];

window.adminModules = adminModules;

Function(adminSources.join("\n"))();

