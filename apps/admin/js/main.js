import { apiModule, apiRoot } from "./modules/api.js?v=20260630-recshow";
import { authModule, authRoot } from "./modules/auth.js?v=20260630-recshow";
import { agendaModule, agendaRoot } from "./modules/agenda.js?v=20260630-recshow";
import { recurrenceUiModule, recurrenceUiRoot } from "./modules/recurrence-ui.js?v=20260630-recshow";
import { clientesModule, clientesRoot } from "./modules/clientes.js?v=20260630-recshow";
import { frotaModule, frotaRoot } from "./modules/frota.js?v=20260630-recshow";
import { pmocModule, pmocRoot } from "./modules/pmoc.js?v=20260630-recshow";
import { recorrenciasModule, recorrenciasRoot } from "./modules/recorrencias.js?v=20260630-recshow";
import { relatoriosModule, relatoriosRoot } from "./modules/relatorios.js?v=20260630-recshow";
import { domModule, domRoot } from "./modules/ui/dom.js?v=20260630-recshow";
import { eventosModule, eventsRoot } from "./modules/eventos.js?v=20260630-recshow";
import { bootstrapModule, bootstrapRoot } from "./modules/bootstrap.js?v=20260630-recshow";

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
  apiRoot,
  authRoot,
  frotaRoot,
  agendaRoot,
  recorrenciasRoot,
  recurrenceUiRoot,
  clientesRoot,
  pmocRoot,
  relatoriosRoot,
  domRoot,
  eventsRoot,
  bootstrapRoot
];

window.adminModules = adminModules;

Function(adminSources.join("\n"))();

