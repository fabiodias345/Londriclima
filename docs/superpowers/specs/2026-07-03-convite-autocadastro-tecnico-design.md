# Convite para autocadastro do tecnico

## Objetivo

Adicionar um convite de uso unico como alternativa ao cadastro manual. Em **Acessos**, o administrador podera escolher entre cadastrar o tecnico diretamente ou gerar um convite para que o proprio tecnico conclua o cadastro no aplicativo.

## Fluxo administrativo

- adicionar o botao **Gerar convite** na tela **Acessos**;
- gerar um codigo curto, aleatorio e legivel, valido por 24 horas;
- exibir o codigo completo somente na resposta de criacao, com acao para copia;
- listar convites com data de criacao, validade e estado: pendente, utilizado, vencido ou cancelado;
- permitir cancelar um convite pendente;
- manter o cadastro e a edicao manual de acessos, inclusive a criacao de tecnico com senha inicial e primeiro acesso pendente;
- oferecer o convite como opcao adicional, sem alterar o funcionamento do cadastro manual.

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
- endpoint publico para validar o codigo sem expor dados da empresa;
- endpoint publico multipart para concluir cadastro com codigo, dados, foto e assinatura;
- resposta final igual a uma autenticacao normal, com tokens de acesso e renovacao.

## Compatibilidade

- preservar usuarios existentes, o cadastro manual e o fluxo atual de primeiro acesso pendente;
- novos tecnicos poderao ser criados pelo convite sem cadastro administrativo previo;
- relatorios, PMOC e documentos continuarao usando o perfil, a foto e a assinatura armazenados.

## Validacao

- testar geracao, listagem, cancelamento, expiracao e uso unico do convite;
- testar concorrencia para impedir dois cadastros com o mesmo codigo;
- testar duplicidade de login, CPF e e-mail;
- testar criacao do tecnico, armazenamento dos arquivos, PDF e autenticacao final;
- testar o painel administrativo e o fluxo completo no aplicativo;
- executar testes do backend, contratos do frontend, build do backend e analise Flutter.
