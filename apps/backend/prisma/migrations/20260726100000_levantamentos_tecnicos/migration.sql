CREATE TYPE "LevantamentoStatus" AS ENUM (
  'pendente_agendamento',
  'agendado',
  'em_levantamento',
  'diagnostico_concluido',
  'resolvido_na_visita',
  'cancelado'
);

CREATE TABLE "levantamentos_tecnicos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "cliente_id" UUID NOT NULL,
  "conversa_id" UUID,
  "equipe_id" UUID,
  "tecnico_id" UUID,
  "problema" TEXT NOT NULL,
  "agendada_para" TIMESTAMP(3),
  "status" "LevantamentoStatus" NOT NULL DEFAULT 'pendente_agendamento',
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tecnico_avisado_em" TIMESTAMP(3),
  "lembrete_tecnico_em" TIMESTAMP(3),
  "notificacao_erro" TEXT,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "levantamentos_tecnicos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "levantamentos_tecnicos_conversa_id_key"
  ON "levantamentos_tecnicos"("conversa_id");

CREATE INDEX "levantamentos_tecnicos_empresa_id_status_agendada_para_idx"
  ON "levantamentos_tecnicos"("empresa_id", "status", "agendada_para");

ALTER TABLE "levantamentos_tecnicos" ADD CONSTRAINT "levantamentos_tecnicos_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "levantamentos_tecnicos" ADD CONSTRAINT "levantamentos_tecnicos_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "levantamentos_tecnicos" ADD CONSTRAINT "levantamentos_tecnicos_conversa_id_fkey"
  FOREIGN KEY ("conversa_id") REFERENCES "whatsapp_conversas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "levantamentos_tecnicos" ADD CONSTRAINT "levantamentos_tecnicos_equipe_id_fkey"
  FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "levantamentos_tecnicos" ADD CONSTRAINT "levantamentos_tecnicos_tecnico_id_fkey"
  FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
