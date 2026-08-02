# IA principal no atendimento WhatsApp e busca de CEP por rua

## Objetivo

Tornar a IA a decisora principal do atendimento WhatsApp, mantendo o backend como autoridade para dados, preços, orçamento, agenda, O.S. e confirmações. O BOLT permanece como fallback quando a IA falhar.

## Escopo

- Interpretar cada mensagem recebida usando o contexto da conversa e os dados já coletados.
- Retornar resposta estruturada com intenção, dados identificados, próxima ação e perguntas pendentes.
- Perguntar a cidade quando o cliente informar uma rua sem cidade.
- Perguntar a UF quando ela não puder ser determinada com segurança.
- Consultar CEP por UF, cidade e logradouro via ViaCEP.
- Pedir confirmação quando houver mais de um endereço possível.
- Preencher e confirmar o endereço antes de concluir o cadastro.
- Preservar o fluxo manual, o orçamento validado pelo backend e a confirmação humana.

Fica fora do escopo a leitura de fotos e a autonomia para enviar mensagens, alterar preços, criar O.S. ou confirmar orçamento.

## Arquitetura

O webhook persiste a entrada e chama o serviço de atendimento com o histórico da conversa, estado atual e dados relevantes. O serviço consulta a Responses API com saída JSON estritamente validada. O backend interpreta a ação retornada, executa apenas funções permitidas e envia a resposta pela `WhatsAppCloudService`.

As ações permitidas são `perguntar_cidade`, `perguntar_uf`, `buscar_cep_rua`, `confirmar_endereco`, `continuar` e `transferir`. A IA não acessa Prisma, ViaCEP ou Meta diretamente.

Quando a IA estiver indisponível, retornar JSON inválido ou exceder o timeout, o atendimento chama o BOLT atual. O fallback não impede a gravação da mensagem recebida.

## Contrato da IA

```json
{
  "resposta": "texto para o cliente",
  "intencao": "instalacao|manutencao|orcamento|endereco|outro",
  "dados": {
    "nome": null,
    "cidade": null,
    "uf": null,
    "logradouro": null,
    "numero": null,
    "cep": null,
    "servico": null,
    "detalhes": null
  },
  "proxima_acao": "perguntar_cidade|perguntar_uf|buscar_cep_rua|confirmar_endereco|continuar|transferir",
  "perguntas_pendentes": []
}
```

O backend rejeita campos desconhecidos, respostas vazias, ações inválidas e dados incompatíveis. Preços, descontos, disponibilidade, agenda, orçamento, O.S. e envio continuam dependentes das funções e confirmações existentes.

## Busca de CEP

- Se houver rua sem cidade, perguntar a cidade.
- Se houver cidade sem UF, perguntar a UF.
- Com rua, cidade e UF, chamar `/ws/{uf}/{cidade}/{logradouro}/json` com valores codificados.
- Sem resultado, pedir número, bairro ou referência adicional.
- Com múltiplos resultados, apresentar opções curtas e aguardar confirmação.
- Com um resultado, preencher CEP, logradouro, bairro, cidade e UF e pedir confirmação.
- Manter o CEP informado manualmente como caminho válido.

## Segurança, histórico e erros

- A IA nunca envia mensagens diretamente.
- Toda saída enviada passa pelo `WhatsAppCloudService` e é gravada no histórico.
- Falhas da OpenAI ou ViaCEP não apagam a entrada e acionam o fallback apropriado.
- Logs registram etapa, ação e motivo do fallback, sem chaves ou conteúdo sensível desnecessário.
- Pedido explícito de atendente transfere a conversa para a fila humana.

## Critérios de aceitação

- Mensagens naturais não ficam presas às perguntas fixas do BOLT quando a IA estiver disponível.
- Rua sem cidade gera pergunta de cidade antes da busca.
- Rua, cidade e UF consultam o ViaCEP e solicitam confirmação do resultado.
- Ambiguidade ou falha não inventa endereço e solicita informação adicional.
- Falha da IA mantém o bot funcional via BOLT.
- Nenhum preço, total, orçamento, O.S. ou envio é decidido autonomamente pela IA.
- O histórico registra entrada, resposta, ação e fallback.
