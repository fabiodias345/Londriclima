ALTER TABLE "clientes" ADD COLUMN "tecnico_responsavel_id" UUID;

ALTER TABLE "clientes" ADD CONSTRAINT "clientes_tecnico_responsavel_id_fkey"
  FOREIGN KEY ("tecnico_responsavel_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "clientes_tecnico_responsavel_id_idx" ON "clientes"("tecnico_responsavel_id");
