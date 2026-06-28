ALTER TABLE "usuarios"
ADD COLUMN "login" TEXT;

WITH candidatos AS (
  SELECT
    "id",
    row_number() OVER (ORDER BY "criado_em", "id") AS ordem
  FROM "usuarios"
  WHERE lower("email") = 'tecnico@airmovebr.local'
)
UPDATE "usuarios" AS usuario
SET "login" = CASE
  WHEN candidatos.ordem = 1 THEN 'tecnico'
  ELSE 'tecnico-' || candidatos.ordem::text
END
FROM candidatos
WHERE usuario."id" = candidatos."id";

CREATE UNIQUE INDEX "usuarios_login_key"
ON "usuarios"("login");
