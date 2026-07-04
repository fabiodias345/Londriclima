WITH candidatos AS (
  SELECT DISTINCT ON (u."empresa_id")
    u."empresa_id",
    u."senha_hash"
  FROM "usuarios" u
  WHERE u."ativo" = true
  ORDER BY u."empresa_id", u."criado_em" ASC
),
empresas_sem_admin AS (
  SELECT c."empresa_id", c."senha_hash"
  FROM candidatos c
  WHERE NOT EXISTS (
    SELECT 1
    FROM "usuarios" admin
    WHERE admin."empresa_id" = c."empresa_id"
      AND admin."role" = 'admin'
      AND admin."ativo" = true
  )
),
admins_para_criar AS (
  SELECT
    e."empresa_id",
    e."senha_hash",
    row_number() OVER (ORDER BY e."empresa_id") AS ordem
  FROM empresas_sem_admin e
)
INSERT INTO "usuarios" (
  "id",
  "empresa_id",
  "nome",
  "login",
  "email",
  "senha_hash",
  "role",
  "ativo",
  "criado_em",
  "atualizado_em"
)
SELECT
  gen_random_uuid(),
  e."empresa_id",
  'Administrador Clima do Brasil',
  CASE
    WHEN e.ordem = 1 AND NOT EXISTS (SELECT 1 FROM "usuarios" u WHERE u."login" = 'admin') THEN 'admin'
    ELSE 'admin-' || substr(replace(e."empresa_id"::text, '-', ''), 1, 8)
  END,
  'admin+' || e."empresa_id"::text || '@airmovebr.local',
  e."senha_hash",
  'admin',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM admins_para_criar e
WHERE NOT EXISTS (
  SELECT 1
  FROM "usuarios" u
  WHERE u."empresa_id" = e."empresa_id"
    AND u."email" = 'admin+' || e."empresa_id"::text || '@airmovebr.local'
);
