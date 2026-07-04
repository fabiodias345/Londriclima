# Acessos e convite para autocadastro do tecnico

## Objetivo

Corrigir a listagem dos acessos existentes, profissionalizar o gerenciamento de usuarios e integrar o convite de uso unico como alternativa ao cadastro manual. Em **Acessos**, o administrador podera cadastrar, editar ou excluir definitivamente um usuario, alem de gerar, copiar e encaminhar um convite para autocadastro no aplicativo.

## Correcao da listagem

- corrigir `renderTecnicos()`, que atualmente referencia dados de cadastro e documento fora do escopo e interrompe a renderizacao;
- carregar e exibir admins, tecnicos e auxiliares ativos da empresa autenticada;
- mostrar nome, funcao, login, email, telefone, estado do primeiro acesso e acoes disponiveis;
- manter a lista visivel independentemente da abertura do cadastro manual ou do gerador de convite.

## Organizacao visual

- usar o layout aprovado **B**, com **Cadastrar acesso** e **Gerar convite** como acoes separadas no cabecalho;
- abrir cadastro e convite em paineis organizados, sem sobreposicao de conteudo;
- manter somente um painel de acao aberto por vez;
- usar hierarquia visual, espacamento, botoes e estados coerentes com o restante do admin;
- adaptar paineis, lista e acoes para telas menores.

## Fluxo administrativo

- manter os acessos existentes visiveis com acoes **Editar** e **Apagar**;
- abrir o cadastro manual pelo botao **Cadastrar acesso**;
- abrir o gerador pelo botao **Gerar convite**;
- gerar um codigo curto, aleatorio e legivel, valido por 24 horas;
- exibir o codigo completo ao administrador imediatamente apos a criacao, com validade e acao **Copiar codigo**;
- permitir que o administrador use o codigo na hora, sem obrigar envio por email ou WhatsApp;
- listar convites com data de criacao, validade e estado: pendente, utilizado, vencido ou cancelado;
- permitir cancelar um convite pendente;
- manter o cadastro e a edicao manual de acessos, inclusive a criacao de tecnico com senha inicial e primeiro acesso pendente;
- oferecer o convite como opcao adicional, sem alterar o funcionamento do cadastro manual.

## Encaminhamento do convite

- depois de gerar o convite, oferecer **Email** e **WhatsApp** como opcoes adicionais;
- no envio por email, exigir um endereco valido e enviar o codigo, a validade e as instrucoes usando o SMTP existente;
- informar sucesso ou falha do SMTP sem ocultar o codigo ja gerado;
- deixar o WhatsApp visivel, mas desabilitado com a mensagem **Aguardando configuracao Meta**;
- preparar a separacao do canal WhatsApp para futura integracao oficial com Meta WhatsApp Cloud API, sem chamada externa, token ou numero enquanto as credenciais nao existirem;
- nunca registrar tokens, credenciais ou o codigo completo do convite em logs.

## Exclusao definitiva de acesso

- o botao **Apagar** deve abrir confirmacao explicita antes da requisicao;
- usar a mensagem: **Esta exclusao e definitiva. Para recuperar o acesso sera necessario criar outro usuario.**;
- impedir que o usuario autenticado exclua o proprio acesso;
- impedir a exclusao do unico administrador ativo da empresa;
- excluir definitivamente o usuario, documentos de funcionario e arquivos pessoais de foto e assinatura;
- remover vinculos operacionais que dependam diretamente do usuario;
- preservar ordens de servico, relatorios e demais historicos operacionais, removendo somente o vinculo com o usuario excluido;
- executar as alteracoes relacionais e a exclusao do usuario em transacao;
- remover arquivos do storage somente depois da transacao concluida, tratando arquivo inexistente como operacao idempotente;
- atualizar a lista de acessos apos a exclusao concluida.

## Fluxo no aplicativo

- adicionar **Primeiro cadastro** na tela de login;
- solicitar e validar o codigo do convite antes de abrir o formulario;
- coletar nome completo, CPF, telefone, e-mail, login, senha, foto e assinatura;
- exigir aceite do termo de responsabilidade;
- criar o usuario como tecnico da empresa vinculada ao convite;
- gerar e armazenar o PDF do termo com foto, assinatura, versao, data e hash;
- autenticar o tecnico e abrir o aplicativo ao concluir.

## Persistencia e seguranca

- criar uma entidade de convite vinculada a empresa e ao administrador emissor;
- armazenar somente o hash do codigo, nunca o codigo em texto puro;
- registrar criacao, expiracao, cancelamento, consumo e usuario criado;
- aceitar cada convite uma unica vez;
- consumir o convite e criar o usuario na mesma transacao;
- impedir login, CPF ou e-mail duplicados;
- recusar codigo inexistente, vencido, cancelado ou ja utilizado com mensagem clara;
- aplicar limite de tentativas no endpoint publico de validacao e cadastro.

## API

- endpoint administrativo autenticado para gerar convite;
- endpoints administrativos autenticados para listar e cancelar convites;
- endpoint administrativo autenticado para encaminhar por email um convite recem-gerado, recebendo o codigo somente na requisicao e sem persisti-lo em texto puro;
- manter o endpoint autenticado de exclusao de acesso, alterando sua semantica de desativacao para exclusao definitiva e segura;
- endpoint publico para validar o codigo sem expor dados da empresa;
- endpoint publico multipart para concluir cadastro com codigo, dados, foto e assinatura;
- resposta final igual a uma autenticacao normal, com tokens de acesso e renovacao.

## Compatibilidade

- preservar usuarios existentes, o cadastro manual e o fluxo atual de primeiro acesso pendente;
- novos tecnicos poderao ser criados pelo convite sem cadastro administrativo previo;
- relatorios, PMOC e documentos continuarao usando o perfil, a foto e a assinatura armazenados.
- historicos operacionais de um usuario excluido continuarao disponiveis sem referencia ativa ao cadastro removido.

## Tratamento de erros

- se a listagem falhar, manter a tela funcional e mostrar erro no estado da secao;
- se o email falhar, preservar o convite gerado e permitir copiar ou tentar novamente;
- se a exclusao estiver bloqueada por regra de seguranca, mostrar a mensagem retornada pela API;
- desabilitar temporariamente o botao durante geracao, envio, cancelamento e exclusao para evitar requisicoes duplicadas;
- atualizar somente os paineis afetados depois de cada operacao.

## Validacao

- testar geracao, listagem, cancelamento, expiracao e uso unico do convite;
- testar a renderizacao dos acessos existentes e as acoes de editar e apagar;
- testar abertura e fechamento dos paineis de cadastro e convite sem sobreposicao;
- testar exibicao e copia do codigo sem encaminhamento;
- testar envio por email, email invalido e falha SMTP preservando o codigo;
- testar WhatsApp desabilitado enquanto a Meta nao estiver configurada;
- testar exclusao definitiva, bloqueio do proprio usuario, bloqueio do unico admin e preservacao do historico operacional;
- testar concorrencia para impedir dois cadastros com o mesmo codigo;
- testar duplicidade de login, CPF e e-mail;
- testar criacao do tecnico, armazenamento dos arquivos, PDF e autenticacao final;
- testar o painel administrativo e o fluxo completo no aplicativo;
- executar testes do backend, contratos do frontend, build do backend e analise Flutter.
