CREATE TYPE "OrdemServicoOrigem" AS ENUM ('orcamento_aprovado', 'contrato_recorrencia', 'servico_gratuito');

ALTER TABLE "ordens_servico"
  ADD COLUMN "origem" "OrdemServicoOrigem" NOT NULL DEFAULT 'contrato_recorrencia',
  ADD COLUMN "orcamento_id" UUID;

CREATE UNIQUE INDEX "ordens_servico_orcamento_id_key" ON "ordens_servico"("orcamento_id");

ALTER TABLE "ordens_servico"
  ADD CONSTRAINT "ordens_servico_orcamento_id_fkey"
  FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;