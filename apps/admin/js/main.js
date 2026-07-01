import { apiModule, apiRoot } from "./modules/api.js?v=20260630-runtimefix";
import { authModule, authRoot } from "./modules/auth.js?v=20260630-runtimefix";
import { agendaModule, agendaRoot } from "./modules/agenda.js?v=20260630-runtimefix";
import { recurrenceUiModule } from "./modules/recurrence-ui.js?v=20260630-runtimefix";
import { recurrenceStatusRoot } from "./modules/recurrence-status.js?v=20260630-runtimefix";
import { clientesModule, clientesRoot } from "./modules/clientes.js?v=20260630-runtimefix";
import { frotaModule, frotaRoot } from "./modules/frota.js?v=20260630-runtimefix";
import { pmocModule, pmocRoot } from "./modules/pmoc.js?v=20260630-runtimefix";
import { recorrenciasModule, recorrenciasRoot } from "./modules/recorrencias.js?v=20260630-runtimefix";
import { relatoriosModule, relatoriosRoot } from "./modules/relatorios.js?v=20260630-runtimefix";
import { domModule, domRoot } from "./modules/ui/dom.js?v=20260630-runtimefix";
import { eventosModule, eventsRoot } from "./modules/eventos.js?v=20260630-runtimefix";
import { bootstrapModule, bootstrapRoot } from "./modules/bootstrap.js?v=20260630-runtimefix";

export const adminModules = {
  api: apiModule,
  auth: authModule,
  agenda: agendaModule,
  recurrenceUi: recurrenceUiModule,
  clientes: clientesModule,
  frota: frotaModule,
  pmoc: pmocModule,
  recorrencias: recorrenciasModule,
  relatorios: relatoriosModule,
  dom: domModule,
  eventos: eventosModule,
  bootstrap: bootstrapModule
};

const adminSources = [
  recurrenceStatusRoot,
  apiRoot,
  authRoot,
  frotaRoot,
  agendaRoot,
  recorrenciasRoot,
  clientesRoot,
  pmocRoot,
  relatoriosRoot,
  domRoot,
  eventsRoot,
  bootstrapRoot
];

window.adminModules = adminModules;

Function(adminSources.join("\n"))();

