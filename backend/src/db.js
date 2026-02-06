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

    // Índices para melhor performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_connections_users ON connections(user_a_id, user_b_id);
      CREATE INDEX IF NOT EXISTS idx_messages_connection ON messages(connection_id);
      CREATE INDEX IF NOT EXISTS idx_messages_expira ON messages(expira_em);
    `)
    console.log('[DB] Índices criados')

    // Inicializar tabelas de salas
    await initRoomsTables(client)

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
      DELETE FROM messages WHERE expira_em < NOW()
    `)
    if (result.rowCount > 0) {
      console.log(`[DB] ${result.rowCount} mensagens expiradas removidas`)
    }
  } catch (error) {
    console.error('[DB] Erro ao limpar mensagens:', error.message)
  }
}

module.exports = {
  pool,
  initDatabase,
  limparMensagensExpiradas,
  verificarSalasInativas,
  generateFriendCode,
  generateRoomInviteCode
}
