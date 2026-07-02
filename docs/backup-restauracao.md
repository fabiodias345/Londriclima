# Backup e restauracao

## Estado da Fase B1

Inventario tecnico realizado em 01/07/2026, sem alterar a producao.

| Item | Estado confirmado |
| --- | --- |
| VM | `191.252.226.11` |
| Timezone da VM | `Etc/UTC` |
| Disco raiz | 79 GB total, 21 GB usados, 55 GB livres |
| PostgreSQL | container `infra-postgres-1`, PostgreSQL 16 Alpine, saudavel |
| Banco | `airmovebr_prod`, 15 MB |
| Volume do banco | `infra_postgres_data`, 69,3 MB |
| Volume de arquivos | `infra_storage_data`, 7,7 MB |
| Backend | container `infra-backend-1`, saudavel |
| Backup automatico | inexistente |
| Ferramentas externas | `restic` e `rclone` nao instalados |
| Dumps existentes | 25 dumps manuais; ultimo em 21/06/2026 |
| Object Storage | sem configuracao na VM; contratacao precisa ser confirmada antes da Fase B4 |

## Estado da Fase B2

Concluida em 01/07/2026.

- Script: `/usr/local/sbin/airmovebr-backup-postgres`.
- Destino local: `/var/backups/airmovebr/postgres`.
- Formato: dump customizado e compactado do PostgreSQL.
- Frequencia: 00:15, 06:15, 12:15 e 18:15 em `America/Sao_Paulo`.
- Retencao local: 7 dias.
- Concorrencia: bloqueada por `flock`.
- Integridade: arquivo temporario, validacao com `pg_restore --list` e SHA-256.
- Primeiro backup automatico validado: `airmovebr-20260701T132818Z.dump`, 2.431.964 bytes.
- Timer: `airmovebr-backup-postgres.timer`, habilitado e ativo na VM.

Validacoes executadas:

- teste isolado de criacao, checksum, retencao e trava de concorrencia;
- verificacao de sintaxe Bash e das unidades systemd;
- execucao real pelo servico systemd;
- checksum do dump real;
- leitura do catalogo do dump real pelo `pg_restore`.

## Estado da Fase B3

Concluida em 01/07/2026.

- Origem: volume `infra_storage_data`, montado somente para leitura no servico.
- Script: `/usr/local/sbin/airmovebr-backup-storage`.
- Destino local: `/var/backups/airmovebr/storage`.
- Formato: arquivo `tar.gz` com fotos, PDFs e assinaturas.
- Frequencia: 00:45, 06:45, 12:45 e 18:45 em `America/Sao_Paulo`.
- Retencao local: 7 dias.
- Concorrencia: bloqueada por `flock`.
- Integridade: arquivo temporario, leitura completa do catalogo e SHA-256.
- Primeiro backup validado: `airmovebr-storage-20260701T141459Z.tar.gz`, 7.271.044 bytes.
- Timer: `airmovebr-backup-storage.timer`, habilitado e ativo na VM.

Validacoes executadas:

- teste isolado de criacao, conteudo, checksum, retencao e trava de concorrencia;
- verificacao de sintaxe Bash e das unidades systemd;
- execucao real pelo servico systemd;
- checksum e leitura integral do arquivo real;
- comparacao do arquivo com o volume de origem sem alterar a producao.

## Estado da Fase B4

Concluida em 02/07/2026.

- Provedor externo: Backblaze B2, regiao US East.
- Bucket privado: `londriclima-storage`.
- Endpoint: `s3.us-east-005.backblazeb2.com`.
- Prefixo exclusivo do repositorio: `restic/`.
- Chave de aplicacao: `airmovebr-restic-prod`, restrita ao bucket.
- Restic 0.16.4 instalado na VM.
- Credenciais e senha de recuperacao gravadas somente em `/etc/airmovebr`, com permissao `0600`.
- Repositorio Restic criptografado inicializado no prefixo `restic/`.
- Primeiro snapshot remoto: 31 arquivos e 57,844 MiB.
- Integridade remota: `restic check` concluido sem erros.
- Retencao: 14 diarios, 8 semanais e 12 mensais.
- Falha de rede simulada: retorno de erro sem apagar nenhum backup local.
- Timer externo: `airmovebr-backup-external.timer`, habilitado a cada 6 horas.
- Horarios: 01:15, 07:15, 13:15 e 19:15 em `America/Sao_Paulo`.

## Estado da Fase B5

Concluida em 02/07/2026.

- Snapshot recorrente configurado no disco da VM pela Locaweb Cloud.
- Frequencia: semanal, todo domingo as 03:30.
- Fuso horario: `America/Sao_Paulo`.
- Retencao: 4 snapshots.
- Zona nativa: `ZP01`.
- Zonas adicionais: nenhuma.
- Agendamento confirmado na lista de snapshots recorrentes do painel.
- Primeira execucao automatica deve ser conferida depois do proximo domingo.

## Estado da Fase B6

Em andamento em 02/07/2026.

- Snapshot remoto restaurado em PostgreSQL 16 isolado, sem tocar a producao.
- Contagens restauradas: 2 empresas, 7 clientes, 35 equipamentos, 5 usuarios e 15 O.S.
- Arquivo de storage restaurado integralmente: 103 arquivos.
- Monitoramento horario ativo, com limite de 8 horas para banco, arquivos e copia externa.
- Falhas dos servicos de backup acionam alerta por e-mail.
- E-mail real de teste aceito pelo SMTP configurado.
- Teste de restauracao mensal ativo no dia 1, as 05:00 em `America/Sao_Paulo`.
- Proxima execucao mensal agendada para 01/08/2026.

Pendente para concluir:

- conferir no painel a primeira execucao do snapshot semanal da Locaweb depois do proximo domingo.

## Operacao e verificacao

- Estado dos timers: `systemctl list-timers 'airmovebr-backup*' --all`.
- Saude imediata: `systemctl start airmovebr-backup-health.service`.
- Restauracao isolada: `systemctl start airmovebr-backup-restore-test.service`.
- Integridade externa: carregar `/etc/airmovebr/backblaze.env` com exportacao e executar `restic check`.
- Logs: `journalctl -u 'airmovebr-backup*' --since today`.
- Nunca restaurar diretamente sobre o banco ou volume de producao durante um teste.

## Politica aprovada

- RPO do banco: no maximo 6 horas.
- Retencao externa: 14 diarios, 8 semanais e 12 mensais.
- Backup local: copia curta para restauracao rapida.
- Backup externo: obrigatorio e separado do disco da VM.
- Snapshot da VM: camada adicional semanal; nao substitui dump PostgreSQL.
- Restauracao: teste mensal em ambiente isolado.
- Agendamentos devem declarar timezone explicitamente para evitar diferenca entre UTC e America/Sao_Paulo.

## Arquitetura por responsabilidade

- Script PostgreSQL: gera dump, checksum e log; usa arquivo temporario e trava de concorrencia.
- Script de arquivos: copia fotos, PDFs e assinaturas sem alterar o volume de producao.
- Servico e timer systemd: executam cada rotina e registram falhas no journal.
- Cliente externo: envia copias criptografadas ao bucket privado.
- Rotina de retencao: remove somente copias confirmadas e fora da janela aprovada.
- Procedimento de restauracao: recria banco isolado e valida dados e arquivos.

Cada arquivo novo ou editado deve permanecer abaixo de 500 linhas.

## Proximo gate

- Concluir a Fase B6 depois de confirmar a primeira execucao do snapshot recorrente da Locaweb.
- Credenciais e senha de recuperacao nunca entram no Git ou no chat.
- Manter uma copia da senha de recuperacao fora da VM.
