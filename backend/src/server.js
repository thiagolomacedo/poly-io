const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { pool, initDatabase, limparMensagensExpiradas } = require('./db')

// ==================== CONFIGURAÇÃO ====================

const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'poly-io-secret-key-change-in-production'
const AZURE_KEY = process.env.AZURE_TRANSLATOR_KEY || ''
const AZURE_REGION = process.env.AZURE_TRANSLATOR_REGION || 'eastus'

// Inicializar Express
const app = express()
const server = http.createServer(app)

// Socket.io para tempo real
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// Middlewares
app.use(cors())
app.use(express.json())

// ==================== MIDDLEWARE DE AUTENTICAÇÃO ====================

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

// ==================== SERVIÇO DE TRADUÇÃO ====================

function detectarIdioma(texto) {
  if (/[áàâãéêíóôõúç]/i.test(texto) && /\b(que|não|com|para|uma|você|está|isso)\b/i.test(texto)) return 'pt'
  if (/\b(olá|oi|tudo|bem|obrigado|bom|dia|irmão|amigo|como|vai)\b/i.test(texto)) return 'pt'
  if (/[ñ¿¡]/i.test(texto) && /\b(que|con|para|una|está|pero|muy)\b/i.test(texto)) return 'es'
  if (/[àâçéèêëîïôùûü]/i.test(texto) && /\b(que|avec|pour|une|est|mais|très|je|vous)\b/i.test(texto)) return 'fr'
  if (/[äöüß]/i.test(texto) && /\b(und|ist|das|ein|nicht|mit|sie)\b/i.test(texto)) return 'de'
  if (/\b(che|con|per|una|sono|molto|questo|ciao)\b/i.test(texto)) return 'it'
  if (/[а-яА-ЯёЁ]/.test(texto)) return 'ru'
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(texto)) return 'ja'
  if (/[\uAC00-\uD7AF]/.test(texto)) return 'ko'
  if (/[\u4E00-\u9FFF]/.test(texto)) return 'zh-Hans'
  if (/[\u0600-\u06FF]/.test(texto)) return 'ar'
  return 'en'
}

async function traduzirComAzure(texto, idiomaOrigem, idiomaDestino) {
  const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${idiomaOrigem}&to=${idiomaDestino}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_KEY,
      'Ocp-Apim-Subscription-Region': AZURE_REGION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{ text: texto }])
  })
  const data = await response.json()
  if (data[0]?.translations?.[0]?.text) return data[0].translations[0].text
  throw new Error('Azure translation failed')
}

async function traduzirComMyMemory(texto, idiomaOrigem, idiomaDestino) {
  const langPair = `${idiomaOrigem}|${idiomaDestino}`
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=${langPair}`
  const response = await fetch(url)
  const data = await response.json()
  if (data.responseStatus === 200 && data.responseData?.translatedText) {
    const translated = data.responseData.translatedText
    if (translated !== texto.toUpperCase()) return translated
  }
  throw new Error('MyMemory translation failed')
}

async function traduzirTexto(texto, idiomaOrigem, idiomaDestino) {
  if (idiomaOrigem === idiomaDestino) return texto

  let azureOrigem = idiomaOrigem === 'zh' ? 'zh-Hans' : idiomaOrigem
  let azureDestino = idiomaDestino === 'zh' ? 'zh-Hans' : idiomaDestino

  if (AZURE_KEY) {
    try {
      return await traduzirComAzure(texto, azureOrigem, azureDestino)
    } catch (error) {
      console.log('  [Azure] Erro:', error.message)
    }
  }

  try {
    return await traduzirComMyMemory(texto, idiomaOrigem, idiomaDestino)
  } catch (error) {
    console.log('  [MyMemory] Erro:', error.message)
  }

  return texto
}

// ==================== ROTAS DE AUTENTICAÇÃO ====================

// Cadastro
app.post('/api/auth/register', async (req, res) => {
  const { nome, email, senha, idioma, pais } = req.body

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' })
  }

  if (senha.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' })
  }

  try {
    // Verificar se email já existe
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' })
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10)

    // Criar usuário
    const result = await pool.query(
      'INSERT INTO users (nome, email, senha_hash, idioma, pais) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, idioma, pais, criado_em',
      [nome.trim(), email.toLowerCase(), senhaHash, idioma || 'pt', pais || null]
    )

    const user = result.rows[0]
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' })

    console.log(`[Auth] Novo usuário: ${user.nome} (${user.email})`)

    res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        idioma: user.idioma,
        pais: user.pais
      },
      token
    })
  } catch (error) {
    console.error('[Auth] Erro no cadastro:', error.message)
    res.status(500).json({ error: 'Erro ao criar conta' })
  }
})

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' })
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha incorretos' })
    }

    const user = result.rows[0]
    const senhaValida = await bcrypt.compare(senha, user.senha_hash)

    if (!senhaValida) {
      return res.status(401).json({ error: 'Email ou senha incorretos' })
    }

    // Atualizar último acesso
    await pool.query('UPDATE users SET ultimo_acesso = NOW() WHERE id = $1', [user.id])

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' })

    console.log(`[Auth] Login: ${user.nome}`)

    res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        idioma: user.idioma,
        pais: user.pais
      },
      token
    })
  } catch (error) {
    console.error('[Auth] Erro no login:', error.message)
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

// Dados do usuário logado
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, email, idioma, pais, criado_em FROM users WHERE id = $1',
      [req.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('[Auth] Erro ao buscar usuário:', error.message)
    res.status(500).json({ error: 'Erro ao buscar dados' })
  }
})

// ==================== ROTAS DE USUÁRIOS ====================

// Buscar usuários (com filtros)
app.get('/api/users', authMiddleware, async (req, res) => {
  const { search, idioma, pais } = req.query

  try {
    let query = 'SELECT id, nome, idioma, pais FROM users WHERE id != $1'
    const params = [req.userId]
    let paramIndex = 2

    if (search) {
      query += ` AND nome ILIKE $${paramIndex}`
      params.push(`%${search}%`)
      paramIndex++
    }

    if (idioma) {
      query += ` AND idioma = $${paramIndex}`
      params.push(idioma)
      paramIndex++
    }

    if (pais) {
      query += ` AND pais ILIKE $${paramIndex}`
      params.push(`%${pais}%`)
      paramIndex++
    }

    query += ' ORDER BY nome LIMIT 50'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('[Users] Erro na busca:', error.message)
    res.status(500).json({ error: 'Erro ao buscar usuários' })
  }
})

// Perfil de um usuário
app.get('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, idioma, pais, criado_em FROM users WHERE id = $1',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('[Users] Erro ao buscar perfil:', error.message)
    res.status(500).json({ error: 'Erro ao buscar perfil' })
  }
})

// Atualizar perfil
app.put('/api/users/:id', authMiddleware, async (req, res) => {
  if (parseInt(req.params.id) !== req.userId) {
    return res.status(403).json({ error: 'Sem permissão' })
  }

  const { nome, idioma, pais } = req.body

  try {
    const result = await pool.query(
      'UPDATE users SET nome = COALESCE($1, nome), idioma = COALESCE($2, idioma), pais = COALESCE($3, pais) WHERE id = $4 RETURNING id, nome, email, idioma, pais',
      [nome, idioma, pais, req.userId]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('[Users] Erro ao atualizar:', error.message)
    res.status(500).json({ error: 'Erro ao atualizar perfil' })
  }
})

// ==================== ROTAS DE CONEXÕES ====================

// Listar minhas conexões (aceitas)
app.get('/api/connections', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id as connection_id,
        c.criado_em as conectado_em,
        CASE
          WHEN c.user_a_id = $1 THEN u2.id
          ELSE u1.id
        END as user_id,
        CASE
          WHEN c.user_a_id = $1 THEN u2.nome
          ELSE u1.nome
        END as nome,
        CASE
          WHEN c.user_a_id = $1 THEN u2.idioma
          ELSE u1.idioma
        END as idioma,
        CASE
          WHEN c.user_a_id = $1 THEN u2.pais
          ELSE u1.pais
        END as pais
      FROM connections c
      JOIN users u1 ON c.user_a_id = u1.id
      JOIN users u2 ON c.user_b_id = u2.id
      WHERE (c.user_a_id = $1 OR c.user_b_id = $1) AND c.status = 'aceita'
      ORDER BY c.atualizado_em DESC
    `, [req.userId])

    res.json(result.rows)
  } catch (error) {
    console.error('[Connections] Erro ao listar:', error.message)
    res.status(500).json({ error: 'Erro ao listar conexões' })
  }
})

// Listar solicitações pendentes (recebidas e enviadas)
app.get('/api/connections/pending', authMiddleware, async (req, res) => {
  try {
    // Solicitações recebidas
    const recebidas = await pool.query(`
      SELECT
        c.id as connection_id,
        c.criado_em,
        u.id as user_id,
        u.nome,
        u.idioma,
        u.pais
      FROM connections c
      JOIN users u ON c.solicitado_por = u.id
      WHERE (c.user_a_id = $1 OR c.user_b_id = $1)
        AND c.solicitado_por != $1
        AND c.status = 'pendente'
      ORDER BY c.criado_em DESC
    `, [req.userId])

    // Solicitações enviadas
    const enviadas = await pool.query(`
      SELECT
        c.id as connection_id,
        c.criado_em,
        CASE
          WHEN c.user_a_id = $1 THEN u2.id
          ELSE u1.id
        END as user_id,
        CASE
          WHEN c.user_a_id = $1 THEN u2.nome
          ELSE u1.nome
        END as nome
      FROM connections c
      JOIN users u1 ON c.user_a_id = u1.id
      JOIN users u2 ON c.user_b_id = u2.id
      WHERE (c.user_a_id = $1 OR c.user_b_id = $1)
        AND c.solicitado_por = $1
        AND c.status = 'pendente'
      ORDER BY c.criado_em DESC
    `, [req.userId])

    res.json({
      recebidas: recebidas.rows,
      enviadas: enviadas.rows
    })
  } catch (error) {
    console.error('[Connections] Erro ao listar pendentes:', error.message)
    res.status(500).json({ error: 'Erro ao listar solicitações' })
  }
})

// Enviar solicitação de conexão
app.post('/api/connections/request/:userId', authMiddleware, async (req, res) => {
  const targetUserId = parseInt(req.params.userId)

  if (targetUserId === req.userId) {
    return res.status(400).json({ error: 'Não pode conectar consigo mesmo' })
  }

  try {
    // Verificar se usuário existe
    const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [targetUserId])
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    // Verificar se já existe conexão
    const existingConnection = await pool.query(`
      SELECT id, status FROM connections
      WHERE (user_a_id = $1 AND user_b_id = $2) OR (user_a_id = $2 AND user_b_id = $1)
    `, [req.userId, targetUserId])

    if (existingConnection.rows.length > 0) {
      const conn = existingConnection.rows[0]
      if (conn.status === 'aceita') {
        return res.status(400).json({ error: 'Vocês já estão conectados' })
      }
      if (conn.status === 'pendente') {
        return res.status(400).json({ error: 'Solicitação já enviada' })
      }
    }

    // Criar solicitação
    const [userA, userB] = req.userId < targetUserId ? [req.userId, targetUserId] : [targetUserId, req.userId]

    const result = await pool.query(`
      INSERT INTO connections (user_a_id, user_b_id, status, solicitado_por, atualizado_em)
      VALUES ($1, $2, 'pendente', $3, NOW())
      ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET status = 'pendente', solicitado_por = $3, atualizado_em = NOW()
      RETURNING id
    `, [userA, userB, req.userId])

    console.log(`[Connections] Solicitação: ${req.userId} → ${targetUserId}`)

    // Notificar via socket
    io.emit('nova-solicitacao', { userId: targetUserId })

    res.json({ message: 'Solicitação enviada', connectionId: result.rows[0].id })
  } catch (error) {
    console.error('[Connections] Erro ao solicitar:', error.message)
    res.status(500).json({ error: 'Erro ao enviar solicitação' })
  }
})

// Aceitar solicitação
app.post('/api/connections/accept/:connectionId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE connections
      SET status = 'aceita', atualizado_em = NOW()
      WHERE id = $1
        AND (user_a_id = $2 OR user_b_id = $2)
        AND solicitado_por != $2
        AND status = 'pendente'
      RETURNING *
    `, [req.params.connectionId, req.userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação não encontrada' })
    }

    console.log(`[Connections] Aceita: ${result.rows[0].id}`)

    // Notificar quem enviou
    io.emit('conexao-aceita', { connectionId: result.rows[0].id })

    res.json({ message: 'Conexão aceita' })
  } catch (error) {
    console.error('[Connections] Erro ao aceitar:', error.message)
    res.status(500).json({ error: 'Erro ao aceitar' })
  }
})

// Recusar solicitação
app.post('/api/connections/reject/:connectionId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE connections
      SET status = 'recusada', atualizado_em = NOW()
      WHERE id = $1
        AND (user_a_id = $2 OR user_b_id = $2)
        AND solicitado_por != $2
        AND status = 'pendente'
      RETURNING id
    `, [req.params.connectionId, req.userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação não encontrada' })
    }

    res.json({ message: 'Solicitação recusada' })
  } catch (error) {
    console.error('[Connections] Erro ao recusar:', error.message)
    res.status(500).json({ error: 'Erro ao recusar' })
  }
})

// Remover conexão
app.delete('/api/connections/:connectionId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM connections
      WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)
      RETURNING id
    `, [req.params.connectionId, req.userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conexão não encontrada' })
    }

    res.json({ message: 'Conexão removida' })
  } catch (error) {
    console.error('[Connections] Erro ao remover:', error.message)
    res.status(500).json({ error: 'Erro ao remover' })
  }
})

// ==================== ROTAS DE CHAT ====================

// Buscar histórico de mensagens
app.get('/api/chat/:connectionId', authMiddleware, async (req, res) => {
  try {
    // Verificar se usuário faz parte da conexão
    const connResult = await pool.query(`
      SELECT c.*, u1.idioma as idioma_a, u2.idioma as idioma_b
      FROM connections c
      JOIN users u1 ON c.user_a_id = u1.id
      JOIN users u2 ON c.user_b_id = u2.id
      WHERE c.id = $1 AND (c.user_a_id = $2 OR c.user_b_id = $2) AND c.status = 'aceita'
    `, [req.params.connectionId, req.userId])

    if (connResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }

    // Buscar mensagens
    const result = await pool.query(`
      SELECT
        m.id,
        m.sender_id,
        m.texto_original,
        m.texto_traduzido,
        m.idioma_original,
        m.enviado_em,
        m.lido,
        u.nome as sender_nome
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.connection_id = $1
      ORDER BY m.enviado_em ASC
    `, [req.params.connectionId])

    // Formatar mensagens para o usuário
    const messages = result.rows.map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      senderNome: msg.sender_nome,
      texto: msg.sender_id === req.userId ? msg.texto_original : msg.texto_traduzido,
      textoOriginal: msg.texto_original,
      enviadoEm: msg.enviado_em,
      lido: msg.lido,
      euEnviei: msg.sender_id === req.userId
    }))

    res.json(messages)
  } catch (error) {
    console.error('[Chat] Erro ao buscar histórico:', error.message)
    res.status(500).json({ error: 'Erro ao buscar mensagens' })
  }
})

// Enviar mensagem
app.post('/api/chat/:connectionId', authMiddleware, async (req, res) => {
  const { texto } = req.body

  if (!texto || !texto.trim()) {
    return res.status(400).json({ error: 'Mensagem vazia' })
  }

  try {
    // Verificar conexão e buscar dados
    const connResult = await pool.query(`
      SELECT
        c.*,
        CASE WHEN c.user_a_id = $2 THEN u2.id ELSE u1.id END as destinatario_id,
        CASE WHEN c.user_a_id = $2 THEN u2.idioma ELSE u1.idioma END as destinatario_idioma,
        CASE WHEN c.user_a_id = $2 THEN u2.nome ELSE u1.nome END as destinatario_nome
      FROM connections c
      JOIN users u1 ON c.user_a_id = u1.id
      JOIN users u2 ON c.user_b_id = u2.id
      WHERE c.id = $1 AND (c.user_a_id = $2 OR c.user_b_id = $2) AND c.status = 'aceita'
    `, [req.params.connectionId, req.userId])

    if (connResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }

    const conn = connResult.rows[0]

    // Detectar e traduzir
    const idiomaOriginal = detectarIdioma(texto)
    const textoTraduzido = await traduzirTexto(texto, idiomaOriginal, conn.destinatario_idioma)

    console.log(`[Chat] ${req.userId} → ${conn.destinatario_id}: "${texto}" → "${textoTraduzido}"`)

    // Salvar mensagem
    const msgResult = await pool.query(`
      INSERT INTO messages (connection_id, sender_id, texto_original, idioma_original, texto_traduzido, idioma_destino)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, enviado_em
    `, [req.params.connectionId, req.userId, texto, idiomaOriginal, textoTraduzido, conn.destinatario_idioma])

    const message = {
      id: msgResult.rows[0].id,
      connectionId: parseInt(req.params.connectionId),
      senderId: req.userId,
      texto: texto,
      textoTraduzido: textoTraduzido,
      enviadoEm: msgResult.rows[0].enviado_em
    }

    // Emitir via Socket
    io.emit('nova-mensagem', {
      ...message,
      destinatarioId: conn.destinatario_id
    })

    res.json(message)
  } catch (error) {
    console.error('[Chat] Erro ao enviar:', error.message)
    res.status(500).json({ error: 'Erro ao enviar mensagem' })
  }
})

// Exportar conversa em TXT
app.get('/api/chat/:connectionId/export', authMiddleware, async (req, res) => {
  try {
    // Verificar conexão
    const connResult = await pool.query(`
      SELECT c.*, u1.nome as nome_a, u2.nome as nome_b
      FROM connections c
      JOIN users u1 ON c.user_a_id = u1.id
      JOIN users u2 ON c.user_b_id = u2.id
      WHERE c.id = $1 AND (c.user_a_id = $2 OR c.user_b_id = $2)
    `, [req.params.connectionId, req.userId])

    if (connResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }

    const conn = connResult.rows[0]
    const outroNome = conn.user_a_id === req.userId ? conn.nome_b : conn.nome_a

    // Buscar mensagens
    const messages = await pool.query(`
      SELECT m.*, u.nome as sender_nome
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.connection_id = $1
      ORDER BY m.enviado_em ASC
    `, [req.params.connectionId])

    // Formatar TXT
    let txt = '═'.repeat(50) + '\n'
    txt += `POLY.IO - Conversa com ${outroNome}\n`
    txt += `Exportado em: ${new Date().toLocaleString('pt-BR')}\n`
    txt += '═'.repeat(50) + '\n\n'

    for (const msg of messages.rows) {
      const hora = new Date(msg.enviado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      txt += `[${hora}] ${msg.sender_nome}: ${msg.texto_original}\n`
      if (msg.texto_traduzido !== msg.texto_original) {
        txt += `        (Traduzido: ${msg.texto_traduzido})\n`
      }
      txt += '\n'
    }

    txt += '═'.repeat(50) + '\n'
    txt += 'Gerado por Poly.io - Comunicação sem barreiras\n'

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="poly-io-chat-${outroNome}.txt"`)
    res.send(txt)
  } catch (error) {
    console.error('[Chat] Erro ao exportar:', error.message)
    res.status(500).json({ error: 'Erro ao exportar' })
  }
})

// Limpar mensagens de uma conversa
app.delete('/api/chat/:connectionId/messages', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM messages
      WHERE connection_id = $1
        AND connection_id IN (
          SELECT id FROM connections WHERE (user_a_id = $2 OR user_b_id = $2)
        )
      RETURNING id
    `, [req.params.connectionId, req.userId])

    res.json({ message: 'Mensagens excluídas', count: result.rowCount })
  } catch (error) {
    console.error('[Chat] Erro ao limpar:', error.message)
    res.status(500).json({ error: 'Erro ao limpar mensagens' })
  }
})

// ==================== ROTAS PÚBLICAS ====================

app.get('/', (req, res) => {
  res.json({
    app: 'Poly.io',
    version: '2.0',
    status: 'online',
    features: ['auth', 'connections', 'private-chat', 'translation']
  })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// ==================== SOCKET.IO ====================

const usuariosOnline = new Map()

io.on('connection', (socket) => {
  console.log('[Socket] Conectado:', socket.id)

  socket.on('registrar', (userId) => {
    usuariosOnline.set(userId, socket.id)
    io.emit('usuarios-atualizados')
  })

  socket.on('disconnect', () => {
    for (const [userId, socketId] of usuariosOnline.entries()) {
      if (socketId === socket.id) {
        usuariosOnline.delete(userId)
        io.emit('usuarios-atualizados')
        break
      }
    }
  })
})

// ==================== INICIAR SERVIDOR ====================

async function startServer() {
  try {
    // Inicializar banco de dados
    await initDatabase()

    // Limpar mensagens expiradas a cada hora
    setInterval(limparMensagensExpiradas, 60 * 60 * 1000)

    // Iniciar servidor
    server.listen(PORT, () => {
      console.log('')
      console.log('='.repeat(50))
      console.log('  POLY.IO v2.0 - Chat Profissional')
      console.log('='.repeat(50))
      console.log(`  Servidor: http://localhost:${PORT}`)
      console.log('  Banco: PostgreSQL (Neon)')
      console.log('  Auth: JWT + bcrypt')
      console.log('='.repeat(50))
      console.log('')
    })
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error)
    process.exit(1)
  }
}

startServer()
