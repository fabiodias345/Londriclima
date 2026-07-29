# Gestão de Empresas e Assinaturas

## Objetivo

Transformar a plataforma em um produto multiempresa, permitindo vender o sistema por assinatura ou aluguel mensal para várias empresas.

## Painel da plataforma

Criar um painel separado, exclusivo do proprietário da plataforma, para:

- cadastrar e editar empresas;
- criar planos e preços;
- ativar, suspender e bloquear empresas;
- acompanhar pagamentos e vencimentos;
- definir período de tolerância para inadimplência;
- visualizar usuários e uso de cada empresa.

## Painel da empresa

Cada empresa continuará acessando apenas seu próprio painel operacional, com clientes, equipes, ordens de serviço, conversas e relatórios.

## Controle de acesso

O bloqueio deve ser aplicado no backend, não apenas ocultado no painel web. A API deve verificar se a empresa está ativa antes de permitir operações protegidas.

Estados sugeridos:

- `ativa`;
- `trial`;
- `em_atraso`;
- `bloqueada`;
- `cancelada`.

## Informações futuras da empresa

- plano contratado;
- valor da mensalidade;
- status do pagamento;
- vencimento;
- início e fim do período de tolerância;
- data de bloqueio;
- identificador no gateway de pagamento.

## Evolução planejada

1. Consolidar o isolamento por `empresaId`.
2. Criar perfil global do proprietário da plataforma.
3. Criar entidades de planos e assinaturas.
4. Criar painel administrativo da plataforma.
5. Implementar bloqueio centralizado no backend.
6. Integrar gateway de pagamentos e webhooks.
7. Adicionar avisos de vencimento e inadimplência no painel da empresa.

## Observação

Esta funcionalidade não faz parte da implementação atual. Deve ser planejada antes de iniciar a comercialização para múltiplas empresas.
