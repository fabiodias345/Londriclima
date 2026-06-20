BEGIN;

DO $$
DECLARE
  v_empresa_id uuid;
  v_eng_id uuid;
  v_celso_id uuid;
  v_mituo_id uuid;
  v_equipamento_id uuid;
  v_endereco_celso_id uuid;
  v_os_id uuid;
  v_eq record;
BEGIN
  SELECT id INTO v_empresa_id FROM empresas ORDER BY criado_em LIMIT 1;

  IF v_empresa_id IS NULL THEN
    INSERT INTO empresas (
      id, nome, razao_social, nome_fantasia, cnpj, logradouro, numero,
      cidade, uf, cep, telefone, email, atualizado_em
    )
    VALUES (
      gen_random_uuid(), 'AIRMOVEBR',
      'M. Lima Manutencoes Prediais e Industriais LTDA', 'AIRMOVEBR',
      '04.959.153/0001-11', 'Avenida Paissandu', '526',
      'Maringa', 'PR', '87050-130', '(43) 99100-0035',
      'airmovebr@gmail.com', now()
    )
    RETURNING id INTO v_empresa_id;
  ELSE
    UPDATE empresas
       SET nome = 'AIRMOVEBR',
           razao_social = 'M. Lima Manutencoes Prediais e Industriais LTDA',
           nome_fantasia = 'AIRMOVEBR',
           cnpj = '04.959.153/0001-11',
           logradouro = 'Avenida Paissandu',
           numero = '526',
           cidade = 'Maringa',
           uf = 'PR',
           cep = '87050-130',
           telefone = '(43) 99100-0035',
           email = 'airmovebr@gmail.com',
           atualizado_em = now()
     WHERE id = v_empresa_id;
  END IF;

  SELECT id INTO v_eng_id
    FROM engenheiros_responsaveis
   WHERE empresa_id = v_empresa_id AND crea = 'PR-206737/D'
   LIMIT 1;

  IF v_eng_id IS NULL THEN
    INSERT INTO engenheiros_responsaveis (
      id, empresa_id, nome, cpf, crea, email, telefone, ativo, atualizado_em
    )
    VALUES (
      gen_random_uuid(), v_empresa_id, 'Andre Mendes dos Santos', '',
      'PR-206737/D', '', NULL, true, now()
    )
    RETURNING id INTO v_eng_id;
  ELSE
    UPDATE engenheiros_responsaveis
       SET nome = 'Andre Mendes dos Santos',
           cpf = '',
           email = '',
           telefone = NULL,
           ativo = true,
           atualizado_em = now()
     WHERE id = v_eng_id;
  END IF;

  SELECT id INTO v_celso_id
    FROM clientes
   WHERE empresa_id = v_empresa_id AND documento = '37.774.269/0001-35'
   LIMIT 1;

  IF v_celso_id IS NULL THEN
    INSERT INTO clientes (
      id, empresa_id, tipo, nome, documento, pmoc_ativo,
      engenheiro_responsavel_id, atualizado_em
    )
    VALUES (
      gen_random_uuid(), v_empresa_id, 'pj', 'Black Workout Academia LTDA',
      '37.774.269/0001-35', true, v_eng_id, now()
    )
    RETURNING id INTO v_celso_id;
  ELSE
    UPDATE clientes
       SET tipo = 'pj',
           nome = 'Black Workout Academia LTDA',
           pmoc_ativo = true,
           engenheiro_responsavel_id = v_eng_id,
           atualizado_em = now()
     WHERE id = v_celso_id;
  END IF;

  IF EXISTS (SELECT 1 FROM cliente_enderecos WHERE cliente_id = v_celso_id AND principal = true) THEN
    UPDATE cliente_enderecos
       SET nome = 'PMOC Celso Garcia Cid',
           logradouro = 'Rod. Celso Garcia Cid',
           numero = '123',
           complemento = NULL,
           bairro = 'Sabara',
           cidade = 'Londrina',
           uf = 'PR',
           cep = '86057-350',
           atualizado_em = now()
     WHERE cliente_id = v_celso_id AND principal = true;
  ELSE
    INSERT INTO cliente_enderecos (
      id, empresa_id, cliente_id, nome, logradouro, numero, bairro,
      cidade, uf, cep, principal, atualizado_em
    )
    VALUES (
      gen_random_uuid(), v_empresa_id, v_celso_id, 'PMOC Celso Garcia Cid',
      'Rod. Celso Garcia Cid', '123', 'Sabara',
      'Londrina', 'PR', '86057-350', true, now()
    );
  END IF;

  SELECT id INTO v_endereco_celso_id
    FROM cliente_enderecos
   WHERE cliente_id = v_celso_id AND principal = true
   LIMIT 1;

  SELECT id INTO v_mituo_id
    FROM clientes
   WHERE empresa_id = v_empresa_id AND documento = '50.536.236/0001-15'
   LIMIT 1;

  IF v_mituo_id IS NULL THEN
    INSERT INTO clientes (
      id, empresa_id, tipo, nome, documento, pmoc_ativo,
      engenheiro_responsavel_id, atualizado_em
    )
    VALUES (
      gen_random_uuid(), v_empresa_id, 'pj',
      'Black Workout Escola de Ginastica e Danca LTDA',
      '50.536.236/0001-15', true, v_eng_id, now()
    )
    RETURNING id INTO v_mituo_id;
  ELSE
    UPDATE clientes
       SET tipo = 'pj',
           nome = 'Black Workout Escola de Ginastica e Danca LTDA',
           pmoc_ativo = true,
           engenheiro_responsavel_id = v_eng_id,
           atualizado_em = now()
     WHERE id = v_mituo_id;
  END IF;

  IF EXISTS (SELECT 1 FROM cliente_enderecos WHERE cliente_id = v_mituo_id AND principal = true) THEN
    UPDATE cliente_enderecos
       SET nome = 'PMOC Mituo Morita',
           logradouro = 'Rua Mituo Morita',
           numero = '290',
           complemento = NULL,
           bairro = 'Conjunto Habitacional Alexandre Urbanas',
           cidade = 'Londrina',
           uf = 'PR',
           cep = '86037-570',
           atualizado_em = now()
     WHERE cliente_id = v_mituo_id AND principal = true;
  ELSE
    INSERT INTO cliente_enderecos (
      id, empresa_id, cliente_id, nome, logradouro, numero, bairro,
      cidade, uf, cep, principal, atualizado_em
    )
    VALUES (
      gen_random_uuid(), v_empresa_id, v_mituo_id, 'PMOC Mituo Morita',
      'Rua Mituo Morita', '290', 'Conjunto Habitacional Alexandre Urbanas',
      'Londrina', 'PR', '86037-570', true, now()
    );
  END IF;

  FOR v_eq IN SELECT * FROM (VALUES
    ('AC1','Cozinha','Split','Agratto','Split',12000,45,40,50),
    ('AC2','Mezanino','Piso teto','Nao informado','Piso teto',60000,45,40,50),
    ('AC3','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC4','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC5','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC6','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC7','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC8','Musculacao','Piso teto','Gree','Piso teto',60000,45,20,50),
    ('AC9','Musculacao','Piso teto','Gree','Piso teto',60000,45,20,50),
    ('AC10','Musculacao','Piso teto','Gree','Piso teto',60000,45,20,50),
    ('AC11','Musculacao','Split','Gree','Split',24000,45,20,50),
    ('AC12','Musculacao','Split','Gree','Split',24000,45,20,50),
    ('AC13','Sala Nutricionista','Split','Philco','Split',9000,45,20,50)
  ) AS t(tag, local_instalacao, tipo, marca, modelo, btu, area_m2, ocup_fixo, ocup_variavel) LOOP
    SELECT id INTO v_equipamento_id
      FROM equipamentos
     WHERE cliente_id = v_celso_id AND patrimonio = v_eq.tag
     LIMIT 1;

    IF v_equipamento_id IS NULL THEN
      INSERT INTO equipamentos (
        id, empresa_id, cliente_id, tipo, patrimonio, codigo_barras,
        marca, modelo, capacidade_btu, gas_refrigerante, local_instalacao,
        area_climatizada_m2, ocupantes_fixo, ocupantes_variavel,
        acesso_publico_ativo, atualizado_em
      )
      VALUES (
        gen_random_uuid(), v_empresa_id, v_celso_id, v_eq.tipo, v_eq.tag, NULL,
        v_eq.marca, v_eq.modelo, v_eq.btu, 'R-410A', v_eq.local_instalacao,
        v_eq.area_m2, v_eq.ocup_fixo, v_eq.ocup_variavel, false, now()
      );
    ELSE
      UPDATE equipamentos
         SET tipo = v_eq.tipo,
             codigo_barras = NULL,
             marca = v_eq.marca,
             modelo = v_eq.modelo,
             capacidade_btu = v_eq.btu,
             gas_refrigerante = COALESCE(gas_refrigerante, 'R-410A'),
             local_instalacao = v_eq.local_instalacao,
             area_climatizada_m2 = v_eq.area_m2,
             ocupantes_fixo = v_eq.ocup_fixo,
             ocupantes_variavel = v_eq.ocup_variavel,
             atualizado_em = now()
       WHERE id = v_equipamento_id;
    END IF;

    SELECT id INTO v_equipamento_id
      FROM equipamentos
     WHERE cliente_id = v_celso_id AND patrimonio = v_eq.tag
     LIMIT 1;

    SELECT id INTO v_os_id
      FROM ordens_servico
     WHERE empresa_id = v_empresa_id
       AND cliente_id = v_celso_id
       AND equipamento_id = v_equipamento_id
       AND status = 'concluida'
       AND concluida_em >= date_trunc('month', now())
       AND concluida_em < date_trunc('month', now()) + interval '1 month'
     ORDER BY concluida_em DESC
     LIMIT 1;

    IF v_os_id IS NULL THEN
      INSERT INTO ordens_servico (
        id, empresa_id, cliente_id, endereco_id, equipamento_id,
        status, titulo, problema_relatado, agendada_para, concluida_em, atualizado_em
      )
      VALUES (
        gen_random_uuid(), v_empresa_id, v_celso_id, v_endereco_celso_id, v_equipamento_id,
        'concluida', 'PMOC mensal - ' || v_eq.tag,
        'Manutencao preventiva PMOC simulada para fechamento mensal.',
        date_trunc('month', now()) + interval '15 days' + interval '9 hours',
        date_trunc('month', now()) + interval '15 days' + interval '10 hours',
        now()
      )
      RETURNING id INTO v_os_id;
    ELSE
      UPDATE ordens_servico
         SET endereco_id = v_endereco_celso_id,
             status = 'concluida',
             titulo = 'PMOC mensal - ' || v_eq.tag,
             problema_relatado = 'Manutencao preventiva PMOC simulada para fechamento mensal.',
             agendada_para = date_trunc('month', now()) + interval '15 days' + interval '9 hours',
             concluida_em = date_trunc('month', now()) + interval '15 days' + interval '10 hours',
             atualizado_em = now()
       WHERE id = v_os_id;
    END IF;

    INSERT INTO ordem_servico_checklists (
      id, empresa_id, ordem_servico_id, servico_realizado, procedimentos, custo_total_pecas, atualizado_em
    )
    VALUES (
      gen_random_uuid(), v_empresa_id, v_os_id,
      'Limpeza preventiva PMOC concluida.',
      ARRAY['limpeza_filtro','limpeza_evaporadora','teste_funcionamento'],
      0, now()
    )
    ON CONFLICT (ordem_servico_id) DO UPDATE
       SET servico_realizado = EXCLUDED.servico_realizado,
           procedimentos = EXCLUDED.procedimentos,
           custo_total_pecas = EXCLUDED.custo_total_pecas,
           atualizado_em = now();

    INSERT INTO ordem_servico_evidencias (
      id, empresa_id, ordem_servico_id, tipo, descricao, storage_url, mime_type, tamanho_bytes
    )
    VALUES
      (
        gen_random_uuid(), v_empresa_id, v_os_id, 'antes',
        'Evidencia inicial da manutencao PMOC.',
        '/storage/demo/black-workout/' || lower(v_eq.tag) || '-antes.jpg',
        'image/jpeg', 1000
      ),
      (
        gen_random_uuid(), v_empresa_id, v_os_id, 'depois',
        'Evidencia final da manutencao PMOC.',
        '/storage/demo/black-workout/' || lower(v_eq.tag) || '-depois.jpg',
        'image/jpeg', 1000
      )
    ON CONFLICT (ordem_servico_id, tipo) DO UPDATE
       SET descricao = EXCLUDED.descricao,
           storage_url = EXCLUDED.storage_url,
           mime_type = EXCLUDED.mime_type,
           tamanho_bytes = EXCLUDED.tamanho_bytes;

    INSERT INTO ordem_servico_assinaturas (
      id, empresa_id, ordem_servico_id, nome_responsavel, storage_url, latitude, longitude, assinado_em
    )
    VALUES (
      gen_random_uuid(), v_empresa_id, v_os_id,
      'Responsavel Black Workout',
      '/storage/demo/black-workout/' || lower(v_eq.tag) || '-assinatura.png',
      -23.3045000, -51.1696000,
      date_trunc('month', now()) + interval '15 days' + interval '10 hours'
    )
    ON CONFLICT (ordem_servico_id) DO UPDATE
       SET nome_responsavel = EXCLUDED.nome_responsavel,
           storage_url = EXCLUDED.storage_url,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           assinado_em = EXCLUDED.assinado_em;

    IF NOT EXISTS (
      SELECT 1
        FROM ordem_servico_eventos
       WHERE ordem_servico_id = v_os_id
         AND acao = 'finalizar'
         AND status_novo = 'concluida'
    ) THEN
      INSERT INTO ordem_servico_eventos (
        id, empresa_id, ordem_servico_id, usuario_id, acao, status_anterior, status_novo, latitude, longitude, registrado_em
      )
      VALUES (
        gen_random_uuid(), v_empresa_id, v_os_id, NULL,
        'finalizar', 'em_atendimento', 'concluida',
        -23.3045000, -51.1696000,
        date_trunc('month', now()) + interval '15 days' + interval '10 hours'
      );
    END IF;
  END LOOP;

  FOR v_eq IN SELECT * FROM (VALUES
    ('AC1','Musculacao','Cassete','Nao informado','Cassete',60000,45,40,50),
    ('AC2','Musculacao','Cassete','Nao informado','Cassete',60000,45,40,50),
    ('AC3','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC4','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC5','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC6','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC7','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC8','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC9','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC10','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC11','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC12','Musculacao','Piso teto','Nao informado','Piso teto',60000,45,20,50),
    ('AC13','Banheiro Feminino','Split','Philco','Split',18000,45,20,50),
    ('AC14','Banheiro Masculino','Split','Philco','Split',18000,45,20,50),
    ('AC15','Cozinha','Split','Philco','Split',9000,45,20,50),
    ('AC16','Administrativo','Split','Philco','Split',9000,45,20,50),
    ('AC17','Sala Nutricionista','Split','Philco','Split',9000,45,20,50)
  ) AS t(tag, local_instalacao, tipo, marca, modelo, btu, area_m2, ocup_fixo, ocup_variavel) LOOP
    SELECT id INTO v_equipamento_id
      FROM equipamentos
     WHERE cliente_id = v_mituo_id AND patrimonio = v_eq.tag
     LIMIT 1;

    IF v_equipamento_id IS NULL THEN
      INSERT INTO equipamentos (
        id, empresa_id, cliente_id, tipo, patrimonio, codigo_barras,
        marca, modelo, capacidade_btu, gas_refrigerante, local_instalacao,
        area_climatizada_m2, ocupantes_fixo, ocupantes_variavel,
        acesso_publico_ativo, atualizado_em
      )
      VALUES (
        gen_random_uuid(), v_empresa_id, v_mituo_id, v_eq.tipo, v_eq.tag, NULL,
        v_eq.marca, v_eq.modelo, v_eq.btu, NULL, v_eq.local_instalacao,
        v_eq.area_m2, v_eq.ocup_fixo, v_eq.ocup_variavel, false, now()
      );
    ELSE
      UPDATE equipamentos
         SET tipo = v_eq.tipo,
             codigo_barras = NULL,
             marca = v_eq.marca,
             modelo = v_eq.modelo,
             capacidade_btu = v_eq.btu,
             gas_refrigerante = NULL,
             local_instalacao = v_eq.local_instalacao,
             area_climatizada_m2 = v_eq.area_m2,
             ocupantes_fixo = v_eq.ocup_fixo,
             ocupantes_variavel = v_eq.ocup_variavel,
             atualizado_em = now()
       WHERE id = v_equipamento_id;
    END IF;
  END LOOP;
END $$;

COMMIT;
