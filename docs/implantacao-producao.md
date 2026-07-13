# Implantacao em Producao

Atualizado em: 13/07/2026

## Estado atual

O sistema esta implantado em uma VM propria na Locaweb Cloud. A opcao Turbo Cloud/cPanel foi descartada para o sistema completo porque nao oferece a infraestrutura ideal para PostgreSQL, Docker, jobs e manutencao limpa.

Servidor contratado:

```text
Fornecedor: Locaweb Cloud
Plano: Medium
Sistema: Ubuntu 24.04.3 LTS
IP publico: 191.252.226.11
Usuario inicial: root
Acesso: SSH por chave
Recursos: 2 vCPU, 4 GB RAM, 80 GB SSD
```

Dominio aprovado para o sistema:

```text
airmovebr.com.br
```

Estado operacional:

```text
Site:    https://airmovebr.com.br/
Admin:   https://admin.airmovebr.com.br/
API:     https://api.airmovebr.com.br/api/v1
Health:  https://api.airmovebr.com.br/api/v1/health
Branch:  main
Deploy:  branch main
Banco:   sem migrations pendentes no ultimo deploy
```

## Objetivo

Subir o MVP web/admin/backend em producao na VM Locaweb, com custo baixo e com base de seguranca adequada para operar dados de clientes, ordens de servico, fotos, assinaturas e localizacao.

## Componentes previstos

```text
airmovebr.com.br
-> reverse proxy HTTPS
-> landing publica
-> painel admin
-> API backend
-> PostgreSQL
-> storage de arquivos/fotos
```

Sugestao inicial de subdominios:

```text
airmovebr.com.br              landing/site publico
admin.airmovebr.com.br        painel administrativo
api.airmovebr.com.br          API backend
```

Alternativa mais simples para MVP:

```text
airmovebr.com.br              landing/site publico
airmovebr.com.br/admin        painel administrativo
airmovebr.com.br/api/v1       API backend
```

A escolha final depende de como o DNS e o proxy do servidor estao configurados.

## Requisitos minimos do servidor

Antes do deploy, confirmar ou configurar:

- acesso SSH administrativo por chave;
- apontamento DNS do dominio `airmovebr.com.br`;
- disponibilidade de portas 80 e 443;
- Docker e Docker Compose;
- espaco em disco para banco, fotos e backups;
- rotina de snapshot ou backup na Locaweb Cloud;
- usuario operacional sem uso diario de root.

Nota operacional 2026-07-13: os dominios principais estao em uso publico com HTTPS. Em novo deploy, validar sempre site, admin, API health e formulario publico de pre-chamado.

## Plano tecnico recomendado

1. Endurecer acesso inicial: atualizar sistema, criar usuario operacional e revisar SSH/firewall.
2. Instalar Docker, Docker Compose e ferramentas basicas.
3. Apontar DNS de `airmovebr.com.br`, `admin.airmovebr.com.br` e `api.airmovebr.com.br` para `191.252.226.11`.
4. Configurar reverse proxy com HTTPS.
5. Publicar PostgreSQL em volume persistente.
6. Publicar backend NestJS em container.
7. Publicar landing e admin como arquivos estaticos servidos pelo proxy.
8. Configurar variaveis de ambiente reais fora do Git.
9. Rodar migrations Prisma.
10. Criar usuario administrador real.
11. Validar login, pre-chamado, aprovacao, agenda, clientes, relatorios e frota.

Checklist apos liberacao do dominio:

```text
airmovebr.com.br       -> 191.252.226.11
admin.airmovebr.com.br -> 191.252.226.11
api.airmovebr.com.br   -> 191.252.226.11
```

Depois da propagacao, validar:

```text
https://airmovebr.com.br
https://airmovebr.com.br/api/v1/health
https://airmovebr.com.br/admin
Formulario publico de pre-chamado pelo dominio
Pre-chamado recebido no painel admin
```

## Artefatos locais preparados

Foram preparados arquivos de exemplo para producao, sem credenciais reais:

```text
.env.production.example
infra/docker-compose.prod.example.yml
infra/caddy/Caddyfile.example
apps/backend/Dockerfile
```

Esses arquivos nao devem ser usados diretamente com secrets de exemplo. Antes de subir no servidor, criar `.env.production` real fora do Git e revisar dominio, HTTPS, volumes, backup e firewall.

## Seguranca e LGPD

Este ponto e critico porque o sistema armazena dados pessoais e operacionais:

- nome, telefone e endereco de clientes;
- historico de atendimento;
- fotos tecnicas;
- assinatura do cliente;
- dados de localizacao por evento e, futuramente, frota/GPS;
- dados de tecnicos e usuarios internos.

Obrigatorio antes de producao:

- HTTPS ativo em todo acesso externo;
- `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` fortes e exclusivos de producao;
- `.env` real fora do Git;
- banco sem acesso publico direto;
- firewall liberando apenas portas necessarias;
- senhas fortes para usuarios admin;
- backup automatico do banco;
- backup ou politica clara para arquivos/fotos;
- logs sem expor senha, token, assinatura ou dados sensiveis completos;
- revisao de permissoes por `empresa_id`;
- teste de login, refresh token e rotas protegidas.

## Banco e arquivos

Para o MVP, o PostgreSQL pode rodar na propria VM Locaweb com volume persistente.

Cuidados:

- nunca usar banco em container sem volume persistente;
- documentar caminho do volume;
- testar restauracao de backup;
- separar dados de desenvolvimento e producao;
- nao rodar seed de demonstracao em producao depois que houver dados reais.

Fotos, assinaturas e evidencias devem ficar em storage persistente. No MVP podem ficar no servidor, mas o caminho deve ser preparado para futura migracao para storage externo.

## Telemetria GPS futura

A decisao de usar VM propria na Locaweb tambem favorece a telemetria propria no futuro, desde que a rede/firewall permita expor portas TCP/UDP para os rastreadores.

Antes de ativar GPS real:

- confirmar se o provedor permite portas TCP/UDP customizadas;
- configurar firewall por porta;
- separar receptor GPS em servico proprio;
- testar com um rastreador fisico antes de comprar para toda a frota.

## Proximos passos

1. Manter deploy somente por `main` alinhada ao GitHub.
2. Conferir migrations Prisma em todo deploy.
3. Conferir health interno e publico em todo deploy.
4. Validar backup/snapshot periodico da VM e banco.
5. Concluir WhatsApp de producao com templates aprovados e webhook.
6. Validar O.S. real do admin ao app tecnico, finalizacao, PDF e notificacao.
