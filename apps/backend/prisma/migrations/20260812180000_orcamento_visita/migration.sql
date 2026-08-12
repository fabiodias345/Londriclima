ALTER TABLE "levantamentos_tecnicos" ADD COLUMN "orcamento_id" UUID;
CREATE UNIQUE INDEX "levantamentos_tecnicos_orcamento_id_key" ON "levantamentos_tecnicos"("orcamento_id");
ALTER TABLE "levantamentos_tecnicos" ADD CONSTRAINT "levantamentos_tecnicos_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;