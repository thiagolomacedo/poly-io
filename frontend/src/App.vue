<template>
  <div class="app">
    <!-- Tela de Login/Registro -->
    <div v-if="!isLoggedIn" class="auth-screen">
      <div class="auth-card">
        <div class="logo">
          <span class="logo-poly">Poly</span><span class="logo-io">.io</span>
        </div>
        <p class="tagline">Chat sem barreiras de idioma</p>

        <!-- Tabs Login/Registro -->
        <div class="auth-tabs">
          <button
            :class="{ active: authMode === 'login' }"
            @click="authMode = 'login'"
          >
            Entrar
          </button>
          <button
            :class="{ active: authMode === 'register' }"
            @click="authMode = 'register'"
          >
            Criar Conta
          </button>
        </div>

        <!-- Formulário de Login -->
        <form v-if="authMode === 'login'" @submit.prevent="login" class="auth-form">
          <div class="form-group">
            <label>Email</label>
            <input
              v-model="loginForm.email"
              type="email"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div class="form-group">
            <label>Senha</label>
            <input
              v-model="loginForm.senha"
              type="password"
              placeholder="Sua senha"
              required
            />
          </div>

          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>

        <!-- Formulário de Registro -->
        <form v-else @submit.prevent="register" class="auth-form">
          <div class="form-group">
            <label>Nome</label>
            <input
              v-model="registerForm.nome"
              type="text"
              placeholder="Seu nome"
              required
            />
          </div>

          <div class="form-group">
            <label>Email</label>
            <input
              v-model="registerForm.email"
              type="email"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div class="form-group">
            <label>Senha</label>
            <input
              v-model="registerForm.senha"
              type="password"
              placeholder="Mínimo 6 caracteres"
              minlength="6"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Idioma</label>
              <select v-model="registerForm.idioma" required>
                <option value="pt">Português</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
                <option value="ru">Русский</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            <div class="form-group">
              <label>País</label>
              <input
                v-model="registerForm.pais"
                type="text"
                placeholder="Brasil"
              />
            </div>
          </div>

          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Criando...' : 'Criar Conta' }}
          </button>
        </form>

        <p v-if="authError" class="error-text">{{ authError }}</p>

        <p class="info-text">
          Escreva no seu idioma.<br>
          A outra pessoa lê no idioma dela.
        </p>
      </div>
    </div>

    <!-- Tela Principal -->
    <div v-else class="main-screen">
      <!-- Botão Menu Mobile -->
      <button class="mobile-menu-btn" @click="sidebarOpen = !sidebarOpen">
        <span v-if="!sidebarOpen">☰</span>
        <span v-else>✕</span>
      </button>

      <!-- Overlay para fechar sidebar no mobile -->
      <div
        v-if="sidebarOpen"
        class="sidebar-overlay"
        @click="sidebarOpen = false"
      ></div>

      <!-- Sidebar -->
      <aside class="sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-header">
          <div class="logo-small">
            <span class="logo-poly">Poly</span><span class="logo-io">.io</span>
          </div>
          <div class="current-user">
            <span class="user-name">{{ currentUser?.nome }}</span>
            <span class="user-lang">{{ getIdiomaLabel(currentUser?.idioma) }}</span>
          </div>
          <div class="status-selector">
            <button
              v-for="s in statusOptions"
              :key="s.value"
              :class="['status-btn', s.value, { active: myStatus === s.value }]"
              @click="changeStatus(s.value)"
              :title="s.label"
            >
              <span class="status-dot"></span>
            </button>
          </div>
        </div>

        <!-- Navegação -->
        <nav class="sidebar-nav">
          <button
            :class="{ active: currentTab === 'connections' }"
            @click="currentTab = 'connections'"
          >
            <span class="nav-icon">👥</span>
            Conexões
            <span v-if="connections.length" class="badge">{{ connections.length }}</span>
          </button>
          <button
            :class="{ active: currentTab === 'search' }"
            @click="currentTab = 'search'"
          >
            <span class="nav-icon">🔍</span>
            Buscar
          </button>
          <button
            :class="{ active: currentTab === 'requests' }"
            @click="currentTab = 'requests'"
          >
            <span class="nav-icon">📨</span>
            Solicitações
            <span v-if="pendingRequests.length" class="badge highlight">{{ pendingRequests.length }}</span>
          </button>
        </nav>

        <!-- Lista baseada na tab atual -->
        <div class="sidebar-content">
          <!-- Tab: Conexões -->
          <div v-if="currentTab === 'connections'" class="tab-content">
            <div
              v-for="conn in connections"
              :key="conn.id"
              class="user-item"
              :class="{ active: selectedConnection?.id === conn.id }"
              @click="selectConnection(conn)"
            >
              <div class="user-avatar" :class="[conn.status || 'offline']">
                {{ conn.nome.charAt(0).toUpperCase() }}
              </div>
              <div class="user-info">
                <span class="name">{{ conn.nome }}</span>
                <span class="lang">{{ getIdiomaLabel(conn.idioma) }} · {{ conn.pais || '?' }}</span>
              </div>
            </div>
            <p v-if="connections.length === 0" class="empty-state">
              Nenhuma conexão ainda.<br>
              Busque usuários para conectar!
            </p>
          </div>

          <!-- Tab: Buscar -->
          <div v-if="currentTab === 'search'" class="tab-content">
            <div class="search-box">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar por nome..."
                @input="searchUsers"
              />
            </div>
            <div
              v-for="user in searchResults"
              :key="user.id"
              class="user-item"
            >
              <div class="user-avatar">
                {{ user.nome.charAt(0).toUpperCase() }}
              </div>
              <div class="user-info">
                <span class="name">{{ user.nome }}</span>
                <span class="lang">{{ getIdiomaLabel(user.idioma) }} · {{ user.pais || '?' }}</span>
              </div>
              <button
                class="btn-connect"
                @click="sendConnectionRequest(user.id)"
                :disabled="user.requestSent"
              >
                {{ user.requestSent ? 'Enviado' : 'Conectar' }}
              </button>
            </div>
            <p v-if="searchQuery && searchResults.length === 0" class="empty-state">
              Nenhum usuário encontrado.
            </p>
            <p v-if="!searchQuery" class="empty-state">
              Digite um nome para buscar.
            </p>
          </div>

          <!-- Tab: Solicitações -->
          <div v-if="currentTab === 'requests'" class="tab-content">
            <h4 class="section-title">Recebidas</h4>
            <div
              v-for="req in pendingRequests"
              :key="req.id"
              class="user-item request-item"
            >
              <div class="user-avatar">
                {{ req.nome.charAt(0).toUpperCase() }}
              </div>
              <div class="user-info">
                <span class="name">{{ req.nome }}</span>
                <span class="lang">{{ getIdiomaLabel(req.idioma) }}</span>
              </div>
              <div class="request-actions">
                <button class="btn-accept" @click="acceptRequest(req.connectionId)">✓</button>
                <button class="btn-reject" @click="rejectRequest(req.connectionId)">✕</button>
              </div>
            </div>
            <p v-if="pendingRequests.length === 0" class="empty-state small">
              Nenhuma solicitação pendente.
            </p>

            <h4 class="section-title">Enviadas</h4>
            <div
              v-for="req in sentRequests"
              :key="req.id"
              class="user-item"
            >
              <div class="user-avatar">
                {{ req.nome.charAt(0).toUpperCase() }}
              </div>
              <div class="user-info">
                <span class="name">{{ req.nome }}</span>
                <span class="lang">Aguardando...</span>
              </div>
            </div>
            <p v-if="sentRequests.length === 0" class="empty-state small">
              Nenhuma solicitação enviada.
            </p>
          </div>
        </div>

        <button class="btn-logout" @click="logout">Sair</button>
      </aside>

      <!-- Área Principal -->
      <main class="main-area">
        <!-- Nenhuma conversa selecionada -->
        <div v-if="!selectedConnection" class="no-chat">
          <div class="logo-big">
            <span class="logo-poly">Poly</span><span class="logo-io">.io</span>
          </div>
          <p>Selecione uma conexão para conversar</p>
          <p class="hint">Ou busque novos usuários para se conectar</p>
        </div>

        <!-- Chat ativo -->
        <template v-else>
          <!-- Header do chat -->
          <div class="chat-header">
            <div class="chat-user">
              <div class="user-avatar" :class="[selectedConnection.status || 'offline']">
                {{ selectedConnection.nome.charAt(0).toUpperCase() }}
              </div>
              <div>
                <span class="name">{{ selectedConnection.nome }}</span>
                <span class="status" :class="[selectedConnection.status || 'offline']">{{ getStatusLabel(selectedConnection.status) }}</span>
              </div>
            </div>
            <div class="chat-actions">
              <span class="translation-badge">
                {{ getIdiomaLabel(currentUser?.idioma) }} ↔ {{ getIdiomaLabel(selectedConnection.idioma) }}
              </span>
              <button class="btn-icon" @click="exportChat" title="Exportar conversa">
                📥
              </button>
            </div>
          </div>

          <!-- Aviso de expiração -->
          <div class="expiration-notice">
            As mensagens expiram automaticamente após 3 dias.
            <button @click="exportChat">Baixar conversa</button>
          </div>

          <!-- Mensagens -->
          <div class="messages" ref="messagesContainer">
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="message"
              :class="{ 'sent': msg.euEnviei, 'received': !msg.euEnviei }"
            >
              <div class="message-content">
                <p class="message-text">{{ msg.texto }}</p>
                <button
                  v-if="!msg.euEnviei && msg.textoOriginal !== msg.texto"
                  class="btn-original"
                  @click="msg.showOriginal = !msg.showOriginal"
                >
                  {{ msg.showOriginal ? 'Ver tradução' : 'Ver original' }}
                </button>
                <p v-if="msg.showOriginal" class="original-text">
                  Original: {{ msg.textoOriginal }}
                </p>
                <span class="message-time">{{ formatTime(msg.enviadoEm) }}</span>
              </div>
            </div>

            <p v-if="messages.length === 0" class="no-messages">
              Nenhuma mensagem ainda.<br>
              Diga olá!
            </p>
          </div>

          <!-- Input de mensagem -->
          <div class="message-input">
            <input
              v-model="newMessage"
              type="text"
              :placeholder="'Escreva em ' + getIdiomaLabel(currentUser?.idioma) + '...'"
              @keyup.enter="sendMessage"
            />
            <button class="btn-send" @click="sendMessage" :disabled="!newMessage.trim()">
              Enviar
            </button>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { io } from 'socket.io-client'

// Configuração da API
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const API_URL = `${API_BASE}/api`

// Socket.io (conecta depois do login)
let socket = null

// Estado de autenticação
const authMode = ref('login')
const loading = ref(false)
const authError = ref('')
const token = ref(localStorage.getItem('poly_token') || '')
const currentUser = ref(null)

const loginForm = ref({
  email: '',
  senha: ''
})

const registerForm = ref({
  nome: '',
  email: '',
  senha: '',
  idioma: 'pt',
  pais: ''
})

// Estado da aplicação
const sidebarOpen = ref(true)
const currentTab = ref('connections')
const connections = ref([])
const pendingRequests = ref([])
const sentRequests = ref([])
const searchQuery = ref('')
const searchResults = ref([])
const selectedConnection = ref(null)
const messages = ref([])
const newMessage = ref('')
const messagesContainer = ref(null)
const myStatus = ref('online')

// Computed
const isLoggedIn = computed(() => !!token.value && !!currentUser.value)

// Status options
const statusOptions = [
  { value: 'online', label: 'Online' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'invisivel', label: 'Invisível' }
]

// Idiomas
const idiomas = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  ru: 'Русский',
  ar: 'العربية'
}

function getIdiomaLabel(code) {
  return idiomas[code] || code || ''
}

function getStatusLabel(status) {
  const labels = {
    online: 'Online',
    ausente: 'Ausente',
    ocupado: 'Ocupado',
    invisivel: 'Invisível',
    offline: 'Offline'
  }
  return labels[status] || 'Offline'
}

// Headers com autenticação
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token.value}`
  }
}

// ==================== AUTENTICAÇÃO ====================

async function login() {
  loading.value = true
  authError.value = ''

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm.value)
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || data.erro || 'Erro ao fazer login')
    }

    token.value = data.token
    currentUser.value = data.user
    localStorage.setItem('poly_token', data.token)

    initializeApp()
  } catch (error) {
    authError.value = error.message
  } finally {
    loading.value = false
  }
}

async function register() {
  loading.value = true
  authError.value = ''

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerForm.value)
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || data.erro || 'Erro ao criar conta')
    }

    token.value = data.token
    currentUser.value = data.user
    localStorage.setItem('poly_token', data.token)

    initializeApp()
  } catch (error) {
    authError.value = error.message
  } finally {
    loading.value = false
  }
}

async function checkAuth() {
  if (!token.value) return

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: authHeaders()
    })

    if (!res.ok) {
      throw new Error('Token inválido')
    }

    currentUser.value = await res.json()
    initializeApp()
  } catch (error) {
    logout()
  }
}

function logout() {
  token.value = ''
  currentUser.value = null
  localStorage.removeItem('poly_token')
  if (socket) {
    socket.disconnect()
    socket = null
  }
  connections.value = []
  pendingRequests.value = []
  sentRequests.value = []
  selectedConnection.value = null
  messages.value = []
}

// ==================== INICIALIZAÇÃO ====================

function initializeApp() {
  // Conectar socket
  socket = io(API_BASE)
  socket.emit('autenticar', token.value)

  // Listeners do socket
  socket.on('nova-mensagem', handleNewMessage)
  socket.on('conexao-atualizada', loadConnections)
  socket.on('usuario-online', handleUserOnline)
  socket.on('usuario-offline', handleUserOffline)
  socket.on('status-atualizado', handleStatusUpdate)

  // Carregar dados após pequeno delay para socket conectar
  setTimeout(() => {
    loadConnections()
    loadPendingRequests()
  }, 500)

  // Atualizar status online periodicamente
  setInterval(loadConnections, 30000)
}

// ==================== CONEXÕES ====================

async function loadConnections() {
  try {
    const res = await fetch(`${API_URL}/connections`, {
      headers: authHeaders()
    })
    const data = await res.json()

    // Buscar quem está online e seus status
    let onlineUsers = {}
    try {
      const onlineRes = await fetch(`${API_URL}/users/online`, {
        headers: authHeaders()
      })
      onlineUsers = await onlineRes.json()
    } catch (e) {
      console.error('Erro ao buscar online:', e)
    }

    connections.value = data.map(c => ({
      id: c.user_id,
      connectionId: c.connection_id,
      nome: c.nome,
      idioma: c.idioma,
      pais: c.pais,
      online: c.user_id in onlineUsers,
      status: onlineUsers[c.user_id] || 'offline'
    }))
  } catch (error) {
    console.error('Erro ao carregar conexões:', error)
  }
}

async function changeStatus(status) {
  try {
    const res = await fetch(`${API_URL}/users/status`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ status })
    })
    if (res.ok) {
      myStatus.value = status
    }
  } catch (error) {
    console.error('Erro ao mudar status:', error)
  }
}

async function loadPendingRequests() {
  try {
    const res = await fetch(`${API_URL}/connections/pending`, {
      headers: authHeaders()
    })
    const data = await res.json()
    // Mapear para formato esperado
    pendingRequests.value = (data.recebidas || data || []).map(r => ({
      id: r.user_id,
      connectionId: r.connection_id,
      nome: r.nome,
      idioma: r.idioma
    }))
    sentRequests.value = (data.enviadas || []).map(r => ({
      id: r.user_id,
      nome: r.nome
    }))
  } catch (error) {
    console.error('Erro ao carregar solicitações:', error)
  }
}

async function searchUsers() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  try {
    const res = await fetch(`${API_URL}/users?search=${encodeURIComponent(searchQuery.value)}`, {
      headers: authHeaders()
    })
    searchResults.value = await res.json()
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
  }
}

async function sendConnectionRequest(userId) {
  try {
    const res = await fetch(`${API_URL}/connections/request/${userId}`, {
      method: 'POST',
      headers: authHeaders()
    })

    const data = await res.json()

    if (res.ok) {
      // Marcar como enviado
      const user = searchResults.value.find(u => u.id === userId)
      if (user) user.requestSent = true
      loadPendingRequests()
      alert('Solicitação enviada!')
    } else {
      alert(data.error || 'Erro ao enviar solicitação')
    }
  } catch (error) {
    console.error('Erro ao enviar solicitação:', error)
    alert('Erro ao conectar com o servidor')
  }
}

async function acceptRequest(connectionId) {
  try {
    await fetch(`${API_URL}/connections/accept/${connectionId}`, {
      method: 'POST',
      headers: authHeaders()
    })
    loadConnections()
    loadPendingRequests()
  } catch (error) {
    console.error('Erro ao aceitar solicitação:', error)
  }
}

async function rejectRequest(connectionId) {
  try {
    await fetch(`${API_URL}/connections/reject/${connectionId}`, {
      method: 'POST',
      headers: authHeaders()
    })
    loadPendingRequests()
  } catch (error) {
    console.error('Erro ao rejeitar solicitação:', error)
  }
}

// ==================== CHAT ====================

async function selectConnection(conn) {
  selectedConnection.value = conn
  sidebarOpen.value = false
  await loadMessages()
}

async function loadMessages() {
  if (!selectedConnection.value) return

  try {
    const res = await fetch(`${API_URL}/chat/${selectedConnection.value.connectionId}`, {
      headers: authHeaders()
    })
    const data = await res.json()
    messages.value = data.map(m => ({
      id: m.id,
      euEnviei: m.euEnviei,
      texto: m.texto,
      textoOriginal: m.textoOriginal,
      enviadoEm: m.enviadoEm,
      showOriginal: false
    }))
    scrollToBottom()
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error)
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || !selectedConnection.value) return

  try {
    await fetch(`${API_URL}/chat/${selectedConnection.value.connectionId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ texto: newMessage.value })
    })
    newMessage.value = ''
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
  }
}

function handleNewMessage(msg) {
  if (!selectedConnection.value) return
  if (msg.connectionId !== selectedConnection.value.connectionId) return

  // Evitar duplicatas
  if (messages.value.some(m => m.id === msg.id)) return

  const euEnviei = msg.senderId === currentUser.value.id
  messages.value.push({
    id: msg.id,
    euEnviei,
    texto: euEnviei ? msg.texto : msg.textoTraduzido,
    textoOriginal: msg.texto,
    enviadoEm: msg.enviadoEm,
    showOriginal: false
  })
  scrollToBottom()
}

async function exportChat() {
  if (!selectedConnection.value) return

  try {
    const res = await fetch(`${API_URL}/chat/${selectedConnection.value.connectionId}/export`, {
      headers: authHeaders()
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${selectedConnection.value.nome}-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Erro ao exportar chat:', error)
  }
}

// ==================== STATUS ONLINE ====================

function handleUserOnline(data) {
  const userId = typeof data === 'object' ? data.userId : data
  const status = typeof data === 'object' ? data.status : 'online'

  const conn = connections.value.find(c => c.id === userId)
  if (conn) {
    conn.online = true
    conn.status = status
  }
  if (selectedConnection.value?.id === userId) {
    selectedConnection.value.online = true
    selectedConnection.value.status = status
  }
}

function handleUserOffline(userId) {
  const conn = connections.value.find(c => c.id === userId)
  if (conn) {
    conn.online = false
    conn.status = 'offline'
  }
  if (selectedConnection.value?.id === userId) {
    selectedConnection.value.online = false
    selectedConnection.value.status = 'offline'
  }
}

function handleStatusUpdate(data) {
  const { userId, status } = data
  const conn = connections.value.find(c => c.id === userId)
  if (conn) {
    conn.status = status
    conn.online = status !== 'invisivel'
  }
  if (selectedConnection.value?.id === userId) {
    selectedConnection.value.status = status
    selectedConnection.value.online = status !== 'invisivel'
  }
}

// ==================== UTILITÁRIOS ====================

function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
         ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// ==================== LIFECYCLE ====================

onMounted(() => {
  checkAuth()
})

watch(messages, scrollToBottom, { deep: true })
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #0a0a0a;
  color: #fff;
  min-height: 100vh;
}

.app {
  min-height: 100vh;
}

/* ==================== AUTH SCREEN ==================== */
.auth-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
  padding: 20px;
}

.auth-card {
  background: #111;
  border: 1px solid #222;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  text-align: center;
}

.logo {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.logo-poly { color: #fff; }
.logo-io { color: #6366f1; }

.tagline {
  color: #666;
  margin-bottom: 32px;
}

.auth-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.auth-tabs button {
  flex: 1;
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #888;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-tabs button.active {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

.auth-form {
  text-align: left;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  color: #888;
  margin-bottom: 8px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 14px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #6366f1;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.btn-primary {
  width: 100%;
  padding: 14px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 8px;
}

.btn-primary:hover:not(:disabled) {
  background: #5558e3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-text {
  color: #f43f5e;
  font-size: 0.875rem;
  margin-top: 16px;
}

.info-text {
  margin-top: 24px;
  font-size: 0.8rem;
  color: #666;
  line-height: 1.5;
}

/* ==================== MAIN SCREEN ==================== */
.main-screen {
  display: flex;
  height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 300px;
  background: #111;
  border-right: 1px solid #222;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #222;
}

.logo-small {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.current-user {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.current-user .user-name {
  font-weight: 600;
}

.current-user .user-lang {
  font-size: 0.75rem;
  color: #6366f1;
}

/* Status Selector */
.status-selector {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.status-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #333;
  background: #1a1a1a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.status-btn:hover {
  border-color: #555;
}

.status-btn.active {
  border-color: #fff;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-btn.online .status-dot { background: #10b981; }
.status-btn.ausente .status-dot { background: #f59e0b; }
.status-btn.ocupado .status-dot { background: #ef4444; }
.status-btn.invisivel .status-dot { background: #6b7280; }

/* Status colors for avatars */
.user-avatar.online::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  background: #10b981;
  border-radius: 50%;
  border: 2px solid #111;
}

.user-avatar.ausente::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  background: #f59e0b;
  border-radius: 50%;
  border: 2px solid #111;
}

.user-avatar.ocupado::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  background: #ef4444;
  border-radius: 50%;
  border: 2px solid #111;
}

.user-avatar.offline::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  background: #6b7280;
  border-radius: 50%;
  border: 2px solid #111;
}

/* Status text colors */
.chat-user .status.online { color: #10b981; }
.chat-user .status.ausente { color: #f59e0b; }
.chat-user .status.ocupado { color: #ef4444; }
.chat-user .status.offline { color: #6b7280; }

/* Navegação */
.sidebar-nav {
  display: flex;
  padding: 12px;
  gap: 8px;
  border-bottom: 1px solid #222;
}

.sidebar-nav button {
  flex: 1;
  padding: 10px 8px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #888;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
  transition: all 0.2s;
}

.sidebar-nav button.active {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

.nav-icon {
  font-size: 1.1rem;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #333;
  color: #fff;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 10px;
}

.badge.highlight {
  background: #f43f5e;
}

/* Sidebar Content */
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #666;
  margin: 12px 0 8px;
}

.section-title:first-child {
  margin-top: 0;
}

.search-box {
  margin-bottom: 12px;
}

.search-box input {
  width: 100%;
  padding: 10px 14px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 0.875rem;
  outline: none;
}

.search-box input:focus {
  border-color: #6366f1;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-item:hover {
  background: #1a1a1a;
}

.user-item.active {
  background: #6366f1;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0;
  position: relative;
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-info .name {
  font-weight: 500;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-info .lang {
  font-size: 0.75rem;
  color: #888;
}

.user-item.active .user-info .lang {
  color: rgba(255, 255, 255, 0.7);
}

.btn-connect {
  padding: 6px 12px;
  background: #6366f1;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-connect:hover:not(:disabled) {
  background: #5558e3;
}

.btn-connect:disabled {
  background: #333;
  cursor: default;
}

.request-item {
  flex-wrap: wrap;
}

.request-actions {
  display: flex;
  gap: 6px;
}

.btn-accept, .btn-reject {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-accept {
  background: #10b981;
  color: #fff;
}

.btn-reject {
  background: #333;
  color: #888;
}

.btn-reject:hover {
  background: #f43f5e;
  color: #fff;
}

.empty-state {
  text-align: center;
  color: #666;
  font-size: 0.85rem;
  padding: 24px 12px;
  line-height: 1.5;
}

.empty-state.small {
  padding: 12px;
  font-size: 0.75rem;
}

.btn-logout {
  margin: 12px;
  padding: 12px;
  background: transparent;
  border: 1px solid #333;
  border-radius: 8px;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  border-color: #f43f5e;
  color: #f43f5e;
}

/* ==================== MAIN AREA ==================== */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
}

.no-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

.logo-big {
  font-size: 4rem;
  font-weight: 700;
  margin-bottom: 16px;
}

.no-chat .hint {
  font-size: 0.875rem;
  margin-top: 8px;
}

/* Chat Header */
.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid #222;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-user .name {
  font-weight: 600;
  display: block;
}

.chat-user .status {
  font-size: 0.75rem;
  color: #888;
}

.chat-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.translation-badge {
  padding: 6px 12px;
  background: #1a1a2e;
  border-radius: 20px;
  font-size: 0.75rem;
  color: #6366f1;
}

.btn-icon {
  width: 36px;
  height: 36px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  border-color: #6366f1;
}

/* Expiration Notice */
.expiration-notice {
  padding: 10px 24px;
  background: #1a1a1a;
  border-bottom: 1px solid #222;
  font-size: 0.75rem;
  color: #888;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.expiration-notice button {
  background: none;
  border: none;
  color: #6366f1;
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.75rem;
}

/* Messages */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 70%;
  display: flex;
}

.message.sent {
  align-self: flex-end;
}

.message.received {
  align-self: flex-start;
}

.message-content {
  padding: 12px 16px;
  border-radius: 16px;
}

.message.sent .message-content {
  background: #6366f1;
  border-bottom-right-radius: 4px;
}

.message.received .message-content {
  background: #222;
  border-bottom-left-radius: 4px;
}

.message-text {
  font-size: 0.9rem;
  line-height: 1.4;
}

.message-time {
  display: block;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 6px;
}

.btn-original {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.7rem;
  cursor: pointer;
  padding: 4px 0;
  text-decoration: underline;
}

.original-text {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.no-messages {
  text-align: center;
  color: #666;
  margin: auto;
  line-height: 1.5;
}

/* Message Input */
.message-input {
  padding: 16px 24px;
  border-top: 1px solid #222;
  display: flex;
  gap: 12px;
}

.message-input input {
  flex: 1;
  padding: 14px 20px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 24px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
}

.message-input input:focus {
  border-color: #6366f1;
}

.btn-send {
  padding: 14px 24px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-send:hover:not(:disabled) {
  background: #5558e3;
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Mobile Menu */
.mobile-menu-btn {
  display: none;
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 200;
  width: 44px;
  height: 44px;
  background: #6366f1;
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.sidebar-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 90;
}

/* Responsive */
@media (max-width: 768px) {
  .mobile-menu-btn {
    display: flex;
  }

  .sidebar-overlay {
    display: block;
  }

  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .main-area {
    width: 100%;
  }

  .no-chat {
    padding-top: 80px;
  }

  .logo-big {
    font-size: 2.5rem;
  }

  .chat-header {
    padding-left: 70px;
  }

  .message {
    max-width: 85%;
  }
}
</style>
