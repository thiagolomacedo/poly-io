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
      <!-- Botão Menu Mobile (só aparece quando fechado) -->
      <button v-if="!sidebarOpen" class="mobile-menu-btn" @click="sidebarOpen = true">
        ☰
      </button>

      <!-- Overlay para fechar sidebar no mobile -->
      <div
        v-if="sidebarOpen"
        class="sidebar-overlay"
        @click="sidebarOpen = false"
      ></div>

      <!-- Modal de Perfil -->
      <div v-if="showProfileModal" class="profile-modal-overlay" @click="showProfileModal = false">
        <div class="profile-modal" @click.stop>
          <button class="profile-close" @click="showProfileModal = false">✕</button>

          <div class="profile-avatar-large">
            <img
              v-if="profileUser?.email"
              :src="getGravatarUrl(profileUser.email, 150)"
              :alt="profileUser.nome"
              @error="$event.target.style.display='none'"
            />
            <span class="profile-letter">{{ profileUser?.nome?.charAt(0).toUpperCase() }}</span>
          </div>

          <h2 class="profile-name">{{ profileUser?.nome }}</h2>
          <p class="profile-info">{{ getIdiomaLabel(profileUser?.idioma) }} · {{ profileUser?.pais || 'Não informado' }}</p>

          <!-- Código de Amigo -->
          <div v-if="profileUser?.codigo_amigo" class="friend-code-section">
            <p class="friend-code-label">Código de Amigo</p>
            <div class="friend-code-box">
              <span class="friend-code">{{ profileUser.codigo_amigo }}</span>
              <button
                v-if="profileUser?.id === currentUser?.id"
                class="btn-copy"
                @click="copyFriendCode"
                :title="codeCopied ? 'Copiado!' : 'Copiar código'"
              >
                {{ codeCopied ? '✓' : '📋' }}
              </button>
            </div>
            <button
              v-if="profileUser?.id === currentUser?.id"
              class="btn-share-link"
              @click="copyInviteLink"
            >
              {{ linkCopied ? '✓ Link copiado!' : '🔗 Copiar link de convite' }}
            </button>
          </div>

          <!-- Rede Social -->
          <div class="profile-social">
            <!-- Meu perfil - posso editar -->
            <div v-if="profileUser?.id === currentUser?.id" class="social-edit">
              <!-- Modo visualização -->
              <div v-if="!editingSocial" class="social-display">
                <a
                  v-if="profileUser?.social_tipo && profileUser?.social_url"
                  :href="profileUser.social_url"
                  target="_blank"
                  class="social-link"
                >
                  <span class="social-icon">{{ getSocialInfo(profileUser.social_tipo).icone }}</span>
                  {{ getSocialInfo(profileUser.social_tipo).nome }}
                </a>
                <span v-else class="social-empty">Sem rede social</span>
                <button class="btn-edit-social" @click="editingSocial = true">
                  {{ profileUser?.social_tipo ? 'Editar' : 'Adicionar' }}
                </button>
              </div>
              <!-- Modo edição -->
              <div v-else class="social-form">
                <select v-model="socialTipoInput" class="social-select">
                  <option value="">Selecione a rede</option>
                  <option v-for="(info, key) in redesSociais" :key="key" :value="key">
                    {{ info.icone }} {{ info.nome }}
                  </option>
                </select>
                <input
                  v-model="socialUrlInput"
                  type="url"
                  :placeholder="socialTipoInput ? getSocialInfo(socialTipoInput).placeholder : 'URL do perfil'"
                  class="social-input"
                />
                <div class="social-buttons">
                  <button class="btn-save" @click="saveSocial">Salvar</button>
                  <button class="btn-cancel" @click="editingSocial = false">Cancelar</button>
                  <button
                    v-if="profileUser?.social_tipo"
                    class="btn-remove"
                    @click="removeSocial"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
            <!-- Perfil de outro usuário - só visualizar -->
            <div v-else>
              <a
                v-if="profileUser?.social_tipo && profileUser?.social_url"
                :href="profileUser.social_url"
                target="_blank"
                class="social-link"
              >
                <span class="social-icon">{{ getSocialInfo(profileUser.social_tipo).icone }}</span>
                {{ getSocialInfo(profileUser.social_tipo).nome }}
              </a>
            </div>
          </div>

          <p class="profile-tip">Foto via Gravatar (gravatar.com)</p>

          <!-- Botão Excluir Conta (só para o próprio perfil) -->
          <button
            v-if="profileUser?.id === currentUser?.id"
            class="btn-delete-account"
            @click="deleteAccount"
          >
            Excluir minha conta
          </button>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-header">
          <div class="sidebar-header-top">
            <div class="logo-small">
              <span class="logo-poly">Poly</span><span class="logo-io">.io</span>
            </div>
            <button class="btn-close-sidebar" @click="sidebarOpen = false">✕</button>
          </div>
          <div class="current-user" @click="openProfile(currentUser)" style="cursor: pointer;">
            <div class="current-user-avatar">
              <img
                v-if="currentUser?.email"
                :src="getGravatarUrl(currentUser.email, 80)"
                class="gravatar-small"
                @error="$event.target.style.display='none'"
              />
              <span class="avatar-letter-small">{{ currentUser?.nome?.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="current-user-info">
              <span class="user-name">{{ currentUser?.nome }}</span>
              <span class="user-lang">{{ getIdiomaLabel(currentUser?.idioma) }}</span>
            </div>
            <button class="btn-edit-profile" @click.stop="openProfile(currentUser)" title="Editar perfil">
              ✏️
            </button>
          </div>
          <div class="status-row">
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
            <button
              class="btn-mute-all"
              :class="{ muted: notificacaoGlobalMudo }"
              @click="toggleMuteAll"
              :title="notificacaoGlobalMudo ? 'Ativar sons' : 'Silenciar tudo'"
            >
              {{ notificacaoGlobalMudo ? '🔇' : '🔔' }}
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
                <span class="lang">{{ getIdiomaLabel(conn.idioma) }} · {{ getPaisLabel(conn.pais, conn.idioma) }}</span>
              </div>
              <button
                class="btn-mute-connection"
                :class="{ muted: isConnectionMuted(conn.connectionId) }"
                @click.stop="toggleMuteConnection(conn.connectionId)"
                :title="isConnectionMuted(conn.connectionId) ? 'Ativar som' : 'Silenciar'"
              >
                {{ isConnectionMuted(conn.connectionId) ? '🔇' : '🔔' }}
              </button>
            </div>
            <p v-if="connections.length === 0" class="empty-state">
              Nenhuma conexão ainda.<br>
              Busque usuários para conectar!
            </p>
          </div>

          <!-- Tab: Buscar -->
          <div v-if="currentTab === 'search'" class="tab-content">
            <!-- Busca por código -->
            <div class="search-box code-search">
              <input
                v-model="codeQuery"
                type="text"
                placeholder="Código de amigo (ex: ABC123)"
                maxlength="6"
                @input="codeQuery = codeQuery.toUpperCase()"
                @keyup.enter="searchByCode"
              />
              <button class="btn-search-code" @click="searchByCode">Buscar</button>
            </div>

            <!-- Resultado da busca por código -->
            <div v-if="codeResult" class="user-item code-result">
              <div class="user-avatar">
                {{ codeResult.nome.charAt(0).toUpperCase() }}
              </div>
              <div class="user-info">
                <span class="name">{{ codeResult.nome }}</span>
                <span class="lang">{{ getIdiomaLabel(codeResult.idioma) }} · {{ getPaisLabel(codeResult.pais, codeResult.idioma) }}</span>
              </div>
              <button
                class="btn-connect"
                @click="sendConnectionRequest(codeResult.id); codeResult = null; codeQuery = ''"
              >
                Conectar
              </button>
            </div>
            <p v-if="codeError" class="empty-state small error-text">{{ codeError }}</p>

            <div class="search-divider">ou busque por nome</div>

            <!-- Busca por nome -->
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
                <span class="lang">{{ getIdiomaLabel(user.idioma) }} · {{ getPaisLabel(user.pais, user.idioma) }}</span>
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
            <div class="chat-user" @click="openProfile(selectedConnection)" style="cursor: pointer;">
              <div class="user-avatar" :class="[selectedConnection.status || 'offline']">
                <img
                  v-if="selectedConnection.email"
                  :src="getGravatarUrl(selectedConnection.email, 80)"
                  class="gravatar-img"
                  @error="$event.target.style.display='none'"
                />
                <span class="avatar-letter">{{ selectedConnection.nome.charAt(0).toUpperCase() }}</span>
              </div>
              <div>
                <span class="name">{{ selectedConnection.nome }}</span>
                <span class="status" :class="[selectedConnection.status || 'offline']">{{ getStatusLabel(selectedConnection.status) }}</span>
              </div>
            </div>
            <div class="chat-actions">
              <select
                v-model="idiomaRecepcao"
                class="idioma-select"
                @change="onIdiomaRecepcaoChange"
                title="Idioma para receber traduções"
              >
                <option :value="null">{{ getIdiomaLabel(currentUser?.idioma) }} (Padrão)</option>
                <option v-for="lang in idiomasDisponiveis" :key="lang.code" :value="lang.code">
                  {{ lang.label }}
                </option>
              </select>
              <span class="translation-arrow">↔</span>
              <span class="translation-badge">{{ getIdiomaLabel(selectedConnection.idioma) }}</span>
              <button class="btn-icon" @click="exportChat" title="Exportar conversa">
                📥
              </button>
              <button class="btn-icon btn-clear" @click="clearConversation" title="Limpar conversa">
                🗑️
              </button>
            </div>
          </div>

          <!-- Aviso de expiração -->
          <div class="expiration-notice">
            As mensagens expiram automaticamente após 24 horas.
            <button @click="exportChat">Baixar conversa</button>
          </div>

          <!-- Mensagens -->
          <div class="messages" ref="messagesContainer">
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="message"
              :class="{ 'sent': msg.euEnviei, 'received': !msg.euEnviei }"
              @click="msg.euEnviei ? toggleMessageMenu(msg) : null"
            >
              <div class="message-content">
                <!-- Menu de ações (apenas para mensagens enviadas) -->
                <div v-if="msg.euEnviei && msg.showMenu && !msg.isEditing" class="message-actions">
                  <button class="btn-edit-msg" @click.stop="startEditMessage(msg)">
                    ✏️ Editar
                  </button>
                  <button class="btn-delete-msg" @click.stop="deleteMessage(msg)">
                    🗑️ Excluir
                  </button>
                </div>
                <!-- Modo edição -->
                <div v-if="msg.isEditing" class="edit-mode" @click.stop>
                  <input
                    v-model="msg.editText"
                    type="text"
                    class="edit-input"
                    @keyup.enter="saveEditMessage(msg)"
                    @keyup.esc="cancelEditMessage(msg)"
                  />
                  <div class="edit-buttons">
                    <button class="btn-save-edit" @click="saveEditMessage(msg)">Salvar</button>
                    <button class="btn-cancel-edit" @click="cancelEditMessage(msg)">Cancelar</button>
                  </div>
                </div>
                <!-- Mensagem de áudio -->
                <div v-else-if="msg.isAudio" class="audio-message">
                  <span class="audio-icon">🎤</span>
                  <audio :src="msg.audioData" controls class="audio-player"></audio>
                </div>
                <!-- Mensagem de arquivo -->
                <div v-else-if="msg.isFile" class="file-message">
                  <span class="file-icon">📎</span>
                  <span class="file-name">{{ msg.fileName }}</span>
                  <button class="btn-download" @click.stop="downloadFile(msg)">
                    Baixar
                  </button>
                </div>
                <!-- Mensagem de texto -->
                <template v-else>
                  <p class="message-text">{{ msg.texto }}</p>
                  <button
                    v-if="!msg.euEnviei && msg.textoOriginal !== msg.texto"
                    class="btn-original"
                    @click.stop="msg.showOriginal = !msg.showOriginal"
                  >
                    {{ msg.showOriginal ? 'Ver tradução' : 'Ver original' }}
                  </button>
                  <p v-if="msg.showOriginal" class="original-text">
                    Original: {{ msg.textoOriginal }}
                  </p>
                </template>
                <span class="message-time">
                  {{ formatTime(msg.enviadoEm) }}
                  <span v-if="msg.editado" class="edited-badge">(editado)</span>
                </span>
              </div>
            </div>

            <p v-if="messages.length === 0" class="no-messages">
              Nenhuma mensagem ainda.<br>
              Diga olá!
            </p>
          </div>

          <!-- Indicador de digitação -->
          <div v-if="isOtherTyping" class="typing-indicator">
            <span class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span class="typing-text">{{ selectedConnection?.nome }} está digitando...</span>
          </div>

          <!-- Input de mensagem -->
          <div class="message-input">
            <div class="input-row">
              <input
                v-model="newMessage"
                type="text"
                :placeholder="isListening ? 'Ouvindo...' : (isRecording ? 'Gravando...' : 'Escreva em ' + getIdiomaLabel(currentUser?.idioma) + '...')"
                @keyup.enter="sendMessage"
                @input="emitTyping"
                :disabled="isRecording"
              />
            </div>
            <div class="buttons-row">
              <label class="btn-attach" title="Enviar arquivo">
                +
                <input
                  type="file"
                  class="file-input-hidden"
                  @change="handleFileSelect"
                />
              </label>
              <button
                class="btn-mic"
                :class="{ recording: isRecording }"
                @click="toggleRecording"
                :title="isRecording ? 'Clique para enviar áudio' : 'Gravar áudio'"
              >
                {{ isRecording ? '⏹' : '🎤' }}
              </button>
              <button
                class="btn-speech"
                :class="{ listening: isListening }"
                @click="toggleSpeechToText"
                :title="isListening ? 'Clique para parar' : 'Falar para digitar'"
              >
                {{ isListening ? '⏹' : '🗣' }}
              </button>
              <button class="btn-send" @click="sendMessage" :disabled="!newMessage.trim() || isRecording">
                Enviar
              </button>
            </div>
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
const codeQuery = ref('')
const codeResult = ref(null)
const codeError = ref('')
const selectedConnection = ref(null)
const idiomaRecepcao = ref(null) // null = usar idioma do perfil (padrão)
const messages = ref([])
const newMessage = ref('')
const messagesContainer = ref(null)
const myStatus = ref('online')
const isOtherTyping = ref(false) // Indica se o outro usuário está digitando
let typingTimeout = null // Timer para resetar o indicador

// Configurações de notificação
const notificacaoGlobalMudo = ref(localStorage.getItem('poly_mute_all') === 'true')
const conexoesMudas = ref(JSON.parse(localStorage.getItem('poly_mute_connections') || '[]'))

// Gravação de áudio
const isRecording = ref(false)
let mediaRecorder = null
let audioChunks = []

// Speech-to-Text (voz para texto)
const isListening = ref(false)
let speechRecognition = null

// Computed
const isLoggedIn = computed(() => !!token.value && !!currentUser.value)
const isOwnProfile = computed(() => profileUser.value?.id === currentUser.value?.id)

// Status options
const statusOptions = [
  { value: 'online', label: 'Online' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'invisivel', label: 'Invisível' }
]

// Modal de perfil
const showProfileModal = ref(false)
const profileUser = ref(null)
const editingSocial = ref(false)
const socialTipoInput = ref('')
const socialUrlInput = ref('')
const codeCopied = ref(false)
const linkCopied = ref(false)

// Tipos de redes sociais disponíveis
const redesSociais = {
  linkedin: { nome: 'LinkedIn', icone: '💼', placeholder: 'https://linkedin.com/in/seu-perfil' },
  github: { nome: 'GitHub', icone: '🐙', placeholder: 'https://github.com/seu-usuario' },
  instagram: { nome: 'Instagram', icone: '📷', placeholder: 'https://instagram.com/seu-perfil' },
  youtube: { nome: 'YouTube', icone: '▶️', placeholder: 'https://youtube.com/@seu-canal' },
  twitter: { nome: 'X (Twitter)', icone: '🐦', placeholder: 'https://x.com/seu-usuario' },
  behance: { nome: 'Behance', icone: '🎨', placeholder: 'https://behance.net/seu-perfil' },
  dribbble: { nome: 'Dribbble', icone: '🏀', placeholder: 'https://dribbble.com/seu-perfil' },
  discord: { nome: 'Discord', icone: '💬', placeholder: 'https://discord.gg/seu-servidor' },
  tiktok: { nome: 'TikTok', icone: '🎵', placeholder: 'https://tiktok.com/@seu-perfil' },
  twitch: { nome: 'Twitch', icone: '🎮', placeholder: 'https://twitch.tv/seu-canal' },
  reddit: { nome: 'Reddit', icone: '🤖', placeholder: 'https://reddit.com/u/seu-usuario' },
  steam: { nome: 'Steam', icone: '🎯', placeholder: 'https://steamcommunity.com/id/seu-perfil' },
  website: { nome: 'Website', icone: '🌐', placeholder: 'https://seu-site.com' }
}

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

// Lista de idiomas para o dropdown (exclui o idioma do perfil)
const idiomasDisponiveis = computed(() => {
  return Object.entries(idiomas)
    .filter(([code]) => code !== currentUser.value?.idioma)
    .map(([code, label]) => ({ code, label }))
})

function getIdiomaLabel(code) {
  return idiomas[code] || code || ''
}

// Quando usuário muda o idioma de recepção no dropdown
async function onIdiomaRecepcaoChange() {
  await loadMessages()
}

// Retorna o país ou um padrão baseado no idioma
function getPaisLabel(pais, idioma) {
  if (pais) return pais

  // Países padrão por idioma
  const paisPadrao = {
    pt: 'Brasil',
    en: 'USA',
    es: 'España',
    fr: 'France',
    de: 'Alemanha',
    it: 'Itália',
    ja: 'Japão',
    ko: 'Coreia',
    zh: 'China',
    ru: 'Rússia',
    ar: 'Arábia'
  }

  return paisPadrao[idioma] || ''
}

// Gerar URL do Gravatar a partir do email
function getGravatarUrl(email, size = 100) {
  if (!email) return null
  // Criar hash MD5 do email (simplificado - usar biblioteca em produção)
  const hash = md5(email.toLowerCase().trim())
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`
}

// Função MD5 simplificada para Gravatar
function md5(string) {
  function rotateLeft(value, shift) {
    return (value << shift) | (value >>> (32 - shift))
  }
  function addUnsigned(x, y) {
    const x8 = x & 0x80000000
    const y8 = y & 0x80000000
    const x4 = x & 0x40000000
    const y4 = y & 0x40000000
    const result = (x & 0x3fffffff) + (y & 0x3fffffff)
    if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8
    if (x4 | y4) {
      if (result & 0x40000000) return result ^ 0xc0000000 ^ x8 ^ y8
      else return result ^ 0x40000000 ^ x8 ^ y8
    } else return result ^ x8 ^ y8
  }
  function f(x, y, z) { return (x & y) | (~x & z) }
  function g(x, y, z) { return (x & z) | (y & ~z) }
  function h(x, y, z) { return x ^ y ^ z }
  function i(x, y, z) { return y ^ (x | ~z) }
  function ff(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function gg(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function hh(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function ii(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function convertToWordArray(string) {
    let messageLength = string.length
    let numberOfWords = (((messageLength + 8) - ((messageLength + 8) % 64)) / 64 + 1) * 16
    let wordArray = Array(numberOfWords - 1)
    let bytePosition = 0
    let byteCount = 0
    while (byteCount < messageLength) {
      let wordCount = (byteCount - (byteCount % 4)) / 4
      bytePosition = (byteCount % 4) * 8
      wordArray[wordCount] = (wordArray[wordCount] | (string.charCodeAt(byteCount) << bytePosition))
      byteCount++
    }
    let wordCount = (byteCount - (byteCount % 4)) / 4
    bytePosition = (byteCount % 4) * 8
    wordArray[wordCount] = wordArray[wordCount] | (0x80 << bytePosition)
    wordArray[numberOfWords - 2] = messageLength << 3
    wordArray[numberOfWords - 1] = messageLength >>> 29
    return wordArray
  }
  function wordToHex(value) {
    let hex = '', temp
    for (let count = 0; count <= 3; count++) {
      temp = (value >>> (count * 8)) & 255
      hex = hex + ('0' + temp.toString(16)).slice(-2)
    }
    return hex
  }
  let x = convertToWordArray(string)
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476
  const S11=7, S12=12, S13=17, S14=22, S21=5, S22=9, S23=14, S24=20
  const S31=4, S32=11, S33=16, S34=23, S41=6, S42=10, S43=15, S44=21
  for (let k = 0; k < x.length; k += 16) {
    let AA = a, BB = b, CC = c, DD = d
    a = ff(a,b,c,d,x[k+0],S11,0xd76aa478); d = ff(d,a,b,c,x[k+1],S12,0xe8c7b756)
    c = ff(c,d,a,b,x[k+2],S13,0x242070db); b = ff(b,c,d,a,x[k+3],S14,0xc1bdceee)
    a = ff(a,b,c,d,x[k+4],S11,0xf57c0faf); d = ff(d,a,b,c,x[k+5],S12,0x4787c62a)
    c = ff(c,d,a,b,x[k+6],S13,0xa8304613); b = ff(b,c,d,a,x[k+7],S14,0xfd469501)
    a = ff(a,b,c,d,x[k+8],S11,0x698098d8); d = ff(d,a,b,c,x[k+9],S12,0x8b44f7af)
    c = ff(c,d,a,b,x[k+10],S13,0xffff5bb1); b = ff(b,c,d,a,x[k+11],S14,0x895cd7be)
    a = ff(a,b,c,d,x[k+12],S11,0x6b901122); d = ff(d,a,b,c,x[k+13],S12,0xfd987193)
    c = ff(c,d,a,b,x[k+14],S13,0xa679438e); b = ff(b,c,d,a,x[k+15],S14,0x49b40821)
    a = gg(a,b,c,d,x[k+1],S21,0xf61e2562); d = gg(d,a,b,c,x[k+6],S22,0xc040b340)
    c = gg(c,d,a,b,x[k+11],S23,0x265e5a51); b = gg(b,c,d,a,x[k+0],S24,0xe9b6c7aa)
    a = gg(a,b,c,d,x[k+5],S21,0xd62f105d); d = gg(d,a,b,c,x[k+10],S22,0x2441453)
    c = gg(c,d,a,b,x[k+15],S23,0xd8a1e681); b = gg(b,c,d,a,x[k+4],S24,0xe7d3fbc8)
    a = gg(a,b,c,d,x[k+9],S21,0x21e1cde6); d = gg(d,a,b,c,x[k+14],S22,0xc33707d6)
    c = gg(c,d,a,b,x[k+3],S23,0xf4d50d87); b = gg(b,c,d,a,x[k+8],S24,0x455a14ed)
    a = gg(a,b,c,d,x[k+13],S21,0xa9e3e905); d = gg(d,a,b,c,x[k+2],S22,0xfcefa3f8)
    c = gg(c,d,a,b,x[k+7],S23,0x676f02d9); b = gg(b,c,d,a,x[k+12],S24,0x8d2a4c8a)
    a = hh(a,b,c,d,x[k+5],S31,0xfffa3942); d = hh(d,a,b,c,x[k+8],S32,0x8771f681)
    c = hh(c,d,a,b,x[k+11],S33,0x6d9d6122); b = hh(b,c,d,a,x[k+14],S34,0xfde5380c)
    a = hh(a,b,c,d,x[k+1],S31,0xa4beea44); d = hh(d,a,b,c,x[k+4],S32,0x4bdecfa9)
    c = hh(c,d,a,b,x[k+7],S33,0xf6bb4b60); b = hh(b,c,d,a,x[k+10],S34,0xbebfbc70)
    a = hh(a,b,c,d,x[k+13],S31,0x289b7ec6); d = hh(d,a,b,c,x[k+0],S32,0xeaa127fa)
    c = hh(c,d,a,b,x[k+3],S33,0xd4ef3085); b = hh(b,c,d,a,x[k+6],S34,0x4881d05)
    a = hh(a,b,c,d,x[k+9],S31,0xd9d4d039); d = hh(d,a,b,c,x[k+12],S32,0xe6db99e5)
    c = hh(c,d,a,b,x[k+15],S33,0x1fa27cf8); b = hh(b,c,d,a,x[k+2],S34,0xc4ac5665)
    a = ii(a,b,c,d,x[k+0],S41,0xf4292244); d = ii(d,a,b,c,x[k+7],S42,0x432aff97)
    c = ii(c,d,a,b,x[k+14],S43,0xab9423a7); b = ii(b,c,d,a,x[k+5],S44,0xfc93a039)
    a = ii(a,b,c,d,x[k+12],S41,0x655b59c3); d = ii(d,a,b,c,x[k+3],S42,0x8f0ccc92)
    c = ii(c,d,a,b,x[k+10],S43,0xffeff47d); b = ii(b,c,d,a,x[k+1],S44,0x85845dd1)
    a = ii(a,b,c,d,x[k+8],S41,0x6fa87e4f); d = ii(d,a,b,c,x[k+15],S42,0xfe2ce6e0)
    c = ii(c,d,a,b,x[k+6],S43,0xa3014314); b = ii(b,c,d,a,x[k+13],S44,0x4e0811a1)
    a = ii(a,b,c,d,x[k+4],S41,0xf7537e82); d = ii(d,a,b,c,x[k+11],S42,0xbd3af235)
    c = ii(c,d,a,b,x[k+2],S43,0x2ad7d2bb); b = ii(b,c,d,a,x[k+9],S44,0xeb86d391)
    a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD)
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase()
}

// Abrir modal de perfil
async function openProfile(user) {
  if (user.id === currentUser.value.id) {
    profileUser.value = { ...currentUser.value }
  } else {
    // Buscar dados completos do usuário
    try {
      const res = await fetch(`${API_URL}/users/${user.id}`, {
        headers: authHeaders()
      })
      profileUser.value = await res.json()
    } catch (e) {
      profileUser.value = user
    }
  }
  socialTipoInput.value = profileUser.value.social_tipo || ''
  socialUrlInput.value = profileUser.value.social_url || ''
  editingSocial.value = false
  showProfileModal.value = true
}

// Salvar rede social
async function saveSocial() {
  if (!socialTipoInput.value || !socialUrlInput.value.trim()) {
    alert('Selecione uma rede e informe a URL')
    return
  }

  try {
    const res = await fetch(`${API_URL}/profile/social`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        tipo: socialTipoInput.value,
        url: socialUrlInput.value.trim()
      })
    })
    if (res.ok) {
      const updated = await res.json()
      currentUser.value.social_tipo = updated.social_tipo
      currentUser.value.social_url = updated.social_url
      profileUser.value.social_tipo = updated.social_tipo
      profileUser.value.social_url = updated.social_url
      editingSocial.value = false
    }
  } catch (e) {
    console.error('Erro ao salvar rede social:', e)
  }
}

// Remover rede social
async function removeSocial() {
  if (!confirm('Remover rede social do perfil?')) return

  try {
    const res = await fetch(`${API_URL}/profile/social`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (res.ok) {
      currentUser.value.social_tipo = null
      currentUser.value.social_url = null
      profileUser.value.social_tipo = null
      profileUser.value.social_url = null
      socialTipoInput.value = ''
      socialUrlInput.value = ''
      editingSocial.value = false
    }
  } catch (e) {
    console.error('Erro ao remover rede social:', e)
  }
}

// Helper para obter info da rede social
function getSocialInfo(tipo) {
  return redesSociais[tipo] || { nome: tipo, icone: '🔗', placeholder: '' }
}

// Copiar código de amigo
function copyFriendCode() {
  if (!currentUser.value?.codigo_amigo) return
  navigator.clipboard.writeText(currentUser.value.codigo_amigo)
  codeCopied.value = true
  setTimeout(() => codeCopied.value = false, 2000)
}

// Copiar link de convite
function copyInviteLink() {
  if (!currentUser.value?.codigo_amigo) return
  const link = `${window.location.origin}?invite=${currentUser.value.codigo_amigo}`
  navigator.clipboard.writeText(link)
  linkCopied.value = true
  setTimeout(() => linkCopied.value = false, 2000)
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

async function deleteAccount() {
  const confirmed = confirm(
    'Tem certeza que deseja excluir sua conta?\n\n' +
    'Esta ação é IRREVERSÍVEL.\n' +
    'Todas as suas conexões e mensagens serão perdidas.'
  )

  if (!confirmed) return

  try {
    const res = await fetch(`${API_BASE}/api/auth/account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    })

    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'Erro ao excluir conta')
      return
    }

    alert('Conta excluída com sucesso!')
    showProfileModal.value = false
    logout()
  } catch (error) {
    alert('Erro ao excluir conta. Tente novamente.')
  }
}

// ==================== INICIALIZAÇÃO ====================

async function initializeApp() {
  // Inicializar IndexedDB para arquivos pendentes
  try {
    await initIndexedDB()
  } catch (e) {
    console.error('Erro ao inicializar IndexedDB:', e)
  }

  // Conectar socket
  socket = io(API_BASE)
  socket.emit('autenticar', token.value)

  // Listeners do socket
  socket.on('nova-mensagem', handleNewMessage)
  socket.on('conexao-atualizada', loadConnections)
  socket.on('usuario-online', handleUserOnline)
  socket.on('usuario-offline', handleUserOffline)
  socket.on('status-atualizado', handleStatusUpdate)
  socket.on('arquivo-recebido', handleFileReceived)
  socket.on('audio-recebido', handleAudioReceived)
  socket.on('usuario-digitando', handleUserTyping)
  socket.on('usuario-parou-digitar', handleUserStoppedTyping)
  socket.on('mensagem-editada', handleMessageEdited)

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

async function searchByCode() {
  codeResult.value = null
  codeError.value = ''

  if (!codeQuery.value.trim()) {
    codeError.value = 'Digite um código'
    return
  }

  try {
    const res = await fetch(`${API_URL}/users/code/${codeQuery.value.trim()}`, {
      headers: authHeaders()
    })

    if (res.ok) {
      codeResult.value = await res.json()
    } else {
      const data = await res.json()
      codeError.value = data.error || 'Código não encontrado'
    }
  } catch (error) {
    console.error('Erro ao buscar por código:', error)
    codeError.value = 'Erro ao buscar'
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
  idiomaRecepcao.value = null // Reset para idioma padrão ao mudar de conversa
  isOtherTyping.value = false // Reset indicador de digitação
  sidebarOpen.value = false
  await loadMessages()

  // Carregar arquivos pendentes do IndexedDB
  try {
    const pendentes = await getFilesFromDB(conn.connectionId)
    if (pendentes && pendentes.length > 0) {
      messages.value.push(...pendentes)
      await deleteFilesFromDB(conn.connectionId)
      scrollToBottom()
    }
  } catch (e) {
    console.error('Erro ao carregar arquivos pendentes:', e)
  }
}

async function loadMessages() {
  if (!selectedConnection.value) return

  try {
    // Monta URL com idioma de recepção se diferente do padrão
    let url = `${API_URL}/chat/${selectedConnection.value.connectionId}`
    if (idiomaRecepcao.value) {
      url += `?idiomaDestino=${idiomaRecepcao.value}`
    }

    const res = await fetch(url, {
      headers: authHeaders()
    })
    const data = await res.json()
    messages.value = data.map(m => ({
      id: m.id,
      euEnviei: m.euEnviei,
      texto: m.texto,
      textoOriginal: m.textoOriginal,
      idiomaOriginal: m.idiomaOriginal,
      enviadoEm: m.enviadoEm,
      editado: m.editado || false,
      showOriginal: false
    }))
    scrollToBottom()
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error)
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || !selectedConnection.value) return

  // Parar indicador de digitação
  emitStoppedTyping()

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

async function handleNewMessage(msg) {
  // Evitar duplicatas
  if (messages.value.some(m => m.id === msg.id)) return

  const euEnviei = msg.senderId === currentUser.value.id

  // Verificar se a mensagem é de uma das MINHAS conexões
  const minhaConexao = connections.value.find(c => c.connectionId === msg.connectionId)

  // Tocar som apenas se: não fui eu que enviei E é uma conexão minha E não está mudo
  if (!euEnviei && minhaConexao) {
    const estaMudo = notificacaoGlobalMudo.value || isConnectionMuted(msg.connectionId)
    if (!estaMudo) {
      playBubblePop()
    }
  }

  // Se não está na conversa selecionada, não adiciona na lista visível
  if (!selectedConnection.value) return
  if (msg.connectionId !== selectedConnection.value.connectionId) return

  // Determinar texto a exibir
  let textoExibir = euEnviei ? msg.texto : msg.textoTraduzido

  // Se usuário escolheu outro idioma no dropdown, traduzir a nova mensagem
  if (!euEnviei && idiomaRecepcao.value && msg.idiomaOriginal) {
    try {
      const res = await fetch(`${API_URL}/translate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          texto: msg.texto,
          idiomaOrigem: msg.idiomaOriginal,
          idiomaDestino: idiomaRecepcao.value
        })
      })
      const data = await res.json()
      if (data.traduzido) {
        textoExibir = data.traduzido
      }
    } catch (e) {
      console.error('Erro ao traduzir mensagem:', e)
    }
  }

  messages.value.push({
    id: msg.id,
    euEnviei,
    texto: textoExibir,
    textoOriginal: msg.texto,
    idiomaOriginal: msg.idiomaOriginal,
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

// ==================== EXCLUIR MENSAGENS ====================

function toggleMessageMenu(msg) {
  // Fechar menu de outras mensagens
  messages.value.forEach(m => {
    if (m.id !== msg.id) m.showMenu = false
  })
  // Toggle menu desta mensagem
  msg.showMenu = !msg.showMenu
}

async function deleteMessage(msg) {
  if (!confirm('Excluir esta mensagem?')) return

  // Se for mensagem local (áudio/arquivo P2P), apenas remover do array
  if (String(msg.id).startsWith('audio-') || String(msg.id).startsWith('file-')) {
    messages.value = messages.value.filter(m => m.id !== msg.id)
    return
  }

  try {
    const res = await fetch(`${API_URL}/chat/message/${msg.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })

    if (res.ok) {
      messages.value = messages.value.filter(m => m.id !== msg.id)
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao excluir mensagem')
    }
  } catch (error) {
    console.error('Erro ao excluir mensagem:', error)
    alert('Erro ao excluir mensagem')
  }
}

// Iniciar edição de mensagem
function startEditMessage(msg) {
  // Fechar menus e cancelar outras edições
  messages.value.forEach(m => {
    m.showMenu = false
    m.isEditing = false
  })
  msg.isEditing = true
  msg.editText = msg.textoOriginal || msg.texto
}

// Cancelar edição
function cancelEditMessage(msg) {
  msg.isEditing = false
  msg.editText = ''
}

// Salvar edição
async function saveEditMessage(msg) {
  if (!msg.editText?.trim()) return

  // Se for mensagem local, não pode editar no servidor
  if (String(msg.id).startsWith('audio-') || String(msg.id).startsWith('file-')) {
    msg.texto = msg.editText
    msg.isEditing = false
    return
  }

  try {
    const res = await fetch(`${API_URL}/chat/message/${msg.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ texto: msg.editText })
    })

    if (res.ok) {
      const data = await res.json()
      msg.texto = data.texto
      msg.textoOriginal = data.texto
      msg.editado = true
      msg.isEditing = false
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao editar mensagem')
    }
  } catch (error) {
    console.error('Erro ao editar mensagem:', error)
    alert('Erro ao editar mensagem')
  }
}

// Handler para mensagem editada pelo outro usuário
function handleMessageEdited(data) {
  if (selectedConnection.value?.connectionId !== data.connectionId) return

  const msg = messages.value.find(m => m.id === data.messageId)
  if (msg) {
    msg.texto = data.texto
    msg.textoOriginal = data.textoOriginal
    msg.editado = true
  }
}

async function clearConversation() {
  if (!selectedConnection.value) return

  if (!confirm('Limpar toda a conversa?\n\nIsso irá excluir todas as mensagens permanentemente.')) return

  try {
    const res = await fetch(`${API_URL}/chat/${selectedConnection.value.connectionId}/messages`, {
      method: 'DELETE',
      headers: authHeaders()
    })

    if (res.ok) {
      messages.value = []
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao limpar conversa')
    }
  } catch (error) {
    console.error('Erro ao limpar conversa:', error)
    alert('Erro ao limpar conversa')
  }
}

// ==================== ENVIO DE ARQUIVOS ====================

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  // Limpar input para permitir selecionar o mesmo arquivo novamente
  event.target.value = ''

  if (file.size > MAX_FILE_SIZE) {
    alert('Arquivo muito grande! Máximo: 10MB')
    return
  }

  if (!selectedConnection.value) {
    alert('Selecione uma conversa primeiro')
    return
  }

  // Converter para base64 e enviar
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result
    socket.emit('enviar-arquivo', {
      connectionId: selectedConnection.value.connectionId,
      recipientId: selectedConnection.value.id,
      fileName: file.name,
      fileType: file.type,
      fileData: base64
    })

    // Adicionar na lista local
    messages.value.push({
      id: `file-${Date.now()}`,
      euEnviei: true,
      isFile: true,
      fileName: file.name,
      fileType: file.type,
      fileData: base64,
      enviadoEm: new Date().toISOString()
    })
    scrollToBottom()
  }
  reader.readAsDataURL(file)
}

async function handleFileReceived(data) {
  // Verificar se é uma das minhas conexões
  const minhaConexao = connections.value.find(c => c.connectionId === data.connectionId)
  if (!minhaConexao) return

  // Tocar som se não estiver mudo
  const estaMudo = notificacaoGlobalMudo.value || isConnectionMuted(data.connectionId)
  if (!estaMudo) {
    playBubblePop()
  }

  const fileMsg = {
    id: `file-${Date.now()}`,
    euEnviei: false,
    isFile: true,
    fileName: data.fileName,
    fileType: data.fileType,
    fileData: data.fileData,
    enviadoEm: new Date().toISOString()
  }

  // Se está na conversa, adicionar na lista
  if (selectedConnection.value?.connectionId === data.connectionId) {
    messages.value.push(fileMsg)
    scrollToBottom()
  } else {
    // Salvar no IndexedDB (persiste mesmo com F5)
    try {
      await saveFileToDB(data.connectionId, fileMsg)
    } catch (e) {
      console.error('Erro ao salvar arquivo:', e)
    }

    // Mostrar alerta de arquivo recebido
    alert(`Arquivo recebido de ${minhaConexao.nome}: ${data.fileName}`)
  }
}

function downloadFile(msg) {
  const a = document.createElement('a')
  a.href = msg.fileData
  a.download = msg.fileName
  a.click()
}

// ==================== GRAVAÇÃO DE ÁUDIO ====================

let currentStream = null

function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

async function startRecording() {
  if (!selectedConnection.value) {
    alert('Selecione uma conversa primeiro')
    return
  }

  // Verificar se o navegador suporta gravação
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Seu navegador não suporta gravação de áudio. Tente usar Chrome ou Firefox.')
    return
  }

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // Tentar diferentes formatos de áudio (compatibilidade mobile)
    let mimeType = 'audio/webm'
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg'
      } else {
        mimeType = '' // Usar padrão do navegador
      }
    }

    const options = mimeType ? { mimeType } : {}
    mediaRecorder = new MediaRecorder(currentStream, options)
    audioChunks = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: mimeType || 'audio/webm' })
      const reader = new FileReader()

      reader.onload = () => {
        const base64 = reader.result
        sendAudio(base64)
      }
      reader.readAsDataURL(audioBlob)

      // Parar todas as tracks do stream
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop())
        currentStream = null
      }
    }

    mediaRecorder.start()
    isRecording.value = true
  } catch (error) {
    console.error('Erro ao acessar microfone:', error)

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      alert('Permissão negada. Vá nas configurações do navegador e permita o acesso ao microfone para este site.')
    } else if (error.name === 'NotFoundError') {
      alert('Nenhum microfone encontrado no dispositivo.')
    } else {
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.')
    }
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    isRecording.value = false
  }
}

// ==================== SPEECH-TO-TEXT ====================

// Contador de tentativas para retry em caso de erro de rede
let speechRetryCount = 0
const MAX_SPEECH_RETRIES = 3

function toggleSpeechToText() {
  if (isListening.value) {
    stopSpeechToText()
  } else {
    speechRetryCount = 0 // Reset apenas quando usuário clica manualmente
    startSpeechToText()
  }
}

function startSpeechToText() {
  // Verificar suporte do navegador
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  if (!SpeechRecognition) {
    alert('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.')
    return
  }

  speechRecognition = new SpeechRecognition()

  // Configurações
  const langMap = {
    pt: 'pt-BR', en: 'en-US', es: 'es-ES', fr: 'fr-FR',
    de: 'de-DE', it: 'it-IT', ja: 'ja-JP', ko: 'ko-KR',
    zh: 'zh-CN', ru: 'ru-RU', ar: 'ar-SA'
  }
  speechRecognition.lang = langMap[currentUser.value?.idioma] || 'pt-BR'
  speechRecognition.continuous = false
  speechRecognition.interimResults = false
  speechRecognition.maxAlternatives = 1

  speechRecognition.onstart = () => {
    console.log('Reconhecimento de voz iniciado')
    isListening.value = true
    // NÃO resetar speechRetryCount aqui - causa loop infinito
  }

  speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    console.log('Transcrição:', transcript)
    if (newMessage.value && !newMessage.value.endsWith(' ')) {
      newMessage.value += ' '
    }
    newMessage.value += transcript
    speechRetryCount = 0
  }

  speechRecognition.onerror = (event) => {
    console.error('Erro no reconhecimento de voz:', event.error)

    if (event.error === 'network') {
      // Tentar novamente automaticamente com delay progressivo
      if (speechRetryCount < MAX_SPEECH_RETRIES) {
        speechRetryCount++
        const delay = speechRetryCount * 1000 // 1s, 2s, 3s
        console.log(`Tentativa ${speechRetryCount} de ${MAX_SPEECH_RETRIES} em ${delay}ms...`)
        isListening.value = false
        setTimeout(() => {
          startSpeechToText()
        }, delay)
        return
      } else {
        // Desktop Chrome usa servidores do Google - pode haver bloqueio
        const isDesktop = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        if (isDesktop) {
          alert('Não foi possível conectar ao serviço de voz.\n\nTente:\n1. Desativar extensões de bloqueio (AdBlock, etc)\n2. Verificar se o microfone está permitido (clique no cadeado)\n3. Usar Chrome ou Edge atualizado\n4. Tentar em aba anônima')
        } else {
          alert('Erro ao conectar com o serviço de voz. Tente novamente.')
        }
        speechRetryCount = 0
      }
    } else if (event.error === 'not-allowed') {
      alert('Permissão de microfone negada. Clique no cadeado na barra de endereços e permita o microfone.')
    } else if (event.error === 'no-speech') {
      // Silencioso - usuário não falou nada
      console.log('Nenhuma fala detectada')
    } else if (event.error === 'aborted') {
      console.log('Reconhecimento cancelado')
    } else {
      console.log('Erro:', event.error)
    }
    isListening.value = false
  }

  speechRecognition.onend = () => {
    console.log('Reconhecimento de voz finalizado')
    isListening.value = false
  }

  try {
    speechRecognition.start()
  } catch (e) {
    console.error('Erro ao iniciar reconhecimento:', e)
    if (e.message?.includes('already started')) {
      // Já está rodando, ignorar
      return
    }
    alert('Erro ao iniciar reconhecimento de voz. Tente novamente.')
    isListening.value = false
  }
}

function stopSpeechToText() {
  if (speechRecognition) {
    speechRecognition.stop()
    speechRecognition = null
  }
  isListening.value = false
}

function sendAudio(audioData) {
  if (!selectedConnection.value) return

  socket.emit('enviar-audio', {
    connectionId: selectedConnection.value.connectionId,
    recipientId: selectedConnection.value.id,
    audioData
  })

  // Adicionar na lista local
  messages.value.push({
    id: `audio-${Date.now()}`,
    euEnviei: true,
    isAudio: true,
    audioData,
    enviadoEm: new Date().toISOString()
  })
  scrollToBottom()
}

function handleAudioReceived(data) {
  // Verificar se é uma das minhas conexões
  const minhaConexao = connections.value.find(c => c.connectionId === data.connectionId)
  if (!minhaConexao) return

  // Tocar som se não estiver mudo
  const estaMudo = notificacaoGlobalMudo.value || isConnectionMuted(data.connectionId)
  if (!estaMudo) {
    playBubblePop()
  }

  const audioMsg = {
    id: `audio-${Date.now()}`,
    euEnviei: false,
    isAudio: true,
    audioData: data.audioData,
    enviadoEm: new Date().toISOString()
  }

  // Se está na conversa, adicionar na lista
  if (selectedConnection.value?.connectionId === data.connectionId) {
    messages.value.push(audioMsg)
    scrollToBottom()
  } else {
    // Salvar no IndexedDB
    try {
      saveFileToDB(data.connectionId, audioMsg)
    } catch (e) {
      console.error('Erro ao salvar áudio:', e)
    }
    alert(`Áudio recebido de ${minhaConexao.nome}`)
  }
}

// ==================== INDICADOR DE DIGITAÇÃO ====================

function handleUserTyping(data) {
  // Só mostrar se for da conversa atual
  if (selectedConnection.value?.connectionId === data.connectionId) {
    isOtherTyping.value = true

    // Resetar após 3 segundos se não receber mais eventos
    clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => {
      isOtherTyping.value = false
    }, 3000)
  }
}

function handleUserStoppedTyping(data) {
  if (selectedConnection.value?.connectionId === data.connectionId) {
    isOtherTyping.value = false
    clearTimeout(typingTimeout)
  }
}

// Emitir evento de digitação (com debounce)
let lastTypingEmit = 0
function emitTyping() {
  if (!selectedConnection.value || !socket) return

  const now = Date.now()
  // Emitir no máximo a cada 1 segundo
  if (now - lastTypingEmit > 1000) {
    lastTypingEmit = now
    socket.emit('digitando', {
      recipientId: selectedConnection.value.id,
      connectionId: selectedConnection.value.connectionId
    })
  }
}

// Emitir quando parar de digitar
function emitStoppedTyping() {
  if (!selectedConnection.value || !socket) return

  socket.emit('parou-digitar', {
    recipientId: selectedConnection.value.id,
    connectionId: selectedConnection.value.connectionId
  })
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

// ==================== INDEXEDDB (ARMAZENAMENTO LOCAL) ====================

let db = null

async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PolyIO_Files', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result
      if (!database.objectStoreNames.contains('pendingFiles')) {
        database.createObjectStore('pendingFiles', { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

async function saveFileToDB(connectionId, fileData) {
  if (!db) await initIndexedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingFiles'], 'readwrite')
    const store = transaction.objectStore('pendingFiles')
    const request = store.add({
      connectionId,
      ...fileData,
      savedAt: Date.now()
    })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getFilesFromDB(connectionId) {
  if (!db) await initIndexedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingFiles'], 'readonly')
    const store = transaction.objectStore('pendingFiles')
    const request = store.getAll()

    request.onsuccess = () => {
      const files = request.result.filter(f => f.connectionId === connectionId)
      resolve(files)
    }
    request.onerror = () => reject(request.error)
  })
}

async function deleteFilesFromDB(connectionId) {
  if (!db) await initIndexedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingFiles'], 'readwrite')
    const store = transaction.objectStore('pendingFiles')
    const request = store.getAll()

    request.onsuccess = () => {
      const files = request.result.filter(f => f.connectionId === connectionId)
      files.forEach(file => store.delete(file.id))
      resolve()
    }
    request.onerror = () => reject(request.error)
  })
}

// ==================== CONTROLE DE NOTIFICAÇÕES ====================

function toggleMuteAll() {
  notificacaoGlobalMudo.value = !notificacaoGlobalMudo.value
  localStorage.setItem('poly_mute_all', notificacaoGlobalMudo.value)
}

function toggleMuteConnection(connectionId) {
  const index = conexoesMudas.value.indexOf(connectionId)
  if (index === -1) {
    conexoesMudas.value.push(connectionId)
  } else {
    conexoesMudas.value.splice(index, 1)
  }
  localStorage.setItem('poly_mute_connections', JSON.stringify(conexoesMudas.value))
}

function isConnectionMuted(connectionId) {
  return conexoesMudas.value.includes(connectionId)
}

// ==================== SOM DE NOTIFICAÇÃO ====================

// Contexto de áudio (criado uma vez)
let audioContext = null

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioContext
}

// Som de bolha (pop) - suave mas audível
function playBubblePop() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Oscilador - frequência que cai rapidamente (efeito "pop")
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15)

    // Envelope de volume
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0.5, now)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2)

    // Conectar
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Tocar
    osc.start(now)
    osc.stop(now + 0.2)
  } catch (e) {
    console.log('Áudio não suportado')
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

  // Verificar se há código de convite na URL
  const urlParams = new URLSearchParams(window.location.search)
  const inviteCode = urlParams.get('invite')
  if (inviteCode) {
    // Salvar para usar após login
    localStorage.setItem('poly_invite_code', inviteCode)
    // Limpar URL
    window.history.replaceState({}, document.title, window.location.pathname)
  }
})

// Processar código de convite após login
watch(isLoggedIn, async (loggedIn) => {
  if (loggedIn) {
    const inviteCode = localStorage.getItem('poly_invite_code')
    if (inviteCode) {
      localStorage.removeItem('poly_invite_code')
      // Aguardar um pouco e ir para busca
      setTimeout(() => {
        currentTab.value = 'search'
        codeQuery.value = inviteCode.toUpperCase()
        searchByCode()
      }, 500)
    }
  }
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

.sidebar-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.btn-close-sidebar {
  display: none;
  width: 32px;
  height: 32px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #888;
  font-size: 1rem;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

.btn-close-sidebar:hover {
  border-color: #f43f5e;
  color: #f43f5e;
}

.logo-small {
  font-size: 1.5rem;
  font-weight: 700;
}

.current-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  margin: -10px;
  margin-top: 0;
  border-radius: 8px;
  transition: background 0.2s;
}

.current-user:hover {
  background: #1a1a1a;
}

.current-user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.gravatar-small {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-letter-small {
  position: relative;
  z-index: 1;
}

.current-user-avatar .gravatar-small + .avatar-letter-small {
  display: none;
}

.current-user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.current-user .user-name {
  font-weight: 600;
}

.current-user .user-lang {
  font-size: 0.75rem;
  color: #6366f1;
}

.btn-edit-profile {
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: 0.5;
  transition: all 0.2s;
}

.btn-edit-profile:hover {
  background: #333;
  opacity: 1;
}

/* Status Row */
.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.status-selector {
  display: flex;
  gap: 8px;
}

/* Botão silenciar tudo */
.btn-mute-all {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #333;
  background: #1a1a1a;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-mute-all:hover {
  border-color: #555;
}

.btn-mute-all.muted {
  background: #333;
  border-color: #f59e0b;
}

/* Botão silenciar conexão */
.btn-mute-connection {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
  opacity: 0.5;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-mute-connection:hover {
  opacity: 1;
  background: #222;
}

.btn-mute-connection.muted {
  opacity: 1;
  background: #333;
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

.search-box.code-search {
  display: flex;
  gap: 8px;
}

.search-box.code-search input {
  flex: 1;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 600;
}

.btn-search-code {
  padding: 10px 16px;
  background: #6366f1;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-search-code:hover {
  background: #5558e3;
}

.search-divider {
  text-align: center;
  color: #666;
  font-size: 0.75rem;
  margin: 16px 0;
  position: relative;
}

.search-divider::before,
.search-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background: #333;
}

.search-divider::before {
  left: 0;
}

.search-divider::after {
  right: 0;
}

.code-result {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid #6366f1;
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

.idioma-select {
  padding: 6px 10px;
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 20px;
  font-size: 0.75rem;
  color: #6366f1;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.idioma-select:hover,
.idioma-select:focus {
  border-color: #6366f1;
}

.idioma-select option {
  background: #1a1a2e;
  color: #fff;
}

.translation-arrow {
  color: #666;
  font-size: 0.9rem;
  margin: 0 4px;
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

.btn-icon.btn-clear:hover {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* Botão excluir mensagem */
.btn-delete-msg {
  display: block;
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: #ef4444;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-delete-msg:hover {
  background: #dc2626;
}

/* Menu de ações da mensagem */
.message-actions {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.btn-edit-msg {
  padding: 6px 10px;
  background: #333;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-edit-msg:hover {
  background: #444;
}

/* Modo edição */
.edit-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.edit-input {
  width: 100%;
  padding: 10px 12px;
  background: #1a1a1a;
  border: 1px solid #6366f1;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
}

.edit-buttons {
  display: flex;
  gap: 6px;
}

.btn-save-edit {
  padding: 6px 12px;
  background: #6366f1;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-save-edit:hover {
  background: #5558e3;
}

.btn-cancel-edit {
  padding: 6px 12px;
  background: #333;
  border: none;
  border-radius: 6px;
  color: #888;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-cancel-edit:hover {
  background: #444;
  color: #fff;
}

/* Badge editado */
.edited-badge {
  color: #666;
  font-size: 0.65rem;
  font-style: italic;
  margin-left: 4px;
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
  max-width: 100%;
  overflow: hidden;
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
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
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
/* Indicador de digitação */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  color: #888;
  font-size: 0.85rem;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: #6366f1;
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite ease-in-out both;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.typing-text {
  font-style: italic;
}

.message-input {
  padding: 16px 24px;
  border-top: 1px solid #222;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-row {
  display: flex;
  width: 100%;
}

.input-row input {
  flex: 1;
  padding: 14px 20px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 24px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
}

.input-row input:focus {
  border-color: #6366f1;
}

.buttons-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.buttons-row .btn-send {
  margin-left: auto;
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

/* Botão anexar arquivo */
.btn-attach {
  position: relative;
  width: 48px;
  height: 48px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 50%;
  color: #888;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-attach:hover {
  border-color: #6366f1;
  color: #6366f1;
}

.file-input-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

/* Mensagem de arquivo */
.file-message {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-icon {
  font-size: 1.2rem;
}

.file-name {
  font-size: 0.9rem;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-download {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-download:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Botão microfone */
.btn-mic {
  width: 48px;
  height: 48px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 50%;
  color: #888;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-mic:hover {
  border-color: #6366f1;
  color: #6366f1;
}

.btn-mic.recording {
  background: #ef4444;
  border-color: #ef4444;
  color: #fff;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Botão Speech-to-Text */
.btn-speech {
  width: 48px;
  height: 48px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 50%;
  color: #888;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-speech:hover {
  border-color: #10b981;
  color: #10b981;
}

.btn-speech.listening {
  background: #10b981;
  border-color: #10b981;
  color: #fff;
  animation: pulse 1s infinite;
}

/* Mensagem de áudio */
.audio-message {
  display: flex;
  align-items: center;
  gap: 10px;
}

.audio-icon {
  font-size: 1.2rem;
}

.audio-player {
  height: 36px;
  max-width: 200px;
  border-radius: 18px;
}

.audio-player::-webkit-media-controls-panel {
  background: rgba(255, 255, 255, 0.1);
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

/* Gravatar no avatar */
.user-avatar {
  position: relative;
  overflow: hidden;
}

.gravatar-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-letter {
  position: relative;
  z-index: 1;
}

.user-avatar .gravatar-img + .avatar-letter {
  display: none;
}

/* Modal de Perfil */
.profile-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.profile-modal {
  background: #111;
  border: 1px solid #333;
  border-radius: 16px;
  padding: 30px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}

.profile-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: #888;
  font-size: 1.2rem;
  cursor: pointer;
}

.profile-close:hover {
  color: #fff;
}

.profile-avatar-large {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: 600;
  position: relative;
  overflow: hidden;
}

.profile-avatar-large img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-letter {
  position: relative;
  z-index: 1;
}

.profile-avatar-large img + .profile-letter {
  display: none;
}

.profile-name {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.profile-info {
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

/* Código de Amigo */
.friend-code-section {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.friend-code-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #666;
  margin-bottom: 8px;
}

.friend-code-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 12px;
}

.friend-code {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 4px;
  color: #6366f1;
  font-family: monospace;
}

.btn-copy {
  width: 36px;
  height: 36px;
  background: #2a2a3e;
  border: 1px solid #333;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-copy:hover {
  background: #3a3a4e;
}

.btn-share-link {
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid #6366f1;
  border-radius: 8px;
  color: #6366f1;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-share-link:hover {
  background: rgba(99, 102, 241, 0.1);
}

.profile-social {
  margin-bottom: 20px;
}

.social-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.social-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.social-icon {
  font-size: 1.1rem;
}

.social-empty {
  color: #666;
  font-size: 0.85rem;
}

.social-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.btn-edit-social {
  padding: 8px 16px;
  background: #333;
  border: none;
  border-radius: 6px;
  color: #888;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-edit-social:hover {
  background: #444;
  color: #fff;
}

.social-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.social-select {
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
}

.social-select:focus {
  border-color: #6366f1;
  outline: none;
}

.social-input {
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
}

.social-input:focus {
  border-color: #6366f1;
  outline: none;
}

.social-buttons {
  display: flex;
  gap: 8px;
}

.social-buttons .btn-save {
  flex: 1;
  padding: 10px;
  background: #6366f1;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}

.social-buttons .btn-cancel {
  flex: 1;
  padding: 10px;
  background: #333;
  border: none;
  border-radius: 8px;
  color: #888;
  cursor: pointer;
}

.social-buttons .btn-remove {
  padding: 10px;
  background: #dc2626;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}

.social-buttons .btn-remove:hover {
  background: #b91c1c;
}

.profile-tip {
  font-size: 0.7rem;
  color: #555;
  margin-top: 20px;
}

.btn-delete-account {
  margin-top: 25px;
  padding: 10px 20px;
  background: transparent;
  border: 1px solid #c53030;
  color: #c53030;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-delete-account:hover {
  background: #c53030;
  color: white;
}

/* Responsive */
@media (max-width: 768px) {
  .mobile-menu-btn {
    display: flex;
  }

  .sidebar-overlay {
    display: block;
  }

  .btn-close-sidebar {
    display: flex;
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
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .no-chat {
    padding-top: 80px;
  }

  .logo-big {
    font-size: 2.5rem;
  }

  /* Header fixo no topo */
  .chat-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    background: #111;
    padding-left: 70px;
  }

  /* Aviso de expiração fixo abaixo do header */
  .expiration-notice {
    position: fixed;
    top: 73px;
    left: 0;
    right: 0;
    z-index: 49;
    text-align: center;
    padding: 6px 12px;
    font-size: 0.65rem;
  }

  /* Esconder botão no mobile (já tem o ícone no header) */
  .expiration-notice button {
    display: none;
  }

  /* Área de mensagens com scroll */
  .messages {
    flex: 1;
    margin-top: 105px;
    margin-bottom: 130px;
    padding: 16px;
    padding-bottom: 20px;
    overflow-x: hidden;
  }

  /* Input fixo no rodapé */
  .message-input {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    background: #0a0a0a;
    padding: 10px 12px;
    border-top: 1px solid #222;
    gap: 8px;
  }

  .input-row input {
    padding: 12px 16px;
    font-size: 0.85rem;
  }

  .buttons-row {
    gap: 8px;
  }

  .btn-attach,
  .btn-mic,
  .btn-speech {
    width: 42px;
    height: 42px;
    font-size: 1.1rem;
  }

  .btn-send {
    padding: 10px 16px;
    font-size: 0.85rem;
  }

  .message {
    max-width: 80%;
  }

  .message-content {
    word-break: break-word;
  }
}
</style>
