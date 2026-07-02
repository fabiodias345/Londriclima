import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const schema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8");

test("modela ar-condicionado e camara fria sem substituir os tipos de servico existentes", () => {
  assert.match(schema, /enum CategoriaAtendimento\s*{\s*ar_condicionado\s+camara_fria\s*}/);
  assert.match(schema, /model Equipamento\s*{[\s\S]*?categoria\s+CategoriaAtendimento\s+@default\(ar_condicionado\)/);
  assert.match(
    schema,
    /model OrdemServico\s*{[\s\S]*?categoriaServico\s+CategoriaAtendimento\s+@default\(ar_condicionado\)\s+@map\("categoria_servico"\)/
  );
  assert.match(schema, /enum OrdemServicoTipoServico\s*{[\s\S]*?preventiva[\s\S]*?corretiva[\s\S]*?instalacao[\s\S]*?}/);
});
