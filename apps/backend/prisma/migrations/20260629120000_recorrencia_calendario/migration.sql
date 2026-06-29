ALTER TABLE "planos_recorrencia"
ADD COLUMN "calendario" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "dia_geracao" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "planos_recorrencia_geracoes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "plano_id" UUID NOT NULL,
  "ordem_servico_id" UUID NOT NULL,
  "competencia_ano" INTEGER NOT NULL,
  "competencia_mes" INTEGER NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "planos_recorrencia_geracoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "planos_recorrencia_geracoes_plano_id_competencia_ano_competencia_mes_key"
ON "planos_recorrencia_geracoes"("plano_id", "competencia_ano", "competencia_mes");

CREATE INDEX "planos_recorrencia_geracoes_empresa_id_idx"
ON "planos_recorrencia_geracoes"("empresa_id");

CREATE INDEX "planos_recorrencia_geracoes_ordem_servico_id_idx"
ON "planos_recorrencia_geracoes"("ordem_servico_id");

ALTER TABLE "planos_recorrencia_geracoes"
ADD CONSTRAINT "planos_recorrencia_geracoes_empresa_id_fkey"
FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "planos_recorrencia_geracoes"
ADD CONSTRAINT "planos_recorrencia_geracoes_plano_id_fkey"
FOREIGN KEY ("plano_id") REFERENCES "planos_recorrencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "planos_recorrencia_geracoes"
ADD CONSTRAINT "planos_recorrencia_geracoes_ordem_servico_id_fkey"
FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
