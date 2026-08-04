# Bot WhatsApp simplificado

## Objetivo

Retirar a IA do atendimento automático do WhatsApp e usar somente o BOLT para uma triagem curta, previsível e semelhante ao fluxo aprovado do Grupo Toyopar.

## Fluxo aprovado

1. O bot cumprimenta o cliente e solicita apenas o nome completo.
2. Depois do nome, exibe os botões: `Orçamento`, `Instalação`, `Manutenção`, `Agendar visita` e `Falar com atendente`.
3. A escolha salva a necessidade no atendimento, confirma o recebimento e transfere para a fila humana.
4. O bot não solicita CEP, documento, e-mail, BTUs, endereço, fotos ou outros dados técnicos nessa etapa.

## Arquitetura e limites

- O processamento automático usa exclusivamente `BoltRules`.
- A chamada de IA, a humanização de respostas e o fallback IA→BOLT deixam de participar do webhook de mensagens.
- O módulo de IA e o Copiloto Comercial continuam disponíveis para uso manual do atendente.
- O histórico continua registrando a mensagem do cliente, a resposta do bot e a transferência humana.
- Dados adicionais permanecem sob responsabilidade do atendente no painel.

## Critérios de aceitação

- Uma conversa nova pede somente o nome antes de mostrar as opções.
- Após uma opção válida, a conversa vai para atendimento humano.
- Nenhuma pergunta técnica adicional é enviada automaticamente.
- Mensagens livres continuam sendo preservadas e encaminhadas ao atendente.
- O Copiloto Comercial continua funcionando quando acionado manualmente.
