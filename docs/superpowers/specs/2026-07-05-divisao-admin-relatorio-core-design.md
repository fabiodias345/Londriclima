# Divisão do AdminRelatorioTecnicoCoreService

Data: 05/07/2026

## Objetivo

Dividir `admin-relatorio-tecnico-core.service.ts` por domínio, sem alterar regras, endpoints, respostas, banco de dados, PDFs ou comportamento observável.

## Limites

- Trabalhar somente na decomposição de `admin-relatorio-tecnico-core.service.ts` e nos arquivos diretamente necessários para conectá-la.
- Não corrigir nem redesenhar PDFs nesta entrega.
- Não refatorar outros arquivos grandes nesta entrega.
- Novos arquivos devem ter no máximo 500 linhas, exceto:
  - arquivo exclusivo de PMOC;
  - arquivo exclusivo de relatório/resumo.
- PMOC e relatório/resumo devem permanecer separados entre si.

## Estratégia

Aplicar migração incremental por domínio. `AdminRelatorioTecnicoCoreService` permanece temporariamente como fachada, conservando sua API pública enquanto delega para serviços extraídos. Cada fase deve compilar e passar nos testes antes da seguinte.

## Estrutura alvo

### PMOC

`admin-pmoc-core.service.ts` será o único núcleo do domínio PMOC e poderá ultrapassar 500 linhas. Deve concentrar:

- prévia PMOC;
- regras e pendências PMOC;
- geração do PDF PMOC existente;
- solicitação de assinatura;
- formatações exclusivas do PMOC.

### Relatório e resumo

`admin-relatorio-resumo-core.service.ts` será o único núcleo do domínio relatório/resumo e poderá ultrapassar 500 linhas. Deve concentrar:

- resumo administrativo de relatórios;
- listagem e prévia de relatórios avulsos;
- geração do PDF avulso existente;
- envio e exclusão de relatório avulso;
- imagens, respostas e formatações exclusivas do relatório avulso.

### Fachada temporária

`admin-relatorio-tecnico-core.service.ts` deve terminar com menos de 500 linhas. Durante a migração, conserva os métodos públicos atuais e apenas encaminha chamadas para:

- núcleo PMOC;
- núcleo relatório/resumo;
- serviços administrativos já existentes de agenda, frota, clientes, equipamentos, técnicos, equipes, engenheiros, recorrência e pré-chamados.

## Fases

### Fase 1 — proteção de contratos

- Mapear os métodos públicos e consumidores atuais.
- Confirmar cobertura dos endpoints de PMOC, relatório avulso e resumo.
- Registrar resultado inicial de build e testes.
- Não alterar implementação.

### Fase 2 — extração PMOC

- Mover tipos, consultas, mapeamentos, regras, formatações e operações exclusivas do PMOC para `admin-pmoc-core.service.ts`.
- Manter assinaturas públicas e respostas idênticas.
- Fazer a fachada delegar ao novo núcleo.
- Executar build e testes PMOC antes de continuar.

### Fase 3 — extração relatório/resumo

- Mover resumo, relatório avulso, PDF, imagens, envio e exclusão para `admin-relatorio-resumo-core.service.ts`.
- Manter nomes de arquivos, conteúdo dos PDFs e payloads idênticos.
- Fazer a fachada delegar ao novo núcleo.
- Executar build e testes de relatório antes de continuar.

### Fase 4 — redução da fachada

- Remover da fachada lógica que já pertence aos serviços administrativos existentes.
- Preservar delegações necessárias para compatibilidade.
- Garantir que `admin-relatorio-tecnico-core.service.ts` tenha menos de 500 linhas.
- Não modificar outros arquivos grandes além das conexões indispensáveis.

### Fase 5 — estabilização

- Executar build, testes do módulo admin e testes HTTP relacionados.
- Comparar contratos de endpoints e nomes de arquivos.
- Verificar que somente os dois núcleos autorizados ultrapassam 500 linhas.
- Manter a fachada enquanto houver consumidores; sua remoção fica para entrega posterior.

## Compatibilidade

Devem permanecer idênticos:

- rotas e métodos HTTP;
- autenticação e escopo por empresa;
- consultas e ordenação;
- estruturas JSON;
- mensagens de erro;
- nomes e bytes gerados dos PDFs;
- payloads de automação e e-mail;
- regras de assinatura PMOC;
- seleção da O.S. mais recente nos relatórios avulsos.

## Verificação

Cada fase deve incluir:

1. `npm.cmd run backend:build`;
2. testes unitários diretamente relacionados;
3. testes HTTP dos endpoints preservados;
4. `git diff --check`;
5. contagem de linhas dos arquivos alterados;
6. commit isolado da fase.

Falha em qualquer verificação interrompe a fase seguinte até correção.
