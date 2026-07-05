# Login biométrico Android

Data: 05/07/2026

## Objetivo

Permitir que o técnico acesse o aplicativo Android usando a biometria cadastrada no aparelho, sem armazenar login ou senha e mantendo o formulário atual como alternativa.

## Escopo

- Aplicativo técnico Android.
- Ativação opcional após um login real concluído com sucesso.
- Autenticação local pela biometria do aparelho.
- Renovação da sessão pelo endpoint existente `POST /api/v1/auth/refresh`.
- Armazenamento seguro somente do `refresh_token` e dos dados mínimos necessários para apresentar o acesso biométrico.
- Remoção do acesso biométrico quando o token for inválido, expirar ou não puder ser recuperado com segurança.

Ficam fora deste escopo o aplicativo admin, iOS, autenticação biométrica no servidor e armazenamento da senha.

## Fluxo

1. O técnico entra normalmente com login e senha.
2. A API retorna `access_token`, `refresh_token` e usuário.
3. Se o aparelho suportar biometria cadastrada e o recurso ainda não estiver ativo, o aplicativo pergunta se deseja ativar o acesso por digital.
4. Se aceitar, o aplicativo grava o `refresh_token` no armazenamento seguro do Android.
5. Em uma abertura posterior, a tela de login apresenta `Entrar com digital`.
6. Após a validação biométrica, o aplicativo envia o `refresh_token` para `POST /api/v1/auth/refresh`.
7. A API devolve um novo par de tokens. O aplicativo substitui o token armazenado e abre o dashboard com a nova sessão.
8. Login e senha permanecem disponíveis em todos os casos.

## Componentes

### Serviço biométrico

Encapsula a verificação de disponibilidade e a solicitação de autenticação ao Android. O restante da aplicação depende de uma interface testável, não diretamente do plugin nativo.

### Armazenamento seguro

Persiste o `refresh_token` usando armazenamento criptografado ligado ao Android Keystore. Não persiste senha, `access_token` vencido nem dados biométricos.

### Gateway de autenticação

Passa a interpretar `refresh_token` no login comum e oferece uma operação de renovação de sessão. A criação dos repositórios continua centralizada no gateway da API.

### Tela de login

Consulta a disponibilidade do acesso biométrico, exibe o botão quando aplicável, solicita ativação após o primeiro login e mantém o fluxo atual de login e primeiro cadastro.

## Segurança

- A biometria é validada exclusivamente pelo sistema operacional; o aplicativo não recebe nem armazena impressões digitais.
- A senha nunca é persistida.
- O token é salvo somente no armazenamento seguro.
- Token inválido, ausente ou irrecuperável desativa o atalho biométrico e retorna ao login convencional.
- Cancelamento ou falha biométrica não apaga o token; apenas mantém o usuário na tela de login.
- Erros não devem exibir tokens ou detalhes internos.

## Tratamento de erros

- Aparelho sem biometria ou sem digital cadastrada: não oferecer ativação nem botão biométrico.
- Usuário recusa ativação: continuar normalmente sem insistir na mesma sessão.
- Biometria cancelada ou rejeitada: manter a tela e permitir nova tentativa ou senha.
- Falha de rede no refresh: manter o acesso biométrico habilitado e informar falha de conexão.
- Refresh token rejeitado: apagar o token seguro, ocultar o botão biométrico e exigir login e senha.
- Armazenamento seguro indisponível: concluir o login sem ativar biometria.

## Android

- Usar plugin Flutter de autenticação local.
- Usar plugin Flutter de armazenamento seguro.
- Ajustar a activity Android para o tipo exigido pelo plugin biométrico.
- Declarar a permissão biométrica necessária no manifesto.

## Testes e aceite

- Login por senha continua funcionando.
- Usuário pode aceitar ou recusar a ativação após login válido.
- A senha não é gravada no armazenamento.
- Botão biométrico aparece somente quando há token seguro e biometria disponível.
- Biometria válida chama o refresh, troca o token armazenado e abre o dashboard.
- Refresh rejeitado apaga o token e exige senha.
- Cancelamento biométrico não bloqueia o login convencional.
- Falha de rede apresenta erro sem apagar uma credencial ainda válida.
- Fluxos de primeiro cadastro e modo demo permanecem funcionando.
