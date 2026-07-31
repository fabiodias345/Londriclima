# Resumo AIRMOVEBR

Atualizado em: 29/07/2026

## Regras atuais

- Evoluir o sistema existente; não recomeçar do zero.
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
