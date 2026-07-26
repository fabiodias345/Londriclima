# Envio de orçamentos e PDF comercial — Design

## Objetivo

Disponibilizar os canais corretos de envio de orçamento no painel administrativo e na central WhatsApp, com assinatura digital obrigatória para valores acima de R$ 2.000,00, e corrigir o PDF comercial para eliminar sobreposição e textos corrompidos.

## Escopo

- Painel web em `apps/admin` e backend em `apps/backend`.
- Envio por WhatsApp e por e-mail para orçamentos de até R$ 2.000,00.
- Envio para assinatura digital por e-mail para orçamentos com total estritamente maior que R$ 2.000,00.
- Correção da renderização do PDF comercial: acentuação, quebras de linha, altura dos blocos, paginação e rodapé.
- Não alterar apps Flutter, APK, PMOC ou regras de criação de O.S.

## Regra de canais

| Total do orçamento | Ações disponíveis | Resultado |
| --- | --- | --- |
| Até R$ 2.000,00 | Enviar por WhatsApp; Enviar por e-mail | PDF segue pelo canal escolhido e o orçamento fica aguardando aprovação. |
| Acima de R$ 2.000,00 | Enviar para assinatura por e-mail | O PDF é enviado ao Assinafy; o cliente recebe o e-mail de assinatura e o orçamento fica aguardando assinatura. |

O botão de assinatura exige e-mail cadastrado no cliente. Se estiver ausente, a tela informa o motivo e não inicia integração externa. O WhatsApp continua disponível como canal de atendimento, mas não registra aceite simples para orçamento acima de R$ 2.000,00.

## Interface administrativa

No detalhe de um orçamento e no cartão de orçamento dentro da central WhatsApp:

- até R$ 2.000,00, exibir os botões `Enviar por WhatsApp` e `Enviar por e-mail`;
- acima de R$ 2.000,00, substituir as ações de envio pelo botão `Enviar para assinatura por e-mail`, acompanhado do texto “O cliente receberá um e-mail para assinar digitalmente.”;
- ocultar a ação de aceite pelo WhatsApp para orçamento acima de R$ 2.000,00;
- após sucesso, recarregar o detalhe e a listagem, exibindo o canal e o estado atual;
- durante a solicitação, desabilitar a ação para impedir envio duplicado.

As telas usarão os endpoints específicos já existentes (`enviar-whatsapp`, `enviar-email` e `assinafy`), deixando de usar o endpoint legado `enviar` no fluxo visual.

## Backend e integridade

O backend continuará sendo a autoridade da regra de R$ 2.000,00. A interface apenas apresenta as ações adequadas; chamadas indevidas continuam rejeitadas pelo serviço.

- O envio por WhatsApp e e-mail permanece disponível somente para total menor ou igual a R$ 2.000,00.
- O Assinafy é permitido somente para total maior que R$ 2.000,00 e e-mail de cliente válido.
- Falhas de SMTP, WhatsApp ou Assinafy não alteram status, canal ou data de envio.
- O início de assinatura persiste identificadores externos apenas depois do retorno bem-sucedido do Assinafy.
- O texto do e-mail de assinatura deixa claro que a aprovação ocorrerá no link de assinatura recebido pelo cliente.

## PDF comercial

O renderer deixará de truncar textos por quantidade fixa de caracteres e passará a medir/quebrar o conteúdo nas larguras de cada coluna.

- Textos serão gerados com acentuação correta em português.
- Dados de empresa e cliente terão blocos com altura calculada conforme o número de linhas.
- Título, detalhes e itens terão quebra de linha sem invadir colunas vizinhas.
- A tabela de itens continuará em páginas seguintes quando não houver altura útil, repetindo cabeçalho e mantendo totais no fim.
- O rodapé ocupará uma área reservada, sem concorrer com conteúdo.
- Os valores, datas e dados do orçamento continuarão sendo os calculados pelo backend.

## Testes e validação

- Testes de serviço para os limites R$ 2.000,00 e R$ 2.000,01, incluindo bloqueio dos canais incompatíveis.
- Testes de frontend para as ações condicionais no detalhe comercial e na central WhatsApp.
- Testes do renderer com texto acentuado, descrição longa e quantidade de itens suficiente para segunda página.
- Geração de PDF de exemplo e inspeção visual para confirmar ausência de sobreposição e correção ortográfica.
- Validações finais: suíte backend, build backend, testes frontend e `git diff --check`.

## Critério de conclusão

O administrador consegue enviar um orçamento de até R$ 2.000,00 por WhatsApp ou e-mail; para valores superiores, consegue iniciar assinatura digital por e-mail. O PDF enviado apresenta português correto, conteúdo legível e sem elementos sobrepostos, inclusive em orçamentos longos.
