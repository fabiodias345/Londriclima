ALTER TABLE "whatsapp_conversas"
  ADD COLUMN "ultima_leitura_em" TIMESTAMP(3),
  ADD COLUMN "cliente_id" UUID,
  ADD COLUMN "ordem_servico_id" UUID,
  ADD COLUMN "encerramento_motivo" TEXT;

CREATE UNIQUE INDEX "whatsapp_conversas_ordem_servico_id_key"
  ON "whatsapp_conversas"("ordem_servico_id");

CREATE INDEX "whatsapp_conversas_empresa_id_ultima_leitura_em_idx"
  ON "whatsapp_conversas"("empresa_id", "ultima_leitura_em");

ALTER TABLE "whatsapp_conversas"
  ADD CONSTRAINT "whatsapp_conversas_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whatsapp_conversas"
  ADD CONSTRAINT "whatsapp_conversas_ordem_servico_id_fkey"
  FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whatsapp_mensagens" ADD COLUMN "status_entrega" TEXT, ADD COLUMN "status_entrega_em" TIMESTAMP(3);
