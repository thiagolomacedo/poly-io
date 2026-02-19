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
    // Cada usuário pode criar UMA io friend personalizada
    await client.query(`
      CREATE TABLE IF NOT EXISTS io_friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
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
    console.log('[DB] Tabela io_friends OK')
    // TODO: Migrar para Cloudinary quando escalar (armazenamento de imagens)

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

// Buscar io friend do usuário
async function getIoFriend(userId) {
  try {
    const result = await pool.query(
      'SELECT * FROM io_friends WHERE user_id = $1 AND ativo = TRUE',
      [userId]
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('[io Friend] Erro ao buscar:', error.message)
    return null
  }
}

// Criar io friend
async function createIoFriend(userId, config) {
  try {
    // Verificar se já existe
    const existing = await pool.query(
      'SELECT id FROM io_friends WHERE user_id = $1',
      [userId]
    )
    if (existing.rows.length > 0) {
      return { error: 'Você já tem uma io friend. Limite: 1 por usuário.' }
    }

    const result = await pool.query(`
      INSERT INTO io_friends (user_id, nome, personalidade, estilo_comunicacao, tom_emocional, nivel_iniciativa, usa_emojis, caracteristicas_extras, avatar_prompt, avatar_base64)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      config.avatar_base64 || null
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
      config.avatar_base64
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
  createIoFriend,
  updateIoFriend,
  deleteIoFriend
}
