import { apiModule, apiRoot } from "./modules/api.js?v=20260630-recfix";
import { authModule, authRoot } from "./modules/auth.js?v=20260630-recfix";
import { agendaModule, agendaRoot } from "./modules/agenda.js?v=20260630-recfix";
import { recurrenceUiModule, recurrenceUiRoot } from "./modules/recurrence-ui.js?v=20260630-recfix";
import { clientesModule, clientesRoot } from "./modules/clientes.js?v=20260630-recfix";
import { frotaModule, frotaRoot } from "./modules/frota.js?v=20260630-recfix";
import { pmocModule, pmocRoot } from "./modules/pmoc.js?v=20260630-recfix";
import { recorrenciasModule, recorrenciasRoot } from "./modules/recorrencias.js?v=20260630-recfix";
import { relatoriosModule, relatoriosRoot } from "./modules/relatorios.js?v=20260630-recfix";
import { domModule, domRoot } from "./modules/ui/dom.js?v=20260630-recfix";
import { eventosModule, eventsRoot } from "./modules/eventos.js?v=20260630-recfix";
import { bootstrapModule, bootstrapRoot } from "./modules/bootstrap.js?v=20260630-recfix";

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

