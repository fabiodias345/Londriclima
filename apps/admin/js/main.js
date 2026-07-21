import { apiModule, apiRoot } from "./modules/api.js?v=20260704-access";
import { authModule, authRoot } from "./modules/auth.js?v=20260704-access";
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
import { whatsappModule, whatsappRoot } from "./modules/whatsapp.js?v=20260721-whatsapp-fix";

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
  bootstrap: bootstrapModule,
  tecnicoFoto: tecnicoFotoModule,
  whatsapp: whatsappModule
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
  tecnicoFotoRoot,
  whatsappRoot,
  eventsRoot,
  bootstrapRoot
];

window.adminModules = adminModules;

Function(adminSources.join("\n"))();

