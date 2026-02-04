const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')

// ==================== CONFIGURAÇÃO ====================

const PORT = process.env.PORT || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174'
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

// ==================== BANCO EM MEMÓRIA (MVP) ====================

const db = {
  users: [],
  messages: [],
  nextUserId: 1,
  nextMessageId: 1
}

// ==================== SERVIÇO DE TRADUÇÃO ====================

// Detectar idioma baseado em padrões
function detectarIdioma(texto) {
  // Português
  if (/[áàâãéêíóôõúç]/i.test(texto) && /\b(que|não|com|para|uma|você|está|isso)\b/i.test(texto)) {
    return 'pt'
  }
  if (/\b(olá|oi|tudo|bem|obrigado|bom|dia|irmão|amigo|como|vai)\b/i.test(texto)) {
    return 'pt'
  }

  // Espanhol
  if (/[ñ¿¡]/i.test(texto) && /\b(que|con|para|una|está|pero|muy)\b/i.test(texto)) {
    return 'es'
  }

  // Francês
  if (/[àâçéèêëîïôùûü]/i.test(texto) && /\b(que|avec|pour|une|est|mais|très|je|vous)\b/i.test(texto)) {
    return 'fr'
  }

  // Alemão
  if (/[äöüß]/i.test(texto) && /\b(und|ist|das|ein|nicht|mit|sie)\b/i.test(texto)) {
    return 'de'
  }

  // Italiano
  if (/\b(che|con|per|una|sono|molto|questo|ciao)\b/i.test(texto)) {
    return 'it'
  }

  // Russo (cirílico)
  if (/[а-яА-ЯёЁ]/.test(texto)) {
    return 'ru'
  }

  // Japonês
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(texto)) {
    return 'ja'
  }

  // Coreano
  if (/[\uAC00-\uD7AF]/.test(texto)) {
    return 'ko'
  }

  // Chinês
  if (/[\u4E00-\u9FFF]/.test(texto)) {
    return 'zh-Hans'
  }

  // Árabe
  if (/[\u0600-\u06FF]/.test(texto)) {
    return 'ar'
  }

  // Default: inglês
  return 'en'
}

// Traduzir com Azure Translator (2M chars/mês grátis)
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

  if (data[0]?.translations?.[0]?.text) {
    return data[0].translations[0].text
  }

  throw new Error('Azure translation failed')
}

// Traduzir com MyMemory (fallback gratuito)
async function traduzirComMyMemory(texto, idiomaOrigem, idiomaDestino) {
  const langPair = `${idiomaOrigem}|${idiomaDestino}`
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=${langPair}`

  const response = await fetch(url)
  const data = await response.json()

  if (data.responseStatus === 200 && data.responseData?.translatedText) {
    const translated = data.responseData.translatedText
    if (translated !== texto.toUpperCase()) {
      return translated
    }
  }

  throw new Error('MyMemory translation failed')
}

// Função principal de tradução
async function traduzirTexto(texto, idiomaOrigem, idiomaDestino) {
  if (idiomaOrigem === idiomaDestino) {
    return texto
  }

  // Converter códigos de idioma para Azure se necessário
  let azureOrigem = idiomaOrigem === 'zh' ? 'zh-Hans' : idiomaOrigem
  let azureDestino = idiomaDestino === 'zh' ? 'zh-Hans' : idiomaDestino

  // Tentar Azure primeiro (se configurado)
  if (AZURE_KEY) {
    try {
      const result = await traduzirComAzure(texto, azureOrigem, azureDestino)
      console.log('  [Azure] Tradução OK')
      return result
    } catch (error) {
      console.log('  [Azure] Erro:', error.message)
    }
  }

  // Fallback para MyMemory
  try {
    const result = await traduzirComMyMemory(texto, idiomaOrigem, idiomaDestino)
    console.log('  [MyMemory] Tradução OK')
    return result
  } catch (error) {
    console.log('  [MyMemory] Erro:', error.message)
  }

  // Último fallback: retornar original
  console.log('  [Fallback] Retornando original')
  return texto
}

// ==================== ROTAS API ====================

// Health check
app.get('/', (req, res) => {
  res.json({
    app: 'Poly.io',
    status: 'online',
    translation: AZURE_KEY ? 'Azure Translator' : 'MyMemory',
    users: db.users.length,
    messages: db.messages.length
  })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', users: db.users.length, messages: db.messages.length })
})

// Criar usuário
app.post('/api/users', (req, res) => {
  const { nome, idioma } = req.body

  if (!nome) {
    return res.status(400).json({ error: 'Nome é obrigatório' })
  }

  const user = {
    id: db.nextUserId++,
    nome: nome.trim(),
    idioma: idioma || 'pt',
    criadoEm: new Date().toISOString()
  }

  db.users.push(user)
  console.log(`[User] Novo: ${user.nome} (${user.idioma})`)

  res.json(user)
})

// Listar usuários
app.get('/api/users', (req, res) => {
  res.json(db.users)
})

// Buscar usuário por ID
app.get('/api/users/:id', (req, res) => {
  const user = db.users.find(u => u.id === parseInt(req.params.id))
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' })
  }
  res.json(user)
})

// Enviar mensagem
app.post('/api/messages', async (req, res) => {
  const { remetenteId, destinatarioId, texto } = req.body

  if (!remetenteId || !destinatarioId || !texto) {
    return res.status(400).json({ error: 'Dados incompletos' })
  }

  const remetente = db.users.find(u => u.id === parseInt(remetenteId))
  const destinatario = db.users.find(u => u.id === parseInt(destinatarioId))

  if (!remetente) {
    return res.status(404).json({ error: 'Remetente não encontrado' })
  }
  if (!destinatario) {
    return res.status(404).json({ error: 'Destinatário não encontrado' })
  }

  console.log(`\n[Msg] ${remetente.nome} → ${destinatario.nome}`)
  console.log(`  Original: "${texto}"`)

  const idiomaOriginal = detectarIdioma(texto)
  console.log(`  Idioma: ${idiomaOriginal} → ${destinatario.idioma}`)

  const textoTraduzido = await traduzirTexto(texto, idiomaOriginal, destinatario.idioma)
  console.log(`  Traduzido: "${textoTraduzido}"`)

  const message = {
    id: db.nextMessageId++,
    remetente_id: parseInt(remetenteId),
    destinatario_id: parseInt(destinatarioId),
    texto_original: texto,
    idioma_original: idiomaOriginal,
    texto_traduzido: textoTraduzido,
    idioma_destino: destinatario.idioma,
    enviado_em: new Date().toISOString()
  }

  db.messages.push(message)

  io.emit('nova-mensagem', {
    ...message,
    textoParaDestinatario: textoTraduzido,
    textoParaRemetente: texto
  })

  res.json(message)
})

// Buscar conversa entre dois usuários
app.get('/api/messages/:usuarioId/:outroUsuarioId', (req, res) => {
  const usuarioId = parseInt(req.params.usuarioId)
  const outroUsuarioId = parseInt(req.params.outroUsuarioId)

  const usuario = db.users.find(u => u.id === usuarioId)
  if (!usuario) {
    return res.status(404).json({ error: 'Usuário não encontrado' })
  }

  const messages = db.messages.filter(msg =>
    (msg.remetente_id === usuarioId && msg.destinatario_id === outroUsuarioId) ||
    (msg.remetente_id === outroUsuarioId && msg.destinatario_id === usuarioId)
  )

  const formatted = messages.map(msg => {
    const euEnviei = msg.remetente_id === usuarioId
    return {
      id: msg.id,
      remetenteId: msg.remetente_id,
      texto: euEnviei ? msg.texto_original : msg.texto_traduzido,
      textoOriginal: msg.texto_original,
      enviadoEm: msg.enviado_em,
      euEnviei
    }
  })

  res.json(formatted)
})

// Ver texto original de uma mensagem
app.get('/api/messages/:id/original', (req, res) => {
  const message = db.messages.find(m => m.id === parseInt(req.params.id))
  if (!message) {
    return res.status(404).json({ error: 'Mensagem não encontrada' })
  }
  res.json({
    texto_original: message.texto_original,
    idioma_original: message.idioma_original
  })
})

// ==================== SOCKET.IO ====================

const usuariosOnline = new Map()

io.on('connection', (socket) => {
  console.log('[Socket] Conectado:', socket.id)

  socket.on('registrar', (userId) => {
    usuariosOnline.set(userId, socket.id)
  })

  socket.on('disconnect', () => {
    for (const [userId, socketId] of usuariosOnline.entries()) {
      if (socketId === socket.id) {
        usuariosOnline.delete(userId)
        break
      }
    }
  })
})

// ==================== INICIAR SERVIDOR ====================

server.listen(PORT, () => {
  console.log('')
  console.log('='.repeat(50))
  console.log('  POLY.IO - Chat com Tradução Automática')
  console.log('='.repeat(50))
  console.log(`  Servidor: http://localhost:${PORT}`)
  console.log(`  Tradução: ${AZURE_KEY ? 'Azure Translator' : 'MyMemory (fallback)'}`)
  console.log('='.repeat(50))
  console.log('')
})
