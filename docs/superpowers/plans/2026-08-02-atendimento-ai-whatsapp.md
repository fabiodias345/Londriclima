# Atendimento WhatsApp com IA — Plano de Implementação

**Objetivo:** manter a IA na coleta e análise, exigir revisão manual da proposta e automatizar a O.S. somente após o aceite do cliente.

**Arquitetura:** o Bolt continua conduzindo a coleta inicial; o Copiloto IA monta os dados do orçamento; o atendente revisa preço, desconto, validade e agenda antes do envio. A proposta guarda agenda e responsável, e o webhook de aceite valida a disponibilidade antes de criar a O.S.

## Entregas

- [x] Persistir data, equipe e técnico junto ao orçamento.
- [x] Enviar proposta somente pela ação manual do atendente.
- [x] Criar O.S. automaticamente após aceite quando houver agenda e responsável.
- [x] Enviar confirmação ao cliente com O.S., técnico, adulto responsável e reagendamento antecipado.
- [x] Notificar o atendente responsável.
- [ ] Publicar após revisão do usuário.
