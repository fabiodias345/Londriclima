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
├── README.md                    ← Visão geral do projeto
├── memoria.md                   ← Contexto, decisões e convenções do projeto
├── prd.md                       ← Documento de Requisitos do Produto (v1.4.0)
├── api-spec.md                  ← Especificação parcial da API REST
└── schema.sql                   ← Pendente: schema do banco de dados PostgreSQL

Módulos planejados para implementação:

├── londriclima-landing/         ← Website institucional público
├── londriclima-backend/         ← API REST, automações e banco de dados
├── londriclima-admin/           ← Painel web administrativo
└── londriclima-mobile/          ← Aplicativo Flutter (Android)
```

---

## Módulos da Plataforma

### 🌐 Website Institucional (`londriclima-landing`)
Site público focado em conversão e captação de leads. Formulário de
agendamento integrado ao backend, criando pré-chamados automáticos no
painel administrativo.

### 💻 Painel Administrativo (`londriclima-admin`)
Interface web para o gestor. Controle de clientes, equipamentos, ordens
de serviço, agenda com drag-and-drop, mapa de monitoramento da frota via
Leaflet e dashboard financeiro com Recharts.

### 📱 App do Técnico (`londriclima-mobile`)
Aplicativo Flutter para Android com funcionamento **offline-first**
obrigatório. Guia o técnico por um fluxo linear de registro de serviço
com fotos obrigatórias, checklist, peças trocadas e assinatura digital
do cliente. Sincronização automática em background ao retomar conexão.

### ⚙️ Motor de Automações (`londriclima-backend`)
API centralizada responsável por geração de PDF de relatório técnico,
disparo de e-mail transacional, mensagem de agradecimento via WhatsApp
e motor de recorrência para lembretes preventivos de manutenção.

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
| Infra | Google Cloud (Cloud Run + Cloud SQL) |

---

## Documentação de Referência

| Documento | Descrição |
| :--- | :--- |
| [`memoria.md`](./memoria.md) | Contexto, decisões arquiteturais, convenções e modelo de monetização. |
| [`prd.md`](./prd.md) | Visão consolidada do produto, escopo do MVP, decisões técnicas e diagrama de estados. |
| [`api-spec.md`](./api-spec.md) | Especificação parcial dos endpoints REST do fluxo mobile de OS. |
| `schema.sql` | Pendente: schema completo do PostgreSQL com ENUMs e empresa_id. |

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
                              (Fotos + Assinatura)
                                        │
                                        ▼
                                   [Concluída]
                                        │
                              (PDF + E-mail + WhatsApp)
                                        │
                              (Gatilho: +180 dias)
                                        │
                                        ▼
                            [Lembrete Preventivo Enviado]
```

---

## Decisões Arquiteturais Importantes

**GPS por eventos, não contínuo.**
O app não rastreia o técnico em segundo plano. A geolocalização é
capturada apenas nos três gatilhos manuais da OS: Iniciar Rota,
Chegar ao Cliente e Finalizar OS. Decisão por segurança jurídica
trabalhista e economia de bateria.

**Rastreamento de frota via hardware.**
Veículos monitorados por rastreadores físicos de baixo custo
(ex: SinoTrack via protocolo TCP). O celular do técnico fica fora
do rastreamento contínuo.

**Mensageria desacoplada via padrão Strategy.**
Evolution API é o provedor atual. Migração futura para API Oficial
da Meta não exige refatoração da lógica de negócio.

**Multi-Tenant por `empresa_id`.**
Todas as tabelas transacionais possuem `empresa_id`. A barreira
está no banco, não apenas na API.

**Integridade transacional offline.**
Status local de OS no Drift só atualiza após confirmação de sucesso
completo do servidor. Nenhum dado parcial é marcado como sincronizado.

---

## Fora do Escopo — Fase 1

- Emissão de NF-e ou NFS-e.
- Integração com ERP ou sistema contábil externo.
- Login individual para o Auxiliar Técnico. Na Fase 1, o auxiliar pode ser cadastrado no painel apenas como vínculo operacional da equipe, sem credenciais próprias.
- IA de diagnóstico por código de erro (Fase 2 — Claude API).
- Reabertura de OS com status `Concluída`.
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

Pré-requisitos: Docker, PostgreSQL e Node.js ou Python instalados.

```bash
# 1. Clone o repositório principal
git clone https://github.com/fabiodias345/Londriclima.git

# 2. Acesse o repositório
cd plataforma-londriclima

# 3. Inicialize o banco de dados quando schema.sql estiver disponível
psql -U postgres -f schema.sql

# 4. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais locais

# 5. Instale as dependências e suba o servidor
npm install && npm run start:dev   # NestJS
# ou
pip install -r requirements.txt && uvicorn main:app --reload  # FastAPI
```

Cada submódulo possui um `README.md` próprio com instruções específicas
de inicialização.

---

## Ordem de Desenvolvimento Recomendada

O banco de dados é a dependência raiz de todos os módulos. A sequência
recomendada é:

1. `londriclima-backend` — Schema, autenticação e endpoints base.
2. `londriclima-mobile` — Estrutura Flutter + Drift espelhando as tabelas locais.
3. `londriclima-admin` — Painel conectado à API do backend.
4. `londriclima-landing` — Website com formulário integrado ao backend.

---

## Repositório e Autoria

**GitHub:** https://github.com/fabiodias345/Londriclima.git
**Autor:** Fábio Dias
**Versão do PRD:** 1.4.0
**Última atualização:** 10/06/2026
