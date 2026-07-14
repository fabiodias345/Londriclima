# Resumo AIRMOVEBR

Atualizado em: 14/07/2026

Somente estado atual e proximos passos. Historico concluido fica no Git e nos testes.

## Regras

- Executar uma fase por vez e validar antes de continuar.
- App tecnico e app admin devem ficar separados.
- App admin aceita somente usuario com `role=admin`.
- Tecnico e auxiliar nao acessam o app admin.
- Nao gerar APK admin ainda; testar por `flutter run`.
- APK admin so depois de validar notificacoes WhatsApp em producao.
- Segredos e credenciais nunca entram no Git.

## Estado atual

- Rebrand para AIRMOVEBR aplicado em todos os componentes ativos.
- Git `dev`, `main`, GitHub e repo da VM alinhados no ultimo deploy.
- Backend de producao saudavel em `https://api.airmovebr.com.br/api/v1/health`.
- Banco de producao verificado no deploy: Prisma sem migrations pendentes.
- Admin web esta ok por enquanto em `https://admin.airmovebr.com.br/`.
- Site publico foi redesenhado no padrao operacional AIRMOVEBR, com servicos, PMOC, projetos, segmentos e formulario de pre-chamado com CEP.
- APK tecnico esta ok por enquanto, mas ainda precisa validacao final em campo real.
- Novo app separado criado em `apps/admin_mobile`.
- Fase 1 do app admin implementada:
  - login pela mesma API do sistema;
  - bloqueio local para `role != admin`;
  - dashboard com botoes coloridos;
  - botoes para O.S., Agenda, Clientes, PMOC, Frota, Relatorios, Tecnicos e Pendencias;
  - telas-resumo preparadas para as proximas fases.
- Fase 2 do app admin implementada:
  - cliente HTTP autenticado para endpoints admin;
  - botoes do dashboard abrem dados reais;
  - O.S., Agenda, Clientes, PMOC, Frota, Relatorios, Tecnicos e Pendencias em modo somente leitura;
  - estados de carregamento, vazio, erro e atualizacao manual.
- Fase 3 do app admin implementada:
  - criar nova O.S. com cliente, titulo, detalhes, tecnico e agendamento;
  - reprogramar O.S. operacional;
  - aprovar ou rejeitar pre-chamado com confirmacao;
  - reenviar assinatura PMOC com confirmacao;
  - atualizacao automatica da lista depois da acao.
- Fase 4 do app admin implementada:
  - busca e filtros locais nos modulos;
  - layout compacto para celular pequeno;
  - abertura autenticada de PDF PMOC e relatorio avulso;
  - detalhes da frota somente para consulta.
- Codigo das fases 1 a 4 esta no GitHub e na VM; APK admin ainda nao foi gerado.
- WhatsApp Cloud API oficial da Airmovebr configurado localmente e em producao com o numero `+55 43 3067-3793`.
- Envio manual por texto livre validado quando existe janela de atendimento aberta.
- Template `boas_vindas_airmovebr` criado na Meta e aguardando aprovacao para iniciar conversa sem mensagem previa do cliente.
- Backend em producao recebeu integracao inicial para fila `enviar_whatsapp` na finalizacao de O.S.

## Validacao feita

```powershell
cd apps\admin_mobile
dart analyze lib test
```

Resultado:

```text
No issues found
```

Tentativa adicional:

```powershell
cd apps\admin_mobile
flutter test --no-pub
```

Resultado: comando travou sem saida ate o timeout local.

## O que falta fazer

1. Confirmar na Meta se o template `boas_vindas_airmovebr` foi aprovado.
2. Criar templates reais para O.S. finalizada, agendamento/lembrete e aviso de atendimento.
3. Trocar a automacao `os_finalizada` para template aprovado quando a mensagem for iniciada pela empresa.
4. Configurar webhook WhatsApp para receber mensagens e status `sent`, `delivered`, `read` e `failed`.
5. Persistir status real de WhatsApp no banco, nao apenas `messageId`.
6. Finalizar uma O.S. real e validar se o WhatsApp dispara sozinho.
7. Validar app tecnico no celular em campo real.
8. Validar app admin completo no aparelho real.
9. Gerar APK tecnico/admin somente depois das validacoes acima.

## Proximo foco

- Nao fazer nova feature hoje.
- Na proxima sessao, continuar por WhatsApp de producao: template aprovado, webhook e O.S. real.
- Build APK admin somente no final.

## Apos instalar a API Meta

- Fazer uma limpeza geral do backend:
  - alinhar a spec PMOC ao texto acentuado do PDF;
  - limpar os 4 avisos de lint;
  - isolar o scheduler de recorrencias nos testes para remover o ruido de bootstrap.

## Comando para testar agora

```powershell
cd apps\admin_mobile
flutter run --dart-define=ADMIN_API_BASE_URL=https://api.airmovebr.com.br
```
