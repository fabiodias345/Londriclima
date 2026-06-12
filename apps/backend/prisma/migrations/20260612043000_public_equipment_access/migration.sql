ALTER TABLE "equipamentos"
ADD COLUMN "codigo_publico" TEXT,
ADD COLUMN "senha_publica_hash" TEXT,
ADD COLUMN "acesso_publico_ativo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "tipo" TEXT,
ADD COLUMN "patrimonio" TEXT,
ADD COLUMN "codigo_barras" TEXT;

UPDATE "equipamentos"
SET
  "codigo_publico" = 'EQ-' || upper(substr(md5("id"::text), 1, 10)),
  "acesso_publico_ativo" = false
WHERE "codigo_publico" IS NULL;

CREATE UNIQUE INDEX "equipamentos_codigo_publico_key" ON "equipamentos"("codigo_publico");
CREATE INDEX "equipamentos_empresa_id_codigo_barras_idx" ON "equipamentos"("empresa_id", "codigo_barras");
CREATE INDEX "equipamentos_empresa_id_patrimonio_idx" ON "equipamentos"("empresa_id", "patrimonio");
