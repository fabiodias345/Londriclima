import { apiModule, apiRoot } from "./modules/api.js?v=20260630-reclist";
import { authModule, authRoot } from "./modules/auth.js?v=20260630-reclist";
import { agendaModule, agendaRoot } from "./modules/agenda.js?v=20260630-reclist";
import { recurrenceUiModule } from "./modules/recurrence-ui.js?v=20260630-reclist";
import { recurrenceStatusRoot } from "./modules/recurrence-status.js?v=20260630-reclist";
import { clientesModule, clientesRoot } from "./modules/clientes.js?v=20260630-reclist";
import { frotaModule, frotaRoot } from "./modules/frota.js?v=20260630-reclist";
import { pmocModule, pmocRoot } from "./modules/pmoc.js?v=20260630-reclist";
import { recorrenciasModule, recorrenciasRoot } from "./modules/recorrencias.js?v=20260630-reclist";
import { relatoriosModule, relatoriosRoot } from "./modules/relatorios.js?v=20260630-reclist";
import { domModule, domRoot } from "./modules/ui/dom.js?v=20260630-reclist";
import { eventosModule, eventsRoot } from "./modules/eventos.js?v=20260630-reclist";
import { bootstrapModule, bootstrapRoot } from "./modules/bootstrap.js?v=20260630-reclist";

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
  recurrenceStatusRoot,
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

