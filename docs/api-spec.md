# API Spec Parcial — Fluxo Mobile de OS

Esta especificação cobre, neste momento, os endpoints do fluxo obrigatório do app do técnico. Endpoints de autenticação, clientes, equipamentos, gestão administrativa completa de OS, uploads avulsos, relatórios e webhooks ainda precisam ser detalhados.

---

### PATCH `/os/:osId/status`
Registra eventos de status da OS, com geolocalização e horário do evento.

**Autenticado:** Técnico
**Content-Type:** `application/json`

**Body completo:**
```json
{
  "acao": "iniciar_rota",
  "latitude": -23.3045,
  "longitude": -51.1696,
  "registrado_em": "2026-06-10T08:45:00-03:00"
}
```

**Ações permitidas:**

| Ação | Status resultante | Descrição |
| :--- | :--- | :--- |
| `iniciar_rota` | `em_deslocamento` | Técnico saiu em direção ao cliente. |
| `cheguei_cliente` | `em_atendimento` | Técnico chegou ao endereço de atendimento. |
| `cancelar` | `cancelada` | Cancela a OS antes da conclusão. |

**Campos do Body:**

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `acao` | string | Sim | Evento executado pelo técnico. |
| `latitude` | decimal | Sim | Latitude capturada pelo app no momento do evento. |
| `longitude` | decimal | Sim | Longitude capturada pelo app no momento do evento. |
| `registrado_em` | datetime ISO 8601 | Sim | Data e hora local do evento. |

**Resposta 200:**
```json
{
  "os_id": "uuid-da-os",
  "status": "em_deslocamento",
  "evento": {
    "acao": "iniciar_rota",
    "latitude": -23.3045,
    "longitude": -51.1696,
    "registrado_em": "2026-06-10T08:45:00-03:00"
  }
}
```

**Erros possíveis:**

| Status | Mensagem |
| :--- | :--- |
| 400 | "acao é obrigatória." |
| 400 | "latitude e longitude são obrigatórias." |
| 409 | "Transição de status inválida para esta OS." |
| 422 | "OS concluída é imutável." |

---

### PUT `/os/:osId/identificacao-equipamento`
Salva a identificação obrigatória do equipamento atendido.

**Autenticado:** Técnico
**Content-Type:** `application/json`

**Body completo:**
```json
{
  "marca": "LG",
  "modelo": "Dual Inverter",
  "capacidade_btu": 12000,
  "numero_serie": "SN123456789",
  "local_instalacao": "Sala comercial"
}
```

**Campos do Body:**

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `marca` | string | Sim | Marca do equipamento. |
| `modelo` | string | Sim | Modelo do equipamento. |
| `capacidade_btu` | integer | Não | Capacidade em BTUs quando aplicável. |
| `numero_serie` | string | Não | Número de série ou patrimônio. |
| `local_instalacao` | string | Não | Local físico onde o equipamento está instalado. |

**Resposta 200:**
```json
{
  "os_id": "uuid-da-os",
  "equipamento": {
    "marca": "LG",
    "modelo": "Dual Inverter",
    "capacidade_btu": 12000,
    "numero_serie": "SN123456789",
    "local_instalacao": "Sala comercial"
  },
  "atualizado_em": "2026-06-10T09:05:00-03:00"
}
```

**Erros possíveis:**

| Status | Mensagem |
| :--- | :--- |
| 400 | "marca é obrigatória." |
| 400 | "modelo é obrigatório." |
| 422 | "OS não está com status em_atendimento." |

---

### POST `/os/:osId/evidencia-inicial`
Salva texto descritivo e foto obrigatória do estado do equipamento antes do serviço.

**Autenticado:** Técnico
**Content-Type:** `multipart/form-data`

**Campos do Body:**

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `descricao_antes` | string | Sim | Texto livre descrevendo o estado do equipamento antes do serviço. |
| `foto_antes` | arquivo (WebP/JPEG) | Sim | Imagem comprimida em WebP ou JPEG, limite de 800 KB. |

**Exemplo curl:**
```bash
curl -X POST https://api.airmovebr.com.br/v1/os/uuid-da-os/evidencia-inicial \
  -H "Authorization: Bearer <token>" \
  -F "descricao_antes=Filtros com alto acúmulo de poeira e serpentina obstruída." \
  -F "foto_antes=@/caminho/para/foto_antes.webp"
```

**Resposta 201:**
```json
{
  "id": "uuid-da-evidencia",
  "os_id": "uuid-da-os",
  "tipo": "antes",
  "descricao": "Filtros com alto acúmulo de poeira e serpentina obstruída.",
  "storage_url": "https://storage.googleapis.com/londriclima/os/uuid/evidencias/antes.webp",
  "criado_em": "2026-06-10T09:15:00-03:00"
}
```

**Erros possíveis:**

| Status | Mensagem |
| :--- | :--- |
| 400 | "foto_antes é obrigatória." |
| 400 | "descricao_antes é obrigatória." |
| 400 | "Arquivo excede o limite de 800 KB." |
| 400 | "Formato de arquivo não suportado. Use WebP ou JPEG." |
| 409 | "Evidência inicial já registrada para esta OS." |
| 422 | "OS não está com status em_atendimento." |

---

### POST `/os/:osId/checklist`
Salva procedimentos executados, peças e insumos utilizados no serviço.

**Autenticado:** Técnico
**Content-Type:** `application/json`

**Body completo:**
```json
{
  "servico_realizado": "Realizada limpeza química completa e troca de capacitor de partida.",
  "procedimentos": [
    "limpeza_filtro",
    "limpeza_evaporadora",
    "limpeza_condensadora",
    "verificacao_gas",
    "verificacao_eletrica"
  ],
  "pecas": [
    {
      "descricao_peca": "Capacitor de Partida 35uF",
      "quantidade": 1,
      "custo_unitario": 45.50
    },
    {
      "descricao_peca": "Fita Veda Calor",
      "quantidade": 2,
      "custo_unitario": 8.00
    }
  ]
}
```

**Campos do Body:**

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `servico_realizado` | string | Sim | Descrição geral do serviço executado. Aparece no PDF do relatório. |
| `procedimentos` | array de string | Não | ENUMs de procedimentos executados. |
| `pecas` | array de objeto | Não | Lista de peças e insumos utilizados com custo unitário. |
| `pecas[].descricao_peca` | string | Sim (se pecas) | Nome ou código da peça. |
| `pecas[].quantidade` | integer | Sim (se pecas) | Quantidade utilizada. |
| `pecas[].custo_unitario` | decimal | Sim (se pecas) | Custo unitário da peça em reais (R$). Usado no financeiro. |

**Resposta 200:**
```json
{
  "os_id": "uuid-da-os",
  "servico_realizado": "Realizada limpeza química completa e troca de capacitor de partida.",
  "procedimentos": ["limpeza_filtro", "limpeza_evaporadora", "limpeza_condensadora"],
  "pecas": [
    {
      "id": "uuid-da-peca",
      "descricao_peca": "Capacitor de Partida 35uF",
      "quantidade": 1,
      "custo_unitario": 45.50,
      "subtotal": 45.50
    }
  ],
  "custo_total_pecas": 61.50,
  "atualizado_em": "2026-06-10T10:45:00-03:00"
}
```

**Erros possíveis:**

| Status | Mensagem |
| :--- | :--- |
| 400 | "servico_realizado é obrigatório." |
| 400 | "custo_unitario deve ser um valor decimal positivo." |
| 422 | "Evidência inicial ainda não registrada. Siga o fluxo obrigatório." |
| 422 | "OS não está com status em_atendimento." |

---

### POST `/os/:osId/evidencia-final`
Salva texto descritivo e foto obrigatória do estado do equipamento após o serviço.

**Autenticado:** Técnico
**Content-Type:** `multipart/form-data`

**Campos do Body:**

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `descricao_depois` | string | Sim | Texto livre descrevendo o estado do equipamento após o serviço. |
| `foto_depois` | arquivo (WebP/JPEG) | Sim | Imagem comprimida em WebP ou JPEG, limite de 800 KB. |

**Exemplo curl:**
```bash
curl -X POST https://api.airmovebr.com.br/v1/os/uuid-da-os/evidencia-final \
  -H "Authorization: Bearer <token>" \
  -F "descricao_depois=Equipamento limpo, operando normalmente. Serpentina desobstruída." \
  -F "foto_depois=@/caminho/para/foto_depois.webp"
```

**Resposta 201:**
```json
{
  "id": "uuid-da-evidencia",
  "os_id": "uuid-da-os",
  "tipo": "depois",
  "descricao": "Equipamento limpo, operando normalmente. Serpentina desobstruída.",
  "storage_url": "https://storage.googleapis.com/londriclima/os/uuid/evidencias/depois.webp",
  "criado_em": "2026-06-10T11:30:00-03:00"
}
```

**Erros possíveis:**

| Status | Mensagem |
| :--- | :--- |
| 400 | "foto_depois é obrigatória." |
| 400 | "descricao_depois é obrigatória." |
| 400 | "Arquivo excede o limite de 800 KB." |
| 409 | "Evidência final já registrada para esta OS." |
| 422 | "Evidência inicial ainda não registrada. Siga o fluxo obrigatório." |
| 422 | "OS não está com status em_atendimento." |

---

### PATCH `/os/:osId/observacoes`
Salva observações livres do técnico sobre a execução do serviço.

**Autenticado:** Técnico
**Content-Type:** `application/json`

**Body completo:**
```json
{
  "observacoes": "Cliente relatou ruído intermitente ao ligar o equipamento. Orientado a acompanhar o funcionamento nos próximos dias."
}
```

**Campos do Body:**

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `observacoes` | string | Não | Texto livre exibido no histórico da OS e, quando aprovado, no relatório técnico. |

**Resposta 200:**
```json
{
  "os_id": "uuid-da-os",
  "observacoes": "Cliente relatou ruído intermitente ao ligar o equipamento. Orientado a acompanhar o funcionamento nos próximos dias.",
  "atualizado_em": "2026-06-10T11:45:00-03:00"
}
```

**Erros possíveis:**

| Status | Mensagem |
| :--- | :--- |
| 422 | "OS não está com status em_atendimento." |
| 422 | "OS concluída é imutável." |

---

### POST `/os/:osId/finalizar`
Finaliza a OS, salvando assinatura digital, geolocalização e horário de encerramento.

**Autenticado:** Técnico
**Content-Type:** `application/json`

**Body completo:**
```json
{
  "assinatura_cliente_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  "nome_responsavel_assinatura": "Maria Souza",
  "latitude": -23.3048,
  "longitude": -51.1701,
  "finalizado_em": "2026-06-10T12:05:00-03:00"
}
```

**Campos do Body:**

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `assinatura_cliente_base64` | string | Sim | Assinatura digital capturada no app. |
| `nome_responsavel_assinatura` | string | Sim | Nome da pessoa que assinou a conclusão do serviço. |
| `latitude` | decimal | Sim | Latitude capturada no encerramento. |
| `longitude` | decimal | Sim | Longitude capturada no encerramento. |
| `finalizado_em` | datetime ISO 8601 | Sim | Data e hora local de encerramento. |

**Resposta 200:**
```json
{
  "os_id": "uuid-da-os",
  "status": "concluida",
  "finalizado_em": "2026-06-10T12:05:00-03:00",
  "assinatura_url": "https://storage.googleapis.com/londriclima/os/uuid/assinatura.png",
  "automacoes_agendadas": ["gerar_pdf", "enviar_email", "enviar_whatsapp", "recorrencia_180_dias"]
}
```

**Validações obrigatórias antes da conclusão:**

| Regra | Descrição |
| :--- | :--- |
| Equipamento identificado | `marca` e `modelo` devem estar preenchidos. |
| Evidência inicial | `descricao_antes` e `foto_antes` devem existir. |
| Checklist | `servico_realizado` deve estar preenchido. |
| Evidência final | `descricao_depois` e `foto_depois` devem existir. |
| Assinatura | Assinatura e nome do responsável são obrigatórios. |
| GPS de encerramento | Latitude e longitude são obrigatórias. |

**Erros possíveis:**

| Status | Mensagem |
| :--- | :--- |
| 400 | "assinatura_cliente_base64 é obrigatória." |
| 400 | "nome_responsavel_assinatura é obrigatório." |
| 400 | "latitude e longitude são obrigatórias." |
| 409 | "OS já está concluída." |
| 422 | "Identificação do equipamento ainda não registrada." |
| 422 | "Evidência inicial ainda não registrada." |
| 422 | "Checklist ainda não registrado." |
| 422 | "Evidência final ainda não registrada." |
