# Resumo Clima do Brasil

Atualizado em: 04/07/2026

Somente estado atual e proximos passos. Historico concluido fica no Git e nos testes.

## Regras

- Executar uma fase por vez e validar antes de continuar.
- App tecnico e app admin devem ficar separados.
- App admin aceita somente usuario com `role=admin`.
- Tecnico e auxiliar nao acessam o app admin.
- Nao gerar APK admin ainda; testar por `flutter run`.
- APK admin so depois de definir telefone e API Meta.
- Segredos e credenciais nunca entram no Git.

## Estado atual

- Rebrand visual para Clima do Brasil aplicado.
- Admin web esta ok por enquanto.
- APK tecnico esta ok por enquanto.
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

## Proximo foco - App Admin Mobile

- Notificacoes depois da definicao Meta/telefone.
- Build APK admin somente no final.

## Comando para testar agora

```powershell
cd apps\admin_mobile
flutter run --dart-define=ADMIN_API_BASE_URL=https://api.airmovebr.com.br
```
