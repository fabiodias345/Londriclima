import { apiModule, apiRoot } from "./modules/api.js?v=20260620-art";
import { authModule, authRoot } from "./modules/auth.js?v=20260620-art";
import { agendaModule, agendaRoot } from "./modules/agenda.js?v=20260620-art";
import { clientesModule, clientesRoot } from "./modules/clientes.js?v=20260620-art";
import { frotaModule, frotaRoot } from "./modules/frota.js?v=20260620-art";
import { pmocModule, pmocRoot } from "./modules/pmoc.js?v=20260620-art";
import { recorrenciasModule, recorrenciasRoot } from "./modules/recorrencias.js?v=20260620-art";
import { relatoriosModule, relatoriosRoot } from "./modules/relatorios.js?v=20260620-art";
import { domModule, domRoot } from "./modules/ui/dom.js?v=20260620-art";
import { eventosModule, eventsRoot } from "./modules/eventos.js?v=20260620-art";
import { bootstrapModule, bootstrapRoot } from "./modules/bootstrap.js?v=20260620-art";

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
