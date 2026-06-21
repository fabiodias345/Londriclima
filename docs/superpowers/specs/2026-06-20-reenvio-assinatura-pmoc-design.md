# Reenvio de assinatura PMOC

## Objetivo

Permitir nova solicitação de assinatura do PMOC quando uma tentativa anterior falhar, sem manter duas solicitações válidas e sem fixar nome ou e-mail do engenheiro no código.

## Regras

- O botão de solicitação permanece disponível enquanto o PMOC estiver pronto para PDF e houver engenheiro responsável com nome e e-mail válidos.
- Nome e e-mail do signatário são lidos do `engenheiro_responsavel` vinculado ao cliente no momento de cada envio.
- Antes de registrar uma nova solicitação, todos os relatórios pendentes do mesmo cliente e empresa são marcados como `cancelado`.
- Eventos e sincronizações posteriores de uma solicitação cancelada não podem assiná-la nem agendar o envio do PDF ao cliente.
- A nova solicitação passa a ser a assinatura atual exibida no dossiê.
- Um signatário existente na Assinafy só pode ser reutilizado quando e-mail e nome normalizados correspondem. Um cadastro com o mesmo e-mail e nome divergente deve produzir erro claro, evitando identificar outra pessoa silenciosamente.

## Fluxo

1. O administrador solicita ou reenvia a assinatura.
2. O backend carrega a prévia oficial e valida o engenheiro vinculado.
3. O backend cria o documento e resolve o signatário usando os dados atuais do engenheiro.
4. Em uma transação, o backend cancela solicitações pendentes anteriores e grava o novo relatório como `aguardando_assinatura_engenheiro`.
5. Webhooks e sincronização ignoram relatórios já cancelados.

## Interface

- Remover a trava baseada em `assinatura_atual.status === aguardando_assinatura_engenheiro`.
- Manter a trava por PMOC incompleto ou engenheiro ausente.
- Quando já existir solicitação pendente, exibir o texto do botão como `Reenviar assinatura`.
- Após sucesso, recarregar o dossiê normalmente.

## Erros

- Engenheiro sem nome ou e-mail: rejeitar antes de criar documento.
- Mesmo e-mail cadastrado na Assinafy com outro nome: rejeitar com mensagem para corrigir o cadastro do signatário.
- Falha da Assinafy: não cancelar a solicitação anterior nem registrar uma nova solicitação como pendente.
- Solicitação antiga concluída depois do reenvio: manter cancelada e não enviar e-mail ao cliente.

## Testes

- O envio usa nome e e-mail atuais do engenheiro, inclusive após alteração do e-mail.
- O reenvio cancela pendências anteriores e cria uma nova solicitação.
- Webhook concluído de relatório cancelado não baixa PDF nem agenda e-mail.
- Sincronização não processa relatórios cancelados.
- Signatário com mesmo e-mail e nome divergente não é reutilizado.
- A interface permite reenvio e mostra `Reenviar assinatura` quando houver pendência.
