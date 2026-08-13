ALTER TABLE "ordens_servico" ADD COLUMN "levantamento_id" UUID;

CREATE UNIQUE INDEX "ordens_servico_levantamento_id_key" ON "ordens_servico"("levantamento_id");

ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_levantamento_id_fkey" FOREIGN KEY ("levantamento_id") REFERENCES "levantamentos_tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;