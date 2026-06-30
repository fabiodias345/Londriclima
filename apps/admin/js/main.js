import { apiModule, apiRoot } from "./modules/api.js?v=20260630-recostatus";
import { authModule, authRoot } from "./modules/auth.js?v=20260630-recostatus";
import { agendaModule, agendaRoot } from "./modules/agenda.js?v=20260630-recostatus";
import { recurrenceUiModule } from "./modules/recurrence-ui.js?v=20260630-recostatus";
import { recurrenceStatusRoot } from "./modules/recurrence-status.js?v=20260630-recostatus";
import { clientesModule, clientesRoot } from "./modules/clientes.js?v=20260630-recostatus";
import { frotaModule, frotaRoot } from "./modules/frota.js?v=20260630-recostatus";
import { pmocModule, pmocRoot } from "./modules/pmoc.js?v=20260630-recostatus";
import { recorrenciasModule, recorrenciasRoot } from "./modules/recorrencias.js?v=20260630-recostatus";
import { relatoriosModule, relatoriosRoot } from "./modules/relatorios.js?v=20260630-recostatus";
import { domModule, domRoot } from "./modules/ui/dom.js?v=20260630-recostatus";
import { eventosModule, eventsRoot } from "./modules/eventos.js?v=20260630-recostatus";
import { bootstrapModule, bootstrapRoot } from "./modules/bootstrap.js?v=20260630-recostatus";

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

