ALTER TABLE "orcamentos"
ADD COLUMN "agendada_para" TIMESTAMP(3),
ADD COLUMN "equipe_id" UUID,
ADD COLUMN "tecnico_id" UUID;

CREATE INDEX "orcamentos_empresa_id_agendada_para_idx" ON "orcamentos"("empresa_id", "agendada_para");
