CREATE TYPE "WhatsAppConversaStatus" AS ENUM ('bot', 'humano', 'encerrada');
CREATE TYPE "WhatsAppMensagemDirecao" AS ENUM ('entrada', 'saida');

CREATE TABLE "whatsapp_conversas" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome_contato" TEXT,
    "status" "WhatsAppConversaStatus" NOT NULL DEFAULT 'bot',
    "dados" JSONB,
    "ultima_mensagem_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atribuido_usuario_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_mensagens" (
    "id" UUID NOT NULL,
    "conversa_id" UUID NOT NULL,
    "direcao" "WhatsAppMensagemDirecao" NOT NULL,
    "texto" TEXT NOT NULL,
    "mensagem_id" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'text',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_mensagens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_conversas_empresa_id_telefone_key" ON "whatsapp_conversas"("empresa_id", "telefone");
CREATE INDEX "whatsapp_conversas_empresa_id_status_ultima_mensagem_em_idx" ON "whatsapp_conversas"("empresa_id", "status", "ultima_mensagem_em");
CREATE UNIQUE INDEX "whatsapp_mensagens_mensagem_id_key" ON "whatsapp_mensagens"("mensagem_id");
CREATE INDEX "whatsapp_mensagens_conversa_id_criado_em_idx" ON "whatsapp_mensagens"("conversa_id", "criado_em");

ALTER TABLE "whatsapp_conversas" ADD CONSTRAINT "whatsapp_conversas_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversas" ADD CONSTRAINT "whatsapp_conversas_atribuido_usuario_id_fkey"
  FOREIGN KEY ("atribuido_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_mensagens" ADD CONSTRAINT "whatsapp_mensagens_conversa_id_fkey"
  FOREIGN KEY ("conversa_id") REFERENCES "whatsapp_conversas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
