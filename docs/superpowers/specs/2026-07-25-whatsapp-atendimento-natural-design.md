# Atendimento WhatsApp natural e cadastro progressivo

## Objetivo

Tornar o primeiro atendimento da AIRMOVEBR mais natural e reduzir a fricção
do pré-cadastro. O bot Move deve conversar em texto livre, coletar um dado por
vez e transferir o contato para um especialista ao terminar o cadastro.

## Fluxo aprovado

1. O Move se apresenta e pergunta como pode chamar a pessoa.
2. Depois do nome, pergunta: "Como podemos ajudar? Pode me contar com suas
   palavras."
3. Para relatos de problema, responde com empatia antes de pedir dados. Para
   instalação ou outros serviços sem problema, usa uma resposta neutra e não
   diz "que pena".
4. Explica que precisa de alguns dados para preparar o orçamento e solicita,
   separadamente:
   - CEP;
   - número do endereço;
   - e-mail.
5. Após cada resposta válida, salva o campo e faz somente a próxima pergunta.
6. CPF não é solicitado no fluxo inicial e continua opcional no cadastro
   administrativo.
7. Ao concluir, o bot salva os dados no cadastro do cliente e transfere a
   conversa para atendimento humano com uma mensagem equivalente a:

   > Obrigado, [nome]. Já registrei seus dados. Estamos transferindo você para
   > um de nossos especialistas, que continuará o atendimento e passará todas
   > as informações necessárias.

8. Fora do horário comercial, de segunda a sexta-feira das 08:00 às 18:00,
   o bot informa:

   > Nosso horário de atendimento é de segunda a sexta, das 08:00 às 18:00.
   > Mas já registrei tudo por aqui. Nossos especialistas entrarão em contato
   > o mais rápido possível.

   Nesse caso, a conversa continua registrada para a equipe, sem prometer
   atendimento imediato.

## Alterações técnicas

- Remover o menu inicial de cinco opções e as opções específicas de instalação
  e manutenção; o serviço e o problema passam a ser inferidos da resposta
  livre.
- Adicionar ao estado do Bolt os campos `numero` e `email` e etapas explícitas
  para cada coleta.
- Manter a consulta de CEP, mas só avançar após endereço válido; o número será
  solicitado depois da confirmação/localização do CEP.
- Atualizar a montagem da prévia e o cadastro administrativo para usar o
  número e o e-mail coletados.
- Normalizar telefone removendo máscara e o prefixo internacional `55` quando
  presente, aceitando entradas locais e internacionais sem rejeitar o número
  de WhatsApp recebido.
- Preservar fallback para atendente quando a resposta não puder ser entendida,
  sem reintroduzir menus como requisito.
- Centralizar a verificação do horário comercial usando o fuso
  `America/Sao_Paulo`; considerar segunda a sexta, 08:00 inclusive até 18:00
  exclusivo, como horário comercial.

## Casos de erro

- CEP inválido: informar o problema e pedir novamente somente o CEP.
- Número vazio: pedir somente o número do endereço novamente.
- E-mail inválido: pedir somente um e-mail válido novamente.
- Problema sem descrição suficiente: pedir que a pessoa descreva livremente o
  que aconteceu.
- Falha na API de WhatsApp ou ViaCEP: manter a entrada salva e permitir
  continuidade manual pelo painel.

## Validação

- Testes unitários do Bolt para instalação e problema descrito em texto livre.
- Teste de sequência garantindo uma pergunta por vez: nome, descrição, CEP,
  número e e-mail.
- Testes de validação para e-mail, número e telefone com e sem `55`.
- Teste garantindo que CPF não é exigido.
- Testes de atendimento dentro e fora do horário comercial, incluindo sábados,
  domingos e os limites de 08:00 e 18:00.
- Teste de integração do cadastro com endereço e e-mail preenchidos.
- Verificação manual no painel e no WhatsApp com um contato de teste.

## Fora de escopo

- Não alterar orçamento, aprovação, agendamento ou regras de criação de O.S.
- Não tornar CPF obrigatório em nenhuma etapa.
- Não criar novos menus ou botões para substituir o menu removido.
