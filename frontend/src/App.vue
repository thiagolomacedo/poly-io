<template>
  <div class="app">
    <!-- Tela de Login/Registro -->
    <div v-if="!isLoggedIn" class="auth-screen">
      <div v-if="!resetPasswordToken" class="auth-card">
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

          <label class="remember-me">
            <input type="checkbox" v-model="rememberMe" />
            <span>Lembrar-me</span>
          </label>

          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Entrando...' : 'Entrar' }}
          </button>

          <p class="forgot-password-link">
            <a href="#" @click.prevent="showForgotPassword = true">Esqueci minha senha</a>
          </p>
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

        <!-- Modal: Esqueci minha senha -->
        <div v-if="showForgotPassword" class="modal-overlay" @click="showForgotPassword = false">
          <div class="modal-content" @click.stop>
            <h3>Recuperar Senha</h3>
            <p class="modal-subtitle">Digite o email cadastrado para receber o link de recuperação.</p>
            <form @submit.prevent="requestPasswordReset" class="auth-form">
              <div class="form-group">
                <label>Email</label>
                <input
                  v-model="forgotPasswordEmail"
                  type="email"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div class="modal-buttons">
                <button type="submit" class="btn-primary" :disabled="loading">
                  {{ loading ? 'Enviando...' : 'Enviar Link' }}
                </button>
                <button type="button" class="btn-secondary" @click="showForgotPassword = false">Cancelar</button>
              </div>
            </form>
            <p v-if="forgotPasswordMessage" class="success-text">{{ forgotPasswordMessage }}</p>
            <p v-if="forgotPasswordError" class="error-text">{{ forgotPasswordError }}</p>
          </div>
        </div>
      </div>

      <!-- Tela: Resetar Senha (quando tem token na URL) -->
      <div v-if="resetPasswordToken" class="auth-card reset-password-card">
        <div class="logo">
          <span class="logo-poly">Poly</span><span class="logo-io">.io</span>
        </div>
        <h3>Nova Senha</h3>
        <p class="modal-subtitle" v-if="resetPasswordEmail">Resetando senha para: <strong>{{ resetPasswordEmail }}</strong></p>
        <form @submit.prevent="resetPassword" class="auth-form">
          <div class="form-group">
            <label>Nova Senha</label>
            <input
              v-model="newPassword"
              type="password"
              placeholder="Mínimo 6 caracteres"
              minlength="6"
              required
            />
          </div>
          <div class="form-group">
            <label>Confirmar Senha</label>
            <input
              v-model="confirmPassword"
              type="password"
              placeholder="Confirme a senha"
              minlength="6"
              required
            />
          </div>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Salvando...' : 'Salvar Nova Senha' }}
          </button>
        </form>
        <p v-if="resetPasswordError" class="error-text">{{ resetPasswordError }}</p>
        <p v-if="resetPasswordSuccess" class="success-text">{{ resetPasswordSuccess }}</p>
        <p class="forgot-password-link" style="margin-top: 16px;">
          <a href="#" @click.prevent="cancelResetPassword">Voltar ao Login</a>
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

          <div class="profile-name-row">
            <h2 v-if="!editingName" class="profile-name">{{ profileUser?.nome }}</h2>
            <input
              v-else
              v-model="nameInput"
              type="text"
              class="profile-name-input"
              @keyup.enter="saveName"
              @keyup.esc="editingName = false"
              ref="nameInputRef"
            />
            <button
              v-if="profileUser?.id === currentUser?.id && !editingName"
              class="btn-edit-name"
              @click="startEditName"
              title="Editar nome"
            >✏️</button>
            <div v-if="editingName" class="name-edit-buttons">
              <button class="btn-save-name" @click="saveName">✓</button>
              <button class="btn-cancel-name" @click="editingName = false">✕</button>
            </div>
          </div>
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

          <!-- Botão Adicionar Amigo (só para outros usuários sem conexão) -->
          <button
            v-if="profileUser?.id !== currentUser?.id && !isConnectedOrPending(profileUser?.id)"
            class="btn-add-friend-profile"
            @click="sendProfileConnectionRequest"
          >
            ➕ Adicionar amigo
          </button>

          <!-- Status de conexão (se já conectado ou pendente) -->
          <div
            v-if="profileUser?.id !== currentUser?.id && isConnectedOrPending(profileUser?.id)"
            class="connection-status"
          >
            {{ getConnectionStatus(profileUser?.id) }}
          </div>

          <!-- Link Excluir Conta (só para o próprio perfil) -->
          <a
            v-if="profileUser?.id === currentUser?.id"
            class="link-delete-account"
            @click="deleteAccount"
          >
            Excluir conta
          </a>
        </div>
      </div>

      <!-- Modal: Participantes da Sala (mobile fullscreen) -->
      <div v-if="showParticipantsModal" class="participants-modal-overlay" @click="showParticipantsModal = false">
        <div class="participants-modal" @click.stop>
          <div class="participants-modal-header">
            <h3>👥 Participantes ({{ roomUsers.length }})</h3>
            <button class="btn-close-participants" @click="showParticipantsModal = false">✕</button>
          </div>
          <div class="participants-list">
            <div
              v-for="user in roomUsers"
              :key="user.id"
              class="participant-item"
              @click="openProfile(user); showParticipantsModal = false"
            >
              <span class="participant-letter">{{ user.nome?.charAt(0).toUpperCase() }}</span>
              <div class="participant-info">
                <span class="participant-name">{{ user.nome }}</span>
                <span v-if="user.id === selectedRoom?.owner_id" class="participant-owner">⭐ Dono da sala</span>
                <span v-if="user.id === currentUser?.id" class="participant-you">(você)</span>
              </div>
              <div v-if="!isConnectedOrPending(user.id) && user.id !== currentUser?.id" class="participant-add">
                ➕
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Criar Sala -->
      <div v-if="showCreateRoomModal" class="modal-overlay" @click="showCreateRoomModal = false">
        <div class="modal-content" @click.stop>
          <h3>Criar Sala</h3>
          <form @submit.prevent="createRoom" class="room-form">
            <div class="form-group">
              <label>Nome da Sala *</label>
              <input
                v-model="createRoomForm.name"
                type="text"
                placeholder="Ex: Tech Talk Brasil"
                maxlength="50"
                required
              />
            </div>
            <div class="form-group">
              <label>Descrição (opcional)</label>
              <input
                v-model="createRoomForm.description"
                type="text"
                placeholder="Sobre o que é a sala?"
                maxlength="200"
              />
            </div>
            <div class="form-group room-visibility">
              <label>Visibilidade</label>
              <div class="visibility-options">
                <button
                  type="button"
                  class="visibility-btn"
                  :class="{ active: !createRoomForm.is_private }"
                  @click="createRoomForm.is_private = false"
                >
                  🌐 Pública
                </button>
                <button
                  type="button"
                  class="visibility-btn"
                  :class="{ active: createRoomForm.is_private }"
                  @click="createRoomForm.is_private = true"
                >
                  🔒 Privada
                </button>
              </div>
              <small v-if="createRoomForm.is_private" class="visibility-hint">
                Só entra quem tiver o link de convite
              </small>
            </div>
            <div class="modal-buttons">
              <button type="submit" class="btn-primary">Criar</button>
              <button type="button" class="btn-secondary" @click="showCreateRoomModal = false">Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Chamada Recebida -->
      <div v-if="incomingCall" class="call-modal-overlay">
        <div class="call-modal">
          <div class="call-icon">{{ incomingCall.audioOnly ? '📞' : '📹' }}</div>
          <h3>{{ incomingCall.audioOnly ? 'Ligação de Voz' : 'Chamada de Vídeo' }}</h3>
          <p class="caller-name">{{ incomingCall.callerName }}</p>
          <p class="call-text">está ligando...</p>
          <div class="call-buttons">
            <button class="btn-accept-call" @click="acceptCall">
              ✓ Atender
            </button>
            <button class="btn-reject-call" @click="rejectCall">
              ✕ Recusar
            </button>
          </div>
        </div>
      </div>

      <!-- Overlay: Chamada de Vídeo/Áudio Ativa (Jitsi) -->
      <div v-if="activeCall" class="video-call-overlay">
        <div class="video-call-header">
          <span>{{ activeCall.audioOnly ? '📞' : '📹' }} {{ activeCall.audioOnly ? 'Ligação' : 'Chamada' }} com {{ activeCall.remoteName }}</span>
          <button class="btn-end-call" @click="endCall">
            ✕ Encerrar
          </button>
        </div>
        <iframe
          :src="jitsiUrl"
          class="jitsi-iframe"
          allow="camera; microphone; fullscreen; display-capture"
        ></iframe>
      </div>

      <!-- Emoji Picker estilo WhatsApp -->
      <div v-if="showEmojiPicker" class="emoji-picker-backdrop" @click="showEmojiPicker = false"></div>
      <div v-if="showEmojiPicker" class="emoji-picker-popup" :class="{ 'for-reaction': reactingToMessage }">
        <div class="emoji-picker-tabs">
          <button
            v-for="cat in emojiCategories"
            :key="cat.name"
            class="emoji-tab"
            :class="{ active: currentEmojiCategory === cat.name }"
            @click="currentEmojiCategory = cat.name"
            :title="cat.label"
          >
            {{ cat.icon }}
          </button>
        </div>
        <div class="emoji-picker-search">
          <input
            v-model="emojiSearch"
            type="text"
            placeholder="Pesquisar emoji"
            class="emoji-search-input"
          />
        </div>
        <div class="emoji-picker-content">
          <!-- Recentes -->
          <div v-if="currentEmojiCategory === 'recentes' || (!emojiSearch && recentEmojis.length > 0 && currentEmojiCategory === 'recentes')" class="emoji-section">
            <div class="emoji-section-title">Recentes</div>
            <div class="emoji-grid">
              <button
                v-for="emoji in recentEmojis"
                :key="'recent-' + emoji"
                class="emoji-btn"
                @click="selectEmoji(emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
          <!-- Categoria atual -->
          <div class="emoji-section">
            <div class="emoji-section-title">{{ getCurrentCategoryLabel() }}</div>
            <div class="emoji-grid">
              <button
                v-for="emoji in filteredEmojis"
                :key="emoji"
                class="emoji-btn"
                @click="selectEmoji(emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
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
            <div class="status-dropdown-wrapper">
              <button
                class="status-dropdown-btn"
                :class="myStatus"
                @click="statusDropdownOpen = !statusDropdownOpen"
              >
                <span class="status-dot"></span>
                <span class="status-label">{{ statusOptions.find(s => s.value === myStatus)?.label }}</span>
                <span class="dropdown-arrow">{{ statusDropdownOpen ? '▲' : '▼' }}</span>
              </button>
              <div v-if="statusDropdownOpen" class="status-dropdown-menu" @click.stop>
                <div
                  v-for="s in statusOptions"
                  :key="s.value"
                  :class="['status-dropdown-item', s.value, { active: myStatus === s.value }]"
                  @click="changeStatus(s.value); statusDropdownOpen = false"
                >
                  <div class="status-item-header">
                    <span class="status-dot"></span>
                    <span class="status-name">{{ s.label }}</span>
                  </div>
                  <p class="status-desc">{{ s.desc }}</p>
                </div>
              </div>
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
            :class="{ active: currentTab === 'rooms' }"
            @click="currentTab = 'rooms'; loadRooms()"
          >
            <span class="nav-icon">🏠</span>
            Salas
            <span v-if="rooms.length" class="badge">{{ rooms.length }}</span>
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
            <span class="nav-icon">✋</span>
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

          <!-- Tab: Salas -->
          <div v-if="currentTab === 'rooms'" class="tab-content">
            <!-- Minha Sala -->
            <div v-if="myRoom" class="my-room-section">
              <h4 class="section-title">Minha Sala</h4>
              <div
                class="room-item my-room"
                :class="{ active: selectedRoom?.id === myRoom.id }"
                @click="enterRoom(myRoom.id)"
              >
                <div class="room-icon">🏠</div>
                <div class="room-info">
                  <span class="name">{{ myRoom.name }}</span>
                  <span class="desc">{{ myRoom.online_count || 0 }} online</span>
                </div>
                <button class="btn-delete-room" @click.stop="deleteMyRoom" title="Excluir sala">🗑️</button>
              </div>
            </div>

            <!-- Criar Sala -->
            <button
              v-if="!myRoom"
              class="btn-create-room"
              @click="showCreateRoomModal = true"
            >
              + Criar Minha Sala
            </button>

            <!-- Lista de Salas Públicas -->
            <h4 class="section-title">Salas Públicas</h4>
            <div
              v-for="room in rooms.filter(r => r.id !== myRoom?.id)"
              :key="room.id"
              class="room-item"
              :class="{ active: selectedRoom?.id === room.id }"
              @click="enterRoom(room.id)"
            >
              <div class="room-icon">💬</div>
              <div class="room-info">
                <span class="name">{{ room.name }}</span>
                <span class="desc">
                  {{ room.online_count || 0 }}/{{ room.max_users }} · {{ room.owner_nome }}
                </span>
              </div>
            </div>
            <p v-if="rooms.filter(r => r.id !== myRoom?.id).length === 0" class="empty-state small">
              Nenhuma sala pública disponível.
            </p>
          </div>
        </div>

        <button class="btn-logout" @click="logout">Sair</button>
      </aside>

      <!-- Área Principal -->
      <main class="main-area">
        <!-- Nenhuma conversa ou sala selecionada -->
        <div v-if="!selectedConnection && !selectedRoom" class="no-chat">
          <div class="logo-big">
            <span class="logo-poly">Poly</span><span class="logo-io">.io</span>
          </div>
          <p>Selecione uma conexão para conversar</p>
          <p class="hint">Ou entre em uma sala para conversar com várias pessoas</p>
          <p class="powered-by">
            Powered by <a href="https://ousianic.com/#" target="_blank" rel="noopener">Ousianic</a>
            <span class="powered-subtitle">Plataforma de tecnologia e inovação</span>
          </p>
        </div>

        <!-- Sala ativa -->
        <div v-else-if="selectedRoom" class="room-wrapper">
          <!-- Header da sala -->
          <div class="chat-header room-header">
            <div class="room-header-info">
              <div class="room-icon-large">🏠</div>
              <div>
                <span class="name">{{ selectedRoom.name }}</span>
                <span class="room-meta">
                  {{ roomUsers.length }}/{{ selectedRoom.max_users }} online
                  <span v-if="isRoomOwner" class="owner-badge">ADM</span>
                  <span v-if="isRoomMuted" class="muted-badge">Silenciado</span>
                  <span v-if="selectedRoom.status === 'hidden'" class="hidden-badge">Oculta</span>
                </span>
              </div>
            </div>
            <div class="chat-actions">
              <button
                v-if="isRoomOwner && selectedRoom.status === 'hidden'"
                class="btn-reactivate"
                @click="reactivateRoom"
                title="Reativar sala"
              >
                🔄 Reativar
              </button>
              <button
                class="btn-icon btn-participants"
                @click="toggleParticipants"
                title="Ver participantes"
              >
                👥 {{ roomUsers.length }}
              </button>
              <button
                class="btn-icon"
                @click="roomSoundMuted = !roomSoundMuted"
                :title="roomSoundMuted ? 'Ativar som' : 'Silenciar sala'"
              >
                {{ roomSoundMuted ? '🔕' : '🔔' }}
              </button>
              <button
                class="btn-icon"
                @click="copyRoomInviteLink"
                title="Copiar link de convite"
              >
                🔗
              </button>
              <button class="btn-icon" @click="leaveRoom" title="Sair da sala">
                🚪
              </button>
            </div>
          </div>

          <!-- Lista de usuários da sala (toggle) -->
          <div class="room-users-sidebar" v-if="roomUsers.length > 0 && showRoomParticipants" @click="userMenuOpen = null">
            <h5>Na sala ({{ roomUsers.length }})</h5>
            <div v-for="user in roomUsers" :key="user.id" class="room-user-item">
              <span class="user-letter">{{ user.nome?.charAt(0).toUpperCase() }}</span>
              <span
                class="user-name clickable"
                @click.stop="openProfile(user)"
                title="Ver perfil"
              >
                {{ user.nome }}
              </span>
              <span v-if="user.id === selectedRoom.owner_id" class="owner-star">⭐</span>

              <!-- Menu de ações do moderador (inline) -->
              <div
                v-if="isRoomOwner && user.id !== currentUser?.id"
                class="mod-menu"
                @click.stop
              >
                <button @click="kickUser(user.id)" title="Expulsar">
                  👢
                </button>
                <button @click="banUser(user.id)" title="Banir">
                  🚫
                </button>
                <button @click="toggleMuteUser(user.id)" :title="roomMutedUsers.has(user.id) ? 'Dessilenciar' : 'Silenciar'">
                  {{ roomMutedUsers.has(user.id) ? '🔊' : '🔇' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Mensagens da sala -->
          <div class="messages-area" ref="roomMessagesContainer">
            <div
              v-for="msg in roomMessages"
              :key="msg.id"
              class="message"
              :class="{ mine: msg.senderId === currentUser?.id }"
            >
              <div class="message-header">
                <span class="sender-name" :style="{ color: msg.corNome }">{{ msg.senderNome }}</span>
                <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              <div class="message-bubble" :style="{ color: msg.cor }">
                {{ msg.texto }}
              </div>
              <button
                v-if="!msg.euEnviei && msg.textoOriginal && msg.texto !== msg.textoOriginal"
                class="btn-show-original"
                @click="msg.showingOriginal = !msg.showingOriginal"
              >
                {{ msg.showingOriginal ? '🔄' : '🌐' }}
              </button>
              <div v-if="msg.showingOriginal" class="original-text">
                Original: {{ msg.textoOriginal }}
              </div>
            </div>

            <!-- Indicador de digitação -->
            <div v-if="roomTypingUsers.size > 0" class="typing-indicator">
              <span class="typing-dots">
                <span></span><span></span><span></span>
              </span>
              {{ Array.from(roomTypingUsers).join(', ') }} digitando...
            </div>
          </div>

          <!-- Input de mensagem da sala (redesenhado) -->
          <div class="room-input-container">
            <!-- Seletor de cor com toggle -->
            <div class="color-picker-wrapper" @click.stop>
              <input
                type="color"
                :value="colorPickerMode === 'message' ? roomMessageColor : roomNameColor"
                @input="e => colorPickerMode === 'message' ? roomMessageColor = e.target.value : roomNameColor = e.target.value"
                class="color-picker"
                :title="colorPickerMode === 'message' ? 'Cor da mensagem' : 'Cor do nome'"
              />
              <div class="color-mode-toggle">
                <button
                  :class="{ active: colorPickerMode === 'message' }"
                  @click="colorPickerMode = 'message'"
                  title="Cor da mensagem"
                >Aa</button>
                <button
                  :class="{ active: colorPickerMode === 'name' }"
                  @click="colorPickerMode = 'name'"
                  title="Cor do nome"
                >@</button>
              </div>
            </div>

            <!-- Campo de mensagem -->
            <div class="room-input-field">
              <input
                v-model="newRoomMessage"
                type="text"
                :placeholder="isRoomMuted ? 'Você está silenciado...' : 'Escreva sua mensagem aqui...'"
                :disabled="isRoomMuted"
                :style="{ color: roomMessageColor }"
                @keyup.enter="sendRoomMessage"
                @input="onRoomTyping"
              />
            </div>

            <!-- Botão enviar -->
            <button
              class="room-send-btn"
              @click="sendRoomMessage"
              :disabled="!newRoomMessage.trim() || isRoomMuted"
              title="Enviar mensagem"
            >
              <span class="send-icon">➤</span>
            </button>
          </div>
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
              <button
                class="btn-icon btn-video"
                @click="startVideoCall"
                :disabled="selectedConnection?.status === 'offline'"
                :title="selectedConnection?.status === 'offline' ? 'Usuário offline' : 'Iniciar chamada de vídeo'"
              >
                📹
              </button>
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
              :class="{
                'sent': msg.euEnviei,
                'received': !msg.euEnviei,
                'emoji-only': isOnlyEmoji(msg.texto)
              }"
              @click="toggleMessageMenu(msg)"
            >
              <div
                class="message-content"
                :class="{ 'emoji-only-content': isOnlyEmoji(msg.texto) }"
                :style="msg.euEnviei && !isOnlyEmoji(msg.texto) ? { backgroundColor: msg.bubbleColor || messageBubbleColor } : {}"
              >
                <!-- Menu de ações para mensagens enviadas -->
                <div v-if="msg.euEnviei && msg.showMenu && !msg.isEditing" class="message-actions">
                  <button class="btn-edit-msg" @click.stop="startEditMessage(msg)">
                    ✏️ Editar
                  </button>
                </div>
                <!-- Menu de reações para mensagens recebidas -->
                <div v-if="!msg.euEnviei && msg.showMenu" class="message-actions reaction-actions">
                  <button class="btn-react-msg" @click.stop="openEmojiPicker(msg)">
                    😊 Reagir
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
                    <button class="btn-delete-edit" @click="deleteMessage(msg)">Excluir</button>
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
                  <p class="message-text" :class="{ 'emoji-large': isOnlyEmoji(msg.texto) }">{{ msg.texto }}</p>
                  <button
                    v-if="!msg.euEnviei && msg.textoOriginal !== msg.texto"
                    class="btn-original"
                    @click.stop="msg.showOriginal = !msg.showOriginal"
                  >
                    {{ msg.showOriginal ? '🔄' : '🌐' }}
                  </button>
                  <p v-if="msg.showOriginal" class="original-text">
                    Original: {{ msg.textoOriginal }}
                  </p>
                </template>
                <span class="message-time">
                  {{ formatTime(msg.enviadoEm) }}
                  <span v-if="msg.editado" class="edited-badge">(editado)</span>
                  <span v-if="msg.euEnviei" class="read-status" :class="{ read: msg.lido }">
                    {{ msg.lido ? '✓✓' : '✓' }}
                  </span>
                </span>
                <!-- Reações da mensagem -->
                <div v-if="msg.reactions && msg.reactions.length > 0" class="message-reactions">
                  <span
                    v-for="reaction in msg.reactions"
                    :key="reaction.emoji"
                    class="reaction-badge"
                    :class="{ 'my-reaction': reaction.userIds?.includes(currentUser?.id) }"
                    @click.stop="toggleReaction(msg, reaction.emoji)"
                    :title="reaction.count + ' ' + (reaction.count === 1 ? 'pessoa' : 'pessoas')"
                  >
                    {{ reaction.emoji }} {{ reaction.count > 1 ? reaction.count : '' }}
                  </span>
                </div>
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
                @blur="emitStoppedTyping"
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
                class="btn-emoji"
                @click="openEmojiPickerForInput"
                title="Inserir emoji"
              >
                😊
              </button>
              <label class="btn-color-picker" title="Cor do balão">
                🎨
                <input
                  type="color"
                  v-model="messageBubbleColor"
                  class="color-input-hidden"
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
              <button
                class="btn-call"
                @click="startAudioCall"
                :disabled="selectedConnection?.status === 'offline'"
                :title="selectedConnection?.status === 'offline' ? 'Usuário offline' : 'Ligação de voz'"
              >
                📞
              </button>
              <button class="btn-send" @click="sendMessage" :disabled="!newMessage.trim() || isRecording">
                Enviar
              </button>
            </div>
          </div>
        </template>
      </main>
    </div>

    <!-- Prompt de Atualização PWA -->
    <div v-if="showUpdatePrompt" class="update-prompt">
      <div class="update-content">
        <span>🚀 Nova versão disponível!</span>
        <div class="update-actions">
          <button @click="updateApp" class="btn-update">Atualizar</button>
          <button @click="showUpdatePrompt = false" class="btn-later">Depois</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { io } from 'socket.io-client'
import html2pdf from 'html2pdf.js'

// Configuração da API
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const API_URL = `${API_BASE}/api`

// Socket.io (conecta depois do login)
let socket = null

// PWA Update
const showUpdatePrompt = ref(false)
let swRegistration = null

// Estado de autenticação
const authMode = ref('login')
const loading = ref(false)
const authError = ref('')
const token = ref(localStorage.getItem('poly_token') || '')
const currentUser = ref(null)

const loginForm = ref({
  email: localStorage.getItem('poly_saved_email') || '',
  senha: localStorage.getItem('poly_saved_senha') || ''
})
const rememberMe = ref(!!localStorage.getItem('poly_saved_email'))

const registerForm = ref({
  nome: '',
  email: '',
  senha: '',
  idioma: 'pt',
  pais: ''
})

// Estado de recuperação de senha
const showForgotPassword = ref(false)
const forgotPasswordEmail = ref('')
const forgotPasswordMessage = ref('')
const forgotPasswordError = ref('')
const resetPasswordToken = ref('')
const resetPasswordEmail = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const resetPasswordError = ref('')
const resetPasswordSuccess = ref('')

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
const messageBubbleColor = ref(localStorage.getItem('poly_bubble_color') || '#6366f1')
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

// Chamada de vídeo (Jitsi)
const incomingCall = ref(null)  // { callerId, callerName, connectionId, roomName }
const activeCall = ref(null)    // { roomName, remoteName, remoteId }

// Emoji Picker para reações
const showEmojiPicker = ref(false)
const emojiSearch = ref('')
const currentEmojiCategory = ref('smileys')
const reactingToMessage = ref(null)
const recentEmojis = ref(JSON.parse(localStorage.getItem('poly_recent_emojis') || '[]'))

const emojiCategories = [
  { name: 'recentes', label: 'Recentes', icon: '🕐' },
  { name: 'smileys', label: 'Smileys e pessoas', icon: '😊' },
  { name: 'gestos', label: 'Gestos', icon: '👋' },
  { name: 'animais', label: 'Animais e natureza', icon: '🐶' },
  { name: 'comida', label: 'Comida e bebida', icon: '🍔' },
  { name: 'atividades', label: 'Atividades', icon: '⚽' },
  { name: 'viagem', label: 'Viagem e lugares', icon: '🚗' },
  { name: 'objetos', label: 'Objetos', icon: '💡' },
  { name: 'simbolos', label: 'Símbolos', icon: '❤️' }
]

const emojiData = {
  recentes: [],
  smileys: [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','😵‍💫','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾','🙈','🙉','🙊'
  ],
  gestos: [
    '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷','👮','🕵️','💂','🥷','👷','🤴','👸','👳','👲','🧕','🤵','👰','🤰','🤱','👼','🎅','🤶','🦸','🦹','🧙','🧚','🧛','🧜','🧝','🧞','🧟','💆','💇','🚶','🧍','🧎','🏃','💃','🕺','👯','🧖','🧗','🤺','🏇','⛷️','🏂','🏋️','🤸','⛹️','🤾','🏌️','🏄','🚣','🏊','🤽','🚴','🚵','🤼'
  ],
  animais: [
    '🐶','🐕','🦮','🐩','🐺','🦊','🦝','🐱','🐈','🦁','🐯','🐅','🐆','🐴','🐎','🦄','🦓','🦌','🦬','🐮','🐂','🐃','🐄','🐷','🐖','🐗','🐽','🐏','🐑','🐐','🐪','🐫','🦙','🦒','🐘','🦣','🦏','🦛','🐭','🐁','🐀','🐹','🐰','🐇','🐿️','🦫','🦔','🦇','🐻','🐻‍❄️','🐨','🐼','🦥','🦦','🦨','🦘','🦡','🐾','🦃','🐔','🐓','🐣','🐤','🐥','🐦','🐧','🕊️','🦅','🦆','🦢','🦉','🦤','🪶','🦩','🦚','🦜','🐸','🐊','🐢','🦎','🐍','🐲','🐉','🦕','🦖','🐳','🐋','🐬','🦭','🐟','🐠','🐡','🦈','🐙','🐚','🐌','🦋','🐛','🐜','🐝','🪲','🐞','🦗','🕷️','🦂','🦟','🪳','🌸','💐','🌹','🥀','🌺','🌻','🌼','🌷','🌱','🪴','🌲','🌳','🌴','🌵','🌾','🌿','☘️','🍀','🍁','🍂','🍃'
  ],
  comida: [
    '🍇','🍈','🍉','🍊','🍋','🍌','🍍','🥭','🍎','🍏','🍐','🍑','🍒','🍓','🫐','🥝','🍅','🫒','🥥','🥑','🍆','🥔','🥕','🌽','🌶️','🫑','🥒','🥬','🥦','🧄','🧅','🍄','🥜','🌰','🍞','🥐','🥖','🫓','🥨','🥯','🥞','🧇','🧀','🍖','🍗','🥩','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🫔','🥙','🧆','🥚','🍳','🥘','🍲','🫕','🥣','🥗','🍿','🧈','🧂','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🦀','🦞','🦐','🦑','🦪','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🫖','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🥤','🧋','🧃','🧉','🧊'
  ],
  atividades: [
    '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','🎯','🪂','🏋️','🤼','🤸','⛹️','🤾','🏌️','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🎰'
  ],
  viagem: [
    '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛴','🚲','🛵','🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🪝','⛽','🚧','🚦','🚥','🚏','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🏠','🏡','🏘️','🏚️','🏗️','🏭','🏢','🏬','🏣','🏥','🏦','🏨','🏪','🏫','🏩','💒','🏛️','⛪','🕌','🕍','🛕','🕋','⛩️','🌅','🌄','🌠','🎇','🎆','🌇','🌆','🏙️','🌃','🌌','🌉','🌁'
  ],
  objetos: [
    '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🔫','💣','🪓','🔪','🗡️','⚔️','🛡️','🔮','📿','🧿','💈','⚗️','🔭','🔬','🩹','🩺','💊','💉','🧬','🧪','🌡️','🧹','🧺','🧻','🚽','🚰','🚿','🛁','🧼','🪥','🪒','🧽','🛎️','🔑','🗝️','🚪','🪑','🛋️','🛏️','🧸','🖼️','🛍️','🛒','🎁','🎈','🎏','🎀','🎊','🎉','🎎','🏮','🎐','✉️','📩','📨','📧','💌','📥','📤','📦','📪','📫','📬','📭','📮','📝','💼','📁','📂','📅','📆','📇','📈','📉','📊','📋','📌','📍','📎','🖇️','📏','📐','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔏','🔐','🔑','🗝️'
  ],
  simbolos: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🈳','🈂️','🛂','🛃','🛄','🛅','🚹','🚺','🚼','⚧️','🚻','🚮','🎦','📶','🈁','🔣','ℹ️','🔤','🔡','🔠','🆖','🆗','🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔢','#️⃣','*️⃣','⏏️','▶️','⏸️','⏯️','⏹️','⏺️','⏭️','⏮️','⏩','⏪','⏫','⏬','◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','↪️','↩️','⤴️','⤵️','🔀','🔁','🔂','🔄','🔃','🎵','🎶','➕','➖','➗','✖️','♾️','💲','💱','™️','©️','®️','〰️','➰','➿','✔️','☑️','🔘','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹','🔶','🔷','🔳','🔲','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫','🔈','🔇','🔉','🔊','🔔','🔕','📣','📢','💬','💭','🗯️','♠️','♣️','♥️','♦️','🃏','🎴','🀄'
  ]
}
const jitsiUrl = computed(() => {
  if (!activeCall.value) return ''
  const room = activeCall.value.roomName
  const displayName = encodeURIComponent(currentUser.value?.nome || 'Usuário')
  // Usando meet.ffmuc.net - instância pública gratuita sem limite de tempo
  let url = `https://meet.ffmuc.net/${room}#userInfo.displayName="${displayName}"&config.prejoinPageEnabled=false`
  // Se for chamada de áudio, iniciar com vídeo desligado
  if (activeCall.value.audioOnly) {
    url += '&config.startWithVideoMuted=true'
  }
  return url
})

// ==================== SALAS ====================
const rooms = ref([])                    // Lista de salas públicas
const myRoom = ref(null)                 // Minha sala (se existir)
const selectedRoom = ref(null)           // Sala atualmente selecionada
const roomUsers = ref([])                // Usuários na sala atual
const roomMutedUsers = ref(new Set())    // IDs de usuários silenciados na sala
const userMenuOpen = ref(null)           // ID do usuário com menu aberto
const roomMessages = ref([])             // Mensagens da sala atual
const newRoomMessage = ref('')           // Input de nova mensagem na sala
const isRoomOwner = ref(false)           // Sou o dono da sala atual?
const isRoomMuted = ref(false)           // Estou silenciado na sala?
const roomTypingUsers = ref(new Set())   // Usuários digitando na sala
const showCreateRoomModal = ref(false)   // Modal de criar sala
const roomMessageColor = ref('#ffffff') // Cor da mensagem na sala
const roomNameColor = ref('#ffffff')    // Cor do nome na sala
const showRoomParticipants = ref(true)  // Mostrar lista de participantes (desktop)
const showParticipantsModal = ref(false) // Modal de participantes (mobile)
const colorPickerMode = ref('message')  // 'message' ou 'name'
const currentTime = ref(Date.now())     // Timer para contagem regressiva
const roomSoundMuted = ref(false)       // Som da sala silenciado
const createRoomForm = reactive({
  name: '',
  description: '',
  is_private: false
})

// Computed
const isLoggedIn = computed(() => !!token.value && !!currentUser.value)
const isOwnProfile = computed(() => profileUser.value?.id === currentUser.value?.id)

// Emojis filtrados para o picker
const filteredEmojis = computed(() => {
  if (currentEmojiCategory.value === 'recentes') {
    return recentEmojis.value
  }
  const categoryEmojis = emojiData[currentEmojiCategory.value] || emojiData.smileys
  if (!emojiSearch.value) return categoryEmojis
  // Busca - mostrar de todas categorias
  const allEmojis = Object.values(emojiData).flat()
  return [...new Set(allEmojis)].slice(0, 100)
})

function getCurrentCategoryLabel() {
  const cat = emojiCategories.find(c => c.name === currentEmojiCategory.value)
  return cat ? cat.label : 'Emojis'
}

// Detecta se a mensagem é apenas emoji(s) - máximo 3 emojis, sem texto
function isOnlyEmoji(text) {
  if (!text) return false
  // Remove espaços
  const clean = text.trim()
  if (!clean) return false
  // Regex para detectar emojis (inclui variações e modificadores)
  const emojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\s]+$/u
  if (!emojiRegex.test(clean)) return false
  // Conta quantos emojis tem (aproximado)
  const emojiCount = [...clean].filter(char => /[\u{1F300}-\u{1FAFF}]/u.test(char)).length
  return emojiCount > 0 && emojiCount <= 3
}

function addToRecentEmojis(emoji) {
  const recents = recentEmojis.value.filter(e => e !== emoji)
  recents.unshift(emoji)
  recentEmojis.value = recents.slice(0, 24) // Máximo 24 recentes
  localStorage.setItem('poly_recent_emojis', JSON.stringify(recentEmojis.value))
}

function selectEmoji(emoji) {
  addToRecentEmojis(emoji)
  addReaction(emoji)
}

// Status options
const statusOptions = [
  { value: 'online', label: 'Online', desc: 'Você está disponível para conversar.' },
  { value: 'ausente', label: 'Ausente', desc: 'Mostra que você está em um intervalo. Ainda receberá notificações.' },
  { value: 'ocupado', label: 'Ocupado', desc: 'Sons de notificação serão desligados.' },
  { value: 'invisivel', label: 'Invisível', desc: 'Você aparecerá offline, mas ainda pode conversar.' }
]
const statusDropdownOpen = ref(false)

// Modal de perfil
const showProfileModal = ref(false)
const profileUser = ref(null)
const editingSocial = ref(false)
const socialTipoInput = ref('')
const socialUrlInput = ref('')
const codeCopied = ref(false)
const linkCopied = ref(false)
const editingName = ref(false)
const nameInput = ref('')
const nameInputRef = ref(null)

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
  editingName.value = false
  showProfileModal.value = true
}

// Editar nome
function startEditName() {
  nameInput.value = profileUser.value?.nome || ''
  editingName.value = true
  nextTick(() => {
    nameInputRef.value?.focus()
  })
}

async function saveName() {
  if (!nameInput.value.trim()) {
    alert('Nome não pode ficar vazio')
    return
  }

  try {
    const res = await fetch(`${API_URL}/users/${currentUser.value.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ nome: nameInput.value.trim() })
    })
    if (res.ok) {
      const updated = await res.json()
      currentUser.value.nome = updated.nome
      profileUser.value.nome = updated.nome
      editingName.value = false
    }
  } catch (e) {
    console.error('Erro ao salvar nome:', e)
  }
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

    // Salvar ou limpar credenciais baseado no checkbox
    if (rememberMe.value) {
      localStorage.setItem('poly_saved_email', loginForm.value.email)
      localStorage.setItem('poly_saved_senha', loginForm.value.senha)
    } else {
      localStorage.removeItem('poly_saved_email')
      localStorage.removeItem('poly_saved_senha')
    }

    initializeApp()
  } catch (error) {
    authError.value = error.message
  } finally {
    loading.value = false
  }
}

// Solicitar reset de senha
async function requestPasswordReset() {
  loading.value = true
  forgotPasswordMessage.value = ''
  forgotPasswordError.value = ''

  try {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotPasswordEmail.value })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Erro ao processar solicitação')
    }

    forgotPasswordMessage.value = 'Se o email existir, você receberá um link de recuperação em breve.'
    forgotPasswordEmail.value = ''
  } catch (error) {
    forgotPasswordError.value = error.message
  } finally {
    loading.value = false
  }
}

// Resetar senha com token
async function resetPassword() {
  if (newPassword.value !== confirmPassword.value) {
    resetPasswordError.value = 'As senhas não coincidem'
    return
  }

  if (newPassword.value.length < 6) {
    resetPasswordError.value = 'A senha deve ter no mínimo 6 caracteres'
    return
  }

  loading.value = true
  resetPasswordError.value = ''
  resetPasswordSuccess.value = ''

  try {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetPasswordToken.value,
        novaSenha: newPassword.value
      })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Erro ao alterar senha')
    }

    resetPasswordSuccess.value = 'Senha alterada com sucesso! Redirecionando...'

    // Limpar token da URL e redirecionar para login
    setTimeout(() => {
      cancelResetPassword()
    }, 2000)
  } catch (error) {
    resetPasswordError.value = error.message
  } finally {
    loading.value = false
  }
}

// Cancelar reset e voltar ao login
function cancelResetPassword() {
  resetPasswordToken.value = ''
  resetPasswordEmail.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  resetPasswordError.value = ''
  resetPasswordSuccess.value = ''

  // Limpar token da URL
  const url = new URL(window.location.href)
  url.searchParams.delete('reset')
  window.history.replaceState({}, '', url)
}

// Verificar token de reset na URL
async function checkResetToken() {
  const urlParams = new URLSearchParams(window.location.search)
  const resetToken = urlParams.get('reset')

  if (resetToken) {
    try {
      const res = await fetch(`${API_URL}/auth/verify-reset-token/${resetToken}`)
      const data = await res.json()

      if (res.ok && data.valid) {
        resetPasswordToken.value = resetToken
        resetPasswordEmail.value = data.email
      } else {
        // Token inválido, limpar da URL
        const url = new URL(window.location.href)
        url.searchParams.delete('reset')
        window.history.replaceState({}, '', url)
        authError.value = 'Link de recuperação inválido ou expirado'
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error)
    }
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
  // Limpar dados de salas
  rooms.value = []
  myRoom.value = null
  selectedRoom.value = null
  roomUsers.value = []
  roomMessages.value = []
  isRoomOwner.value = false
  isRoomMuted.value = false
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

// ==================== SALAS ====================

// Carregar lista de salas públicas
async function loadRooms() {
  try {
    const res = await fetch(`${API_BASE}/api/rooms`, {
      headers: { 'Authorization': `Bearer ${token.value}` }
    })
    if (res.ok) {
      rooms.value = await res.json()
    }
  } catch (error) {
    console.error('Erro ao carregar salas:', error)
  }
}

// Carregar minha sala
async function loadMyRoom() {
  try {
    const res = await fetch(`${API_BASE}/api/rooms/mine`, {
      headers: { 'Authorization': `Bearer ${token.value}` }
    })
    if (res.ok) {
      myRoom.value = await res.json()
    }
  } catch (error) {
    console.error('Erro ao carregar minha sala:', error)
  }
}

// Criar sala
async function createRoom() {
  if (!createRoomForm.name.trim()) return

  try {
    const res = await fetch(`${API_BASE}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({
        name: createRoomForm.name.trim(),
        description: createRoomForm.description.trim() || null,
        is_private: createRoomForm.is_private
      })
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error || 'Erro ao criar sala')
      return
    }

    myRoom.value = data
    showCreateRoomModal.value = false
    createRoomForm.name = ''
    createRoomForm.description = ''
    createRoomForm.is_private = false

    // Entrar na sala recém-criada
    enterRoom(data.id)
    loadRooms()
  } catch (error) {
    alert('Erro ao criar sala')
  }
}

// Excluir minha sala
async function deleteMyRoom() {
  if (!myRoom.value) return

  const confirmed = confirm('Tem certeza que deseja excluir sua sala?\nTodos os usuários serão removidos.')
  if (!confirmed) return

  try {
    const res = await fetch(`${API_BASE}/api/rooms/${myRoom.value.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token.value}` }
    })

    if (res.ok) {
      if (selectedRoom.value?.id === myRoom.value.id) {
        selectedRoom.value = null
        roomMessages.value = []
        roomUsers.value = []
      }
      myRoom.value = null
      loadRooms()
    }
  } catch (error) {
    alert('Erro ao excluir sala')
  }
}

// Entrar em uma sala
function enterRoom(roomId) {
  if (socket) {
    // Limpar conversa privada se estiver ativa
    selectedConnection.value = null
    messages.value = []

    socket.emit('entrar-sala', { roomId })
  }
}

// Toggle participantes (mobile = modal, desktop = inline)
function toggleParticipants() {
  const isMobile = window.innerWidth <= 768
  if (isMobile) {
    showParticipantsModal.value = true
  } else {
    showRoomParticipants.value = !showRoomParticipants.value
  }
}

// Sair da sala
function leaveRoom() {
  if (socket && selectedRoom.value) {
    socket.emit('sair-sala')
    selectedRoom.value = null
    roomMessages.value = []
    roomUsers.value = []
    isRoomOwner.value = false
    isRoomMuted.value = false
    roomTypingUsers.value = new Set()
    roomMutedUsers.value = new Set()
  }
}

// Copiar link de convite da sala
function copyRoomInviteLink() {
  if (!selectedRoom.value?.invite_code) {
    alert('Código de convite não disponível')
    return
  }

  const inviteUrl = `${window.location.origin}?sala=${selectedRoom.value.invite_code}`

  navigator.clipboard.writeText(inviteUrl).then(() => {
    alert('Link de convite copiado!')
  }).catch(() => {
    // Fallback para navegadores mais antigos
    prompt('Copie o link:', inviteUrl)
  })
}

// Entrar em sala via código de convite
async function joinRoomByInvite(code) {
  try {
    const res = await fetch(`${API_BASE}/api/rooms/invite/${code}`, {
      headers: { 'Authorization': `Bearer ${token.value}` }
    })

    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'Sala não encontrada')
      return
    }

    const room = await res.json()

    // Ir para aba de salas e entrar na sala
    currentTab.value = 'rooms'
    await loadRooms()

    setTimeout(() => {
      enterRoom(room.id)
    }, 300)
  } catch (error) {
    console.error('Erro ao entrar na sala via convite:', error)
    alert('Erro ao processar convite')
  }
}

// Enviar mensagem na sala
function sendRoomMessage() {
  if (!newRoomMessage.value.trim() || !selectedRoom.value || isRoomMuted.value) return

  socket.emit('sala-mensagem', {
    roomId: selectedRoom.value.id,
    texto: newRoomMessage.value.trim(),
    cor: roomMessageColor.value,
    corNome: roomNameColor.value
  })

  newRoomMessage.value = ''
}

// Digitando na sala
let roomTypingTimer = null
function onRoomTyping() {
  if (!selectedRoom.value || isRoomMuted.value) return

  socket.emit('sala-digitando', { roomId: selectedRoom.value.id })

  clearTimeout(roomTypingTimer)
  roomTypingTimer = setTimeout(() => {
    socket.emit('sala-parou-digitar', { roomId: selectedRoom.value.id })
  }, 1500)
}

// Toggle menu de ações do usuário
function toggleUserMenu(userId) {
  if (userMenuOpen.value === userId) {
    userMenuOpen.value = null
  } else {
    userMenuOpen.value = userId
  }
}

// Ações de moderação
async function kickUser(userId) {
  if (!selectedRoom.value || !isRoomOwner.value) return

  socket.emit('sala-kick', {
    roomId: selectedRoom.value.id,
    targetUserId: userId
  })
}

async function banUser(userId) {
  if (!selectedRoom.value || !isRoomOwner.value) return

  const confirmed = confirm('Banir este usuário? Ele não poderá mais entrar na sala.')
  if (!confirmed) return

  try {
    await fetch(`${API_BASE}/api/rooms/${selectedRoom.value.id}/ban/${userId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token.value}` }
    })
  } catch (error) {
    console.error('Erro ao banir:', error)
  }
}

async function toggleMuteUser(userId) {
  if (!selectedRoom.value || !isRoomOwner.value) return

  const isMuted = roomMutedUsers.value.has(userId)

  try {
    await fetch(`${API_BASE}/api/rooms/${selectedRoom.value.id}/mute/${userId}`, {
      method: isMuted ? 'DELETE' : 'POST',
      headers: { 'Authorization': `Bearer ${token.value}` }
    })

    // Atualizar estado local
    if (isMuted) {
      roomMutedUsers.value.delete(userId)
    } else {
      roomMutedUsers.value.add(userId)
    }
  } catch (error) {
    console.error('Erro ao alterar mute:', error)
  }
}

// Verificar se já tem conexão ou solicitação pendente com usuário
function isConnectedOrPending(userId) {
  // Já é amigo? (conexões têm campo "id", não "user_id")
  const isConnected = connections.value.some(c => c.id === userId)
  if (isConnected) return true

  // Solicitação pendente recebida?
  const hasPendingReceived = pendingRequests.value.some(r => r.user_id === userId)
  if (hasPendingReceived) return true

  // Solicitação pendente enviada?
  const hasPendingSent = sentRequests.value.some(r => r.user_id === userId)
  if (hasPendingSent) return true

  return false
}

// Enviar solicitação de conexão da sala
async function sendRoomConnectionRequest(userId) {
  try {
    const res = await fetch(`${API_BASE}/api/connections/request/${userId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token.value}` }
    })

    if (res.ok) {
      // Recarregar solicitações enviadas
      loadPendingRequests()
      alert('Solicitação enviada!')
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao enviar solicitação')
    }
  } catch (error) {
    console.error('Erro ao enviar solicitação:', error)
    alert('Erro ao enviar solicitação')
  }
}

// Enviar solicitação de conexão do modal de perfil
async function sendProfileConnectionRequest() {
  if (!profileUser.value?.id) return

  try {
    const res = await fetch(`${API_BASE}/api/connections/request/${profileUser.value.id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token.value}` }
    })

    if (res.ok) {
      loadPendingRequests()
      alert('Solicitação enviada!')
      showProfileModal.value = false
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao enviar solicitação')
    }
  } catch (error) {
    console.error('Erro ao enviar solicitação:', error)
    alert('Erro ao enviar solicitação')
  }
}

// Obter status da conexão com usuário
function getConnectionStatus(userId) {
  // conexões têm campo "id", não "user_id"
  const isConnected = connections.value.some(c => c.id === userId)
  if (isConnected) return '✓ Já são amigos'

  const hasPendingReceived = pendingRequests.value.some(r => r.user_id === userId)
  if (hasPendingReceived) return '⏳ Solicitação recebida'

  const hasPendingSent = sentRequests.value.some(r => r.user_id === userId)
  if (hasPendingSent) return '⏳ Solicitação enviada'

  return ''
}

// Reativar sala (apenas dono)
async function reactivateRoom() {
  if (!selectedRoom.value || !isRoomOwner.value) return

  try {
    const res = await fetch(`${API_BASE}/api/rooms/${selectedRoom.value.id}/reactivate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token.value}` }
    })

    if (res.ok) {
      selectedRoom.value.status = 'active'
      if (myRoom.value?.id === selectedRoom.value.id) {
        myRoom.value.status = 'active'
      }
      loadRooms()
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao reativar sala')
    }
  } catch (error) {
    console.error('Erro ao reativar sala:', error)
  }
}

// Handlers de socket para salas
async function handleRoomEntered(data) {
  selectedRoom.value = data.room
  roomUsers.value = data.users || []
  isRoomOwner.value = data.isOwner
  isRoomMuted.value = data.isMuted
  roomTypingUsers.value = new Set()
  roomMutedUsers.value = new Set()
  sidebarOpen.value = false

  // Carregar mensagens salvas do localStorage
  roomMessages.value = loadRoomMessages(data.room.id)

  // Se for dono, carregar lista de usuários silenciados
  if (data.isOwner) {
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${data.room.id}/mutes`, {
        headers: { 'Authorization': `Bearer ${token.value}` }
      })
      if (res.ok) {
        const mutes = await res.json()
        roomMutedUsers.value = new Set(mutes.map(m => m.user_id))
      }
    } catch (e) {
      console.error('Erro ao carregar mutes:', e)
    }
  }
}

function handleUserJoinedRoom(data) {
  if (!selectedRoom.value) return

  const exists = roomUsers.value.find(u => u.id === data.odestinandoId)
  if (!exists) {
    roomUsers.value.push({
      id: data.odestinandoId,
      nome: data.nome,
      idioma: data.idioma
    })
  }
}

function handleUserLeftRoom(data) {
  if (!selectedRoom.value) return

  roomUsers.value = roomUsers.value.filter(u => u.id !== data.odestinandoId)
  roomTypingUsers.value.delete(data.odestinandoId)
}

function handleRoomMessage(data) {
  // Salvar mensagem mesmo se não estiver na sala (para persistência)
  const roomId = data.roomId

  // Determinar se eu enviei a mensagem
  const euEnviei = data.euEnviei || data.senderId === currentUser.value?.id

  // Se estiver vendo esta sala, adiciona na tela
  if (selectedRoom.value?.id === roomId) {
    roomMessages.value.push({
      id: data.id,
      senderId: data.senderId,
      senderNome: data.senderNome,
      // Se eu enviei, sempre mostrar meu texto original
      texto: euEnviei ? data.textoOriginal : data.texto,
      textoOriginal: data.textoOriginal,
      idiomaOriginal: data.idiomaOriginal,
      timestamp: data.timestamp,
      cor: data.cor || '#ffffff',
      corNome: data.corNome || '#ffffff',
      euEnviei: euEnviei,
      showingOriginal: false
    })

    // Salvar no localStorage
    saveRoomMessages(roomId, roomMessages.value)

    // Auto scroll
    nextTick(() => {
      const container = document.querySelector('.messages-area')
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    })
  }

  // Som de notificação (se não for minha mensagem e som não estiver mudo)
  if (data.senderId !== currentUser.value?.id && !roomSoundMuted.value) {
    playRoomTick()
  }
}

function handleRoomTyping(data) {
  if (selectedRoom.value?.id !== data.roomId) return
  if (data.odestinandoId === currentUser.value?.id) return

  // Encontrar nome do usuário
  const user = roomUsers.value.find(u => u.id === data.odestinandoId)
  if (user) {
    roomTypingUsers.value.add(user.nome)
  }
}

function handleRoomStoppedTyping(data) {
  if (selectedRoom.value?.id !== data.roomId) return

  const user = roomUsers.value.find(u => u.id === data.odestinandoId)
  if (user) {
    roomTypingUsers.value.delete(user.nome)
  }
}

function handleKickedFromRoom(data) {
  if (selectedRoom.value?.id === data.roomId) {
    alert('Você foi expulso da sala.')
    leaveRoom()
  }
}

function handleBannedFromRoom(data) {
  if (selectedRoom.value?.id === data.roomId) {
    alert('Você foi banido desta sala.')
    leaveRoom()
  }
}

function handleMutedInRoom(data) {
  if (selectedRoom.value?.id === data.roomId) {
    isRoomMuted.value = true
    alert('Você foi silenciado pelo moderador.')
  }
}

function handleUnmutedInRoom(data) {
  if (selectedRoom.value?.id === data.roomId) {
    isRoomMuted.value = false
  }
}

function handleRoomClosed(data) {
  if (selectedRoom.value?.id === data.roomId) {
    alert('A sala foi encerrada pelo dono.')
    leaveRoom()
  }
}

function handleRoomFull(data) {
  alert(data.message || 'Esta sala está cheia. Tente criar uma nova sala.')
}

function handleRoomError(data) {
  alert(data.error || 'Erro na sala')
}

// ==================== PUSH NOTIFICATIONS ====================

async function setupPushNotifications() {
  // Verificar se push é suportado
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Push notifications não suportadas')
    return
  }

  try {
    // Solicitar permissão
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('[Push] Permissão negada')
      return
    }

    // Obter service worker registration
    const registration = await navigator.serviceWorker.ready

    // Buscar chave VAPID do servidor
    const vapidRes = await fetch(`${API_BASE}/api/push/vapid-key`)
    const { publicKey } = await vapidRes.json()

    // Converter chave para Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(publicKey)

    // Verificar se já tem subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Criar nova subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      })
    }

    // Registrar no servidor
    await fetch(`${API_BASE}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({ subscription })
    })

    console.log('[Push] Notificações configuradas com sucesso!')

    // Escutar mensagens do service worker
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)

  } catch (error) {
    console.error('[Push] Erro ao configurar:', error)
  }
}

// Converter base64 para Uint8Array (necessário para VAPID)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Lidar com mensagens do service worker (ex: clique na notificação de chamada)
function handleServiceWorkerMessage(event) {
  const { type, action, data } = event.data || {}

  if (type === 'notification-click') {
    if (data?.type === 'call') {
      if (action === 'accept') {
        // Aceitar chamada via push
        console.log('[Push] Aceitando chamada de', data.callerName)
        // A lógica de aceitar já acontece quando o app abre
      }
    }
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

  // Autenticar quando conectar (importante para mobile)
  socket.on('connect', () => {
    console.log('[Socket] Conectado, autenticando...')
    socket.emit('autenticar', token.value)
  })

  // Re-autenticar em reconexão (mobile pode perder conexão)
  socket.on('reconnect', () => {
    console.log('[Socket] Reconectado, re-autenticando...')
    socket.emit('autenticar', token.value)
  })

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
  socket.on('reacao-mensagem', handleMessageReaction)
  socket.on('mensagens-lidas', handleMessagesRead)

  // Eventos de chamada de vídeo
  socket.on('chamada-recebida', handleIncomingCall)
  socket.on('chamada-aceita', handleCallAccepted)
  socket.on('chamada-recusada', handleCallRejected)
  socket.on('chamada-encerrada', handleCallEnded)
  socket.on('chamada-erro', handleCallError)

  // Eventos de salas
  socket.on('sala-entrou', handleRoomEntered)
  socket.on('usuario-entrou-sala', handleUserJoinedRoom)
  socket.on('usuario-saiu-sala', handleUserLeftRoom)
  socket.on('sala-nova-mensagem', handleRoomMessage)
  socket.on('sala-usuario-digitando', handleRoomTyping)
  socket.on('sala-usuario-parou-digitar', handleRoomStoppedTyping)
  socket.on('expulso-da-sala', handleKickedFromRoom)
  socket.on('banido-da-sala', handleBannedFromRoom)
  socket.on('silenciado-na-sala', handleMutedInRoom)
  socket.on('dessilenciado-na-sala', handleUnmutedInRoom)
  socket.on('sala-encerrada', handleRoomClosed)
  socket.on('sala-cheia', handleRoomFull)
  socket.on('sala-erro', handleRoomError)

  // Carregar dados após pequeno delay para socket conectar
  setTimeout(() => {
    loadConnections()
    loadPendingRequests()
    loadRooms()
    loadMyRoom()

    // Configurar push notifications (solicita permissão)
    setupPushNotifications()
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

    // Verificar se há chat para abrir (vindo de push notification)
    const openChatId = localStorage.getItem('poly_open_chat')
    if (openChatId) {
      localStorage.removeItem('poly_open_chat')
      const conn = connections.value.find(c => c.connectionId === parseInt(openChatId))
      if (conn) {
        selectConnection(conn)
      }
    }
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
  // Limpar sala se estiver em uma
  if (selectedRoom.value) {
    leaveRoom()
  }

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
      lido: m.lido || false,
      reactions: m.reactions || [],
      showOriginal: false
    }))
    scrollToBottom()

    // Marcar mensagens recebidas como lidas
    if (socket && selectedConnection.value) {
      socket.emit('marcar-lidas', {
        connectionId: selectedConnection.value.connectionId,
        senderId: selectedConnection.value.id
      })
    }
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
    lido: !euEnviei,
    showOriginal: false,
    bubbleColor: euEnviei ? messageBubbleColor.value : null
  })
  scrollToBottom()

  // Se recebi uma mensagem (não fui eu que enviei), marcar como lida
  if (!euEnviei && socket && selectedConnection.value) {
    socket.emit('marcar-lidas', {
      connectionId: selectedConnection.value.connectionId,
      senderId: msg.senderId
    })
  }
}

async function exportChat() {
  if (!selectedConnection.value) return

  try {
    const meuNome = currentUser.value.nome
    const outroNome = selectedConnection.value.nome
    const dataExport = new Date().toLocaleString('pt-BR')

    // Gerar HTML das mensagens
    let messagesHtml = ''
    for (const msg of messages.value) {
      if (!msg.textoOriginal && !msg.texto_original) continue

      const texto = msg.textoOriginal || msg.texto_original || ''
      const traducao = msg.textoTraduzido || msg.texto_traduzido || ''
      const hora = new Date(msg.enviadoEm || msg.enviado_em).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
      const data = new Date(msg.enviadoEm || msg.enviado_em).toLocaleDateString('pt-BR')
      const euEnviei = msg.senderId === currentUser.value.id || msg.sender_id === currentUser.value.id
      const nomeRemetente = euEnviei ? meuNome : outroNome

      messagesHtml += `
        <div style="
          background: ${euEnviei ? '#1e1e3c' : '#191923'};
          border-radius: 8px;
          padding: 12px 15px;
          margin-bottom: 10px;
          ${euEnviei ? 'margin-left: 30px; border-right: 3px solid #6366f1;' : 'margin-right: 30px;'}
        ">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: ${euEnviei ? '#6366f1' : '#64c896'}; font-weight: bold; font-size: 11px;">
              ${nomeRemetente}
            </span>
            <span style="color: #888; font-size: 10px;">${data} ${hora}</span>
          </div>
          <div style="color: #fff; font-size: 13px; line-height: 1.5;">${texto}</div>
          ${traducao && traducao !== texto ? `
            <div style="color: #8282b4; font-size: 11px; font-style: italic; margin-top: 6px;">
              Tradução: ${traducao}
            </div>
          ` : ''}
        </div>
      `
    }

    // HTML completo do PDF
    const htmlContent = `
      <div id="pdf-content" style="
        background: #0a0a0a;
        color: #fff;
        padding: 30px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        min-height: 100%;
      ">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #6366f1;">
          <div style="font-size: 36px; font-weight: bold; margin-bottom: 8px;">
            <span style="color: #fff;">Poly</span><span style="color: #6366f1;">.io</span>
          </div>
          <div style="color: #888; font-size: 14px;">Chat profissional sem barreiras de idioma</div>
        </div>

        <!-- Info da conversa -->
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="font-size: 18px; font-weight: bold; color: #fff;">Conversa com ${outroNome}</div>
          <div style="color: #888; font-size: 12px; margin-top: 5px;">Exportado em ${dataExport}</div>
        </div>

        <div style="border-top: 1px solid #333; margin-bottom: 20px;"></div>

        <!-- Mensagens -->
        ${messagesHtml}

        <!-- Footer -->
        <div style="border-top: 1px solid #333; margin-top: 30px; padding-top: 15px; text-align: center;">
          <div style="color: #888; font-size: 11px;">Poly.io - Chat profissional sem barreiras de idioma</div>
        </div>
      </div>
    `

    // Criar elemento temporário
    const container = document.createElement('div')
    container.innerHTML = htmlContent
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '210mm'
    document.body.appendChild(container)

    // Configurar html2pdf
    const opt = {
      margin: 0,
      filename: `poly-io-${outroNome}-${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0a0a'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: 'avoid-all' }
    }

    // Gerar PDF
    await html2pdf().set(opt).from(container.firstChild).save()

    // Remover elemento temporário
    document.body.removeChild(container)

  } catch (error) {
    console.error('Erro ao exportar chat:', error)
    alert('Erro ao exportar: ' + error.message)
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

// ==================== REAÇÕES EM MENSAGENS ====================

function openEmojiPicker(msg) {
  reactingToMessage.value = msg
  emojiSearch.value = ''
  currentEmojiCategory.value = 'frequentes'
  showEmojiPicker.value = true
  msg.showMenu = false
}

function openEmojiPickerForInput() {
  reactingToMessage.value = null // null = inserir no input, não reagir
  emojiSearch.value = ''
  currentEmojiCategory.value = 'frequentes'
  showEmojiPicker.value = true
}

async function addReaction(emoji) {
  showEmojiPicker.value = false

  // Se não tem mensagem selecionada, inserir no input
  if (!reactingToMessage.value) {
    newMessage.value += emoji
    return
  }

  const msg = reactingToMessage.value

  try {
    const res = await fetch(`${API_URL}/chat/message/${msg.id}/reaction`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emoji })
    })

    if (res.ok) {
      const data = await res.json()
      // Atualizar reações da mensagem
      const message = messages.value.find(m => m.id === msg.id)
      if (message) {
        message.reactions = data.reactions.map(r => ({
          emoji: r.emoji,
          count: parseInt(r.count),
          userIds: r.user_ids
        }))
      }
    }
  } catch (error) {
    console.error('Erro ao adicionar reação:', error)
  }

  reactingToMessage.value = null
}

async function toggleReaction(msg, emoji) {
  const hasMyReaction = msg.reactions?.some(
    r => r.emoji === emoji && r.userIds?.includes(currentUser.value?.id)
  )

  try {
    const res = await fetch(`${API_URL}/chat/message/${msg.id}/reaction`, {
      method: hasMyReaction ? 'DELETE' : 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emoji })
    })

    if (res.ok) {
      const data = await res.json()
      // Atualizar reações
      const message = messages.value.find(m => m.id === msg.id)
      if (message) {
        message.reactions = data.reactions.map(r => ({
          emoji: r.emoji,
          count: parseInt(r.count),
          userIds: r.user_ids
        }))
      }
    }
  } catch (error) {
    console.error('Erro ao toggle reação:', error)
  }
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

// Handler para reação em mensagem (tempo real)
function handleMessageReaction(data) {
  if (selectedConnection.value?.connectionId !== data.connectionId) return

  const msg = messages.value.find(m => m.id === data.messageId)
  if (msg) {
    msg.reactions = data.reactions.map(r => ({
      emoji: r.emoji,
      count: parseInt(r.count),
      userIds: r.user_ids
    }))
  }
}

// Handler para mensagens lidas (tempo real)
function handleMessagesRead(data) {
  if (selectedConnection.value?.connectionId !== data.connectionId) return

  // Marcar todas as mensagens informadas como lidas
  data.messageIds.forEach(msgId => {
    const msg = messages.value.find(m => m.id === msgId)
    if (msg) {
      msg.lido = true
    }
  })
}

// ==================== CHAMADA DE VÍDEO (Jitsi) ====================

function startVideoCall() {
  if (!selectedConnection.value || !socket) return

  if (selectedConnection.value.status === 'offline') {
    alert('Usuário está offline. Não é possível iniciar chamada.')
    return
  }

  // Gerar nome da sala único
  const timestamp = Date.now()
  const roomName = `PolyIO-${selectedConnection.value.connectionId}-${timestamp}`

  // Enviar convite via socket
  socket.emit('iniciar-chamada', {
    recipientId: selectedConnection.value.id,
    connectionId: selectedConnection.value.connectionId,
    roomName
  })

  // Entrar na chamada imediatamente (aguardando o outro aceitar)
  activeCall.value = {
    roomName,
    remoteName: selectedConnection.value.nome,
    remoteId: selectedConnection.value.id,
    audioOnly: false
  }

  console.log('[Chamada] Iniciando vídeo:', roomName)
}

function startAudioCall() {
  if (!selectedConnection.value || !socket) return

  if (selectedConnection.value.status === 'offline') {
    alert('Usuário está offline. Não é possível iniciar chamada.')
    return
  }

  // Gerar nome da sala único
  const timestamp = Date.now()
  const roomName = `PolyIO-${selectedConnection.value.connectionId}-${timestamp}`

  // Enviar convite via socket (com flag de áudio)
  socket.emit('iniciar-chamada', {
    recipientId: selectedConnection.value.id,
    connectionId: selectedConnection.value.connectionId,
    roomName,
    audioOnly: true
  })

  // Entrar na chamada imediatamente (aguardando o outro aceitar)
  activeCall.value = {
    roomName,
    remoteName: selectedConnection.value.nome,
    remoteId: selectedConnection.value.id,
    audioOnly: true
  }

  console.log('[Chamada] Iniciando áudio:', roomName)
}

function handleIncomingCall(data) {
  const tipoLigacao = data.audioOnly ? 'áudio' : 'vídeo'
  console.log(`[Chamada] Recebida de ${data.callerName} (${tipoLigacao})`)
  incomingCall.value = data

  // Tocar som de chamada (opcional)
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdG2BnZ2tnJyMfnRwa3Z7f4qXqLa3sauknJOKhYCAg4mPl6Csua+lnpWMhYB/f4OIjpScoaalpaCblpCKhYODhomNkpacn5+dnJmWkoyJh4eIioyOkJKTk5OSkZCPjo2NjY2Ojg==')
    audio.volume = 0.5
    audio.play().catch(() => {})
  } catch (e) {}
}

function acceptCall() {
  if (!incomingCall.value || !socket) return

  const call = incomingCall.value

  // Notificar quem ligou
  socket.emit('aceitar-chamada', {
    callerId: call.callerId,
    roomName: call.roomName
  })

  // Entrar na chamada (preserva audioOnly do convite)
  activeCall.value = {
    roomName: call.roomName,
    remoteName: call.callerName,
    remoteId: call.callerId,
    audioOnly: call.audioOnly || false
  }

  // Limpar modal
  incomingCall.value = null

  const tipoLigacao = call.audioOnly ? 'áudio' : 'vídeo'
  console.log(`[Chamada] Aceita (${tipoLigacao}), entrando na sala:`, call.roomName)
}

function rejectCall() {
  if (!incomingCall.value || !socket) return

  socket.emit('recusar-chamada', {
    callerId: incomingCall.value.callerId
  })

  incomingCall.value = null
  console.log('[Chamada] Recusada')
}

function endCall() {
  if (!activeCall.value || !socket) return

  socket.emit('encerrar-chamada', {
    recipientId: activeCall.value.remoteId
  })

  activeCall.value = null
  console.log('[Chamada] Encerrada')
}

function handleCallAccepted(data) {
  console.log('[Chamada] Aceita pelo destinatário')
  // Já estamos na chamada, só confirma
}

function handleCallRejected(data) {
  console.log('[Chamada] Recusada pelo destinatário')
  activeCall.value = null
  alert('Chamada recusada')
}

function handleCallEnded(data) {
  console.log('[Chamada] Encerrada pelo outro usuário')
  activeCall.value = null
}

function handleCallError(data) {
  console.log('[Chamada] Erro:', data.error)
  activeCall.value = null
  alert(data.error)
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
  // Verificar se temos conexão selecionada e socket
  if (!selectedConnection.value || !socket) return

  // Verificar dados necessários
  const recipientId = selectedConnection.value.id
  const connectionId = selectedConnection.value.connectionId
  if (!recipientId || !connectionId) return

  const now = Date.now()
  // Emitir no máximo a cada 1 segundo (debounce)
  if (now - lastTypingEmit > 1000) {
    lastTypingEmit = now
    try {
      socket.emit('digitando', { recipientId, connectionId })
    } catch (e) {
      console.error('Erro ao emitir digitando:', e)
    }
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

// Som de tick suave para salas
function playRoomTick() {
  try {
    const ctx = getAudioContext()

    // Resumir contexto se estiver suspenso (política do navegador)
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime

    // Oscilador - frequência que cai (tick suave)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1)

    // Envelope de volume - audível mas suave
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0.3, now)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15)

    // Conectar
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Tocar
    osc.start(now)
    osc.stop(now + 0.15)
  } catch (e) {
    console.log('Áudio não suportado:', e)
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

function formatCountdown(timestamp) {
  const msgTime = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime()
  const expiresAt = msgTime + (60 * 60 * 1000) // 1 hora em ms
  const remaining = expiresAt - currentTime.value

  if (remaining <= 0) return 'Expirada'

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  if (minutes >= 60) {
    return '59:59'
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// ==================== STORAGE DE MENSAGENS DE SALA ====================

function saveRoomMessages(roomId, messages) {
  try {
    const key = `poly_room_messages_${roomId}`
    localStorage.setItem(key, JSON.stringify(messages))
  } catch (e) {
    console.warn('Erro ao salvar mensagens no localStorage:', e)
  }
}

function loadRoomMessages(roomId) {
  try {
    const key = `poly_room_messages_${roomId}`
    const saved = localStorage.getItem(key)
    if (!saved) return []

    const messages = JSON.parse(saved)
    const oneHourAgo = Date.now() - (60 * 60 * 1000)

    // Filtrar mensagens expiradas
    return messages.filter(msg => {
      const msgTime = typeof msg.timestamp === 'number' ? msg.timestamp : new Date(msg.timestamp).getTime()
      return msgTime > oneHourAgo
    })
  } catch (e) {
    console.warn('Erro ao carregar mensagens do localStorage:', e)
    return []
  }
}

function cleanExpiredRoomMessages() {
  try {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)

    // Limpar todas as salas salvas
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('poly_room_messages_')) {
        const messages = JSON.parse(localStorage.getItem(key) || '[]')
        const valid = messages.filter(msg => {
          const msgTime = typeof msg.timestamp === 'number' ? msg.timestamp : new Date(msg.timestamp).getTime()
          return msgTime > oneHourAgo
        })

        if (valid.length === 0) {
          localStorage.removeItem(key)
        } else if (valid.length !== messages.length) {
          localStorage.setItem(key, JSON.stringify(valid))
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao limpar mensagens expiradas:', e)
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// ==================== PWA UPDATE ====================

function updateApp() {
  if (swRegistration && swRegistration.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }
  showUpdatePrompt.value = false
  window.location.reload()
}

// ==================== LIFECYCLE ====================

onMounted(() => {
  checkResetToken()
  checkAuth()

  // Fechar dropdown de status ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.status-dropdown-wrapper')) {
      statusDropdownOpen.value = false
    }
  })

  // Detectar atualizações do Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      swRegistration = registration

      // Verificar se já há um SW esperando
      if (registration.waiting) {
        showUpdatePrompt.value = true
      }

      // Ouvir mudanças de estado
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdatePrompt.value = true
            }
          })
        }
      })
    })

    // Recarregar quando o SW assumir controle
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }

  // Verificar se há código de convite na URL
  const urlParams = new URLSearchParams(window.location.search)
  const inviteCode = urlParams.get('invite')
  if (inviteCode) {
    // Salvar para usar após login
    localStorage.setItem('poly_invite_code', inviteCode)
    // Limpar URL
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  // Verificar se há código de convite de SALA na URL
  const roomInviteCode = urlParams.get('sala')
  if (roomInviteCode) {
    localStorage.setItem('poly_room_invite', roomInviteCode.toUpperCase())
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  // Verificar se há chat para abrir (vindo de push notification)
  const openChatId = urlParams.get('openChat')
  if (openChatId) {
    localStorage.setItem('poly_open_chat', openChatId)
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  // Timer para remover mensagens expiradas das salas (1 hora)
  setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)

    // Limpar mensagens expiradas da tela
    if (roomMessages.value.length > 0) {
      const before = roomMessages.value.length
      roomMessages.value = roomMessages.value.filter(msg => {
        const msgTime = typeof msg.timestamp === 'number' ? msg.timestamp : new Date(msg.timestamp).getTime()
        return msgTime > oneHourAgo
      })

      // Se removeu alguma, atualizar localStorage
      if (roomMessages.value.length !== before && selectedRoom.value) {
        saveRoomMessages(selectedRoom.value.id, roomMessages.value)
      }
    }

    // Limpar mensagens expiradas do localStorage
    cleanExpiredRoomMessages()
  }, 60000) // Verifica a cada minuto
})

// Processar código de convite após login
watch(isLoggedIn, async (loggedIn) => {
  if (loggedIn) {
    // Verificar convite de usuário
    const inviteCode = localStorage.getItem('poly_invite_code')
    if (inviteCode) {
      localStorage.removeItem('poly_invite_code')
      setTimeout(() => {
        currentTab.value = 'search'
        codeQuery.value = inviteCode.toUpperCase()
        searchByCode()
      }, 500)
      return
    }

    // Verificar convite de sala
    const roomInviteCode = localStorage.getItem('poly_room_invite')
    if (roomInviteCode) {
      localStorage.removeItem('poly_room_invite')
      setTimeout(() => {
        joinRoomByInvite(roomInviteCode)
      }, 500)
    }
  }
})

watch(messages, scrollToBottom, { deep: true })

// Watch para detectar digitação (funciona melhor em mobile)
watch(newMessage, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    emitTyping()
  } else if (!newVal && oldVal) {
    emitStoppedTyping()
  }
})

// Watch para salvar cor do balão
watch(messageBubbleColor, (newColor) => {
  localStorage.setItem('poly_bubble_color', newColor)
})
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

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #888;
  cursor: pointer;
  margin-top: 4px;
}

.remember-me input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #6366f1;
  cursor: pointer;
}

.remember-me span {
  user-select: none;
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

.success-text {
  color: #22c55e;
  font-size: 0.875rem;
  margin-top: 16px;
}

.forgot-password-link {
  text-align: center;
  margin-top: 16px;
  font-size: 0.875rem;
}

.forgot-password-link a {
  color: #6366f1;
  text-decoration: none;
}

.forgot-password-link a:hover {
  text-decoration: underline;
}

.modal-subtitle {
  color: #888;
  font-size: 0.875rem;
  margin-bottom: 16px;
  text-align: center;
}

.reset-password-card {
  text-align: center;
}

.reset-password-card h3 {
  margin-bottom: 8px;
  color: #fff;
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

/* Status Dropdown */
.status-dropdown-wrapper {
  position: relative;
  flex: 1;
}

.status-dropdown-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #2a2a3a;
  border: 1px solid #3a3a4a;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  width: 100%;
  transition: all 0.2s;
}

.status-dropdown-btn:hover {
  background: #3a3a4a;
}

.status-dropdown-btn .status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dropdown-btn.online .status-dot { background: #10b981; }
.status-dropdown-btn.ausente .status-dot { background: #f59e0b; }
.status-dropdown-btn.ocupado .status-dot { background: #ef4444; }
.status-dropdown-btn.invisivel .status-dot { background: #6b7280; }

.status-dropdown-btn .status-label {
  flex: 1;
  text-align: left;
}

.status-dropdown-btn .dropdown-arrow {
  font-size: 10px;
  opacity: 0.6;
}

.status-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #1e1e2e;
  border: 1px solid #3a3a4a;
  border-radius: 10px;
  overflow: hidden;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.status-dropdown-item {
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #2a2a3a;
}

.status-dropdown-item:last-child {
  border-bottom: none;
}

.status-dropdown-item:hover {
  background: #2a2a3a;
}

.status-dropdown-item.active {
  background: #3a3a4a;
}

.status-item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.status-dropdown-item .status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dropdown-item.online .status-dot { background: #10b981; }
.status-dropdown-item.ausente .status-dot { background: #f59e0b; }
.status-dropdown-item.ocupado .status-dot { background: #ef4444; }
.status-dropdown-item.invisivel .status-dot { background: #6b7280; }

.status-name {
  font-weight: 600;
  font-size: 13px;
}

.status-desc {
  font-size: 11px;
  color: #888;
  margin: 0;
  padding-left: 20px;
  line-height: 1.4;
}

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

.powered-by {
  margin-top: 32px;
  font-size: 0.8rem;
  color: rgba(99, 102, 241, 0.65);
  text-align: center;
}

.powered-by a {
  color: rgba(99, 102, 241, 0.65);
  text-decoration: none;
  font-weight: 600;
}

.powered-by a:hover {
  color: #6366f1;
  text-decoration: underline;
}

.powered-subtitle {
  display: block;
  font-size: 0.75rem;
  margin-top: 4px;
  opacity: 0.8;
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

/* Botão de reagir */
.btn-react-msg {
  padding: 6px 10px;
  background: #333;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-react-msg:hover {
  background: #444;
}

/* Reações na mensagem */
.message-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.reaction-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  background: #2a2a3a;
  border: 1px solid #3a3a4a;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.reaction-badge:hover {
  background: #3a3a4a;
  border-color: #4a4a5a;
}

.reaction-badge.my-reaction {
  background: #3730a3;
  border-color: #4f46e5;
}

/* Emoji Picker estilo WhatsApp */
.emoji-picker-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1999;
}

.emoji-picker-popup {
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  width: 360px;
  max-width: calc(100vw - 20px);
  background: #1e1e2e;
  border-radius: 12px;
  box-shadow: 0 -4px 30px rgba(0,0,0,0.5);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.emoji-picker-popup.for-reaction {
  bottom: auto;
  top: 50%;
  transform: translate(-50%, -50%);
}

.emoji-picker-tabs {
  display: flex;
  background: #151520;
  padding: 4px 8px;
  gap: 2px;
  border-bottom: 1px solid #2a2a3a;
  overflow-x: auto;
}

.emoji-tab {
  font-size: 18px;
  padding: 8px 10px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  opacity: 0.5;
  transition: all 0.15s;
  flex-shrink: 0;
}

.emoji-tab:hover {
  opacity: 0.8;
  background: #2a2a3a;
}

.emoji-tab.active {
  opacity: 1;
  background: #3730a3;
}

.emoji-picker-search {
  padding: 8px 12px;
  background: #1a1a28;
}

.emoji-search-input {
  width: 100%;
  padding: 10px 14px;
  background: #252535;
  border: 1px solid #3a3a4a;
  border-radius: 20px;
  color: #fff;
  font-size: 14px;
  outline: none;
}

.emoji-search-input:focus {
  border-color: #4f46e5;
}

.emoji-search-input::placeholder {
  color: #666;
}

.emoji-picker-content {
  overflow-y: auto;
  max-height: 280px;
  padding: 8px;
}

.emoji-section {
  margin-bottom: 12px;
}

.emoji-section-title {
  font-size: 12px;
  color: #888;
  padding: 4px 8px;
  font-weight: 500;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

.emoji-btn {
  font-size: 24px;
  padding: 6px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-btn:hover {
  background: #2a2a3a;
  transform: scale(1.15);
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

.btn-delete-edit {
  padding: 6px 12px;
  background: #dc2626;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-delete-edit:hover {
  background: #b91c1c;
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

/* Mensagem só de emoji - grande e sem fundo */
.message.emoji-only .message-content {
  background: transparent !important;
  padding: 4px 0;
}

.message.emoji-only .message-content.emoji-only-content {
  background: transparent !important;
}

.message-text.emoji-large {
  font-size: 4rem;
  line-height: 1.2;
}

.message.emoji-only .message-time {
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 8px;
  border-radius: 8px;
  display: inline-block;
}

.message-time {
  display: block;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 6px;
}

.message.sent .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.read-status {
  margin-left: 4px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
}

.read-status.read {
  color: #22c55e;
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

.btn-show-original {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 2px 4px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-show-original:hover {
  opacity: 1;
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

/* Botão emoji no input */
.btn-emoji {
  width: 48px;
  height: 48px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 50%;
  font-size: 1.3rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-emoji:hover {
  border-color: #6366f1;
  background: #2a2a3a;
}

/* Botão cor do balão */
.btn-color-picker {
  position: relative;
  width: 48px;
  height: 48px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-color-picker:hover {
  border-color: #6366f1;
  background: #2a2a3a;
}

.color-input-hidden {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
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

/* Botão de chamada */
.btn-call {
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

.btn-call:hover:not(:disabled) {
  border-color: #22c55e;
  color: #22c55e;
}

.btn-call:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
  margin: 0;
}

.profile-name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.btn-edit-name {
  background: none;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
  padding: 4px;
}

.btn-edit-name:hover {
  opacity: 1;
}

.profile-name-input {
  background: #222;
  border: 1px solid #6366f1;
  border-radius: 6px;
  padding: 8px 12px;
  color: #fff;
  font-size: 1.2rem;
  font-weight: 600;
  text-align: center;
  width: 200px;
}

.profile-name-input:focus {
  outline: none;
  border-color: #818cf8;
}

.name-edit-buttons {
  display: flex;
  gap: 4px;
}

.btn-save-name,
.btn-cancel-name {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-save-name {
  color: #22c55e;
}

.btn-save-name:hover {
  background: rgba(34, 197, 94, 0.2);
}

.btn-cancel-name {
  color: #ef4444;
}

.btn-cancel-name:hover {
  background: rgba(239, 68, 68, 0.2);
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

.btn-add-friend-profile {
  margin-top: 20px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #4ade80, #22c55e);
  border: none;
  color: #000;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s;
  width: 100%;
}

.btn-add-friend-profile:hover {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  transform: translateY(-1px);
}

.connection-status {
  margin-top: 20px;
  padding: 12px 24px;
  background: #2a2a4a;
  border-radius: 8px;
  color: #888;
  font-size: 0.9rem;
  text-align: center;
}

.link-delete-account {
  display: block;
  margin-top: 25px;
  color: #ef4444;
  cursor: pointer;
  font-size: 0.85rem;
  text-decoration: none;
  transition: opacity 0.2s;
}

.link-delete-account:hover {
  opacity: 0.7;
  text-decoration: underline;
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
    width: 100%;
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
  .btn-speech,
  .btn-call {
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

  /* Chat header compacto no mobile */
  .chat-actions {
    gap: 6px;
  }

  .idioma-select {
    max-width: 90px;
    font-size: 0.65rem;
    padding: 4px 6px;
  }

  .translation-arrow {
    display: none;
  }

  .translation-badge {
    display: none;
  }

  .btn-icon {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
  }

  /* Indicador de digitação no mobile */
  .typing-indicator {
    position: fixed;
    bottom: 135px;
    left: 0;
    right: 0;
    padding: 6px 16px;
    background: #0a0a0a;
    z-index: 49;
  }

  .message-actions .btn-edit-msg,
  .message-actions .btn-delete-msg {
    width: 100%;
  }
}

/* ==================== CHAMADA DE VÍDEO ==================== */

/* Modal de chamada recebida */
.call-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.call-modal {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  max-width: 320px;
  animation: scaleIn 0.3s ease;
}

@keyframes scaleIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.call-icon {
  font-size: 48px;
  margin-bottom: 16px;
  animation: ring 1s ease-in-out infinite;
}

@keyframes ring {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-15deg); }
  75% { transform: rotate(15deg); }
}

.call-modal h3 {
  font-size: 1.2rem;
  color: #888;
  margin-bottom: 12px;
}

.caller-name {
  font-size: 1.5rem;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
}

.call-text {
  color: #888;
  margin-bottom: 24px;
}

.call-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-accept-call,
.btn-reject-call {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-accept-call {
  background: #22c55e;
  color: #fff;
}

.btn-accept-call:hover {
  background: #16a34a;
  transform: scale(1.05);
}

.btn-reject-call {
  background: #ef4444;
  color: #fff;
}

.btn-reject-call:hover {
  background: #dc2626;
  transform: scale(1.05);
}

/* Overlay de chamada ativa (Jitsi) */
.video-call-overlay {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.video-call-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
}

.video-call-header span {
  font-weight: 500;
}

.btn-end-call {
  background: #ef4444;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-end-call:hover {
  background: #dc2626;
}

.jitsi-iframe {
  flex: 1;
  width: 100%;
  border: none;
}

/* Botão de vídeo no header do chat */
.btn-video {
  transition: all 0.2s;
}

.btn-video:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-video:not(:disabled):hover {
  background: #22c55e !important;
}

/* Mobile: ajustar modal de chamada */
@media (max-width: 768px) {
  .call-modal {
    margin: 20px;
    padding: 30px 20px;
  }

  .call-buttons {
    flex-direction: column;
  }

  .btn-accept-call,
  .btn-reject-call {
    width: 100%;
  }

  .video-call-header {
    padding: 10px 16px;
  }
}

/* ==================== SALAS ==================== */

.my-room-section {
  margin-bottom: 16px;
}

.room-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #1a1a2e;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.room-item:hover {
  background: #252540;
}

.room-item.active {
  background: #6366f1;
}

.room-item.my-room {
  border: 1px solid #6366f1;
}

.room-icon {
  font-size: 1.5rem;
}

.room-icon-large {
  font-size: 2rem;
  margin-right: 8px;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-info .name {
  display: block;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-info .desc {
  display: block;
  font-size: 0.8rem;
  color: #888;
}

.room-item.my-room .room-info .desc,
.room-item.active .room-info .desc {
  color: rgba(255, 255, 255, 0.7);
}

.btn-create-room {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 16px;
  transition: transform 0.2s;
}

.btn-create-room:hover {
  transform: scale(1.02);
}

.btn-delete-room {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.btn-delete-room:hover {
  opacity: 1;
}

/* Modal criar sala */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #16213e;
  padding: 24px;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
}

.modal-content h3 {
  margin-bottom: 16px;
  color: #fff;
}

.room-form .form-group {
  margin-bottom: 16px;
}

.modal-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-secondary {
  flex: 1;
  padding: 10px;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Visibilidade da sala */
.room-visibility {
  margin-top: 8px;
}

.visibility-options {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.visibility-btn {
  flex: 1;
  padding: 10px 16px;
  background: #222;
  color: #888;
  border: 1px solid #333;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.visibility-btn:hover {
  background: #2a2a2a;
}

.visibility-btn.active {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
}

.visibility-hint {
  display: block;
  margin-top: 8px;
  color: #888;
  font-size: 0.8rem;
}

/* Header da sala */
.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-header-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-meta {
  font-size: 0.8rem;
  color: #888;
  display: block;
}

.owner-badge {
  background: #f59e0b;
  color: #000;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: 8px;
}

.muted-badge {
  background: #ef4444;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  margin-left: 8px;
}

.hidden-badge {
  background: #6b7280;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  margin-left: 8px;
}

.btn-reactivate {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  margin-right: 8px;
  transition: transform 0.2s;
}

.btn-reactivate:hover {
  transform: scale(1.05);
}

/* Sidebar de usuários da sala */
.room-users-sidebar {
  background: #0f0f1a;
  padding: 12px;
  border-bottom: 1px solid #333;
  max-height: 120px;
  overflow-y: auto;
  flex-shrink: 0;
}

.room-users-sidebar h5 {
  margin: 0 0 8px 0;
  font-size: 0.8rem;
  color: #888;
}

.room-user-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 0.85rem;
  position: relative;
}

.room-user-item .user-letter {
  width: 24px;
  height: 24px;
  background: #6366f1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
}

.room-user-item .user-name {
  color: #ccc;
}

.room-user-item .user-name.clickable {
  cursor: pointer;
  transition: color 0.2s;
}

.room-user-item .user-name.clickable:hover {
  color: #6366f1;
}

.owner-star {
  color: #f59e0b;
}

.btn-add-friend {
  background: transparent;
  border: 1px solid #4ade80;
  color: #4ade80;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.7rem;
  transition: all 0.2s;
  margin-left: 4px;
}

.btn-add-friend:hover {
  background: #4ade80;
  color: #000;
}

.mod-menu {
  display: inline-flex;
  gap: 4px;
  margin-left: 12px;
  vertical-align: middle;
}

.mod-menu button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  background: #2a2a4a;
  border: 1px solid #444;
  color: #ccc;
  font-size: 0.75rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  white-space: nowrap;
}

.mod-menu button:hover {
  background: #3a3a5a;
  color: #fff;
  border-color: #666;
}

/* Mensagens da sala */
.message-header {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 4px;
}

.message-header .sender-name {
  font-weight: 600;
  color: #6366f1;
  font-size: 0.85rem;
}

.message .message-header .sender-name {
  color: #6366f1;
}

.message.mine .message-header .sender-name {
  color: #10b981;
}

.message-time {
  font-size: 0.7rem;
  color: #666;
}

.message-time.countdown {
  color: #f59e0b;
  font-weight: 500;
  font-family: monospace;
}

/* Indicador de digitação na sala */
.room-typing-indicator {
  padding: 8px 16px;
  color: #888;
  font-size: 0.85rem;
  font-style: italic;
}

/* ==================== LAYOUT DA SALA ==================== */

/* Wrapper da sala - layout flexbox */
.room-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

/* Container das mensagens da sala - scrollable */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ==================== NOVO INPUT DE SALA ==================== */

.room-input-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%);
  border-top: 1px solid #2a2a4a;
  flex-shrink: 0;
}

.color-picker-wrapper {
  flex-shrink: 0;
}

.color-picker {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  background: transparent;
  padding: 0;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 4px;
}

.color-picker::-webkit-color-swatch {
  border-radius: 8px;
  border: 2px solid #3a3a5a;
}

.color-mode-toggle {
  display: flex;
  gap: 2px;
  margin-top: 4px;
}

.color-mode-toggle button {
  flex: 1;
  padding: 2px 4px;
  font-size: 0.65rem;
  background: #222;
  color: #666;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.color-mode-toggle button:hover {
  background: #333;
}

.color-mode-toggle button.active {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
}

.room-input-field {
  flex: 1;
  min-width: 0;
}

.room-input-field input {
  width: 100%;
  padding: 14px 20px;
  font-size: 1rem;
  background: #16213e;
  border: 2px solid #2a2a4a;
  border-radius: 12px;
  color: #fff;
  outline: none;
  transition: all 0.2s ease;
}

.room-input-field input::placeholder {
  color: #666;
}

.room-input-field input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.room-input-field input:disabled {
  background: #0f0f1a;
  cursor: not-allowed;
  opacity: 0.6;
}

.room-send-btn {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.room-send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}

.room-send-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.room-send-btn:disabled {
  background: #333;
  cursor: not-allowed;
  opacity: 0.5;
}

.room-send-btn .send-icon {
  font-size: 1.3rem;
}

.btn-participants {
  background: rgba(99, 102, 241, 0.2) !important;
  border: 1px solid rgba(99, 102, 241, 0.4) !important;
  font-size: 0.85rem !important;
  padding: 6px 10px !important;
}

.btn-participants:hover {
  background: rgba(99, 102, 241, 0.4) !important;
}

/* Modal de Participantes (mobile fullscreen) */
.participants-modal-overlay {
  display: none;
}

@media (max-width: 768px) {
  .participants-modal-overlay {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    align-items: flex-start;
    justify-content: center;
    padding-top: 0;
  }

  .participants-modal {
    width: 100%;
    height: 100%;
    background: #0a0a14;
    display: flex;
    flex-direction: column;
  }

  .participants-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: #1a1a2e;
    border-bottom: 1px solid #333;
  }

  .participants-modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #fff;
  }

  .btn-close-participants {
    background: transparent;
    border: none;
    color: #888;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 4px 8px;
  }

  .btn-close-participants:hover {
    color: #fff;
  }

  .participants-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .participant-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 12px;
    background: #1a1a2e;
    border-radius: 10px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .participant-item:active {
    background: #2a2a4a;
  }

  .participant-letter {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
    flex-shrink: 0;
  }

  .participant-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .participant-name {
    font-size: 1rem;
    color: #fff;
    font-weight: 500;
  }

  .participant-owner {
    font-size: 0.8rem;
    color: #f59e0b;
  }

  .participant-you {
    font-size: 0.8rem;
    color: #888;
  }

  .participant-add {
    font-size: 1.2rem;
    padding: 8px;
    background: rgba(74, 222, 128, 0.2);
    border-radius: 8px;
  }
}

@media (max-width: 768px) {
  /* Esconder lista inline no mobile - usa modal */
  .room-users-sidebar {
    display: none !important;
  }

  .btn-participants {
    font-size: 0.85rem !important;
    padding: 6px 10px !important;
  }
}

/* PWA Update Prompt */
.update-prompt {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.update-content {
  display: flex;
  align-items: center;
  gap: 15px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  padding: 12px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
  font-size: 0.95rem;
}

.update-actions {
  display: flex;
  gap: 8px;
}

.btn-update {
  background: #fff;
  color: #6366f1;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-update:hover {
  transform: scale(1.05);
}

.btn-later {
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-later:hover {
  background: rgba(255, 255, 255, 0.1);
}

@media (max-width: 480px) {
  .update-prompt {
    bottom: 10px;
    left: 10px;
    right: 10px;
    transform: none;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .update-content {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
}
</style>
