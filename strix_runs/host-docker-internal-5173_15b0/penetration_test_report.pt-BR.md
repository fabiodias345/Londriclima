# Relatório de Teste de Penetração

**Gerado:** 2026-08-11 00:48:26 UTC

## Resumo executivo

Foi realizada uma avaliação autorizada nas duas aplicações locais: o SPA **AIRMOVEBR Admin** (`http://host.docker.internal:5173/admin/`) e a API (`http://host.docker.internal:3000`, base `/api/v1`). Foram confirmadas duas vulnerabilidades de severidade limitada.

**Postura geral:** risco elevado para uma futura publicação em produção, mas limitado no sandbox de desenvolvimento. O ambiente usa credenciais de teste (`admin` / `123456`), dados semeados e integrações externas desativadas.

- **Médio — Reutilização de refresh token sem rotação efetiva** (`/api/v1/auth/refresh`): o endpoint emite novos tokens sem invalidar o refresh token já usado. Um token capturado pode ser reutilizado durante sua validade de 30 dias (CWE-613).
- **Baixo — Upload irrestrito de foto de técnico** (`/api/v1/admin/tecnicos/{id}/foto`): conteúdo que não é imagem é aceito e armazenado com extensão controlada pelo cliente (CWE-434).

O controle de acesso multiempresa, a separação de papéis, a assinatura JWT, os fluxos PDF/SSRF e a lógica de negócio testada não apresentaram vulnerabilidades confirmadas. O CORS reflete origens arbitrárias, mas não expõe credenciais neste cenário porque a autenticação usa Bearer JWT no `localStorage` e não habilita credenciais CORS.

## Metodologia

Avaliação black-box de baixo impacto, seguindo OWASP WSTG e PTES. Não foram acessados hosts externos, nem acionadas integrações de WhatsApp, e-mail/SMTP, Assinafy ou ViaCEP. Foram feitos reconhecimento, mapeamento de rotas, análise de autenticação, validação de JWT, controle de acesso, uploads, PDFs, SSRF, CORS e regras de negócio.

## Achados técnicos

### 1. Reutilização de refresh token sem rotação — Médio

`POST /api/v1/auth/refresh` aceitou o mesmo refresh token duas vezes e retornou `201` em ambas, emitindo novos pares de tokens. O token original não é invalidado nem associado a uma família de rotação revogável.

### 2. Upload irrestrito de foto de técnico — Baixo

`PATCH /api/v1/admin/tecnicos/{tecnicoId}/foto` aceitou texto e binário de 2 MB enviados como imagens, sem validação de MIME, extensão, magic bytes ou tamanho. O arquivo resultante não é servido neste sandbox; portanto, o impacto atual é de integridade do conteúdo armazenado. Em produção, isso pode evoluir para XSS armazenado ou spoofing se o caminho for servido inline.

## Recomendações

1. Implementar rotação de refresh tokens com hash persistido, detecção de reutilização e revogação da família.
2. Validar o conteúdo real das imagens, limitar tamanho, usar lista de MIME/extensões permitidos e gerar nomes no servidor.
3. Restringir CORS a uma lista fixa de origens confiáveis.
4. Migrar tokens de `localStorage` para cookies `HttpOnly`/`Secure`.
5. Remover `admin` / `123456` e credenciais padrão antes de qualquer uso em produção.
6. Corrigir os endpoints de orçamento que retornam `500` e retestar os fluxos de recorrência.

Após as correções, retestar a reutilização de refresh tokens, uploads não-imagem, CORS e os fluxos de orçamento/recorrência.
