import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AutomacoesModule } from "../automacoes/automacoes.module";
import { LevantamentosController } from "./levantamentos.controller";
import { LevantamentosLembreteScheduler } from "./levantamentos-lembrete.scheduler";
import { LevantamentosNotificacaoService } from "./levantamentos-notificacao.service";
import { LevantamentosService } from "./levantamentos.service";

@Module({ imports: [AuthModule, AutomacoesModule], controllers: [LevantamentosController], providers: [LevantamentosService, LevantamentosNotificacaoService, LevantamentosLembreteScheduler], exports: [LevantamentosService, LevantamentosNotificacaoService] })
export class LevantamentosModule {}
