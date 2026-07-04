CREATE TABLE "convites_tecnico" (
  "id" UUID NOT NULL,
  "empresa_id" UUID NOT NULL,
  "criado_por_id" UUID NOT NULL,
  "codigo_hash" TEXT NOT NULL,
  "codigo_sufixo" CHAR(4) NOT NULL,
  "expira_em" TIMESTAMP(3) NOT NULL,
  "cancelado_em" TIMESTAMP(3),
  "usado_em" TIMESTAMP(3),
  "usuario_criado_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "convites_tecnico_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "convites_tecnico_codigo_hash_key" ON "convites_tecnico"("codigo_hash");
CREATE UNIQUE INDEX "convites_tecnico_usuario_criado_id_key" ON "convites_tecnico"("usuario_criado_id");
CREATE INDEX "convites_tecnico_empresa_id_criado_em_idx" ON "convites_tecnico"("empresa_id", "criado_em");
CREATE INDEX "convites_tecnico_expira_em_idx" ON "convites_tecnico"("expira_em");

ALTER TABLE "convites_tecnico" ADD CONSTRAINT "convites_tecnico_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "convites_tecnico" ADD CONSTRAINT "convites_tecnico_criado_por_id_fkey"
  FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "convites_tecnico" ADD CONSTRAINT "convites_tecnico_usuario_criado_id_fkey"
  FOREIGN KEY ("usuario_criado_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
