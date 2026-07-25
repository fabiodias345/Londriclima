# Orçamentos O5 — Revisão, PDF, Canais e Assinafy

**Data:** 25/07/2026  
**Escopo:** `apps/admin` e `apps/backend`

## Objetivo

Entregar no painel web o ciclo operacional de revisão e envio de orçamentos: abrir detalhes completos, baixar PDF, enviar por WhatsApp ou e-mail e iniciar assinatura via Assinafy para valores acima de R$ 2.000, mantendo o backend como fonte dos totais, regras e transições de status.

## Fora do escopo

- Alterar `apps/admin_mobile`, `apps/mobile` ou qualquer código Flutter.
- Gerar APK ou executar validação de Flutter.
- Converter orçamento aprovado em O.S.; isso pertence à Fase O6.
- Reutilizar dados, payloads ou regras específicas de PMOC.
- Criar novos segredos no Git; credenciais continuam em variáveis de ambiente.

## Estado e transições

O orçamento continua usando os status existentes: `rascunho`, `enviado`, `aguardando_aprovacao`, `em_negociacao`, `aprovado`, `recusado` e `convertido_os`.

- Abrir/revisar e baixar PDF não alteram status.
- Enviar por WhatsApp ou e-mail exige orçamento válido e cliente correspondente. Em caso de sucesso, o backend grava o canal, data e muda o status para `aguardando_aprovacao`.
- Se o envio falhar, a resposta retorna erro e o status permanece inalterado.
- Assinafy só pode ser iniciado para orçamento com total maior que R$ 2.000, cliente com dados mínimos de assinatura e PDF gerado pelo fluxo comercial. O início bem-sucedido grava os identificadores externos e deixa o orçamento aguardando aprovação/assinatura.
- Status e transições continuam protegidos por autenticação de administrador e pelas regras já existentes no serviço comercial.

## Arquitetura

### Backend

O módulo comercial será a fronteira do caso de uso. O controller expõe detalhes e ações específicas de orçamento. O service valida empresa, cliente, status, total e pré-condições antes de delegar:

- `ComercialOrcamentoPdfRenderer` para o documento comercial;
- adaptador de envio WhatsApp usando o cliente Cloud existente;
- `SmtpEmailService` para e-mail com anexo PDF;
- adaptador comercial de Assinafy, reutilizando apenas o transporte/cliente de API existente, sem usar modelos de PMOC.

Cada ação deve retornar uma resposta operacional suficiente para a tela: orçamento atualizado, canal utilizado, identificador externo quando houver e mensagem de erro legível quando a operação não for concluída. Operações externas não devem marcar o orçamento como enviado antes do sucesso confirmado.

Quando os campos atuais do modelo não forem suficientes para auditoria comercial, a persistência será ampliada com nomes explícitos de orçamento, sem alterar campos de assinatura de O.S./PMOC. A migration deve ser criada no Prisma e validada antes de qualquer deploy.

### Painel web

O módulo de Orçamentos terá uma visão de detalhes aberta a partir da listagem. Ela exibirá cliente, validade, itens, quantidades, valores unitários, subtotal, desconto, total, observações, histórico operacional disponível e status atual.

As ações ficam agrupadas no cabeçalho do detalhe:

- `Baixar PDF` abre o PDF autenticado;
- `Enviar por WhatsApp` usa o telefone do cliente;
- `Enviar por e-mail` exige e-mail válido;
- `Enviar para assinatura` aparece somente quando o total é maior que R$ 2.000 e informa a pré-condição quando não estiver disponível;
- alteração de status usa as transições já aprovadas pelo backend.

Após cada ação, o detalhe e a listagem são recarregados. A tela mostra carregamento, sucesso e erro sem perder a seleção atual. A apresentação seguirá o estilo operacional AIRMOVEBR já usado no painel, com foco em leitura rápida, ação clara e compatibilidade com telas menores.

## Integrações

### PDF

O PDF comercial será gerado a partir dos dados atuais do orçamento, cliente e empresa. A resposta deve usar o tipo MIME correto e exigir autenticação/escopo admin. O painel não deve montar valores nem duplicar o cálculo do backend.

### WhatsApp

O envio usará o telefone do cliente e o mecanismo Cloud já configurado. A mensagem deve identificar o orçamento, seu total, validade e caminho de consulta/aceite quando disponível. Fora da janela de atendimento, deverá ser usado template aprovado já existente ou configurado para o caso comercial; a indisponibilidade do template será tratada como erro explícito.

### E-mail

O envio usará o serviço SMTP existente, com assunto e corpo próprios de orçamento e o PDF comercial anexado. O endereço será validado antes da chamada externa. O e-mail do cliente não será inferido de dados de PMOC.

### Assinafy

O fluxo criará documento comercial a partir do PDF do orçamento e enviará para o responsável do cliente. O limiar é estritamente `total > 2000`; valores iguais ou inferiores não acionam Assinafy. A resposta persistirá `documentId`, atribuição/status e timestamps em campos comerciais próprios. Falhas de credencial, configuração ou API não alterarão o status do orçamento.

## Tratamento de erros e segurança

- Todos os endpoints exigem usuário autenticado com `role=admin` e filtram por `empresaId`.
- IDs inválidos ou orçamento inexistente retornam erro consistente sem revelar dados de outra empresa.
- Ações duplicadas devem ser idempotentes quando o orçamento já possuir envio/assinatura correspondente; o backend não deve disparar operações externas desnecessárias.
- Falhas externas são registradas em log sem incluir tokens, senhas ou credenciais.
- O painel desabilita a ação durante a requisição para evitar duplo clique.

## Validação

Testes backend devem cobrir:

1. leitura autenticada dos detalhes e isolamento por empresa;
2. geração de PDF comercial;
3. envio WhatsApp e mudança de status apenas após sucesso;
4. envio de e-mail com anexo e validação do endereço;
5. regra Assinafy para total acima, igual e abaixo de R$ 2.000;
6. persistência de IDs/status externos e comportamento diante de falha;
7. bloqueio de operações para usuário não admin e transições inválidas.

Testes frontend devem cobrir a abertura do detalhe, renderização dos totais/status, disponibilidade condicional das ações, estados de sucesso/erro e atualização da listagem. A validação final desta fase será `npm.cmd run frontend:test` e a suíte backend existente, sem Flutter/APK.

## Critério de conclusão

A Fase O5 estará concluída quando um administrador conseguir abrir um orçamento, revisar seus dados, baixar o PDF, enviá-lo por WhatsApp e e-mail, iniciar Assinafy acima de R$ 2.000, visualizar o resultado de cada operação e confirmar que falhas não produzem status falsos, sem alterar os apps Flutter.
