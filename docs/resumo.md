# Resumo AIRMOVEBR

## Plano de segurança do Admin — 11/08/2026

- Issue #5: remover `admin/123456` e implementar rotação segura da senha admin.
- Issue #6: limpar artefatos do Strix, preservando somente os três relatórios PT-BR.
- Issue #7: validar Docker local e produção sem chamar Meta, WhatsApp ou integrações externas.
- Issue #8: publicar as correções após validação e configuração segura da nova senha.
- Limpeza do Strix: concluída; permanecem somente os três relatórios PT-BR em `strix_runs/`.
- Proteção inicial: concluída; o Admin não preenche mais `123456`, o seed exige `ADMIN_INITIAL_PASSWORD` e foi criado o comando `admin:password`.
- Rotação local: concluída; `123456` retorna `401`, a nova senha retorna `201`, health retorna `200` e o Admin retorna `200`.
- O arquivo temporário da senha foi removido após a validação.
- Próximo passo: configurar uma senha própria no servidor, validar produção sem integrações externas e publicar.

Atualizado em: 09/08/2026

## Estado publicado — 02/08/2026

- A IA do atendimento WhatsApp está publicada em produção, com fallback para o BOLT quando necessário.
- O fluxo do WhatsApp prioriza uma conversa humana, identifica CEP informado com ou sem hífen e busca o endereço automaticamente.
- O cliente não precisa informar modelo, marca, BTUs ou foto; essas informações ficam para o técnico.
- O agendamento de visita técnica permanece liberado somente para os fluxos de manutenção.
- O último commit publicado é `63fa29e`, que reverteu a liberação de visita técnica para instalação.

## Regras atuais

- Evoluir o sistema existente; não recomeçar do zero.
- Toda mudanca deve ser registrada em uma Issue antes do desenvolvimento. A branch deve incluir o numero da Issue e o Pull Request deve usar `Closes #numero`, `Fixes #numero` ou `Resolves #numero` para fechar a tarefa somente depois do merge na `main`; `Refs #numero` mantem a Issue aberta.
- Antes de chegar a `main` ou ao ambiente principal, toda mudanca precisa passar por PIOMI, STRIKE, revisao de arquitetura, teste de validacao e CI/CD. O PR deve mostrar essas validacoes; sem aprovacao completa, nao fazer merge nem deploy.
- A IA será implantada gradualmente no software atual.
- A chave `OPENAI_API_KEY` é exclusiva da IA do produto, no Admin e no APK.
- Não usar os créditos da chave para Codex, VSCode, respostas nesta conversa ou codificação.
- A chave permanece somente no backend, fora do frontend, APK e Git.
- O modelo inicial escolhido é `gpt-5.6-luna`.
- Toda ação comercial gerada pela IA deve passar pela confirmação do atendente.

## Estado atual

- Sistema AIRMOVEBR existente com backend, painel Admin, WhatsApp e aplicativo.
- WhatsApp oficial integrado ao sistema.
- Módulo de clientes, atendimento, orçamento, PDF comercial e envio de mensagens já existente.
- Chave OpenAI configurada no ambiente real do backend.
- Crédito adicionado e chamada mínima à API validada com sucesso.

## Novo direcionamento: IA no atendimento e orçamento

- Unificar WhatsApp e orçamento na mesma tela do Admin.
- Criar um copiloto para auxiliar a atendente durante a conversa.
- Interpretar mensagens e identificar cliente, serviço, equipamento, endereço e urgência.
- Sugerir perguntas quando faltarem informações.
- Montar rascunho do orçamento com dados estruturados.
- Consultar clientes, catálogo e preços através das funções do sistema.
- Permitir revisão e alteração manual antes da aprovação.
- Gerar o PDF final do orçamento usando o template oficial do sistema.
- Permitir visualizar, salvar e enviar o PDF pelo WhatsApp.
- Registrar histórico das sugestões, alterações, aprovação e envio.

## Regras do orçamento com IA

- A IA não define preços finais por conta própria.
- Valores, descontos, totais e condições devem ser validados pelo backend.
- O PDF só pode ser gerado após confirmação da atendente.
- O PDF só pode ser enviado ao cliente após confirmação explícita.
- O fluxo atual deve continuar disponível como fallback.

## Plano ativo: IA no atendimento e orçamento

### Status das fases

- **Fase 0 — Fundação e diagnóstico:** concluída.
- **Fase 1 — Preparação do backend:** concluída.
- **Fase 2 — Ferramentas do copiloto:** concluída.
- **Fase 3 — Tela única no Admin:** concluída.
- **Fase 4 — PDF e envio:** concluída.
- **Fase 5 — APK e expansão:** em andamento — funções comerciais e IA disponíveis no APK; leitura de fotos permanece posterior.

### Fase 1 — Preparação do backend

- Mapear os endpoints e telas atuais de WhatsApp, clientes e orçamento.
- Criar o serviço OpenAI no backend usando `OPENAI_API_KEY` e `OPENAI_MODEL`.
- Usar `gpt-5.6-luna` pela Responses API.
- Definir entradas, saídas estruturadas, logs e tratamento de erros.

### Fase 2 — Ferramentas do copiloto

- Criar função para buscar ou identificar cliente.
- Criar função para consultar catálogo e preços.
- Criar função para calcular totais, descontos e condições.
- Criar função para montar rascunho de orçamento.
- Impedir que a IA invente preços ou grave alterações sem confirmação.

### Fase 3 — Tela única no Admin

- Unir conversa WhatsApp, dados do cliente e orçamento na mesma tela.
- Exibir resumo da IA e informações identificadas.
- Exibir perguntas pendentes e sugestões de resposta.
- Permitir editar todos os dados antes de confirmar.
- Manter o fluxo manual atual como fallback.

### Fase 4 — PDF e envio

- Gerar o PDF final somente com dados validados pelo backend.
- Permitir pré-visualização e download do PDF.
- Exigir confirmação da atendente antes do envio.
- Enviar o PDF pelo WhatsApp.
- Registrar orçamento, PDF, canal, data, destinatário e status do envio.

### Fase 5 — APK e expansão

- Disponibilizar as funções de IA necessárias no APK.
- Reutilizar as mesmas regras e endpoints do backend.
- Adicionar leitura de fotos e apoio técnico somente depois do fluxo comercial estável.

### Critérios de conclusão

- Nenhum preço ou total pode ser inventado pela IA.
- Nenhum PDF pode ser enviado sem confirmação humana.
- O atendente consegue concluir um orçamento do WhatsApp ao PDF em uma única tela.
- Falhas da OpenAI não impedem o uso manual do sistema.
- A chave OpenAI permanece exclusiva da IA do produto.

## Atualização operacional — 02/08/2026

- O painel Admin usa navegação horizontal com os grupos Configurações, Documentação e Frota.
- O fluxo de orçamento permite validade padrão de 14 dias, com alteração manual para outros prazos.
- Orçamentos podem guardar data, equipe e técnico; após aceite do cliente, o backend tenta criar a O.S. automaticamente.
- Após o aceite, o cliente recebe confirmação e o atendente é notificado para formalizar ou acompanhar a O.S.
- A agenda do WhatsApp foi corrigida para preservar o contexto visual e trocar corretamente o mês.
- O PDF comercial usa o layout profissional da Air Move Climatização, mantendo os dados cadastrais da M. Lima Manutenções.
- O endpoint atual do webhook é `/api/v1/webhooks/whatsapp`; o Caddy também mantém compatibilidade com `/webhooks/whatsapp`.
- O webhook recebe e grava mensagens na caixa de entrada; o envio depende das credenciais carregadas no container.
- O compose de produção foi ajustado para carregar `.env.production` e `chaves.env`, sem registrar credenciais no Git.
- A integração da IA no atendimento está implementada localmente para humanizar as respostas do BOLT, mantendo regras, opções, preços, agenda, propostas e O.S. sob controle do sistema.
- A IA usa fallback para o BOLT quando a chave ou a API estiver indisponível; a integração está publicada na produção.
- Commit atualmente publicado: `63fa29e` (reversão da liberação de visita técnica para instalação).
- O carregamento de `chaves.env` ocorre somente no ambiente de produção e não expõe credenciais no Git.
- Não alterar configurações da Meta; correções de webhook e envio devem ser feitas no projeto, Caddy, container e deploy.
