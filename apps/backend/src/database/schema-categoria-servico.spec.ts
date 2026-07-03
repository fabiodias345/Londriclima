import * as assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const prismaDir = join(process.cwd(), "prisma");
const schema = readFileSync(join(prismaDir, "schema.prisma"), "utf8");

test("modela ar-condicionado e camara fria sem substituir os tipos de servico existentes", () => {
  assert.match(schema, /enum CategoriaAtendimento\s*{\s*ar_condicionado\s+camara_fria\s*}/);
  assert.match(schema, /model Equipamento\s*{[\s\S]*?categoria\s+CategoriaAtendimento\s+@default\(ar_condicionado\)/);
  assert.match(
    schema,
    /model OrdemServico\s*{[\s\S]*?categoriaServico\s+CategoriaAtendimento\s+@default\(ar_condicionado\)\s+@map\("categoria_servico"\)/
  );
  assert.match(schema, /enum OrdemServicoTipoServico\s*{[\s\S]*?preventiva[\s\S]*?corretiva[\s\S]*?instalacao[\s\S]*?}/);
});

test("possui migration para persistir categoria de atendimento sem perder registros existentes", () => {
  const migrationsDir = join(prismaDir, "migrations");
  const migrationName = readdirSync(migrationsDir).find((entry) => entry.includes("categoria_atendimento"));

  assert.ok(migrationName, "migration de categoria_atendimento deve existir");

  const migrationSql = readFileSync(join(migrationsDir, migrationName, "migration.sql"), "utf8");

  assert.match(migrationSql, /CREATE TYPE "CategoriaAtendimento" AS ENUM \('ar_condicionado', 'camara_fria'\);/);
  assert.match(
    migrationSql,
    /ALTER TABLE "equipamentos"\s+ADD COLUMN "categoria" "CategoriaAtendimento" NOT NULL DEFAULT 'ar_condicionado';/
  );
  assert.match(
    migrationSql,
    /ALTER TABLE "ordens_servico"\s+ADD COLUMN "categoria_servico" "CategoriaAtendimento" NOT NULL DEFAULT 'ar_condicionado';/
  );
});
