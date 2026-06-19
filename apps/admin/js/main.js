import { agendaModule } from "./modules/agenda.js";
import { clientesModule } from "./modules/clientes.js";
import { frotaModule } from "./modules/frota.js";
import { pmocModule } from "./modules/pmoc.js";
import { recorrenciasModule } from "./modules/recorrencias.js";

export const adminModules = {
  agenda: agendaModule,
  clientes: clientesModule,
  frota: frotaModule,
  pmoc: pmocModule,
  recorrencias: recorrenciasModule
};

window.adminModules = adminModules;

import "../script.js";
