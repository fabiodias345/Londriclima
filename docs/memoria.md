# 📑 memoria.md — Plataforma AIRMOVEBR (v1.4.0)

## Contexto do Projeto

Cliente piloto: AIRMOVEBR (airmovebr.com.br)
Segmento: Refrigeração, climatização, ar-condicionado — Londrina, PR.
Objetivo: Substituir o site atual (desatualizado) por uma plataforma integrada que profissionalize a operação e sirva de produto (SaaS Multi-Tenant) para vender a outras empresas do setor (refrigeração, solar, construtoras) no futuro.

Restrição principal da fase 1: Uma única empresa pagando, custo mínimo de infraestrutura, sem superdimensionamento.

---

## Modelo de Negócios e Cobrança (Validação Comercial)

Para que o sistema seja sustentável e escalável desde o cliente piloto, o modelo de monetização foi estruturado da seguinte forma:

- **Fase 1 (AIRMOVEBR - Piloto):** Modelo de **Mensalidade Fixa de Infraestrutura + Suporte** (Valor enxuto para cobrir custos de servidores, banco de dados e APIs, servindo como laboratório de validação).
- **Fase 2 (Escalabilidade SaaS para Mercado):** Modelo baseado em **Mensalidade por Licença de Usuário/Técnico Ativo** ou **Pacotes por Volume de Ordens de Serviço (OS) geradas**. 
*Nota de Arquitetura:* O sistema deve registrar e contabilizar o volume de OS e usuários ativos por `empresa_id` para permitir faturamento automatizado no futuro.

---

## Problema Atual da AIRMOVEBR

- Site sem conversão e sem identidade profissional.
- Sem controle centralizado da equipe em campo.
- Sem registro formal de serviços (histórico, fotos, assinatura do cliente).
- Sem relatório técnico automático para o cliente.
- Atendimento e agendamento 100% manual e desorganizado.
- Sem visão financeira integrada da operação.
- Riscos jurídicos/trabalhistas caso se tente rastrear o celular do técnico continuamente em segundo plano.

---

## Solução — Visão Geral

Três produtos integrados numa única plataforma:

1. **Website Institucional Moderno:** Vitrine focada em conversão + captação de leads.
2. **Painel Web Administrativo:** Gestão, agendamento, financeiro e monitoramento.
3. **App de Campo para o Técnico:** Registro de serviço padronizado e funcionamento *Offline-First*.

Suportados por automação de WhatsApp, relatório técnico automático em PDF e, na fase 2, IA de apoio a diagnóstico (Claude API).

---

## Convenções do Projeto (Regras de Negócio Inegociáveis)

Para evitar ambiguidades durante o desenvolvimento com agentes de IA, ficam definidas as seguintes convenções:

1. **Definição de OS Concluída (Campos Obrigatórios):** Uma Ordem de Serviço só pode ser alterada para o status "Concluída" se contiver, obrigatoriamente: Identificação do equipamento (marca/modelo), descrição do serviço realizado, pelo menos 1 Foto do Antes, pelo menos 1 Foto do Depois, assinatura digital do cliente e geolocalização do evento de encerramento.
2. **Definição de Técnico Ativo (Faturamento SaaS):** É considerado um usuário ativo qualquer conta com a role `tecnico` que tenha feito login no aplicativo ou executado pelo menos 1 alteração de status de OS nos últimos 30 dias.
3. **Prazo Padrão da Máquina de Recorrência:** O gatilho padrão para o marketing de pós-venda automatizado é de **6 meses (180 dias)** após a conclusão da OS. O sistema deve permitir que o administrador altere esse prazo manualmente por cliente ou tipo de equipamento (Ex: PMOC industrial exige prazos mensais/trimestrais).

---

## Fase 1 — Escopo Mínimo Viável (MVP)

### 1. Website
- Páginas: Home, Sobre, Serviços (Limpeza, Manutenção, Instalação, Infraestrutura), Contato/Agendamento.
- Formulário de agendamento integrado que cria automaticamente um pré-chamado no Painel Admin.
- Botão flutuante do WhatsApp conectado ao fluxo de automação.
- Design moderno, mobile-first, carregamento rápido e focado em SEO local.
- Substituir completamente o site atual.

### 2. Painel Administrativo (Web)

**Equipe e Usuários**
- Cadastro de técnicos e auxiliares (Estrutura: 1 técnico + 1 auxiliar por equipe). Na Fase 1, o auxiliar é apenas um vínculo operacional da equipe e não possui login individual no app.
- Controle de login e permissões por perfil (Admin, Supervisor).

**Clientes e Equipamentos**
- Cadastro unificado de clientes (PF/PJ) com múltiplos endereços e histórico.
- Cadastro de equipamentos (marca, modelo, BTU, local de instalação).
- Histórico completo e cronológico de manutenções por equipamento.

**Ordens de Serviço (OS)**
- Criação, agendamento e despacho (*dispatch*) de OS por equipe.
- Status da OS: Pré-Chamado → Aberta → Em Deslocamento → Em Atendimento → Concluída, com ramificações para Rejeitada e Cancelada.
- Agenda visual de serviços em formato de calendário interativo.

**Monitoramento Híbrido em Tempo Real**
- Painel com mapa central utilizando **Leaflet** (OpenStreetMap) para evitar custos iniciais de API do Google, com possibilidade de transição futura.
- O mapa deve estar preparado para plotar a localização dos veículos da frota através de rastreadores físicos simples de baixo custo (ex: SinoTrack).
- Exibição os pontos exatos de atendimento baseados nos eventos do aplicativo mobile.

**Módulo Financeiro Básico**
- Painel de Analytics utilizando a biblioteca **Recharts** para gráficos limpos, responsivos e performáticos.
- Receitas por OS (valor cobrado ao cliente).
- Custo de peças, insumos e deslocamento.
- Produtividade por técnico: Horas trabalhadas, km rodado relatado, serviços realizados.
- Relatório de fechamento mensal e DRE básico.

### 3. App do Técnico (Flutter — Offline-First)
*Nota técnica: Optou-se por Flutter nativo para garantir controle absoluto do hardware (câmera, armazenamento persistente de fotos e serviços offline).*

- Login individual do técnico vinculado à sua equipe.
- Lista de OS atribuídas ao dia, ordenada por prioridade/horário (com dados de endereço e equipamento).
- **Fluxo Obrigatório de Registro de Serviço:**
  - Identificação da máquina (Marca, modelo, capacidade).
  - Estado antes do serviço: Texto descritivo + **Foto Obrigatória 1**.
  - Checklist de procedimentos realizados.
  - Peças substituídas: Seleção por lista + quantidade.
  - Estado depois do serviço: Texto descritivo + **Foto Obrigatória 2**.
  - Observações livres.
  - Coleta da assinatura digital do cliente diretamente na tela do celular (dedo ou caneta).
  - Registro automático da hora de início e fim do serviço.
- **Estratégia de GPS e LGPD (Rastreamento por Eventos):**
  - O aplicativo **NÃO** faz rastreamento contínuo em segundo plano (*background tracking*), evitando processos trabalhistas e consumo excessivo de bateria.
  - A geolocalização é capturada estritamente via gatilhos de ação executados pelo técnico: *Ao Iniciar Rota*, *Ao Chegar no Cliente* e *Ao Finalizar a OS*.
- **Modo Offline Obrigatório com Banco Relacional:**
  - Devido à complexidade e relações da OS (peças trocadas, logs de status, metadados de fotos), o armazenamento local deve ser robusto e relacional, utilizando a biblioteca **Drift (antigo Moor)** sobre SQLite.
  - Fila de sincronização automática (*background sync*) que envia os dados para a API assim que detectar conexão com a internet, sem travar o uso do técnico.

### 4. Relatório Técnico Automático
Gerado automaticamente pelo backend assim que o técnico conclui e sincroniza a OS.

- **Conteúdo do PDF:**
  - Logo e dados da empresa (CNPJ, endereço, telefone).
  - Dados do cliente e endereço do serviço.
  - Dados do equipamento (marca, modelo, capacidade).
  - Descrição do problema relatado e serviço realizado.
  - Fotos de antes e depois lado a lado.
  - Lista de peças substituídas.
  - Assinatura digital do cliente.
  - Data, hora de início/fim e técnico responsável.
- **Envio Automático:**
  - E-mail transacional ao cliente com o PDF anexado (com cópia oculta para a empresa).
  - Mensagem automática via WhatsApp ao cliente:
    *"Olá! Obrigado por escolher a AIRMOVEBR. O relatório completo do serviço realizado hoje foi enviado para o seu e-mail. Qualquer dúvida, estamos à disposição. Até logo!"*

### 5. Automação de WhatsApp

**Atendimento Inicial (Chatbot de Triagem):**
- Auto-resposta instantânea ao receber mensagem no WhatsApp da empresa.
- Fluxo de recolha de dados:
  - Tipo de serviço desejado (limpeza, manutenção, instalação, carga de gás).
  - Tipo e modelo do equipamento.
  - Cidade e bairro.
  - Melhor horário para atendimento.
- Integration: Criação automática de um **Pré-Chamado** no painel administrativo para o supervisor validar e agendar na agenda visual.

**Máquina de Recorrência (Pós-Venda):**
- Agendamento automático no banco de dados para disparar uma mensagem automatizada no WhatsApp do cliente conforme definido nas **Convenções do Projeto**, relembrando e sugerindo a necessidade de uma nova limpeza preventiva/PMOC.

---

## Stack Técnica Selecionada

| Camada | Tecnologia | Justificativa |
| :--- | :--- | :--- |
| **Backend** | Node.js (NestJS) ou Python (FastAPI) | APIs rápidas, tipadas e excelente suporte a Webhooks. |
| **Banco de Dados** | PostgreSQL | Robusto, relacional, ideal para o financeiro e auditoria de OS. |
| **Storage de Fotos** | Google Cloud Storage ou Supabase Storage | Armazenamento seguro de mídia com geração de URLs públicas. |
| **Frontend Admin** | React.js com Tailwind CSS | Agilidade no desenvolvimento, usando **Recharts** para gráficos e **Leaflet** para mapas. |
| **App Técnico** | Flutter | Performance nativa, manutenção offline com banco relacional utilizando **Drift**. |
| **Autenticação** | JWT + Refresh Token | Segurança nas requirições da Web e do Aplicativo Mobile. |
| **Geração de PDF** | Puppeteer (Node) ou WeasyPrint (Python) | Renderização precisa de relatórios HTML para PDF no servidor. |
| **E-mail** | Resend ou SendGrid | Entrega de e-mails transacionais direta na caixa de entrada (Free Tier). |
| **WhatsApp API** | Evolution API ou Z-API | **Nota de Risco de Escalar:** Soluções baseadas em WhatsApp Web espelhado reduzem custos drasticamente no MVP, mas possuem risco de banimento caso o volume de disparos cresça agressivamente. A arquitetura deve isolar o módulo de mensageria para facilitar a migração futura para a API Oficial Cloud da Meta quando o sistema virar SaaS. |
| **Infraestrutura** | VM Locaweb Cloud Medium + dominio `airmovebr.com.br` | Decisao atual para o MVP, com Ubuntu 24.04, Docker, PostgreSQL e manutencao limpa. |
| **Repositório Central** | GitHub Privado | https://github.com/fabiodias345/Londriclima.git |
| **Editor** | VS Code | Ambiente de desenvolvimento unificado. |

---

## Custo Estimado Mensal (Fase Piloto)

| Item | Estimativa | Observação |
| :--- | :--- | :--- |
| **Servidor & Banco de Dados** | R$ 85+ no MVP | VM Locaweb Cloud Medium com IP publico; snapshot/backup pode gerar custo adicional |
| **Storage de Fotos** | R$ 0 a R$ 30 | Cobrado por GB armazenado (Compressão agressiva de imagens) |
| **Instância API WhatsApp** | R$ 50 a R$ 90 | Hospedagem VPS própria para rodar a Evolution API |
| **E-mail Transacional** | R$ 0 | Limite gratuito do Resend/SendGrid atende o MVP |
| **Chips M2M dos Carros** | R$ 15 / por carro | Plano de dados apenas para telemetria de localização |
| **Total Estimado** | **< R$ 250 / mês** | Custo enxuto, ideal para validação do cliente piloto |

---

## Estrutura de Repositórios (VS Code)

Para manter o projeto modularizado, centralizado e facilitar o trabalho com agentes de IA, as subpastas locais serão vinculadas como submódulos ou organizadas dentro do repositório principal no GitHub (**https://github.com/fabiodias345/Londriclima.git**).

**Este arquivo `memoria.md` reside em `docs/`, junto com `README.md`, `prd.md` e `api-spec.md`.**

```text
📁 plataforma-airmovebr/  (Repositório: fabiodias345/Londriclima.git)
│
├── docs/                        # Documentação do projeto
├── apps/
│   ├── backend/                 # API centralizada NestJS e banco de dados
│   ├── admin/                   # Painel Web Administrativo (React + Tailwind + Recharts)
│   ├── landing/                 # Website institucional público
│   └── mobile/                  # Aplicativo do Técnico em Campo (Flutter + Drift)
├── infra/                       # Docker e infraestrutura local
└── storage/                     # Arquivos locais de desenvolvimento
