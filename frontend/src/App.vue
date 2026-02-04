<template>
  <div class="app">
    <!-- Tela de Login/Registro -->
    <div v-if="!currentUser" class="login-screen">
      <div class="login-card">
        <div class="logo">
          <span class="logo-poly">Poly</span><span class="logo-io">.io</span>
        </div>
        <p class="tagline">Chat sem barreiras de idioma</p>

        <div class="form-group">
          <label>Seu nome</label>
          <input
            v-model="loginForm.nome"
            type="text"
            placeholder="Como quer ser chamado?"
            @keyup.enter="entrar"
          />
        </div>

        <div class="form-group">
          <label>Seu idioma</label>
          <select v-model="loginForm.idioma">
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

        <button class="btn-primary" @click="entrar">
          Entrar no Chat
        </button>

        <p class="info-text">
          Você escreve no seu idioma.<br>
          A outra pessoa lê no idioma dela.
        </p>
      </div>
    </div>

    <!-- Tela Principal do Chat -->
    <div v-else class="chat-screen">
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

      <!-- Sidebar com usuários -->
      <aside class="sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-header">
          <div class="logo-small">
            <span class="logo-poly">Poly</span><span class="logo-io">.io</span>
          </div>
          <div class="current-user">
            <span class="user-name">{{ currentUser.nome }}</span>
            <span class="user-lang">{{ getIdiomaLabel(currentUser.idioma) }}</span>
          </div>
        </div>

        <div class="users-list">
          <h3>Usuários Online</h3>
          <div
            v-for="user in outrosUsuarios"
            :key="user.id"
            class="user-item"
            :class="{ active: selectedUser?.id === user.id }"
            @click="selecionarUsuario(user)"
          >
            <div class="user-avatar">{{ user.nome.charAt(0).toUpperCase() }}</div>
            <div class="user-info">
              <span class="name">{{ user.nome }}</span>
              <span class="lang">{{ getIdiomaLabel(user.idioma) }}</span>
            </div>
          </div>

          <p v-if="outrosUsuarios.length === 0" class="no-users">
            Nenhum outro usuário online.<br>
            Compartilhe o link!
          </p>
        </div>

        <button class="btn-logout" @click="sair">Sair</button>
      </aside>

      <!-- Área do Chat -->
      <main class="chat-area">
        <div v-if="!selectedUser" class="no-chat">
          <div class="logo-big">
            <span class="logo-poly">Poly</span><span class="logo-io">.io</span>
          </div>
          <p>Selecione um usuário para conversar</p>
          <p class="hint">Ou compartilhe o link para convidar alguém</p>
        </div>

        <template v-else>
          <!-- Header do chat -->
          <div class="chat-header">
            <div class="chat-user">
              <div class="user-avatar">{{ selectedUser.nome.charAt(0).toUpperCase() }}</div>
              <div>
                <span class="name">{{ selectedUser.nome }}</span>
                <span class="lang">Fala {{ getIdiomaLabel(selectedUser.idioma) }}</span>
              </div>
            </div>
            <div class="translation-badge">
              {{ getIdiomaLabel(currentUser.idioma) }} ↔ {{ getIdiomaLabel(selectedUser.idioma) }}
            </div>
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
                  @click="toggleOriginal(msg)"
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
              Diga olá! 👋
            </p>
          </div>

          <!-- Input de mensagem -->
          <div class="message-input">
            <input
              v-model="newMessage"
              type="text"
              :placeholder="'Escreva em ' + getIdiomaLabel(currentUser.idioma) + '...'"
              @keyup.enter="enviarMensagem"
            />
            <button class="btn-send" @click="enviarMensagem" :disabled="!newMessage.trim()">
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

// Configuração da API (usa variável de ambiente em produção)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const API_URL = `${API_BASE}/api`
const socket = io(API_BASE)

// Estado
const currentUser = ref(null)
const users = ref([])
const selectedUser = ref(null)
const messages = ref([])
const newMessage = ref('')
const messagesContainer = ref(null)
const sidebarOpen = ref(true) // Sidebar visível no mobile

const loginForm = ref({
  nome: '',
  idioma: 'pt'
})

// Computed
const outrosUsuarios = computed(() => {
  return users.value.filter(u => u.id !== currentUser.value?.id)
})

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
  return idiomas[code] || code
}

// Funções
async function entrar() {
  if (!loginForm.value.nome.trim()) return

  try {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm.value)
    })
    currentUser.value = await res.json()

    // Registrar no socket
    socket.emit('registrar', currentUser.value.id)

    // Carregar usuários
    await carregarUsuarios()
  } catch (error) {
    console.error('Erro ao entrar:', error)
    alert('Erro ao conectar. Verifique se o servidor está rodando.')
  }
}

function sair() {
  currentUser.value = null
  selectedUser.value = null
  messages.value = []
}

async function carregarUsuarios() {
  try {
    const res = await fetch(`${API_URL}/users`)
    users.value = await res.json()
  } catch (error) {
    console.error('Erro ao carregar usuários:', error)
  }
}

async function selecionarUsuario(user) {
  selectedUser.value = user
  sidebarOpen.value = false // Fechar sidebar no mobile
  await carregarMensagens()
}

async function carregarMensagens() {
  if (!currentUser.value || !selectedUser.value) return

  try {
    const res = await fetch(`${API_URL}/messages/${currentUser.value.id}/${selectedUser.value.id}`)
    messages.value = await res.json()
    scrollToBottom()
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error)
  }
}

async function enviarMensagem() {
  if (!newMessage.value.trim() || !selectedUser.value) return

  try {
    await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        remetenteId: currentUser.value.id,
        destinatarioId: selectedUser.value.id,
        texto: newMessage.value
      })
    })
    newMessage.value = ''
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
  }
}

function toggleOriginal(msg) {
  msg.showOriginal = !msg.showOriginal
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Socket.io - receber mensagens em tempo real
socket.on('nova-mensagem', (msg) => {
  // Verificar se a mensagem é da conversa atual
  if (!currentUser.value || !selectedUser.value) return

  const isFromSelectedUser = msg.remetente_id === selectedUser.value.id
  const isToMe = msg.destinatario_id === currentUser.value.id
  const isFromMe = msg.remetente_id === currentUser.value.id
  const isToSelectedUser = msg.destinatario_id === selectedUser.value.id

  if ((isFromSelectedUser && isToMe) || (isFromMe && isToSelectedUser)) {
    const euEnviei = msg.remetente_id === currentUser.value.id
    messages.value.push({
      id: msg.id,
      remetenteId: msg.remetente_id,
      texto: euEnviei ? msg.textoParaRemetente : msg.textoParaDestinatario,
      textoOriginal: msg.texto_original,
      enviadoEm: msg.enviado_em,
      euEnviei
    })
    scrollToBottom()
  }

  // Atualizar lista de usuários (pode ter usuário novo)
  carregarUsuarios()
})

// Socket.io - atualizar lista quando alguém entra/sai
socket.on('usuarios-atualizados', () => {
  carregarUsuarios()
})

// Atualizar usuários periodicamente (backup)
onMounted(() => {
  setInterval(carregarUsuarios, 10000)
})

// Watch para scroll quando mensagens mudam
watch(messages, scrollToBottom, { deep: true })
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  background: #0a0a0a;
  color: #fff;
  min-height: 100vh;
}

.app {
  min-height: 100vh;
}

/* ==================== LOGIN ==================== */
.login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
}

.login-card {
  background: #111;
  border: 1px solid #222;
  border-radius: 16px;
  padding: 48px;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.logo {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.logo-poly {
  color: #fff;
}

.logo-io {
  color: #6366f1;
}

.tagline {
  color: #666;
  margin-bottom: 32px;
}

.form-group {
  text-align: left;
  margin-bottom: 20px;
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
  padding: 14px 16px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #6366f1;
}

.form-group select {
  cursor: pointer;
}

.btn-primary {
  width: 100%;
  padding: 16px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #5558e3;
}

.info-text {
  margin-top: 24px;
  font-size: 0.875rem;
  color: #666;
  line-height: 1.5;
}

/* ==================== CHAT SCREEN ==================== */
.chat-screen {
  display: flex;
  height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 280px;
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

.users-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.users-list h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #666;
  margin-bottom: 12px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
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
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-info .name {
  font-weight: 500;
}

.user-info .lang {
  font-size: 0.75rem;
  color: #888;
}

.user-item.active .user-info .lang {
  color: rgba(255, 255, 255, 0.7);
}

.no-users {
  text-align: center;
  color: #666;
  font-size: 0.875rem;
  line-height: 1.5;
  padding: 20px;
}

.btn-logout {
  margin: 16px;
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

/* Chat Area */
.chat-area {
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

.chat-user .lang {
  font-size: 0.75rem;
  color: #888;
}

.translation-badge {
  padding: 6px 12px;
  background: #1a1a2e;
  border-radius: 20px;
  font-size: 0.75rem;
  color: #6366f1;
}

/* Messages */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  font-size: 0.9375rem;
  line-height: 1.4;
}

.message-time {
  display: block;
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 6px;
}

.btn-original {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 4px 0;
  text-decoration: underline;
}

.btn-original:hover {
  color: #fff;
}

.original-text {
  font-size: 0.8125rem;
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
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.2s;
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

/* Mobile Menu Button */
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

/* Sidebar Overlay */
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

  .chat-area {
    width: 100%;
  }

  .no-chat {
    padding-top: 80px;
  }

  .logo-big {
    font-size: 2.5rem;
  }
}
</style>
