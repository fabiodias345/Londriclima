CREATE TYPE "CategoriaAtendimento" AS ENUM ('ar_condicionado', 'camara_fria');

ALTER TABLE "equipamentos"
ADD COLUMN "categoria" "CategoriaAtendimento" NOT NULL DEFAULT 'ar_condicionado';

ALTER TABLE "ordens_servico"
ADD COLUMN "categoria_servico" "CategoriaAtendimento" NOT NULL DEFAULT 'ar_condicionado';
