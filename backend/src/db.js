const { Pool } = require('pg')

// Conexão com PostgreSQL (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

// Criar tabelas se não existirem
async function initDatabase() {
  const client = await pool.connect()

  try {
    console.log('[DB] Conectado ao PostgreSQL')

    // Tabela de usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        idioma VARCHAR(10) NOT NULL DEFAULT 'pt',
        pais VARCHAR(100),
        linkedin_url VARCHAR(255),
        criado_em TIMESTAMP DEFAULT NOW(),
        ultimo_acesso TIMESTAMP
      )
    `)

    // Adicionar coluna linkedin_url se não existir (migração legada)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255)
    `)

    // Adicionar colunas para rede social genérica (migração)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS social_tipo VARCHAR(50)
    `)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS social_url VARCHAR(255)
    `)

    // Migrar linkedin_url existente para o novo formato
    await client.query(`
      UPDATE users
      SET social_tipo = 'linkedin', social_url = linkedin_url
      WHERE linkedin_url IS NOT NULL AND social_tipo IS NULL
    `)

    // Adicionar coluna codigo_amigo se não existir (migração)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS codigo_amigo VARCHAR(10) UNIQUE
    `)

    // Gerar código para usuários existentes que não têm
    const usersWithoutCode = await client.query(`
      SELECT id FROM users WHERE codigo_amigo IS NULL
    `)
    for (const user of usersWithoutCode.rows) {
      const codigo = generateFriendCode()
      await client.query(`
        UPDATE users SET codigo_amigo = $1 WHERE id = $2
      `, [codigo, user.id])
    }

    // Adicionar coluna avatar_config se não existir (migração)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_config JSONB
    `)

    // Adicionar coluna contacts_config para ordem e fixados (migração)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS contacts_config JSONB
    `)

    // Adicionar coluna remember_token para auto-login (migração)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS remember_token VARCHAR(64)
    `)

    // ==================== CAMPOS DA IO (ASSISTENTE) ====================
    // Apelido que a io usa para chamar o usuário
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS io_apelido VARCHAR(50)
    `)
    // Data de aniversário do usuário
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS io_aniversario DATE
    `)
    // Se o usuário aceita mensagens proativas da io (default: true)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS io_proativo BOOLEAN DEFAULT TRUE
    `)
    // Se já teve o primeiro contato com a io (para mensagem de boas-vindas)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS io_primeiro_contato BOOLEAN DEFAULT FALSE
    `)
    // Última mensagem proativa enviada (para rate limiting)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS io_ultimo_proativo TIMESTAMP
    `)
    // Modo narrativo híbrido da io (resposta em estilo literário)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS io_modo_narrativo BOOLEAN DEFAULT FALSE
    `)
    // Última conversa com a io (consciência temporal)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS io_ultima_conversa TIMESTAMP
    `)

    // URL da loja Ko-fi do usuário
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS kofi_url VARCHAR(255)
    `)

    // ==================== VERIFICAÇÃO DE IDADE ====================
    // Data de nascimento do usuário
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS data_nascimento DATE
    `)
    // Confirmação de maior de idade
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS maior_idade_confirmado BOOLEAN DEFAULT FALSE
    `)

    // ==================== CAMPOS DE MEMBRO FUNDADOR ====================
    // Se é membro fundador (cadastrou durante o beta)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT TRUE
    `)
    // Se é usuário pago (para limites expandidos)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE
    `)
    // Limite de io friends que pode criar (fundador: 2, normal: 1)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS max_io_friends INTEGER DEFAULT 2
    `)
    // Limite de salas que pode criar (fundador: 2, normal: 1)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS max_rooms INTEGER DEFAULT 2
    `)

    // Marcar todos os usuários existentes como fundadores
    await client.query(`
      UPDATE users SET is_founder = TRUE, max_io_friends = 2, max_rooms = 2 WHERE is_founder IS NULL
    `)

    // Garantir que TODOS os fundadores tenham os limites corretos (2 io friends, 2 salas)
    await client.query(`
      UPDATE users SET max_io_friends = 2, max_rooms = 2 WHERE is_founder = TRUE AND (max_io_friends < 2 OR max_rooms < 2)
    `)

    console.log('[DB] Tabela users OK')

    // Tabela de conexões entre usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS connections (
        id SERIAL PRIMARY KEY,
        user_a_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user_b_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pendente',
        solicitado_por INTEGER REFERENCES users(id),
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP,
        UNIQUE(user_a_id, user_b_id)
      )
    `)
    console.log('[DB] Tabela connections OK')

    // Tabela de mensagens
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        connection_id INTEGER REFERENCES connections(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        texto_original TEXT NOT NULL,
        idioma_original VARCHAR(10),
        texto_traduzido TEXT,
        idioma_destino VARCHAR(10),
        enviado_em TIMESTAMP DEFAULT NOW(),
        lido BOOLEAN DEFAULT FALSE,
        expira_em TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')
      )
    `)
    console.log('[DB] Tabela messages OK')

    // Adicionar coluna editado se não existir (migração)
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS editado BOOLEAN DEFAULT FALSE
    `)

    // Colunas para responder mensagem específica (reply/quote)
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS replied_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL
    `)
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS replied_to_text TEXT
    `)
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS replied_to_sender TEXT
    `)

    // Tabela de reações em mensagens
    await client.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        emoji VARCHAR(10) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW(),
        UNIQUE(message_id, user_id, emoji)
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id)
    `)
    console.log('[DB] Tabela message_reactions OK')

    // Índices para melhor performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_connections_users ON connections(user_a_id, user_b_id);
      CREATE INDEX IF NOT EXISTS idx_messages_connection ON messages(connection_id);
      CREATE INDEX IF NOT EXISTS idx_messages_expira ON messages(expira_em);
    `)
    console.log('[DB] Índices criados')

    // Inicializar tabelas de salas
    await initRoomsTables(client)

    // Tabela de tokens de reset de senha
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(64) UNIQUE NOT NULL,
        expira_em TIMESTAMP NOT NULL,
        usado BOOLEAN DEFAULT FALSE,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
      CREATE INDEX IF NOT EXISTS idx_password_resets_expira ON password_resets(expira_em);
    `)
    console.log('[DB] Tabela password_resets OK')

    // Tabela de lembretes da io
    await client.query(`
      CREATE TABLE IF NOT EXISTS io_reminders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        texto VARCHAR(500) NOT NULL,
        remind_at TIMESTAMP NOT NULL,
        sent BOOLEAN DEFAULT FALSE,
        recorrente BOOLEAN DEFAULT FALSE,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_io_reminders_remind_at ON io_reminders(remind_at);
      CREATE INDEX IF NOT EXISTS idx_io_reminders_sent ON io_reminders(sent);
    `)
    // Adicionar coluna recorrente se não existir (para bancos já existentes)
    await client.query(`
      ALTER TABLE io_reminders ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT FALSE
    `)
    console.log('[DB] Tabela io_reminders OK')

    // ==================== TABELA CONTADOR DIÁRIO IO FRIEND ====================
    // Conta quantas mensagens cada usuário enviou pra io Friend por dia
    await client.query(`
      CREATE TABLE IF NOT EXISTS io_daily_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        data DATE NOT NULL DEFAULT CURRENT_DATE,
        msg_count INTEGER DEFAULT 0,
        UNIQUE(user_id, data)
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_io_daily_usage_user_date ON io_daily_usage(user_id, data)
    `)
    console.log('[DB] Tabela io_daily_usage OK')

    // ==================== TABELA DE MEMÓRIAS DA IO ====================
    // Memória persistente individual por usuário
    await client.query(`
      CREATE TABLE IF NOT EXISTS io_memories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        fact TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        importance INTEGER DEFAULT 1,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_io_memories_user ON io_memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_io_memories_importance ON io_memories(importance DESC);
    `)
    console.log('[DB] Tabela io_memories OK')

    // ==================== TABELA IO FRIEND (Io Personalizada) ====================
    // Usuários podem criar múltiplas io friends (fundadores: 2, normal: 1)
    await client.query(`
      CREATE TABLE IF NOT EXISTS io_friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        nome VARCHAR(50) NOT NULL DEFAULT 'io',
        personalidade TEXT,
        estilo_comunicacao VARCHAR(30) DEFAULT 'equilibrado',
        tom_emocional VARCHAR(30) DEFAULT 'gentil',
        nivel_iniciativa VARCHAR(20) DEFAULT 'equilibrado',
        usa_emojis BOOLEAN DEFAULT TRUE,
        caracteristicas_extras TEXT,
        avatar_prompt TEXT,
        avatar_base64 TEXT,
        ativo BOOLEAN DEFAULT TRUE,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_io_friends_user ON io_friends(user_id);
    `)
    // Migração: adicionar colunas de avatar se não existirem
    await client.query(`ALTER TABLE io_friends ADD COLUMN IF NOT EXISTS avatar_prompt TEXT`)
    await client.query(`ALTER TABLE io_friends ADD COLUMN IF NOT EXISTS avatar_base64 TEXT`)
    // Migração: adicionar colunas para bots públicos
    await client.query(`ALTER TABLE io_friends ADD COLUMN IF NOT EXISTS genero VARCHAR(20) DEFAULT 'feminino'`)
    await client.query(`ALTER TABLE io_friends ADD COLUMN IF NOT EXISTS perfil_publico TEXT`)
    await client.query(`ALTER TABLE io_friends ADD COLUMN IF NOT EXISTS cenario TEXT`)
    await client.query(`ALTER TABLE io_friends ADD COLUMN IF NOT EXISTS exemplos_dialogo TEXT`)
    await client.query(`ALTER TABLE io_friends ADD COLUMN IF NOT EXISTS publico BOOLEAN DEFAULT FALSE`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_io_friends_publico ON io_friends(publico) WHERE publico = TRUE`)

    // Migração: remover constraint UNIQUE de user_id para permitir múltiplas io friends
    try {
      await client.query(`ALTER TABLE io_friends DROP CONSTRAINT IF EXISTS io_friends_user_id_key`)
      console.log('[DB] Constraint UNIQUE de user_id removida (permite múltiplas io friends)')
    } catch (e) {
      // Constraint pode não existir, ignorar erro
    }

    console.log('[DB] Tabela io_friends OK')
    // TODO: Migrar para Cloudinary quando escalar (armazenamento de imagens)

    // ==================== TABELA USER_PUBLIC_IO_FRIENDS (Io Friends Públicas Adicionadas) ====================
    // Relacionamento: usuário pode adicionar várias io friends públicas de outros usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_public_io_friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        io_friend_id INTEGER REFERENCES io_friends(id) ON DELETE CASCADE,
        adicionado_em TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, io_friend_id)
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_public_io_friends_user ON user_public_io_friends(user_id)`)
    console.log('[DB] Tabela user_public_io_friends OK')

    // Coluna para io friend em experimento (substitui temporariamente a io do usuário)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS experimenting_io_friend_id INTEGER REFERENCES io_friends(id) ON DELETE SET NULL`)

    // ==================== TABELA IO FRIEND LIKES (Curtidas) ====================
    // Sistema de curtidas para io friends públicas
    await client.query(`
      CREATE TABLE IF NOT EXISTS io_friend_likes (
        id SERIAL PRIMARY KEY,
        io_friend_id INTEGER REFERENCES io_friends(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        criado_em TIMESTAMP DEFAULT NOW(),
        UNIQUE(io_friend_id, user_id)
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_io_friend_likes_io ON io_friend_likes(io_friend_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_io_friend_likes_user ON io_friend_likes(user_id)`)
    console.log('[DB] Tabela io_friend_likes OK')

    // Coluna de contador de likes (cache para performance)
    await client.query(`ALTER TABLE io_friends ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0`)

    // ==================== TABELA CACHE DE TRADUÇÕES ====================
    // Cache permanente de traduções para economizar chamadas à API
    await client.query(`
      CREATE TABLE IF NOT EXISTS translation_cache (
        id SERIAL PRIMARY KEY,
        texto_original VARCHAR(500) NOT NULL,
        idioma_origem VARCHAR(10) NOT NULL,
        idioma_destino VARCHAR(10) NOT NULL,
        traducao VARCHAR(1000) NOT NULL,
        uso_count INTEGER DEFAULT 1,
        criado_em TIMESTAMP DEFAULT NOW(),
        ultimo_uso TIMESTAMP DEFAULT NOW(),
        UNIQUE(texto_original, idioma_origem, idioma_destino)
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup
      ON translation_cache(texto_original, idioma_origem, idioma_destino)
    `)
    console.log('[DB] Tabela translation_cache OK')

    console.log('[DB] Banco de dados inicializado com sucesso!')

  } catch (error) {
    console.error('[DB] Erro ao inicializar banco:', error.message)
    throw error
  } finally {
    client.release()
  }
}

// Gerar código de amigo único (6 caracteres)
function generateFriendCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Sem I, O, 0, 1 para evitar confusão
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Gerar código de convite de sala (8 caracteres)
function generateRoomInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// ==================== TABELAS DE SALAS ====================

// Criar tabelas de salas
async function initRoomsTables(client) {
  // Tabela de salas
  await client.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(50) NOT NULL,
      description VARCHAR(200),
      created_at TIMESTAMP DEFAULT NOW(),
      last_activity_at TIMESTAMP DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'active',
      max_users INTEGER DEFAULT 20,
      message_expiry_minutes INTEGER DEFAULT 60
    )
  `)
  console.log('[DB] Tabela rooms OK')

  // Adicionar colunas para sala privada (migração)
  await client.query(`
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE
  `)
  await client.query(`
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS invite_code VARCHAR(10) UNIQUE
  `)

  // Gerar código de convite para salas existentes que não têm
  const roomsWithoutCode = await client.query(`
    SELECT id FROM rooms WHERE invite_code IS NULL
  `)
  for (const room of roomsWithoutCode.rows) {
    const codigo = generateRoomInviteCode()
    await client.query(`
      UPDATE rooms SET invite_code = $1 WHERE id = $2
    `, [codigo, room.id])
  }

  // Índice para buscar sala do usuário
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms(owner_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
    CREATE INDEX IF NOT EXISTS idx_rooms_activity ON rooms(last_activity_at);
    CREATE INDEX IF NOT EXISTS idx_rooms_invite_code ON rooms(invite_code);
  `)

  // Tabela de bans de sala
  await client.query(`
    CREATE TABLE IF NOT EXISTS room_bans (
      room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      banned_at TIMESTAMP DEFAULT NOW(),
      banned_by INTEGER REFERENCES users(id),
      PRIMARY KEY (room_id, user_id)
    )
  `)
  console.log('[DB] Tabela room_bans OK')

  // Tabela de usuários silenciados em sala
  await client.query(`
    CREATE TABLE IF NOT EXISTS room_mutes (
      room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      muted_at TIMESTAMP DEFAULT NOW(),
      muted_by INTEGER REFERENCES users(id),
      PRIMARY KEY (room_id, user_id)
    )
  `)
  console.log('[DB] Tabela room_mutes OK')
}

// Verificar salas inativas e atualizar status
async function verificarSalasInativas() {
  try {
    const now = new Date()

    // Salas com 7+ dias sem atividade: ainda ativas mas notificar
    // (notificação será implementada no frontend)

    // Salas com 15+ dias: mudar para hidden
    await pool.query(`
      UPDATE rooms
      SET status = 'hidden'
      WHERE status = 'active'
        AND last_activity_at < NOW() - INTERVAL '15 days'
    `)

    // Salas com 30+ dias: deletar
    const deleted = await pool.query(`
      DELETE FROM rooms
      WHERE last_activity_at < NOW() - INTERVAL '30 days'
      RETURNING id, name
    `)

    if (deleted.rowCount > 0) {
      console.log(`[Rooms] ${deleted.rowCount} salas inativas excluídas`)
    }
  } catch (error) {
    console.error('[Rooms] Erro ao verificar salas inativas:', error.message)
  }
}

// Função para limpar mensagens expiradas (rodar periodicamente)
async function limparMensagensExpiradas() {
  try {
    const result = await pool.query(`
      DELETE FROM messages
      WHERE expira_em < NOW()
         OR (expira_em IS NULL AND enviado_em < NOW() - INTERVAL '24 hours')
    `)
    if (result.rowCount > 0) {
      console.log(`[DB] ${result.rowCount} mensagens expiradas removidas`)
    }
  } catch (error) {
    console.error('[DB] Erro ao limpar mensagens:', error.message)
  }
}

// ==================== FUNÇÕES DE MEMÓRIA DA IO ====================

// Limite de memórias por usuário (versão teste - sem planos pagos)
const MEMORY_LIMIT = 50

// Buscar memórias do usuário
async function getIoMemories(userId, limit = 20) {
  try {
    const result = await pool.query(`
      SELECT fact, category, importance, criado_em
      FROM io_memories
      WHERE user_id = $1
      ORDER BY importance DESC, criado_em DESC
      LIMIT $2
    `, [userId, limit])
    return result.rows
  } catch (error) {
    console.error('[io Memory] Erro ao buscar memórias:', error.message)
    return []
  }
}

// Salvar nova memória
async function saveIoMemory(userId, fact, category = 'general', importance = 1) {
  try {
    // Verificar limite de memórias
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM io_memories WHERE user_id = $1',
      [userId]
    )
    const total = parseInt(countResult.rows[0].total)

    if (total >= MEMORY_LIMIT) {
      // Apagar a memória mais antiga e menos importante
      await pool.query(`
        DELETE FROM io_memories
        WHERE id = (
          SELECT id FROM io_memories
          WHERE user_id = $1
          ORDER BY importance ASC, criado_em ASC
          LIMIT 1
        )
      `, [userId])
      console.log(`[io Memory] Limite atingido, memória antiga removida (user ${userId})`)
    }

    // Verificar se já existe fato similar (evitar duplicatas)
    const existingResult = await pool.query(
      'SELECT id FROM io_memories WHERE user_id = $1 AND LOWER(fact) = LOWER($2)',
      [userId, fact]
    )

    if (existingResult.rows.length > 0) {
      // Atualizar timestamp e importância se já existe
      await pool.query(
        'UPDATE io_memories SET atualizado_em = NOW(), importance = GREATEST(importance, $1) WHERE id = $2',
        [importance, existingResult.rows[0].id]
      )
      console.log(`[io Memory] Memória atualizada: "${fact.substring(0, 50)}..." (user ${userId})`)
      return { updated: true }
    }

    // Inserir nova memória
    await pool.query(
      'INSERT INTO io_memories (user_id, fact, category, importance) VALUES ($1, $2, $3, $4)',
      [userId, fact, category, importance]
    )
    console.log(`[io Memory] Nova memória salva: "${fact.substring(0, 50)}..." (user ${userId})`)
    return { created: true }
  } catch (error) {
    console.error('[io Memory] Erro ao salvar memória:', error.message)
    return { error: error.message }
  }
}

// Deletar memória específica
async function deleteIoMemory(userId, memoryId) {
  try {
    await pool.query(
      'DELETE FROM io_memories WHERE id = $1 AND user_id = $2',
      [memoryId, userId]
    )
    return true
  } catch (error) {
    console.error('[io Memory] Erro ao deletar memória:', error.message)
    return false
  }
}

// Limpar todas as memórias do usuário
async function clearIoMemories(userId) {
  try {
    const result = await pool.query(
      'DELETE FROM io_memories WHERE user_id = $1',
      [userId]
    )
    console.log(`[io Memory] ${result.rowCount} memórias apagadas (user ${userId})`)
    return result.rowCount
  } catch (error) {
    console.error('[io Memory] Erro ao limpar memórias:', error.message)
    return 0
  }
}

// Contar memórias do usuário
async function countIoMemories(userId) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as total FROM io_memories WHERE user_id = $1',
      [userId]
    )
    return parseInt(result.rows[0].total)
  } catch (error) {
    return 0
  }
}

// ==================== FUNÇÕES IO FRIEND ====================

// Buscar io friend do usuário (primeira ativa)
async function getIoFriend(userId) {
  try {
    const result = await pool.query(
      'SELECT * FROM io_friends WHERE user_id = $1 AND ativo = TRUE',
      [userId]
    )
    const ioFriend = result.rows[0] || null
    console.log(`[io Friend] Busca user ${userId}:`, ioFriend ? `"${ioFriend.nome}"` : 'não tem')
    return ioFriend
  } catch (error) {
    console.error('[io Friend] Erro ao buscar:', error.message)
    return null
  }
}

// Buscar TODAS as io friends do usuário (para fundadores com múltiplas)
async function getAllIoFriends(userId) {
  try {
    const result = await pool.query(
      'SELECT * FROM io_friends WHERE user_id = $1 ORDER BY criado_em ASC',
      [userId]
    )
    console.log(`[io Friend] Busca todas do user ${userId}: ${result.rows.length} encontradas`)
    return result.rows
  } catch (error) {
    console.error('[io Friend] Erro ao buscar todas:', error.message)
    return []
  }
}

// Criar io friend
async function createIoFriend(userId, config) {
  try {
    // Buscar limite do usuário
    const userLimit = await pool.query(
      'SELECT max_io_friends FROM users WHERE id = $1',
      [userId]
    )
    const maxIoFriends = userLimit.rows[0]?.max_io_friends || 1

    // Contar io friends existentes do usuário
    const existing = await pool.query(
      'SELECT COUNT(*) as total FROM io_friends WHERE user_id = $1',
      [userId]
    )
    const total = parseInt(existing.rows[0].total)

    if (total >= maxIoFriends) {
      return { error: `Você já atingiu o limite de ${maxIoFriends} io friend(s).` }
    }

    const result = await pool.query(`
      INSERT INTO io_friends (user_id, nome, personalidade, estilo_comunicacao, tom_emocional, nivel_iniciativa, usa_emojis, caracteristicas_extras, avatar_prompt, avatar_base64, genero, perfil_publico, cenario, exemplos_dialogo, publico)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      userId,
      config.nome || 'io',
      config.personalidade || null,
      config.estilo_comunicacao || 'equilibrado',
      config.tom_emocional || 'gentil',
      config.nivel_iniciativa || 'equilibrado',
      config.usa_emojis !== false,
      config.caracteristicas_extras || null,
      config.avatar_prompt || null,
      config.avatar_base64 || null,
      config.genero || 'feminino',
      config.perfil_publico || null,
      config.cenario || null,
      config.exemplos_dialogo || null,
      config.publico || false
    ])

    console.log(`[io Friend] Criada para user ${userId}: "${config.nome}"`)
    return { created: true, ioFriend: result.rows[0] }
  } catch (error) {
    console.error('[io Friend] Erro ao criar:', error.message)
    return { error: error.message }
  }
}

// Atualizar io friend
async function updateIoFriend(userId, config) {
  try {
    const result = await pool.query(`
      UPDATE io_friends SET
        nome = COALESCE($2, nome),
        personalidade = COALESCE($3, personalidade),
        estilo_comunicacao = COALESCE($4, estilo_comunicacao),
        tom_emocional = COALESCE($5, tom_emocional),
        nivel_iniciativa = COALESCE($6, nivel_iniciativa),
        usa_emojis = COALESCE($7, usa_emojis),
        caracteristicas_extras = COALESCE($8, caracteristicas_extras),
        avatar_prompt = COALESCE($9, avatar_prompt),
        avatar_base64 = COALESCE($10, avatar_base64),
        genero = COALESCE($11, genero),
        perfil_publico = COALESCE($12, perfil_publico),
        cenario = COALESCE($13, cenario),
        exemplos_dialogo = COALESCE($14, exemplos_dialogo),
        publico = COALESCE($15, publico),
        atualizado_em = NOW()
      WHERE user_id = $1
      RETURNING *
    `, [
      userId,
      config.nome,
      config.personalidade,
      config.estilo_comunicacao,
      config.tom_emocional,
      config.nivel_iniciativa,
      config.usa_emojis,
      config.caracteristicas_extras,
      config.avatar_prompt,
      config.avatar_base64,
      config.genero,
      config.perfil_publico,
      config.cenario,
      config.exemplos_dialogo,
      config.publico
    ])

    if (result.rows.length === 0) {
      return { error: 'io friend não encontrada' }
    }

    console.log(`[io Friend] Atualizada para user ${userId}`)
    return { updated: true, ioFriend: result.rows[0] }
  } catch (error) {
    console.error('[io Friend] Erro ao atualizar:', error.message)
    return { error: error.message }
  }
}

// Deletar io friend
async function deleteIoFriend(userId) {
  try {
    const result = await pool.query(
      'DELETE FROM io_friends WHERE user_id = $1 RETURNING id',
      [userId]
    )
    if (result.rowCount > 0) {
      console.log(`[io Friend] Deletada para user ${userId}`)
      return { deleted: true }
    }
    return { error: 'io friend não encontrada' }
  } catch (error) {
    console.error('[io Friend] Erro ao deletar:', error.message)
    return { error: error.message }
  }
}

// ==================== FUNÇÕES IO FRIENDS PÚBLICAS ====================

// Listar io friends públicas (para explorar)
async function getPublicIoFriends(limit = 50, offset = 0) {
  try {
    const result = await pool.query(`
      SELECT
        iof.id,
        iof.nome,
        iof.genero,
        iof.perfil_publico,
        iof.avatar_base64,
        iof.criado_em,
        COALESCE(iof.likes_count, 0) as likes_count,
        u.id as criador_id,
        u.nome as criador_nome,
        u.avatar_config as criador_avatar
      FROM io_friends iof
      JOIN users u ON iof.user_id = u.id
      WHERE iof.publico = TRUE
      ORDER BY COALESCE(iof.likes_count, 0) DESC, iof.criado_em DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset])

    console.log(`[io Friends Públicas] Listadas: ${result.rows.length}`)
    return result.rows
  } catch (error) {
    console.error('[io Friends Públicas] Erro ao listar:', error.message)
    return []
  }
}

// Buscar io friend pública por ID (para adicionar/conversar)
async function getPublicIoFriendById(ioFriendId) {
  try {
    const result = await pool.query(`
      SELECT
        iof.*,
        COALESCE(iof.likes_count, 0) as likes_count,
        u.id as criador_id,
        u.nome as criador_nome
      FROM io_friends iof
      JOIN users u ON iof.user_id = u.id
      WHERE iof.id = $1 AND iof.publico = TRUE
    `, [ioFriendId])

    return result.rows[0] || null
  } catch (error) {
    console.error('[io Friend Pública] Erro ao buscar:', error.message)
    return null
  }
}

// Contar io friends públicas
async function countPublicIoFriends() {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as total FROM io_friends WHERE publico = TRUE'
    )
    return parseInt(result.rows[0].total)
  } catch (error) {
    return 0
  }
}

// ==================== FUNÇÕES IO FRIENDS PÚBLICAS ADICIONADAS ====================

// Adicionar io friend pública à lista do usuário
async function addPublicIoFriend(userId, ioFriendId) {
  try {
    // Verificar se a io friend existe e é pública
    const ioFriend = await pool.query(
      'SELECT id, user_id FROM io_friends WHERE id = $1 AND publico = TRUE',
      [ioFriendId]
    )
    if (ioFriend.rows.length === 0) {
      return { error: 'io friend não encontrada ou não é pública' }
    }

    // Não pode adicionar sua própria io friend
    if (ioFriend.rows[0].user_id === userId) {
      return { error: 'Você não pode adicionar sua própria io friend' }
    }

    // Verificar se já adicionou
    const existing = await pool.query(
      'SELECT id FROM user_public_io_friends WHERE user_id = $1 AND io_friend_id = $2',
      [userId, ioFriendId]
    )
    if (existing.rows.length > 0) {
      return { error: 'Você já adicionou esta io friend' }
    }

    // Adicionar
    await pool.query(
      'INSERT INTO user_public_io_friends (user_id, io_friend_id) VALUES ($1, $2)',
      [userId, ioFriendId]
    )

    console.log(`[io Friend Pública] User ${userId} adicionou io friend ${ioFriendId}`)
    return { added: true }
  } catch (error) {
    console.error('[io Friend Pública] Erro ao adicionar:', error.message)
    return { error: error.message }
  }
}

// Remover io friend pública da lista do usuário
async function removePublicIoFriend(userId, ioFriendId) {
  try {
    const result = await pool.query(
      'DELETE FROM user_public_io_friends WHERE user_id = $1 AND io_friend_id = $2 RETURNING id',
      [userId, ioFriendId]
    )

    if (result.rows.length === 0) {
      return { error: 'io friend não encontrada na sua lista' }
    }

    console.log(`[io Friend Pública] User ${userId} removeu io friend ${ioFriendId}`)
    return { removed: true }
  } catch (error) {
    console.error('[io Friend Pública] Erro ao remover:', error.message)
    return { error: error.message }
  }
}

// Listar io friends públicas adicionadas pelo usuário
async function getUserPublicIoFriends(userId) {
  try {
    const result = await pool.query(`
      SELECT
        iof.id,
        iof.nome,
        iof.genero,
        iof.perfil_publico,
        iof.avatar_base64,
        iof.personalidade,
        iof.estilo_comunicacao,
        iof.tom_emocional,
        iof.nivel_iniciativa,
        iof.usa_emojis,
        iof.caracteristicas_extras,
        iof.cenario,
        iof.exemplos_dialogo,
        upif.adicionado_em,
        u.id as criador_id,
        u.nome as criador_nome
      FROM user_public_io_friends upif
      JOIN io_friends iof ON upif.io_friend_id = iof.id
      JOIN users u ON iof.user_id = u.id
      WHERE upif.user_id = $1 AND iof.publico = TRUE
      ORDER BY upif.adicionado_em DESC
    `, [userId])

    return result.rows
  } catch (error) {
    console.error('[io Friends Públicas] Erro ao listar do usuário:', error.message)
    return []
  }
}

// Buscar io friend pública específica adicionada pelo usuário (para chat)
async function getUserPublicIoFriendById(userId, ioFriendId) {
  try {
    const result = await pool.query(`
      SELECT
        iof.*,
        u.id as criador_id,
        u.nome as criador_nome
      FROM user_public_io_friends upif
      JOIN io_friends iof ON upif.io_friend_id = iof.id
      JOIN users u ON iof.user_id = u.id
      WHERE upif.user_id = $1 AND iof.id = $2 AND iof.publico = TRUE
    `, [userId, ioFriendId])

    return result.rows[0] || null
  } catch (error) {
    console.error('[io Friend Pública] Erro ao buscar:', error.message)
    return null
  }
}

// ==================== FUNÇÕES CONTADOR DIÁRIO IO FRIEND ====================

// Limites de mensagens por dia
const IO_DAILY_LIMITS = {
  founder: 50,   // Membros fundadores (Beta)
  normal: 20,    // Usuários normais (pós-Beta)
  paid: 500      // Usuários pagos (futuro)
}

// Buscar contagem de mensagens do usuário hoje
async function getIoDailyCount(userId) {
  try {
    const result = await pool.query(`
      SELECT msg_count FROM io_daily_usage
      WHERE user_id = $1 AND data = CURRENT_DATE
    `, [userId])
    return result.rows[0]?.msg_count || 0
  } catch (error) {
    console.error('[io Daily] Erro ao buscar contagem:', error.message)
    return 0
  }
}

// Incrementar contagem de mensagens do usuário
async function incrementIoDailyCount(userId) {
  try {
    await pool.query(`
      INSERT INTO io_daily_usage (user_id, data, msg_count)
      VALUES ($1, CURRENT_DATE, 1)
      ON CONFLICT (user_id, data)
      DO UPDATE SET msg_count = io_daily_usage.msg_count + 1
    `, [userId])
    return true
  } catch (error) {
    console.error('[io Daily] Erro ao incrementar:', error.message)
    return false
  }
}

// Verificar se usuário pode enviar mensagem pra io
async function canSendIoMessage(userId) {
  try {
    // Buscar info do usuário (is_founder, is_paid)
    const userResult = await pool.query(
      'SELECT is_founder, is_paid FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return { allowed: false, reason: 'Usuário não encontrado' }
    }

    const user = userResult.rows[0]

    // Determinar limite baseado no tipo de usuário
    let limit = IO_DAILY_LIMITS.normal // 20 por padrão
    let userType = 'normal'

    if (user.is_paid) {
      limit = IO_DAILY_LIMITS.paid // 500
      userType = 'paid'
    } else if (user.is_founder) {
      limit = IO_DAILY_LIMITS.founder // 50
      userType = 'founder'
    }

    // Buscar contagem atual
    const currentCount = await getIoDailyCount(userId)

    if (currentCount >= limit) {
      return {
        allowed: false,
        reason: 'DAILY_LIMIT',
        currentCount,
        limit,
        userType
      }
    }

    return {
      allowed: true,
      currentCount,
      limit,
      remaining: limit - currentCount,
      userType
    }
  } catch (error) {
    console.error('[io Daily] Erro ao verificar limite:', error.message)
    // Em caso de erro, permite (fail-open)
    return { allowed: true, error: error.message }
  }
}

// Limpar contagens antigas (rodar periodicamente)
async function cleanOldIoDailyUsage() {
  try {
    const result = await pool.query(`
      DELETE FROM io_daily_usage
      WHERE data < CURRENT_DATE - INTERVAL '7 days'
    `)
    if (result.rowCount > 0) {
      console.log(`[io Daily] ${result.rowCount} registros antigos removidos`)
    }
  } catch (error) {
    console.error('[io Daily] Erro ao limpar:', error.message)
  }
}

// ==================== FUNÇÕES CACHE DE TRADUÇÕES ====================

// Limite máximo de caracteres para cachear (textos muito grandes são únicos)
const TRANSLATION_CACHE_MAX_LENGTH = 500

// Buscar tradução no cache
async function getTranslationCache(texto, idiomaOrigem, idiomaDestino) {
  try {
    // Normalizar texto (minúsculo, sem espaços extras)
    const textoNormalizado = texto.toLowerCase().trim().replace(/\s+/g, ' ')

    // Não cachear textos muito longos
    if (textoNormalizado.length > TRANSLATION_CACHE_MAX_LENGTH) {
      return null
    }

    const result = await pool.query(`
      UPDATE translation_cache
      SET uso_count = uso_count + 1, ultimo_uso = NOW()
      WHERE texto_original = $1 AND idioma_origem = $2 AND idioma_destino = $3
      RETURNING traducao, uso_count
    `, [textoNormalizado, idiomaOrigem, idiomaDestino])

    if (result.rows.length > 0) {
      console.log(`  [Cache HIT] "${texto.substring(0, 30)}..." (usado ${result.rows[0].uso_count}x)`)
      return result.rows[0].traducao
    }

    return null
  } catch (error) {
    console.error('[Cache] Erro ao buscar:', error.message)
    return null
  }
}

// Salvar tradução no cache
async function saveTranslationCache(texto, idiomaOrigem, idiomaDestino, traducao) {
  try {
    // Normalizar texto
    const textoNormalizado = texto.toLowerCase().trim().replace(/\s+/g, ' ')

    // Não cachear textos muito longos
    if (textoNormalizado.length > TRANSLATION_CACHE_MAX_LENGTH) {
      return false
    }

    // Não cachear se tradução é igual ao original (não traduziu de verdade)
    if (textoNormalizado === traducao.toLowerCase().trim()) {
      return false
    }

    await pool.query(`
      INSERT INTO translation_cache (texto_original, idioma_origem, idioma_destino, traducao)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (texto_original, idioma_origem, idioma_destino)
      DO UPDATE SET uso_count = translation_cache.uso_count + 1, ultimo_uso = NOW()
    `, [textoNormalizado, idiomaOrigem, idiomaDestino, traducao])

    console.log(`  [Cache SAVE] "${texto.substring(0, 30)}..." → "${traducao.substring(0, 30)}..."`)
    return true
  } catch (error) {
    console.error('[Cache] Erro ao salvar:', error.message)
    return false
  }
}

// Estatísticas do cache
async function getTranslationCacheStats() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_entries,
        SUM(uso_count) as total_hits,
        ROUND(AVG(uso_count), 2) as avg_hits_per_entry,
        pg_size_pretty(pg_total_relation_size('translation_cache')) as tamanho
      FROM translation_cache
    `)
    return result.rows[0]
  } catch (error) {
    console.error('[Cache] Erro ao buscar stats:', error.message)
    return null
  }
}

// ==================== FUNÇÕES EXPERIMENTAR IO FRIEND ====================

// Iniciar experimento com io friend pública (substitui temporariamente a io)
async function startExperimentingIoFriend(userId, ioFriendId) {
  try {
    // Verificar se a io friend existe e é pública
    const ioFriend = await pool.query(
      'SELECT id, user_id, nome FROM io_friends WHERE id = $1 AND publico = TRUE',
      [ioFriendId]
    )
    if (ioFriend.rows.length === 0) {
      return { error: 'io friend não encontrada ou não é pública' }
    }

    // Não pode experimentar sua própria io friend
    if (ioFriend.rows[0].user_id === userId) {
      return { error: 'Você não pode experimentar sua própria io friend' }
    }

    // Marcar como experimentando
    await pool.query(
      'UPDATE users SET experimenting_io_friend_id = $1 WHERE id = $2',
      [ioFriendId, userId]
    )

    console.log(`[Experiment] User ${userId} começou a experimentar io friend ${ioFriendId} (${ioFriend.rows[0].nome})`)
    return { success: true, ioFriendName: ioFriend.rows[0].nome }
  } catch (error) {
    console.error('[Experiment] Erro ao iniciar:', error.message)
    return { error: error.message }
  }
}

// Parar de experimentar io friend
async function stopExperimentingIoFriend(userId) {
  try {
    await pool.query(
      'UPDATE users SET experimenting_io_friend_id = NULL WHERE id = $1',
      [userId]
    )
    console.log(`[Experiment] User ${userId} parou de experimentar`)
    return { success: true }
  } catch (error) {
    console.error('[Experiment] Erro ao parar:', error.message)
    return { error: error.message }
  }
}

// Buscar io friend em experimento do usuário
async function getExperimentingIoFriend(userId) {
  try {
    const result = await pool.query(`
      SELECT iof.*, u.nome as criador_nome
      FROM users usr
      JOIN io_friends iof ON usr.experimenting_io_friend_id = iof.id
      JOIN users u ON iof.user_id = u.id
      WHERE usr.id = $1 AND iof.publico = TRUE
    `, [userId])

    return result.rows[0] || null
  } catch (error) {
    console.error('[Experiment] Erro ao buscar:', error.message)
    return null
  }
}

// Adotar io friend (copiar configurações para a io do usuário)
async function adoptIoFriend(userId, ioFriendId) {
  try {
    // Buscar io friend pública
    const source = await pool.query(
      'SELECT * FROM io_friends WHERE id = $1 AND publico = TRUE',
      [ioFriendId]
    )
    if (source.rows.length === 0) {
      return { error: 'io friend não encontrada' }
    }

    const srcFriend = source.rows[0]

    // Verificar se usuário já tem io friend
    const existing = await pool.query(
      'SELECT id FROM io_friends WHERE user_id = $1',
      [userId]
    )

    if (existing.rows.length > 0) {
      // Atualizar existente
      await pool.query(`
        UPDATE io_friends SET
          nome = $1,
          personalidade = $2,
          estilo_comunicacao = $3,
          tom_emocional = $4,
          nivel_iniciativa = $5,
          usa_emojis = $6,
          caracteristicas_extras = $7,
          avatar_base64 = $8,
          genero = $9,
          perfil_publico = $10,
          cenario = $11,
          exemplos_dialogo = $12,
          atualizado_em = NOW()
        WHERE user_id = $13
      `, [
        srcFriend.nome,
        srcFriend.personalidade,
        srcFriend.estilo_comunicacao,
        srcFriend.tom_emocional,
        srcFriend.nivel_iniciativa,
        srcFriend.usa_emojis,
        srcFriend.caracteristicas_extras,
        srcFriend.avatar_base64,
        srcFriend.genero,
        srcFriend.perfil_publico,
        srcFriend.cenario,
        srcFriend.exemplos_dialogo,
        userId
      ])
    } else {
      // Criar nova
      await pool.query(`
        INSERT INTO io_friends (user_id, nome, personalidade, estilo_comunicacao, tom_emocional, nivel_iniciativa, usa_emojis, caracteristicas_extras, avatar_base64, genero, perfil_publico, cenario, exemplos_dialogo, publico)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE)
      `, [
        userId,
        srcFriend.nome,
        srcFriend.personalidade,
        srcFriend.estilo_comunicacao,
        srcFriend.tom_emocional,
        srcFriend.nivel_iniciativa,
        srcFriend.usa_emojis,
        srcFriend.caracteristicas_extras,
        srcFriend.avatar_base64,
        srcFriend.genero,
        srcFriend.perfil_publico,
        srcFriend.cenario,
        srcFriend.exemplos_dialogo
      ])
    }

    // Parar de experimentar
    await stopExperimentingIoFriend(userId)

    console.log(`[Adopt] User ${userId} adotou io friend ${ioFriendId} (${srcFriend.nome})`)
    return { success: true, ioFriendName: srcFriend.nome }
  } catch (error) {
    console.error('[Adopt] Erro:', error.message)
    return { error: error.message }
  }
}

module.exports = {
  pool,
  initDatabase,
  limparMensagensExpiradas,
  verificarSalasInativas,
  generateFriendCode,
  generateRoomInviteCode,
  // Funções de memória da io
  getIoMemories,
  saveIoMemory,
  deleteIoMemory,
  clearIoMemories,
  countIoMemories,
  MEMORY_LIMIT,
  // Funções io friend
  getIoFriend,
  getAllIoFriends,
  createIoFriend,
  updateIoFriend,
  deleteIoFriend,
  // Funções io friends públicas
  getPublicIoFriends,
  getPublicIoFriendById,
  countPublicIoFriends,
  // Funções io friends públicas adicionadas pelo usuário
  addPublicIoFriend,
  removePublicIoFriend,
  getUserPublicIoFriends,
  getUserPublicIoFriendById,
  // Funções experimentar io friend
  startExperimentingIoFriend,
  stopExperimentingIoFriend,
  getExperimentingIoFriend,
  adoptIoFriend,
  // Funções cache de traduções
  getTranslationCache,
  saveTranslationCache,
  getTranslationCacheStats,
  TRANSLATION_CACHE_MAX_LENGTH,
  // Funções contador diário io Friend
  getIoDailyCount,
  incrementIoDailyCount,
  canSendIoMessage,
  cleanOldIoDailyUsage,
  IO_DAILY_LIMITS
}
