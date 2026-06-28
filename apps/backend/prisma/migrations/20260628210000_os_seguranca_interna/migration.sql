CREATE TABLE "ordem_servico_segurancas" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "usuario_id" UUID,
    "respostas" JSONB NOT NULL,
    "aprovado" BOOLEAN NOT NULL,
    "motivo_bloqueio" TEXT,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "registrado_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordem_servico_segurancas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ordem_servico_segurancas_empresa_id_idx" ON "ordem_servico_segurancas"("empresa_id");
CREATE INDEX "ordem_servico_segurancas_ordem_servico_id_idx" ON "ordem_servico_segurancas"("ordem_servico_id");
CREATE INDEX "ordem_servico_segurancas_usuario_id_idx" ON "ordem_servico_segurancas"("usuario_id");

ALTER TABLE "ordem_servico_segurancas"
ADD CONSTRAINT "ordem_servico_segurancas_ordem_servico_id_fkey"
FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordem_servico_segurancas"
ADD CONSTRAINT "ordem_servico_segurancas_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
