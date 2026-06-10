# LondriClima Digital — Plataforma FSM

> Plataforma integrada de gestão de serviços em campo (Field Service Management)
> desenvolvida para empresas de refrigeração e climatização.
> Cliente piloto: **LondriClima** — Londrina, PR.

---

## Visão Geral

O **LondriClima Digital** substitui processos manuais por uma operação
digitalizada de ponta a ponta: do agendamento pelo site até o relatório
técnico enviado automaticamente ao cliente após o serviço.

A plataforma é construída com arquitetura Multi-Tenant desde o banco de
dados, preparada para ser comercializada como SaaS para outras empresas
do setor (refrigeração, solar, construtoras) a partir da Fase 2.

---

## Estrutura do Repositório

```text
📁 plataforma-londriclima/
│
├── docs/                        ← Documentação do projeto
├── apps/
│   ├── backend/                 ← API REST, automações e banco de dados
│   ├── admin/                   ← Painel web administrativo
│   ├── landing/                 ← Website institucional público
│   └── mobile/                  ← Aplicativo Flutter (Android)
├── infra/                       ← Docker e infraestrutura local
└── storage/                     ← Arquivos locais de desenvolvimento
```

---

## Módulos da Plataforma

### 🌐 Website Institucional (`londriclima-landing`)
Site público focado em conversão e captação de leads. Formulário de
agendamento integrado ao backend, criando pré-chamados automáticos no
painel administrativo. Design mobile-first com foco em SEO local para
Londrina e região.

### 💻 Painel Administrativo (`londriclima-admin`)
Interface web para o gestor. Controle de clientes, equipamentos, ordens
de serviço, agenda com drag-and-drop, mapa de monitoramento da frota via
Leaflet e dashboard financeiro com Recharts.

### 📱 App do Técnico (`londriclima-mobile`)
Aplicativo Flutter para Android com funcionamento **offline-first**
obrigatório. Guia o técnico por um fluxo linear de seis etapas bloqueadas
com fotos obrigatórias, checklist, peças trocadas e assinatura digital
do cliente. Sincronização automática em background ao retomar conexão.

### ⚙️ Motor de Automações (`londriclima-backend`)
API centralizada responsável pela geração de PDF do relatório técnico,
disparo de e-mail transacional, mensagem de agradecimento via WhatsApp
e motor de recorrência para lembretes preventivos de manutenção a cada
180 dias.

---

## Stack Técnica

| Camada | Tecnologia |
| :--- | :--- |
| Backend | Node.js (NestJS) ou Python (FastAPI) |
| Banco de dados | PostgreSQL |
| Storage de mídia | Google Cloud Storage ou Supabase |
| Frontend admin | React.js + Tailwind CSS + Recharts + Leaflet |
| App técnico | Flutter + Drift (SQLite offline) |
| Autenticação | JWT + Refresh Token |
| Geração de PDF | Puppeteer (Node) ou WeasyPrint (Python) |
| E-mail | Resend ou SendGrid |
| WhatsApp | Evolution API (isolada via padrão Strategy) |
| Mapas | Leaflet + OpenStreetMap (sem custo de API) |
| Infra | Google Cloud (Cloud Run + Cloud SQL) |

---

## Documentação de Referência

| Documento | Descrição |
| :--- | :--- |
| [`memoria.md`](./memoria.md) | Contexto do projeto, decisões arquiteturais, convenções de negócio e modelo de monetização. |
| [`prd.md`](./prd.md) | Visão consolidada do produto, escopo do MVP, decisões técnicas e diagrama de estados da OS. |
| [`api-spec.md`](./api-spec.md) | Especificação parcial dos endpoints REST do fluxo mobile de OS. |
| [`telemetria-gps.md`](./telemetria-gps.md) | Decisão e arquitetura futura para receptor próprio de GPS da frota em VPS. |
| [`schema.prisma`](../apps/backend/prisma/schema.prisma) | Schema inicial PostgreSQL/Prisma com multi-tenant por `empresa_id`. |

---

## Ciclo de Vida de uma Ordem de Serviço

```text
[Pré-Chamado (Site / WhatsApp)]
        │
        ├──(Rejeitado pelo Admin)──────────────────────► [Rejeitado]
        │
        └──(Aprovado pelo Admin)──► [Aberta]
                                        │
                                        ├──(Cancelado)──► [Cancelada]
                                        │
                                   (Iniciar Rota)
                                        │
                                        ▼
                                 [Em Deslocamento]
                                        │
                                        ├──(Cancelado)──► [Cancelada]
                                        │
                                 (Cheguei no Cliente)
                                        │
                                        ▼
                                 [Em Atendimento]
                                        │
                         (Fotos obrigatórias + Assinatura)
                                        │
                                        ▼
                                   [Concluída] ← estado imutável
                                        │
                              (PDF + E-mail + WhatsApp)
                                        │
                                 (Gatilho: +180 dias)
                                        │
                                        ▼
                            [Lembrete Preventivo Enviado]
```

---

## Fluxo do App do Técnico (Etapas Bloqueadas)

```text
[1] Iniciar Rota
      ↓ (GPS + timestamp)
[2] Cheguei no Cliente
      ↓ (GPS + timestamp — habilita edição)
[3] Salvar Evidência Inicial
      ↓ (texto obrigatório + foto obrigatória — máx. 800 KB WebP)
[4] Checklist e Insumos
      ↓ (procedimentos + peças + custo unitário)
[5] Salvar Evidência Final
      ↓ (texto obrigatório + foto obrigatória — máx. 800 KB WebP)
[6] Finalizar OS
      ↓ (assinatura Base64 + GPS + timestamp)
[✓] OS Concluída → Motor de automações disparado em background
```

Nenhuma etapa pode ser pulada. A validação existe tanto no app
quanto na API para garantir integridade mesmo em caso de sync offline.

---

## Decisões Arquiteturais Importantes

**GPS por eventos, não contínuo.**
O app não rastreia o técnico em segundo plano. A geolocalização é
capturada apenas nos gatilhos manuais: Iniciar Rota, Chegar ao Cliente
e Finalizar OS. Decisão tomada por segurança jurídica trabalhista
e economia de bateria.

**Rastreamento de frota via hardware.**
Veículos monitorados por rastreadores físicos de baixo custo
(SinoTrack via protocolo TCP). O celular do técnico fica fora do
rastreamento contínuo.

**Mensageria desacoplada via padrão Strategy.**
Evolution API é o provedor atual (custo zero no MVP). A migração
futura para a API Oficial da Meta não exige refatoração da lógica
de negócio, apenas troca do adaptador.

**Multi-Tenant por `empresa_id`.**
Todas as tabelas transacionais possuem `empresa_id`. A barreira
existe no banco de dados, não apenas na API.

**Integridade transacional offline.**
O status local de uma OS no Drift só é atualizado após confirmação
de sucesso completo do servidor. Dados parcialmente sincronizados
nunca são marcados como concluídos.

**OS concluída é imutável.**
Nenhuma OS com status `concluida` pode ser reaberta, editada ou
cancelada. Revisitas geram uma nova OS vinculada ao mesmo
equipamento.

---

## Fora do Escopo — Fase 1

Itens explicitamente excluídos do MVP. Não devem ser implementados
sem aprovação formal:

- Emissão de NF-e ou NFS-e.
- Integração com ERP ou sistema contábil externo.
- Login e painel individual para o Auxiliar Técnico. Na Fase 1, o auxiliar pode ser cadastrado apenas como vínculo operacional da equipe, sem credenciais próprias.
- IA de diagnóstico por código de erro (Fase 2 — Claude API / Anthropic).
- Reabertura ou edição de OS com status `concluida`.
- Multi-Tenant ativo com múltiplas empresas simultâneas (Fase 2).
- Versão iOS do aplicativo mobile.
- Dashboard financeiro com DRE automatizada ou integração bancária.

---

## Estimativa de Custo Mensal (Fase Piloto)

| Item | Estimativa |
| :--- | :--- |
| Servidor e banco de dados | R$ 0 a R$ 100 |
| Storage de fotos | R$ 0 a R$ 30 |
| Instância Evolution API (VPS) | R$ 50 a R$ 90 |
| E-mail transacional | R$ 0 (free tier) |
| Chips M2M dos rastreadores | R$ 15 por veículo |
| **Total estimado** | **< R$ 250 / mês** |

---

## Como Começar (Ambiente Local)

**Pré-requisitos:** Docker, PostgreSQL 15+, Node.js 20+ ou Python 3.11+,
Flutter 3.19+ e Git instalados.

```bash
# 1. Clone o repositório principal
git clone https://github.com/fabiodias345/Londriclima.git
cd Londriclima

# 2. Instale dependências e suba o banco local
npm install
npm run docker:up

# 3. Configure as variáveis de ambiente do backend
cp apps/backend/.env.example apps/backend/.env
# Edite o .env com suas credenciais locais (DB, JWT, Storage, WhatsApp, Email)

# 4. Gere o client Prisma e aplique as migrations
npm run backend:prisma:generate
npm run backend:prisma:migrate

# 5. Inicie o servidor
npm run backend:dev

# 6. Acesse a API local
# http://localhost:3000/api/v1
```

Cada submódulo possui um `README.md` próprio com instruções específicas.

---

## Ordem de Desenvolvimento Recomendada

O banco de dados é a dependência raiz de todos os módulos.
A sequência abaixo evita retrabalho:

```text
1. apps/backend   → Schema, autenticação, endpoints base e empresa_id global.
2. apps/mobile    → Estrutura Flutter + Drift + fluxo offline da OS.
3. apps/admin     → Painel React consumindo a API do backend.
4. apps/landing   → Website com formulário integrado ao backend.
```

---

## Repositório e Autoria

**GitHub:** https://github.com/fabiodias345/Londriclima.git
**Autor:** Fábio Dias
**Versão do PRD:** 1.4.0
**Versão da API Spec:** 1.0.0
**Última atualização:** 10/06/2026
