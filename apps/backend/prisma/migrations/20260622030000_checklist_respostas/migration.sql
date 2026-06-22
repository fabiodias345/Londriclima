CREATE TABLE "ordem_servico_checklist_respostas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "ordem_servico_id" UUID NOT NULL,
  "checklist_id" UUID NOT NULL,
  "equipamento_id" UUID NOT NULL,
  "checklist_tipo" "ChecklistTipo" NOT NULL,
  "codigo" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "valor" TEXT NOT NULL,
  "observacao" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ordem_servico_checklist_respostas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ordem_servico_checklist_respostas_ordem_servico_id_equipamento_id_codigo_key"
ON "ordem_servico_checklist_respostas"("ordem_servico_id", "equipamento_id", "codigo");

CREATE INDEX "ordem_servico_checklist_respostas_empresa_id_idx"
ON "ordem_servico_checklist_respostas"("empresa_id");

CREATE INDEX "ordem_servico_checklist_respostas_checklist_id_idx"
ON "ordem_servico_checklist_respostas"("checklist_id");

CREATE INDEX "ordem_servico_checklist_respostas_equipamento_id_idx"
ON "ordem_servico_checklist_respostas"("equipamento_id");

ALTER TABLE "ordem_servico_checklist_respostas"
ADD CONSTRAINT "ordem_servico_checklist_respostas_ordem_servico_id_fkey"
FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordem_servico_checklist_respostas"
ADD CONSTRAINT "ordem_servico_checklist_respostas_checklist_id_fkey"
FOREIGN KEY ("checklist_id") REFERENCES "ordem_servico_checklists"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordem_servico_checklist_respostas"
ADD CONSTRAINT "ordem_servico_checklist_respostas_equipamento_id_fkey"
FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
