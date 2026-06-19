import { apiModule, apiRoot } from "./modules/api.js";
import { authModule, authRoot } from "./modules/auth.js";
import { agendaModule, agendaRoot } from "./modules/agenda.js";
import { clientesModule, clientesRoot } from "./modules/clientes.js";
import { frotaModule, frotaRoot } from "./modules/frota.js";
import { pmocModule, pmocRoot } from "./modules/pmoc.js";
import { recorrenciasModule, recorrenciasRoot } from "./modules/recorrencias.js";
import { relatoriosModule, relatoriosRoot } from "./modules/relatorios.js";
import { domModule, domRoot } from "./modules/ui/dom.js";
import { eventosModule, eventsRoot } from "./modules/eventos.js";
import { bootstrapModule, bootstrapRoot } from "./modules/bootstrap.js";

export const adminModules = {
  api: apiModule,
  auth: authModule,
  agenda: agendaModule,
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
  clientesRoot,
  pmocRoot,
  relatoriosRoot,
  domRoot,
  eventsRoot,
  bootstrapRoot
];

window.adminModules = adminModules;

Function(adminSources.join("\n"))();
