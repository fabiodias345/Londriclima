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

## Validacao feita

```powershell
cd apps\admin_mobile
flutter analyze --no-pub
```

Resultado:

```text
No issues found
```

## Proximo foco - App Admin Mobile

### Fase 2 - dados reais

Conectar os botoes do dashboard aos endpoints existentes do admin:

- O.S. abertas, em andamento e concluidas.
- Agenda do dia.
- Clientes.
- PMOC pendente.
- Frota.
- Tecnicos.
- Relatorios resumidos.
- Pendencias urgentes.

### Fase 3 - acoes rapidas

- Criar nova O.S.
- Reprogramar agenda.
- Aprovar ou rejeitar solicitacao.
- Reenviar PMOC.
- Abrir PDF/relatorio.
- Registrar acao de frota quando fizer sentido.

### Fase 4 - acabamento

- Busca e filtros.
- Melhor layout para celular pequeno.
- Notificacoes depois da definicao Meta/telefone.
- Build APK admin somente no final.

## Comando para testar agora

```powershell
cd apps\admin_mobile
flutter run --dart-define=ADMIN_API_BASE_URL=https://api.airmovebr.com.br
```
