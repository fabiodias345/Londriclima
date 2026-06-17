-- Flexible technical teams: users can be technicians or assistants, teams can have many members,
-- clients can have many teams, and service orders can have many responsible users/teams.
ALTER TYPE "UsuarioRole" ADD VALUE IF NOT EXISTS 'auxiliar';

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "telefone" TEXT;

CREATE TYPE "EquipeMembroFuncao" AS ENUM ('lider', 'tecnico', 'auxiliar');
CREATE TYPE "OrdemServicoResponsavelTipo" AS ENUM ('usuario', 'equipe');

CREATE TABLE "equipe_membros" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "equipe_id" UUID NOT NULL,
  "usuario_id" UUID NOT NULL,
  "funcao" "EquipeMembroFuncao" NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "equipe_membros_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cliente_equipes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "cliente_id" UUID NOT NULL,
  "equipe_id" UUID NOT NULL,
  "principal" BOOLEAN NOT NULL DEFAULT false,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cliente_equipes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ordem_servico_responsaveis" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "ordem_servico_id" UUID NOT NULL,
  "tipo" "OrdemServicoResponsavelTipo" NOT NULL,
  "usuario_id" UUID,
  "equipe_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ordem_servico_responsaveis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "equipe_membros_equipe_id_usuario_id_key" ON "equipe_membros"("equipe_id", "usuario_id");
CREATE INDEX "equipe_membros_empresa_id_idx" ON "equipe_membros"("empresa_id");
CREATE INDEX "equipe_membros_usuario_id_idx" ON "equipe_membros"("usuario_id");

CREATE UNIQUE INDEX "cliente_equipes_cliente_id_equipe_id_key" ON "cliente_equipes"("cliente_id", "equipe_id");
CREATE INDEX "cliente_equipes_empresa_id_idx" ON "cliente_equipes"("empresa_id");
CREATE INDEX "cliente_equipes_equipe_id_idx" ON "cliente_equipes"("equipe_id");

CREATE UNIQUE INDEX "ordem_servico_responsaveis_ordem_servico_id_usuario_id_key" ON "ordem_servico_responsaveis"("ordem_servico_id", "usuario_id");
CREATE UNIQUE INDEX "ordem_servico_responsaveis_ordem_servico_id_equipe_id_key" ON "ordem_servico_responsaveis"("ordem_servico_id", "equipe_id");
CREATE INDEX "ordem_servico_responsaveis_empresa_id_idx" ON "ordem_servico_responsaveis"("empresa_id");
CREATE INDEX "ordem_servico_responsaveis_usuario_id_idx" ON "ordem_servico_responsaveis"("usuario_id");
CREATE INDEX "ordem_servico_responsaveis_equipe_id_idx" ON "ordem_servico_responsaveis"("equipe_id");

ALTER TABLE "equipe_membros" ADD CONSTRAINT "equipe_membros_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipe_membros" ADD CONSTRAINT "equipe_membros_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cliente_equipes" ADD CONSTRAINT "cliente_equipes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cliente_equipes" ADD CONSTRAINT "cliente_equipes_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordem_servico_responsaveis" ADD CONSTRAINT "ordem_servico_responsaveis_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ordem_servico_responsaveis" ADD CONSTRAINT "ordem_servico_responsaveis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ordem_servico_responsaveis" ADD CONSTRAINT "ordem_servico_responsaveis_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "equipe_membros" ("empresa_id", "equipe_id", "usuario_id", "funcao", "ativo", "atualizado_em")
SELECT "empresa_id", "id", "tecnico_id", 'lider', true, CURRENT_TIMESTAMP
FROM "equipes"
WHERE "tecnico_id" IS NOT NULL
ON CONFLICT ("equipe_id", "usuario_id") DO NOTHING;
