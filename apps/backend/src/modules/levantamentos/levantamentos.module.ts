import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AutomacoesModule } from "../automacoes/automacoes.module";
import { LevantamentosController } from "./levantamentos.controller";
import { LevantamentosLembreteScheduler } from "./levantamentos-lembrete.scheduler";
import { LevantamentosNotificacaoService } from "./levantamentos-notificacao.service";
import { LevantamentosService } from "./levantamentos.service";
import { LevantamentosTecnicoController } from "./levantamentos-tecnico.controller";
import { LevantamentosTecnicoService } from "./levantamentos-tecnico.service";

@Module({ imports: [AuthModule, AutomacoesModule], controllers: [LevantamentosController, LevantamentosTecnicoController], providers: [LevantamentosService, LevantamentosTecnicoService, LevantamentosNotificacaoService, LevantamentosLembreteScheduler], exports: [LevantamentosService, LevantamentosTecnicoService, LevantamentosNotificacaoService] })
export class LevantamentosModule {}
