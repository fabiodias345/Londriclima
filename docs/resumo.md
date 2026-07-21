# Resumo AIRMOVEBR

Atualizado em: 21/07/2026

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
- Bolt isolado em pasta propria com estados, coleta, triagem, FAQs, fallback e transferencia humana.
- Admin WhatsApp possui fila humana, alerta, SSE/polling, assumir/liberar/encerrar, resposta manual e historico.
- Central de atendimento WhatsApp refeita localmente: fila, conversa completa com horario, dados coletados pelo Bolt e criacao de cliente/O.S. pre-preenchida e vinculada; falta publicar e validar no Admin de producao.
- Conversas podem ser vinculadas manualmente a cliente e O.S.; status de entrega WhatsApp sao persistidos.
- Suporte a templates aprovados inclui O.S. finalizada e notificacao proativa ao tecnico.
- Suite backend validada com 211 testes aprovados; todos os arquivos de codigo alterados permanecem abaixo de 500 linhas.

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

## Fases WhatsApp/Bolt e Admin

Executar uma fase por vez. Validar a fase atual antes de iniciar a proxima. Nenhum arquivo de codigo novo ou editado pode passar de 500 linhas.

### Fase W1 — Contrato e estados da conversa (concluida)

- Criar a pasta exclusiva `apps/backend/src/modules/whatsapp/bolt/`.
- Separar tipos, estados, normalizacao, respostas e regras globais do Bolt.
- Padronizar os dados salvos em `whatsapp_conversas.dados`.
- Definir o mapeamento entre os estados do Bolt e os estados atuais do banco.
- Manter deduplicacao, silencio em atendimento humano/encerrado e fallback persistido.

### Fase W2 — Fila humana no Admin (concluida)

- Exibir conversas aguardando atendente no topo.
- Criar contador e badge de novas transferencias.
- Destacar visualmente conversa pendente.
- Criar assumir, liberar, encerrar e reabrir conversa.
- Impedir que dois atendentes assumam a mesma conversa.

### Fase W3 — Atualizacao em tempo real (concluida)

- Criar eventos SSE autenticados para o Admin.
- Atualizar lista e conversa quando chegar mensagem nova.
- Atualizar fila quando o Bolt transferir ou o atendente assumir.
- Usar polling de seguranca quando o SSE estiver indisponivel.
- Adicionar aviso sonoro/notificacao do navegador sem repetir alerta.

### Fase W4 — Intervencao humana completa (concluida)

- Permitir resposta no mesmo historico da conversa.
- Gravar mensagens de entrada e saida com origem correta.
- Mostrar atendente responsavel, horario e status.
- Garantir que o Bolt nao responda depois da transferencia.
- Criar encerramento com motivo: concluido, erro, spam ou sem interesse.

### Fase W5 — Lead e cliente (concluida)

- Nao criar cliente automaticamente a partir de qualquer mensagem.
- Procurar cliente existente pelo telefone.
- Criar cliente somente por botao e confirmacao do atendente.
- Abrir formulario de cliente pre-preenchido com dados do Bolt.
- Permitir descartar/arquivar conversa sem criar cliente.
- Manter vinculo entre conversa e cliente quando houver cadastro.

### Fase W6 — Criacao de O.S. pela conversa (concluida)

- Adicionar botao `Criar O.S.` no atendimento.
- Exigir cliente existente ou criacao confirmada antes da O.S.
- Preencher titulo, detalhes, servico, cidade/bairro e telefone com os dados da conversa.
- Permitir selecionar equipamento, equipe, tecnico, data e horario.
- Usar o fluxo real de agenda/O.S. e gravar o vinculo conversa-O.S.
- Validar uma O.S. real criada a partir do Admin WhatsApp.

### Fase W7 — Perguntas, respostas e qualificacao do Bolt (concluida)

- Implementar os quatro fluxos: manutencao, instalacao, PMOC e locacao.
- Implementar submenus numericos e validacao local.
- Implementar menu, cancelar, voltar, recomecar e corrigir.
- Implementar timeout de 30 minutos e reset apos encerramento.
- Implementar FAQ de horario, cobertura e documentos.
- Manter bloqueios de preco final, diagnostico tecnico e horario confirmado.
- Gerar resumo para cliente e canal interno definido.

### Fase W8 — WhatsApp de producao (parcial)

- Confirmar aprovacao do template `boas_vindas_airmovebr`.
- Criar templates para O.S. finalizada, agendamento/lembrete e aviso de atendimento.
- Trocar automacao `os_finalizada` para template aprovado fora da janela de atendimento.
- Processar e persistir no banco os status `sent`, `delivered`, `read` e `failed` recebidos pelo webhook.
- Suporte a template aprovado e persistencia de status real de entrega implementados; falta validar credenciais, template aprovado e disparo real em producao.
- Validar notificacao proativa para tecnico e atendimento real de cliente.

### Depois do WhatsApp

- Validar app tecnico no celular em campo real.
- Validar app admin completo no aparelho real.
- Gerar APK tecnico/admin somente depois das validacoes acima.

## Proximo foco

- Validar a migration WhatsApp em banco de homologacao/producao.
- Confirmar aprovacao dos templates na Meta e configurar `WHATSAPP_TEMPLATE_OS_FINALIZADA` e `WHATSAPP_TEMPLATE_OS_NOVA`.
- Testar no Admin: transferencia, alerta, assumir, responder, criar cliente e criar O.S.
- Validar um disparo real para tecnico/cliente antes de publicar.

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
