# Memoria AIRMOVEBR

Atualizado em: 13/06/2026

## Contexto

- Cliente piloto: AIRMOVEBR, Londrina/PR.
- Dominio: `airmovebr.com.br`.
- Repositorio: `https://github.com/fabiodias345/Londriclima.git`.
- Workspace local: `C:\develop\LondriClima`.
- Produto: plataforma para operacao de refrigeracao e climatizacao, com caminho para SaaS multiempresa.
- Restricao da fase atual: uma empresa piloto, custo baixo, sem superdimensionar infraestrutura.

## Estado Git

- Branch local padrao atual: `dev`.
- Branches remotas alinhadas: `dev`, `main`, `seg`.
- Branches devem permanecer alinhadas no mesmo commit antes de deploy.

## Identidade

- Usar marca comercial AIRMOVEBR nas interfaces e dados demo.
- Evitar nomes visiveis `LondriClima` para usuario final.
- Login seed atual: `tecnico@airmovebr.local / 123456`.
- Nomes tecnicos internos legados podem permanecer se renomear quebrar Docker, Prisma, Git ou ambiente local.

## Stack Atual

- Backend: Node.js, NestJS, TypeScript.
- Banco: PostgreSQL, Prisma.
- Admin: HTML, CSS, JavaScript, Leaflet.
- Landing: HTML, CSS, JavaScript.
- Infra: Docker Compose local/producao.
- Testes: `node:test`, Nest Testing, ESLint.

## Fluxo Operacional

```text
site -> pre-chamado -> admin -> OS -> tecnico -> evidencias/checklist/GPS -> relatorios
```

## Feito no Produto

- API REST com autenticao JWT e refresh token.
- Multiempresa por `empresa_id`.
- Clientes, enderecos, equipamentos e engenheiros responsaveis.
- OS com status, eventos, GPS, evidencias, checklist e assinatura.
- Admin com login, agenda, clientes, frota, relatorios e PMOC.
- Landing publica com pre-chamado.
- Consulta publica de equipamento protegida por senha.
- Frota com mapa Leaflet, consumo e abastecimentos.
- Testes de backend e contratos do frontend.

## PMOC Atual

- PMOC organizado por cliente.
- Previa oficial no backend.
- Geracao de PDF PMOC pelo backend.
- Relatorio PMOC persistido com status, token, hash, cliente e engenheiro.
- Dossie PMOC exibe Jan-Dez; vermelho indica mes ja enviado ao engenheiro, verde indica mes pendente.
- Pagina publica de assinatura para engenheiro.
- Admin solicita assinatura sem mostrar token ao operador.
- Engenheiro baixa/recebe o PDF, assina no Gov.br e envia o PDF assinado pela pagina publica.
- Confirmacao so agenda e-mail final ao cliente quando o PDF assinado for recebido.

Endpoints principais:

```text
GET  /api/v1/admin/pmoc/clientes/:clienteId/previa
GET  /api/v1/admin/pmoc/clientes/:clienteId/pdf
POST /api/v1/admin/pmoc/clientes/:clienteId/assinatura-engenheiro
GET  /api/v1/site/pmoc/assinaturas/:token
POST /api/v1/site/pmoc/assinaturas/:token/confirmar
```

## Automacoes e E-mail

- Modulo de automacoes processa itens pendentes por lote.
- SMTP envia:
  - link de assinatura ao engenheiro;
  - relatorio PMOC final assinado ao cliente.
- E-mail final do cliente:
  - assunto com mes/ano e nome do cliente;
  - texto profissional;
  - nome, CPF e CREA do engenheiro;
  - PDF assinado no Gov.br em anexo.
- Payload final inclui cliente, engenheiro, data, hash, nome do arquivo e PDF assinado em base64.

## Infra Producao

- VM: Locaweb Cloud Ubuntu 24.04.3 LTS.
- IP esperado: `191.252.226.11`.
- Deploy na VM: `/opt/airmovebr/repo`.
- Usuario operacional: `airmovebr`.
- Backend/PostgreSQL ja validados internamente em Docker.
- Bloqueador conhecido: DNS/publicacao HTTPS.

DNS desejado:

```text
airmovebr.com.br       -> 191.252.226.11
admin.airmovebr.com.br -> 191.252.226.11
api.airmovebr.com.br   -> 191.252.226.11
```

## Proximos Passos

1. Confirmar DNS no Registro.br para os 3 hosts.
2. Atualizar VM com o commit `4f81335`.
3. Rodar `prisma migrate deploy` em producao.
4. Recriar containers com `--build`.
5. Validar HTTPS publico.
6. Configurar SMTP real em `.env.production`.
7. Testar fluxo PMOC completo fora do local.
8. Evoluir PDF PMOC profissional por maquina.
9. Revisar Agenda e Frota.
10. Aplicar logo real quando o arquivo estiver no workspace.
11. Preparar backup, logs e permissoes antes de cliente real.

## Regras de Negocio

- OS so deve concluir com equipamento identificado, evidencias, checklist, assinatura e GPS de encerramento.
- GPS deve ser por eventos de acao, nao rastreamento continuo.
- PMOC deve separar dados por cliente e nao misturar maquinas/OS.
- Dados sensiveis nao devem aparecer em logs ou commits.
- Banco de producao nao deve ter porta publica.

## Comandos de Validacao

```text
npm.cmd run backend:lint
npm.cmd run backend:test
npm.cmd run backend:build
npm.cmd run frontend:test
```
