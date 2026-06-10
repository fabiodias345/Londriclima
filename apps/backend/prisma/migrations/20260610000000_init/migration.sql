-- CreateEnum
CREATE TYPE "UsuarioRole" AS ENUM ('admin', 'supervisor', 'tecnico');

-- CreateEnum
CREATE TYPE "PessoaTipo" AS ENUM ('pf', 'pj');

-- CreateEnum
CREATE TYPE "OrdemServicoStatus" AS ENUM ('pre_chamado', 'rejeitada', 'aberta', 'em_deslocamento', 'em_atendimento', 'cancelada', 'concluida');

-- CreateEnum
CREATE TYPE "OrdemServicoEventoAcao" AS ENUM ('criar_pre_chamado', 'aprovar', 'rejeitar', 'iniciar_rota', 'cheguei_cliente', 'cancelar', 'finalizar');

-- CreateEnum
CREATE TYPE "EvidenciaTipo" AS ENUM ('antes', 'depois');

-- CreateEnum
CREATE TYPE "AutomacaoTipo" AS ENUM ('gerar_pdf', 'enviar_email', 'enviar_whatsapp', 'recorrencia_180_dias');

-- CreateEnum
CREATE TYPE "AutomacaoStatus" AS ENUM ('pendente', 'processando', 'concluida', 'falhou', 'cancelada');

-- CreateTable
CREATE TABLE "empresas" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "role" "UsuarioRole" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipes" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tecnico_id" UUID,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipe_auxiliares" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "equipe_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipe_auxiliares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "tipo" "PessoaTipo" NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_enderecos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "nome" TEXT,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "cep" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_enderecos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipamentos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "capacidade_btu" INTEGER,
    "numero_serie" TEXT,
    "local_instalacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "endereco_id" UUID,
    "equipamento_id" UUID,
    "equipe_id" UUID,
    "tecnico_id" UUID,
    "status" "OrdemServicoStatus" NOT NULL DEFAULT 'pre_chamado',
    "titulo" TEXT NOT NULL,
    "problema_relatado" TEXT,
    "agendada_para" TIMESTAMP(3),
    "valor_cobrado" DECIMAL(12,2),
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizada_em" TIMESTAMP(3) NOT NULL,
    "concluida_em" TIMESTAMP(3),

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordem_servico_eventos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "usuario_id" UUID,
    "acao" "OrdemServicoEventoAcao" NOT NULL,
    "status_anterior" "OrdemServicoStatus",
    "status_novo" "OrdemServicoStatus" NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "registrado_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordem_servico_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordem_servico_evidencias" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "tipo" "EvidenciaTipo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "storage_url" TEXT NOT NULL,
    "mime_type" TEXT,
    "tamanho_bytes" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordem_servico_evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordem_servico_checklists" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "servico_realizado" TEXT NOT NULL,
    "procedimentos" TEXT[],
    "custo_total_pecas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordem_servico_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordem_servico_pecas" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "checklist_id" UUID NOT NULL,
    "descricao_peca" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "custo_unitario" DECIMAL(12,2) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordem_servico_pecas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordem_servico_assinaturas" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "nome_responsavel" TEXT NOT NULL,
    "storage_url" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "assinado_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordem_servico_assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordem_servico_observacoes" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "visivel_no_relatorio" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordem_servico_observacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automacoes_agendadas" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "ordem_servico_id" UUID,
    "tipo" "AutomacaoTipo" NOT NULL,
    "status" "AutomacaoStatus" NOT NULL DEFAULT 'pendente',
    "executar_em" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erro_ultima_tentativa" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automacoes_agendadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE INDEX "usuarios_empresa_id_idx" ON "usuarios"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_empresa_id_email_key" ON "usuarios"("empresa_id", "email");

-- CreateIndex
CREATE INDEX "equipes_empresa_id_idx" ON "equipes"("empresa_id");

-- CreateIndex
CREATE INDEX "equipe_auxiliares_empresa_id_idx" ON "equipe_auxiliares"("empresa_id");

-- CreateIndex
CREATE INDEX "equipe_auxiliares_equipe_id_idx" ON "equipe_auxiliares"("equipe_id");

-- CreateIndex
CREATE INDEX "clientes_empresa_id_idx" ON "clientes"("empresa_id");

-- CreateIndex
CREATE INDEX "clientes_empresa_id_documento_idx" ON "clientes"("empresa_id", "documento");

-- CreateIndex
CREATE INDEX "cliente_enderecos_empresa_id_idx" ON "cliente_enderecos"("empresa_id");

-- CreateIndex
CREATE INDEX "cliente_enderecos_cliente_id_idx" ON "cliente_enderecos"("cliente_id");

-- CreateIndex
CREATE INDEX "equipamentos_empresa_id_idx" ON "equipamentos"("empresa_id");

-- CreateIndex
CREATE INDEX "equipamentos_cliente_id_idx" ON "equipamentos"("cliente_id");

-- CreateIndex
CREATE INDEX "ordens_servico_empresa_id_status_idx" ON "ordens_servico"("empresa_id", "status");

-- CreateIndex
CREATE INDEX "ordens_servico_empresa_id_agendada_para_idx" ON "ordens_servico"("empresa_id", "agendada_para");

-- CreateIndex
CREATE INDEX "ordens_servico_cliente_id_idx" ON "ordens_servico"("cliente_id");

-- CreateIndex
CREATE INDEX "ordem_servico_eventos_empresa_id_idx" ON "ordem_servico_eventos"("empresa_id");

-- CreateIndex
CREATE INDEX "ordem_servico_eventos_ordem_servico_id_idx" ON "ordem_servico_eventos"("ordem_servico_id");

-- CreateIndex
CREATE INDEX "ordem_servico_evidencias_empresa_id_idx" ON "ordem_servico_evidencias"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "ordem_servico_evidencias_ordem_servico_id_tipo_key" ON "ordem_servico_evidencias"("ordem_servico_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "ordem_servico_checklists_ordem_servico_id_key" ON "ordem_servico_checklists"("ordem_servico_id");

-- CreateIndex
CREATE INDEX "ordem_servico_checklists_empresa_id_idx" ON "ordem_servico_checklists"("empresa_id");

-- CreateIndex
CREATE INDEX "ordem_servico_pecas_empresa_id_idx" ON "ordem_servico_pecas"("empresa_id");

-- CreateIndex
CREATE INDEX "ordem_servico_pecas_checklist_id_idx" ON "ordem_servico_pecas"("checklist_id");

-- CreateIndex
CREATE UNIQUE INDEX "ordem_servico_assinaturas_ordem_servico_id_key" ON "ordem_servico_assinaturas"("ordem_servico_id");

-- CreateIndex
CREATE INDEX "ordem_servico_assinaturas_empresa_id_idx" ON "ordem_servico_assinaturas"("empresa_id");

-- CreateIndex
CREATE INDEX "ordem_servico_observacoes_empresa_id_idx" ON "ordem_servico_observacoes"("empresa_id");

-- CreateIndex
CREATE INDEX "ordem_servico_observacoes_ordem_servico_id_idx" ON "ordem_servico_observacoes"("ordem_servico_id");

-- CreateIndex
CREATE INDEX "automacoes_agendadas_empresa_id_status_executar_em_idx" ON "automacoes_agendadas"("empresa_id", "status", "executar_em");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipe_auxiliares" ADD CONSTRAINT "equipe_auxiliares_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_enderecos" ADD CONSTRAINT "cliente_enderecos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_endereco_id_fkey" FOREIGN KEY ("endereco_id") REFERENCES "cliente_enderecos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico_eventos" ADD CONSTRAINT "ordem_servico_eventos_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico_eventos" ADD CONSTRAINT "ordem_servico_eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico_evidencias" ADD CONSTRAINT "ordem_servico_evidencias_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico_checklists" ADD CONSTRAINT "ordem_servico_checklists_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico_pecas" ADD CONSTRAINT "ordem_servico_pecas_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "ordem_servico_checklists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico_assinaturas" ADD CONSTRAINT "ordem_servico_assinaturas_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico_observacoes" ADD CONSTRAINT "ordem_servico_observacoes_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automacoes_agendadas" ADD CONSTRAINT "automacoes_agendadas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automacoes_agendadas" ADD CONSTRAINT "automacoes_agendadas_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
