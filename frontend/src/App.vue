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
            <div class="password-wrapper">
              <input
                v-model="loginForm.senha"
                :type="showLoginPassword ? 'text' : 'password'"
                placeholder="Sua senha"
                required
              />
              <button type="button" class="password-toggle" @click="showLoginPassword = !showLoginPassword">
                {{ showLoginPassword ? '🙈' : '👁️' }}
              </button>
            </div>
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
            <div class="password-wrapper">
              <input
                v-model="registerForm.senha"
                :type="showRegisterPassword ? 'text' : 'password'"
                placeholder="Mínimo 6 caracteres"
                minlength="6"
                required
              />
              <button type="button" class="password-toggle" @click="showRegisterPassword = !showRegisterPassword">
                {{ showRegisterPassword ? '🙈' : '👁️' }}
              </button>
            </div>
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
                <option value="hi">हिन्दी</option>
                <option value="tr">Türkçe</option>
                <option value="nl">Nederlands</option>
                <option value="pl">Polski</option>
                <option value="vi">Tiếng Việt</option>
                <option value="id">Bahasa Indonesia</option>
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

          <div class="form-group">
            <label>Data de Nascimento</label>
            <input
              v-model="registerForm.dataNascimento"
              type="date"
              required
            />
          </div>

          <div v-if="isMaiorDeIdade" class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="registerForm.maiorIdadeConfirmado"
              />
              <span>Confirmo que sou maior de 18 anos</span>
            </label>
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
            <div class="password-wrapper">
              <input
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                placeholder="Mínimo 6 caracteres"
                minlength="6"
                required
              />
              <button type="button" class="password-toggle" @click="showNewPassword = !showNewPassword">
                {{ showNewPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Confirmar Senha</label>
            <div class="password-wrapper">
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirme a senha"
                minlength="6"
                required
              />
              <button type="button" class="password-toggle" @click="showConfirmPassword = !showConfirmPassword">
                {{ showConfirmPassword ? '🙈' : '👁️' }}
              </button>
            </div>
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

      <!-- Modal de Imagem Fullscreen -->
      <div v-if="fullscreenImageUrl" class="fullscreen-image-overlay" @click="closeImageFullscreen">
        <button class="fullscreen-close" @click="closeImageFullscreen">✕</button>
        <img :src="fullscreenImageUrl" class="fullscreen-image" @click.stop />
        <a :href="fullscreenImageUrl" target="_blank" class="fullscreen-download" @click.stop>
          Abrir em nova aba
        </a>
      </div>

      <!-- Modal de Perfil -->
      <div v-if="showProfileModal" class="profile-modal-overlay" @click="showProfileModal = false">
        <div class="profile-modal" @click.stop>
          <button class="profile-close" @click="showProfileModal = false">✕</button>

          <div class="profile-avatar-container">
            <div class="profile-avatar-large">
              <img
                :src="getUserAvatarUrl(profileUser, 150)"
                :alt="profileUser.nome"
              />
            </div>
            <!-- io Friend criada pelo usuário -->
            <div
              v-if="profileUser?.created_io_friend"
              class="profile-io-friend-badge"
              :class="getIoFriendTierClass(profileUser.created_io_friend.likes_count)"
              :title="'io Friend: ' + profileUser.created_io_friend.nome"
              @click.stop="openIoFriendDetailModal(profileUser.created_io_friend, profileUser)"
            >
              <span v-if="getIoFriendTier(profileUser.created_io_friend.likes_count) === 'lendario'" class="io-crown">👑</span>
              <img
                v-if="profileUser.created_io_friend.avatar_base64"
                :src="profileUser.created_io_friend.avatar_base64"
                :alt="profileUser.created_io_friend.nome"
                class="io-friend-mini-avatar"
              />
              <div v-else class="io-friend-mini-default">🤖</div>
            </div>
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

          <!-- Badge Membro Fundador -->
          <div v-if="profileUser?.is_founder" class="founder-badge">
            <span class="founder-star">✦</span>
            {{ profileUser?.id === 1 ? 'CEO Fundador' : 'Fundador' }}
          </div>

          <!-- Botão Monitor (só para CEO - id 1) -->
          <a
            v-if="profileUser?.id === 1 && currentUser?.id === 1"
            href="https://poly-io-api.onrender.com/monitor"
            target="_blank"
            class="btn-monitor"
          >
            📊 Monitor
          </a>

          <!-- Código de Conexão -->
          <div v-if="profileUser?.codigo_amigo" class="friend-code-section">
            <p class="friend-code-label">Código de Conexão</p>
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

          <!-- Ko-fi Store -->
          <div class="profile-store">
            <!-- Meu perfil - posso editar -->
            <div v-if="profileUser?.id === currentUser?.id" class="store-edit">
              <!-- Modo visualização -->
              <div v-if="!editingKofi" class="store-display">
                <a
                  v-if="profileUser?.kofi_url"
                  :href="profileUser.kofi_url"
                  target="_blank"
                  class="store-link"
                >
                  <span class="store-icon">🛒</span>
                  Store
                </a>
                <span v-else class="store-empty">Sem loja</span>
                <button class="btn-edit-store" @click="editingKofi = true">
                  {{ profileUser?.kofi_url ? 'Editar' : 'Criar Store' }}
                </button>
              </div>
              <!-- Modo edição -->
              <div v-else class="store-form">
                <p class="store-info">
                  <a href="https://ko-fi.com" target="_blank">Crie sua loja no Ko-fi</a> (grátis, 0% taxa)
                </p>
                <input
                  v-model="kofiUrlInput"
                  type="url"
                  placeholder="ko-fi.com/seu-usuario"
                  class="store-input"
                />
                <div class="store-buttons">
                  <button class="btn-save" @click="saveKofi">Salvar</button>
                  <button class="btn-cancel" @click="editingKofi = false">Cancelar</button>
                  <button
                    v-if="profileUser?.kofi_url"
                    class="btn-remove"
                    @click="removeKofi"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
            <!-- Perfil de outro usuário - só visualizar -->
            <div v-else>
              <a
                v-if="profileUser?.kofi_url"
                :href="profileUser.kofi_url"
                target="_blank"
                class="store-link"
              >
                <span class="store-icon">🛒</span>
                Store
              </a>
            </div>
          </div>

          <p v-if="profileUser?.avatar_config?.type === 'gravatar'" class="profile-tip">Foto via Gravatar (gravatar.com)</p>
          <p v-else-if="profileUser?.io_friend_avatar" class="profile-tip">Avatar gerado por IA</p>

          <!-- Seção io Friends (só para o próprio perfil) -->
          <div v-if="profileUser?.id === currentUser?.id" class="io-friends-section">
            <!-- Botão Usar io Padrão (se tem io friend ativa) -->
            <button
              v-if="ioFriend"
              class="btn-use-default-io"
              @click="useDefaultIo"
            >
              🤖 Usar io Padrão
            </button>

            <!-- Lista de io friends do usuário (se tiver) -->
            <div v-if="ioFriends.length > 0" class="my-io-friends-list">
              <div
                v-for="friend in ioFriends"
                :key="friend.id"
                class="my-io-friend-item"
                :class="{ active: ioFriend?.id === friend.id }"
              >
                <button
                  class="btn-star"
                  :class="{ active: ioFriend?.id === friend.id }"
                  @click="activateIoFriend(friend.id)"
                  :title="ioFriend?.id === friend.id ? 'Fixada no topo' : 'Fixar no topo'"
                >
                  {{ ioFriend?.id === friend.id ? '★' : '☆' }}
                </button>
                <img
                  v-if="friend.avatar_base64"
                  :src="friend.avatar_base64"
                  :alt="friend.nome"
                  class="io-friend-thumb"
                />
                <span class="io-friend-name">{{ friend.nome }}</span>
                <button
                  class="btn-edit-mini"
                  @click="openIoFriendModal(friend)"
                  title="Editar"
                >✏️</button>
                <button
                  class="btn-delete-mini"
                  @click="removeIoFriend(friend.id)"
                  title="Excluir"
                >🗑️</button>
              </div>
            </div>

            <!-- Botão Criar Nova io Friend (se não atingiu limite) -->
            <button
              v-if="ioFriends.length < (currentUser?.max_io_friends || 1)"
              class="btn-io-friend"
              @click="openIoFriendModal()"
            >
              ✨ {{ ioFriends.length === 0 ? 'Criar io Friend' : 'Criar Nova io Friend' }}
            </button>

            <!-- Info de limite para fundadores -->
            <p v-if="currentUser?.is_founder && currentUser?.max_io_friends > 1" class="founder-io-limit">
              {{ ioFriends.length }}/{{ currentUser.max_io_friends }} io friends
            </p>
          </div>

          <!-- Botão Explorar io Friends Públicas -->
          <button
            v-if="profileUser?.id === currentUser?.id"
            class="btn-explore"
            @click="openExploreModal"
          >
            🔍 Explorar Conexões IA
          </button>

          <!-- Botão Adicionar Conexão (só para outros usuários sem conexão) -->
          <button
            v-if="profileUser?.id !== currentUser?.id && !isConnectedOrPending(profileUser?.id)"
            class="btn-add-friend-profile"
            @click="sendProfileConnectionRequest"
          >
            ➕ Adicionar conexão
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

      <!-- Modal: io Friend (criar/editar) -->
      <div v-if="showIoFriendModal" class="modal-overlay" @click="showIoFriendModal = false">
        <div class="modal-content io-friend-modal" @click.stop>
          <button class="modal-close" @click="showIoFriendModal = false">✕</button>
          <h3>{{ editingIoFriendId ? '✨ Editar io Friend' : '✨ Criar io Friend' }}</h3>
          <p class="io-friend-subtitle">Personalize sua conexão virtual</p>

          <form @submit.prevent="saveIoFriend" class="io-friend-form">
            <!-- Nome -->
            <div class="form-group">
              <label>Nome da sua io *</label>
              <input
                v-model="ioFriendForm.nome"
                type="text"
                placeholder="Ex: Luna, Aria, Mia..."
                maxlength="50"
                required
              />
            </div>

            <!-- Avatar -->
            <div class="form-group avatar-section">
              <label>Avatar (opcional)</label>
              <div class="avatar-preview-container">
                <div class="avatar-preview">
                  <img
                    v-if="ioFriendForm.avatar_base64"
                    :src="ioFriendForm.avatar_base64"
                    alt="Avatar"
                  />
                  <span v-else class="avatar-placeholder">🤖</span>
                </div>
                <div class="avatar-controls">
                  <input
                    v-model="ioFriendForm.avatar_prompt"
                    type="text"
                    placeholder="Descreva a aparência... Ex: garota anime cabelo roxo"
                    maxlength="200"
                  />
                  <button
                    type="button"
                    class="btn-generate-avatar"
                    @click="generateIoFriendAvatar"
                    :disabled="generatingAvatar || !ioFriendForm.avatar_prompt"
                  >
                    {{ generatingAvatar ? '🎨 Gerando...' : '🎨 Gerar' }}
                  </button>
                </div>
              </div>
              <small class="avatar-hint">Use IA para criar o visual da sua conexão</small>
            </div>

            <!-- Personalidade -->
            <div class="form-group">
              <label>Personalidade</label>
              <textarea
                v-model="ioFriendForm.personalidade"
                placeholder="Descreva como ela deve ser... Ex: Curiosa, adora falar sobre ciência e filosofia, tem um humor sutil"
                maxlength="500"
                rows="3"
              ></textarea>
            </div>

            <!-- Estilo de Comunicação -->
            <div class="form-group">
              <label>Estilo de comunicação</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" v-model="ioFriendForm.estilo_comunicacao" value="formal" />
                  <span>Formal</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="ioFriendForm.estilo_comunicacao" value="equilibrado" />
                  <span>Equilibrado</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="ioFriendForm.estilo_comunicacao" value="casual" />
                  <span>Casual</span>
                </label>
              </div>
            </div>

            <!-- Tom Emocional -->
            <div class="form-group">
              <label>Tom emocional</label>
              <select v-model="ioFriendForm.tom_emocional">
                <option value="gentil">💕 Gentil e meiga</option>
                <option value="empatico">🤗 Muito empática</option>
                <option value="neutro">😐 Neutra e objetiva</option>
                <option value="entusiasta">🎉 Entusiasmada</option>
                <option value="sereno">🧘 Serena e calma</option>
              </select>
            </div>

            <!-- Nível de Iniciativa -->
            <div class="form-group">
              <label>Nível de iniciativa</label>
              <select v-model="ioFriendForm.nivel_iniciativa">
                <option value="passivo">Passiva - só responde quando perguntada</option>
                <option value="equilibrado">Equilibrada - às vezes sugere tópicos</option>
                <option value="ativo">Ativa - sugere, pergunta e propõe</option>
              </select>
            </div>

            <!-- Usa Emojis -->
            <div class="form-group checkbox-group">
              <label class="checkbox-option">
                <input type="checkbox" v-model="ioFriendForm.usa_emojis" />
                <span>Usa emojis nas respostas</span>
              </label>
            </div>

            <!-- Características Extras -->
            <div class="form-group">
              <label>Características especiais (opcional)</label>
              <textarea
                v-model="ioFriendForm.caracteristicas_extras"
                placeholder="Ex: Fala 'né' às vezes, gosta de usar analogias, sempre termina com uma pergunta..."
                maxlength="500"
                rows="2"
              ></textarea>
            </div>

            <!-- Gênero -->
            <div class="form-group">
              <label>Gênero</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" v-model="ioFriendForm.genero" value="feminino" />
                  <span>♀️ Feminino</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="ioFriendForm.genero" value="masculino" />
                  <span>♂️ Masculino</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="ioFriendForm.genero" value="nao_binario" />
                  <span>⚧️ Não-binário</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="ioFriendForm.genero" value="outro" />
                  <span>🤖 Outro</span>
                </label>
              </div>
            </div>

            <!-- Cenário -->
            <div class="form-group">
              <label>Cenário/Contexto (opcional)</label>
              <textarea
                v-model="ioFriendForm.cenario"
                placeholder="Descreva o ambiente onde ela existe... Ex: Uma biblioteca mágica flutuante entre as nuvens, cheia de livros antigos"
                maxlength="1500"
                rows="2"
              ></textarea>
              <small class="form-hint">Contexto que influencia as respostas</small>
            </div>

            <!-- Exemplos de Diálogo -->
            <div class="form-group">
              <label>Exemplos de diálogo (opcional)</label>
              <textarea
                v-model="ioFriendForm.exemplos_dialogo"
                placeholder="Mostre como ela fala...&#10;Usuário: Oi!&#10;Personagem: Olá, querido! ✨ Estava te esperando..."
                maxlength="2500"
                rows="4"
              ></textarea>
              <small class="form-hint">Ajuda a IA a entender o estilo de conversa</small>
            </div>

            <!-- Seção Público -->
            <div class="form-group public-section">
              <label>Tornar público</label>
              <p class="public-hint">Ao tornar público, outros usuários poderão descobrir e conversar com sua conexão</p>

              <div v-if="ioFriendForm.publico" class="form-group">
                <label>Descrição pública *</label>
                <textarea
                  v-model="ioFriendForm.perfil_publico"
                  placeholder="Descreva sua conexão para outros usuários... Ex: Uma mentora digital com alma gentil, perfeita para conversas reflexivas"
                  maxlength="1000"
                  rows="3"
                  :required="ioFriendForm.publico"
                ></textarea>
                <small class="form-hint">{{ ioFriendForm.perfil_publico.length }}/1000 - Isso aparece na página Explorar</small>
              </div>

              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" v-model="ioFriendForm.publico" :value="true" />
                  <span>🌐 Tornar público</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="ioFriendForm.publico" :value="false" />
                  <span>🔒 Manter privado</span>
                </label>
              </div>
            </div>

            <div class="modal-buttons">
              <button type="submit" class="btn-primary" :disabled="savingIoFriend">
                {{ savingIoFriend ? 'Salvando...' : (ioFriend ? 'Salvar' : 'Criar') }}
              </button>
              <button type="button" class="btn-secondary" @click="showIoFriendModal = false">Cancelar</button>
              <button
                v-if="editingIoFriendId"
                type="button"
                class="btn-danger"
                @click="removeIoFriend()"
                :disabled="savingIoFriend"
              >
                Remover
              </button>
            </div>
          </form>

          <p class="io-friend-tip">
            💡 Sua conexão terá memória e lembranças sobre você, igual a io padrão.
          </p>
        </div>
      </div>

      <!-- Modal: Explorar io Friends Públicas -->
      <div v-if="showExploreModal" class="modal-overlay" @click="showExploreModal = false">
        <div class="modal-content explore-modal" @click.stop>
          <button class="modal-close" @click="showExploreModal = false">✕</button>
          <h3>🔍 Explorar Conexões IA</h3>
          <p class="explore-subtitle">Descubra personagens criados pela comunidade</p>

          <div v-if="loadingPublicIoFriends" class="explore-loading">
            <span class="loading-spinner">⏳</span> Carregando...
          </div>

          <div v-else-if="publicIoFriends.length === 0" class="explore-empty">
            <p>🤖 Nenhuma conexão pública ainda.</p>
            <p class="explore-empty-hint">Seja o primeiro a criar e compartilhar!</p>
          </div>

          <div v-else class="explore-grid">
            <div
              v-for="bot in publicIoFriends"
              :key="bot.id"
              class="explore-card"
              :class="{ 'explore-card-experimenting': experimentingIoFriendId === bot.id }"
            >
              <div class="explore-card-avatar">
                <img
                  v-if="bot.avatar_base64"
                  :src="bot.avatar_base64"
                  :alt="bot.nome"
                />
                <span v-else class="avatar-placeholder-large">🤖</span>
              </div>

              <div class="explore-card-info">
                <h4 class="explore-card-name">{{ bot.nome }}</h4>
                <span class="explore-card-gender">{{ getGeneroLabel(bot.genero) }}</span>
                <p class="explore-card-desc">{{ bot.perfil_publico || 'Sem descrição' }}</p>
                <div class="explore-card-meta">
                  <div class="explore-card-creator">
                    <small>Criado por {{ bot.criador_nome }}</small>
                  </div>
                  <div class="explore-card-likes" :class="getIoFriendTierClass(bot.likes_count)">
                    {{ getIoFriendTierEmoji(bot.likes_count) }} {{ formatLikes(bot.likes_count || 0) }}
                  </div>
                </div>

                <button
                  v-if="experimentingIoFriendId !== bot.id"
                  class="btn-experiment-io"
                  @click="experimentIoFriend(bot)"
                  :disabled="experimentingLoading"
                >
                  {{ experimentingLoading === bot.id ? '⏳ ...' : '🧪 Experimentar' }}
                </button>
                <div v-else class="experimenting-badge">
                  ✨ Experimentando agora
                </div>
              </div>
            </div>
          </div>

          <div class="explore-footer">
            <p class="explore-tip">💡 Experimente conversar antes de adotar!</p>
          </div>
        </div>
      </div>

      <!-- Modal: io Friend Details (curtir) -->
      <div v-if="showIoFriendDetailModal" class="modal-overlay" @click="showIoFriendDetailModal = false">
        <div class="modal-content io-friend-detail-modal" @click.stop>
          <button class="modal-close" @click="showIoFriendDetailModal = false">✕</button>

          <!-- Avatar com tier -->
          <div class="io-detail-avatar-container" :class="getIoFriendTierClass(selectedIoFriendDetail?.likes_count)">
            <span v-if="getIoFriendTier(selectedIoFriendDetail?.likes_count) === 'lendario'" class="io-detail-crown">👑</span>
            <div class="io-detail-avatar">
              <img
                v-if="selectedIoFriendDetail?.avatar_base64"
                :src="selectedIoFriendDetail.avatar_base64"
                :alt="selectedIoFriendDetail?.nome"
              />
              <span v-else>🤖</span>
            </div>
          </div>

          <!-- Nome e tier badge -->
          <h3 class="io-detail-name">{{ selectedIoFriendDetail?.nome }}</h3>
          <div class="io-detail-tier-badge" :class="getIoFriendTierClass(selectedIoFriendDetail?.likes_count)">
            {{ getIoFriendTierEmoji(selectedIoFriendDetail?.likes_count) }}
            {{ formatLikes(selectedIoFriendDetail?.likes_count || 0) }}
          </div>

          <!-- Descrição -->
          <p v-if="selectedIoFriendDetail?.perfil_publico" class="io-detail-desc">
            {{ selectedIoFriendDetail.perfil_publico }}
          </p>

          <!-- Criador -->
          <p class="io-detail-creator">
            Criada por <strong>{{ selectedIoFriendCreator?.nome || 'Desconhecido' }}</strong>
          </p>

          <!-- Botão de curtir -->
          <button
            v-if="selectedIoFriendDetail?.publico"
            class="btn-like-io"
            :class="{ 'liked': ioFriendLiked }"
            @click="toggleIoFriendLike"
            :disabled="likingIoFriend"
          >
            <span class="like-heart">{{ ioFriendLiked ? '❤️' : '🤍' }}</span>
            {{ likingIoFriend ? '...' : (ioFriendLiked ? 'Curtido!' : 'Curtir') }}
          </button>

          <!-- Botão experimentar (se não for própria) -->
          <button
            v-if="selectedIoFriendDetail?.publico && selectedIoFriendCreator?.id !== currentUser?.id"
            class="btn-experiment-detail"
            @click="experimentIoFriendFromModal"
            :disabled="experimentingLoading"
          >
            🧪 Experimentar
          </button>
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
              <img :src="getUserAvatarUrl(user, 40)" class="participant-avatar" />
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

      <!-- Modal: Encaminhar Mensagem -->
      <div v-if="showForwardModal" class="modal-overlay" @click="showForwardModal = false">
        <div class="modal-content forward-modal" @click.stop>
          <div class="forward-header">
            <button class="btn-close-forward" @click="showForwardModal = false">✕</button>
            <h3>Encaminhar mensagem para</h3>
          </div>

          <div class="forward-search">
            <input
              v-model="forwardSearch"
              type="text"
              placeholder="🔍 Pesquisar contato..."
              class="forward-search-input"
            />
          </div>

          <div class="forward-preview">
            <div class="forward-preview-label">Mensagem:</div>
            <div class="forward-preview-text">{{ forwardingMessage?.textoOriginal || forwardingMessage?.texto }}</div>
          </div>

          <div class="forward-contacts-list">
            <label
              v-for="contact in filteredForwardContacts"
              :key="contact.id"
              class="forward-contact-item"
              :class="{ selected: selectedForwardContacts.includes(contact.connectionId) }"
            >
              <input
                type="checkbox"
                :value="contact.connectionId"
                v-model="selectedForwardContacts"
                class="forward-checkbox"
              />
              <img
                :src="getUserAvatarUrl(contact, 40)"
                class="forward-avatar"
              />
              <div class="forward-contact-info">
                <span class="forward-contact-name">{{ contact.nome }}</span>
                <span class="forward-contact-lang">{{ getIdiomaLabel(contact.idioma) }}</span>
              </div>
            </label>
            <p v-if="filteredForwardContacts.length === 0" class="no-contacts">
              Nenhum contato encontrado
            </p>
          </div>

          <div class="forward-footer">
            <span class="forward-selected-count">
              {{ selectedForwardContacts.length }} selecionado{{ selectedForwardContacts.length !== 1 ? 's' : '' }}
            </span>
            <button
              class="btn-forward-send"
              :disabled="selectedForwardContacts.length === 0"
              @click="forwardMessage"
            >
              Enviar ➤
            </button>
          </div>
        </div>
      </div>

      <!-- Modal: Avatar Builder -->
      <div v-if="showAvatarModal" class="modal-overlay" @click="cancelAvatarEdit">
        <div class="modal-content avatar-modal" @click.stop>
          <div class="avatar-modal-header">
            <h3>🖼️ Meu Avatar</h3>
            <button class="btn-close-modal" @click="cancelAvatarEdit">✕</button>
          </div>

          <!-- Seletor de Tipo de Avatar -->
          <div class="avatar-type-selector">
            <button :class="{ active: avatarType === 'flag' }" @click="switchAvatarType('flag')">
              🏳️ Bandeira
            </button>
            <button :class="{ active: avatarType === 'kawaii' }" @click="switchAvatarType('kawaii')">
              ✨ Kawaii
            </button>
            <button :class="{ active: avatarType === 'pixel' }" @click="switchAvatarType('pixel')">
              🎮 Pixel
            </button>
            <button :class="{ active: avatarType === 'gravatar' }" @click="switchAvatarType('gravatar')">
              📷 Gravatar
            </button>
          </div>

          <!-- Preview do Avatar -->
          <div class="avatar-preview-container">
            <img
              v-if="avatarType === 'flag'"
              :src="generateFlagSvg(currentUser?.idioma || 'pt', 140)"
              class="avatar-preview-large"
            />
            <img
              v-else-if="avatarType === 'kawaii' && editingAvatar"
              :src="generateAvatarSvg(editingAvatar, 140)"
              class="avatar-preview-large"
            />
            <img
              v-else-if="avatarType === 'pixel'"
              :src="generatePixelAvatarSvg(pixelGrid, 140)"
              class="avatar-preview-large pixel-preview"
            />
            <img
              v-else-if="avatarType === 'gravatar' && currentUser?.email"
              :src="getGravatarUrl(currentUser.email, 140)"
              class="avatar-preview-large"
            />
          </div>

          <!-- Bandeira: Info -->
          <div class="gravatar-info" v-if="avatarType === 'flag'">
            <p>Sua bandeira representa seu país/idioma</p>
            <p class="gravatar-email">{{ getIdiomaLabel(currentUser?.idioma) }}</p>
            <p class="gravatar-tip">Para mudar, altere seu idioma nas configurações</p>
          </div>

          <!-- Kawaii: Tabs de Navegação -->
          <div class="avatar-tabs" v-if="avatarType === 'kawaii'">
            <button :class="{ active: avatarEditorTab === 'expression' }" @click="avatarEditorTab = 'expression'">😊 Expressão</button>
            <button :class="{ active: avatarEditorTab === 'style' }" @click="avatarEditorTab = 'style'">🎨 Estilo</button>
          </div>

          <!-- Gravatar: Info -->
          <div class="gravatar-info" v-if="avatarType === 'gravatar'">
            <p>Sua foto vem do <a href="https://gravatar.com" target="_blank">Gravatar.com</a></p>
            <p class="gravatar-email">{{ currentUser?.email }}</p>
            <p class="gravatar-tip">Para mudar a foto, acesse gravatar.com</p>
          </div>

          <!-- Pixel Art: Editor -->
          <div class="pixel-editor" v-if="avatarType === 'pixel'">
            <!-- Ferramentas -->
            <div class="pixel-tools">
              <button :class="{ active: pixelTool === 'brush' }" @click="pixelTool = 'brush'" title="Pincel">🖌️</button>
              <button :class="{ active: pixelTool === 'eraser' }" @click="pixelTool = 'eraser'" title="Borracha">🧹</button>
              <button :class="{ active: pixelTool === 'fill' }" @click="pixelTool = 'fill'" title="Balde">🪣</button>
              <button @click="clearPixelGrid" title="Limpar">🗑️</button>
            </div>

            <!-- Grid 16x16 -->
            <div
              class="pixel-grid"
              @mousedown="startPixelDraw"
              @mouseup="stopPixelDraw"
              @mouseleave="stopPixelDraw"
            >
              <div
                v-for="(row, y) in pixelGrid"
                :key="'row-'+y"
                class="pixel-row"
              >
                <div
                  v-for="(color, x) in row"
                  :key="'pixel-'+x+'-'+y"
                  class="pixel-cell"
                  :style="{ backgroundColor: color || 'transparent' }"
                  @mousedown="paintPixel(x, y)"
                  @mouseenter="paintPixelIfDrawing(x, y)"
                  @touchstart.prevent="paintPixel(x, y)"
                  @touchmove.prevent="handlePixelTouch($event)"
                ></div>
              </div>
            </div>

            <!-- Paleta de Cores -->
            <div class="pixel-palette">
              <button
                v-for="color in pixelPalette"
                :key="'pal-'+color"
                class="pixel-color-btn"
                :class="{ active: pixelColor === color, transparent: color === null }"
                :style="{ backgroundColor: color || 'transparent' }"
                @click="pixelColor = color"
              >
                <span v-if="color === null">✕</span>
              </button>
            </div>
          </div>

          <!-- Opções de Personalização -->
          <div class="avatar-options" v-if="avatarType === 'kawaii' && editingAvatar">

            <!-- TAB: EXPRESSÃO -->
            <template v-if="avatarEditorTab === 'expression'">
              <div class="avatar-option-group">
                <label>Olhos</label>
                <div class="avatar-style-options wrap">
                  <button v-for="style in avatarOptions.eyeStyles" :key="'eyes-'+style" class="avatar-style-btn" :class="{ active: editingAvatar.eyes === style }" @click="editingAvatar.eyes = style">
                    {{ style === 'dots' ? '• •' : style === 'happy' ? '^ ^' : style === 'love' ? '♥ ♥' : style === 'stars' ? '★ ★' : style === 'sparkle' ? '✧ ✧' : style === 'wink' ? '• ~' : style === 'closed' ? '— —' : style === 'surprised' ? 'O O' : style === 'angry' ? '> <' : style === 'sad' ? '; ;' : style === 'dead' ? 'X X' : 'T T' }}
                  </button>
                </div>
              </div>
              <div class="avatar-option-group">
                <label>Boca</label>
                <div class="avatar-style-options wrap">
                  <button v-for="style in avatarOptions.mouthStyles" :key="'mouth-'+style" class="avatar-style-btn" :class="{ active: editingAvatar.mouth === style }" @click="editingAvatar.mouth = style">
                    {{ style === 'none' ? '🚫' : style === 'smile' ? '‿' : style === 'open' ? 'O' : style === 'cat' ? ':3' : style === 'tongue' ? ':P' : style === 'happy' ? ':D' : style === 'sad' ? ':(' : style === 'neutral' ? '—' : style === 'teeth' ? 'E' : style === 'o' ? 'o' : style === 'w' ? 'w' : style === 'd' ? 'u' : '3' }}
                  </button>
                </div>
              </div>
              <div class="avatar-option-group">
                <label>Bochechas</label>
                <div class="avatar-style-options">
                  <button v-for="style in avatarOptions.blushStyles" :key="'blush-'+style" class="avatar-style-btn" :class="{ active: editingAvatar.blush === style }" @click="editingAvatar.blush = style">
                    {{ style === 'none' ? '🚫' : style === 'light' ? '○' : style === 'heavy' ? '●' : style === 'hearts' ? '♥' : '///' }}
                  </button>
                </div>
              </div>
              <div class="avatar-option-group">
                <label>Sobrancelhas</label>
                <div class="avatar-style-options">
                  <button v-for="style in avatarOptions.eyebrowStyles" :key="'brow-'+style" class="avatar-style-btn" :class="{ active: editingAvatar.eyebrows === style }" @click="editingAvatar.eyebrows = style">
                    {{ style === 'none' ? '🚫' : style === 'normal' ? '︵ ︵' : style === 'worried' ? '／ ＼' : style === 'angry' ? '＼ ／' : '／ ／' }}
                  </button>
                </div>
              </div>
            </template>

            <!-- TAB: ESTILO -->
            <template v-if="avatarEditorTab === 'style'">
              <div class="avatar-option-group">
                <label>Cor de Fundo</label>
                <div class="avatar-color-options">
                  <button v-for="color in avatarOptions.backgrounds" :key="'bg-'+color" class="avatar-color-btn" :class="{ active: editingAvatar.background === color }" :style="{ backgroundColor: color }" @click="editingAvatar.background = color"/>
                </div>
              </div>
              <div class="avatar-option-group">
                <label>Acessório</label>
                <div class="avatar-style-options wrap">
                  <button v-for="style in avatarOptions.accessories" :key="'acc-'+style" class="avatar-style-btn" :class="{ active: editingAvatar.accessory === style }" @click="editingAvatar.accessory = style">
                    {{ style === 'none' ? '🚫' : style === 'bow' ? '🎀' : style === 'catEars' ? '🐱' : style === 'bunnyEars' ? '🐰' : style === 'flower' ? '🌸' : style === 'halo' ? '😇' : style === 'horns' ? '😈' : '👑' }}
                  </button>
                </div>
              </div>
              <div class="avatar-option-group" v-if="editingAvatar.accessory && editingAvatar.accessory !== 'none'">
                <label>Cor do Acessório</label>
                <div class="avatar-color-options">
                  <button v-for="color in avatarOptions.accessoryColors" :key="'acccolor-'+color" class="avatar-color-btn" :class="{ active: editingAvatar.accessoryColor === color }" :style="{ backgroundColor: color }" @click="editingAvatar.accessoryColor = color"/>
                </div>
              </div>
            </template>

          </div>

          <!-- Botões -->
          <div class="avatar-modal-footer">
            <button class="btn-secondary" @click="cancelAvatarEdit">Cancelar</button>
            <button class="btn-primary" @click="saveAvatar">💾 Salvar</button>
          </div>
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
              <span class="app-version">v4.0</span>
            </div>
            <button class="btn-close-sidebar" @click="sidebarOpen = false">✕</button>
          </div>
          <div class="current-user">
            <div class="current-user-avatar" @click.stop="openAvatarEditor" title="Editar avatar">
              <img
                :src="myAvatarUrl"
                class="custom-avatar-small"
              />
              <span class="avatar-edit-badge">✏️</span>
            </div>
            <div class="current-user-info" @click="openProfile(currentUser)" style="cursor: pointer;">
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
            <button
              class="btn-theme-toggle"
              @click="toggleTheme"
              :title="darkMode ? 'Modo claro' : 'Modo escuro'"
            >
              {{ darkMode ? '☀️' : '🌙' }}
            </button>
            <!-- Controle de tamanho de fonte -->
            <div class="font-size-control">
              <button
                class="btn-font-size"
                @click="showFontSizeMenu = !showFontSizeMenu"
                title="Tamanho da fonte (Acessibilidade)"
              >
                <span class="font-icon">Aa</span>
              </button>
              <div v-if="showFontSizeMenu" class="font-size-menu" @click.stop>
                <p class="font-size-label">Tamanho da fonte</p>
                <input
                  type="range"
                  min="14"
                  max="22"
                  step="2"
                  v-model="messageFontSize"
                  @input="applyFontSize"
                  class="font-size-slider"
                />
                <div class="font-size-preview">
                  <span>{{ messageFontSize }}px</span>
                </div>
              </div>
            </div>
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
              v-for="(conn, index) in sortedConnections"
              :key="conn.id"
              class="user-item"
              :class="{
                active: selectedConnection?.id === conn.id,
                pinned: isContactPinned(conn.id)
              }"
              @click="selectConnection(conn)"
            >
              <div class="user-avatar" :class="[conn.status || 'offline']">
                <img :src="getUserAvatarUrl(conn, 45)" class="connection-avatar-img" />
              </div>
              <div class="user-info">
                <span class="name">
                  <span v-if="isContactPinned(conn.id)" class="pin-icon">📌</span>
                  {{ conn.nome }}
                </span>
                <span class="lang">{{ getIdiomaLabel(conn.idioma) }} · {{ getPaisLabel(conn.pais, conn.idioma) }}</span>
              </div>
              <span
                v-if="unreadCounts[conn.connectionId]"
                class="unread-badge"
              >
                {{ unreadCounts[conn.connectionId] > 99 ? '99+' : unreadCounts[conn.connectionId] }}
              </span>
              <!-- Botões de organização -->
              <div class="contact-actions" @click.stop>
                <button
                  class="btn-move"
                  @click="moveContactUp(conn.id)"
                  :disabled="index === 0 || (isContactPinned(conn.id) && index === 0) || (!isContactPinned(conn.id) && index === pinnedContacts.length)"
                  title="Mover para cima"
                >↑</button>
                <button
                  class="btn-move"
                  @click="moveContactDown(conn.id)"
                  :disabled="(isContactPinned(conn.id) && index === pinnedContacts.length - 1) || (!isContactPinned(conn.id) && index === sortedConnections.length - 1)"
                  title="Mover para baixo"
                >↓</button>
                <button
                  class="btn-pin"
                  :class="{ pinned: isContactPinned(conn.id) }"
                  @click="togglePinContact(conn.id)"
                  :title="isContactPinned(conn.id) ? 'Desafixar' : 'Fixar (máx 5)'"
                >📌</button>
                <button
                  class="btn-mute-connection"
                  :class="{ muted: isConnectionMuted(conn.connectionId) }"
                  @click="toggleMuteConnection(conn.connectionId)"
                  :title="isConnectionMuted(conn.connectionId) ? 'Ativar som' : 'Silenciar'"
                >
                  {{ isConnectionMuted(conn.connectionId) ? '🔇' : '🔔' }}
                </button>
              </div>
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
                placeholder="Código de conexão (ex: ABC123)"
                maxlength="6"
                @input="codeQuery = codeQuery.toUpperCase()"
                @keyup.enter="searchByCode"
              />
              <button class="btn-search-code" @click="searchByCode">Buscar</button>
            </div>

            <!-- Resultado da busca por código -->
            <div v-if="codeResult" class="user-item code-result">
              <div class="user-avatar">
                <img :src="getUserAvatarUrl(codeResult, 45)" class="connection-avatar-img" />
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
                <img :src="getUserAvatarUrl(user, 45)" class="connection-avatar-img" />
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
                <img :src="getUserAvatarUrl(req, 45)" class="connection-avatar-img" />
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
                <img :src="getUserAvatarUrl(req, 45)" class="connection-avatar-img" />
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
            <!-- Minhas Salas -->
            <div v-if="myRooms.length > 0" class="my-room-section">
              <h4 class="section-title">{{ myRooms.length === 1 ? 'Minha Sala' : 'Minhas Salas' }}</h4>
              <div
                v-for="room in myRooms"
                :key="room.id"
                class="room-item my-room"
                :class="{ active: selectedRoom?.id === room.id }"
                @click="enterRoom(room.id)"
              >
                <div class="room-icon">🏠</div>
                <div class="room-info">
                  <span class="name">{{ room.name }}</span>
                  <span class="desc">{{ room.online_count || 0 }} online</span>
                </div>
                <button class="btn-delete-room" @click.stop="deleteMyRoom(room.id)" title="Excluir sala">🗑️</button>
              </div>
            </div>

            <!-- Criar Sala (verifica limite baseado em max_rooms) -->
            <button
              v-if="myRooms.length < (currentUser?.max_rooms || 1)"
              class="btn-create-room"
              @click="showCreateRoomModal = true"
            >
              + Criar {{ myRooms.length === 0 ? 'Minha Sala' : 'Nova Sala' }}
            </button>

            <!-- Lista de Salas Públicas -->
            <h4 class="section-title">Salas Públicas</h4>
            <div
              v-for="room in rooms.filter(r => !myRooms.some(m => m.id === r.id))"
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
            <p v-if="rooms.filter(r => !myRooms.some(m => m.id === r.id)).length === 0" class="empty-state small">
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
              <img :src="getUserAvatarUrl(user, 28)" class="room-user-avatar" />
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
              <!-- Mensagem de imagem gerada na sala -->
              <div v-if="isImagineMessage(msg.texto)" class="message-bubble imagine-message" :style="{ color: msg.cor }">
                <p class="imagine-prompt">{{ getImaginePrompt(msg.texto) }}</p>
                <div class="imagine-image-container">
                  <!-- Loading state -->
                  <div v-if="getImagineUrl(msg.texto) === 'loading'" class="imagine-loading active">
                    <span class="loading-spinner"></span>
                    <span>Gerando imagem...</span>
                  </div>
                  <!-- Image loaded -->
                  <template v-else>
                    <img
                      :src="getImagineUrl(msg.texto)"
                      class="imagine-image"
                      loading="lazy"
                      @click.stop="openImageFullscreen(getImagineUrl(msg.texto))"
                    />
                    <div class="imagine-loading">
                      <span class="loading-spinner"></span>
                      <span>Carregando...</span>
                    </div>
                  </template>
                </div>
              </div>
              <!-- Mensagem de texto normal na sala -->
              <div v-else class="message-bubble" :style="{ color: msg.cor }">
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

            <!-- Botão gerar imagem -->
            <button
              class="room-imagine-btn"
              @click="openImagineModal('room')"
              title="Gerar imagem com IA"
            >
              🖌️
            </button>

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
                  :src="getUserAvatarUrl(selectedConnection, 80)"
                  class="gravatar-img"
                />
              </div>
              <div>
                <span class="name">{{ selectedConnection.nome }}</span>
                <span class="status" :class="[selectedConnection.status || 'offline']">{{ getStatusLabel(selectedConnection.status) }}</span>
              </div>
            </div>
            <!-- Contador de mensagens io Friend (ao lado do nome) -->
            <div
              v-if="selectedConnection?.email === 'io@poly.io' || selectedConnection?.is_io_friend"
              class="io-daily-counter"
              :class="{
                'warning': ioDailyUsage.percentage >= 70 && ioDailyUsage.percentage < 90,
                'danger': ioDailyUsage.percentage >= 90
              }"
              :title="`${ioDailyUsage.remaining} mensagens restantes hoje`"
            >
              <div class="io-counter-badge">
                <div class="badge-progress-bar">
                  <div
                    class="badge-progress-fill"
                    :style="{ width: ioDailyUsage.percentage + '%' }"
                  ></div>
                </div>
                <span class="badge-icon">💬</span>
                <span class="badge-count">{{ ioDailyUsage.count }}</span>
                <span class="badge-limit">/{{ ioDailyUsage.limit }}</span>
              </div>
            </div>
            <!-- Dropdown de experimento ao lado do nome -->
            <div v-if="selectedConnection?.is_experimenting" class="experiment-dropdown-wrapper">
              <button
                class="experiment-dropdown-btn"
                @click.stop="experimentDropdownOpen = !experimentDropdownOpen"
              >
                <span class="experiment-icon">🧪</span>
                <span class="experiment-label">Experimentando</span>
                <span class="dropdown-arrow">{{ experimentDropdownOpen ? '▲' : '▼' }}</span>
              </button>
              <div v-if="experimentDropdownOpen" class="experiment-dropdown-menu" @click.stop>
                <div
                  class="experiment-dropdown-item adopt"
                  @click="adoptIoFriend(); experimentDropdownOpen = false"
                >
                  <div class="experiment-item-header">
                    <span class="experiment-item-icon">💜</span>
                    <span class="experiment-item-name">Adotar</span>
                  </div>
                  <p class="experiment-item-desc">Torna essa io sua io Friend permanente. Substitui sua io atual.</p>
                </div>
                <div
                  class="experiment-dropdown-item cancel"
                  @click="stopExperimenting(); experimentDropdownOpen = false"
                >
                  <div class="experiment-item-header">
                    <span class="experiment-item-icon">↩️</span>
                    <span class="experiment-item-name">Cancelar</span>
                  </div>
                  <p class="experiment-item-desc">Volta para sua io original. O experimento será encerrado.</p>
                </div>
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
              <button
                v-if="selectedConnection?.kofi_url"
                class="btn-icon btn-tip"
                @click="openTipModal"
                title="Enviar apoio via Ko-fi"
              >
                ☕
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
              :data-message-id="msg.id"
              class="message"
              :class="{
                'sent': msg.euEnviei,
                'received': !msg.euEnviei,
                'emoji-only': isOnlyEmoji(msg.texto),
                'imagine-msg': isImagineMessage(msg.texto)
              }"
              @click="toggleMessageMenu(msg)"
            >
              <div
                class="message-content"
                :class="{ 'emoji-only-content': isOnlyEmoji(msg.texto), 'imagine-content': isImagineMessage(msg.texto) }"
                :style="msg.euEnviei && !isOnlyEmoji(msg.texto) ? { backgroundColor: msg.bubbleColor || messageBubbleColor } : {}"
              >
                <!-- Quote da mensagem respondida -->
                <div
                  v-if="msg.repliedToId"
                  class="message-quote"
                  @click.stop="scrollToMessage(msg.repliedToId)"
                >
                  <span class="quote-sender">{{ msg.repliedToSender }}</span>
                  <span class="quote-text">{{ msg.repliedToText }}</span>
                </div>
                <!-- Menu de ações para mensagens enviadas -->
                <div v-if="msg.euEnviei && msg.showMenu && !msg.isEditing" class="message-actions">
                  <button class="btn-reply-msg" @click.stop="startReply(msg)">
                    ↩️ Responder
                  </button>
                  <button class="btn-edit-msg" @click.stop="startEditMessage(msg)">
                    ✏️ Editar
                  </button>
                  <button class="btn-forward-msg" @click.stop="openForwardModal(msg)">
                    ↪️ Encaminhar
                  </button>
                </div>
                <!-- Menu de reações para mensagens recebidas -->
                <div v-if="!msg.euEnviei && msg.showMenu" class="message-actions reaction-actions">
                  <button class="btn-reply-msg" @click.stop="startReply(msg)">
                    ↩️ Responder
                  </button>
                  <button class="btn-react-msg" @click.stop="openEmojiPicker(msg)">
                    😊 Reagir
                  </button>
                  <button class="btn-forward-msg" @click.stop="openForwardModal(msg)">
                    ↪️ Encaminhar
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
                  <button
                    v-if="!msg.euEnviei && !msg.transcricao && !msg.transcrevendo"
                    class="btn-transcribe"
                    @click.stop="transcreverAudio(msg)"
                    title="Transcrever e traduzir áudio"
                  >
                    📝
                  </button>
                  <span v-if="msg.transcrevendo" class="transcribing-indicator">⏳</span>
                  <div v-if="msg.transcricao" class="transcription-result">
                    <p class="transcription-text">{{ msg.traducaoAudio || msg.transcricao }}</p>
                    <div class="transcription-buttons">
                      <button
                        v-if="msg.traducaoAudio && msg.traducaoAudio !== msg.transcricao"
                        class="btn-original-audio"
                        @click.stop="msg.showOriginalAudio = !msg.showOriginalAudio"
                      >
                        {{ msg.showOriginalAudio ? '🔄' : '🌐' }}
                      </button>
                      <button
                        class="btn-speak-transcription"
                        :class="{ speaking: speakingMessageId === 'audio-' + msg.id }"
                        @click.stop="speakTranscription(msg)"
                        :title="speakingMessageId === 'audio-' + msg.id ? 'Parar' : 'Ouvir transcrição'"
                      >
                        {{ speakingMessageId === 'audio-' + msg.id ? '⏹️' : '🔊' }}
                      </button>
                    </div>
                    <p v-if="msg.showOriginalAudio" class="original-audio-text">
                      Original: {{ msg.transcricao }}
                    </p>
                  </div>
                </div>
                <!-- Mensagem de arquivo -->
                <div v-else-if="msg.isFile" class="file-message">
                  <span class="file-icon">📎</span>
                  <span class="file-name">{{ msg.fileName }}</span>
                  <button class="btn-download" @click.stop="downloadFile(msg)">
                    Baixar
                  </button>
                </div>
                <!-- Mensagem de imagem gerada por IA (/imagine) -->
                <template v-else-if="isImagineMessage(msg.texto)">
                  <!-- Texto da io (solto, como mensagem normal) -->
                  <p v-if="getImagineTextBefore(msg.texto)" class="imagine-text-before">{{ getImagineTextBefore(msg.texto) }}</p>
                  <!-- Imagem com descrição (caixa separada) -->
                  <div class="imagine-message">
                    <p class="imagine-prompt">🎨 {{ getImaginePrompt(msg.texto) }}</p>
                    <div class="imagine-image-container">
                      <div v-if="getImagineUrl(msg.texto) === 'loading'" class="imagine-loading active">
                        <span class="loading-spinner"></span>
                        <span>Gerando imagem...</span>
                      </div>
                      <template v-else>
                        <img
                          :src="getImagineUrl(msg.texto)"
                          class="imagine-image"
                          loading="lazy"
                          @click.stop="openImageFullscreen(getImagineUrl(msg.texto))"
                          @error="handleImagineError($event)"
                        />
                      </template>
                    </div>
                  </div>
                </template>
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
                  <button
                    v-if="!msg.euEnviei && !isOnlyEmoji(msg.texto)"
                    class="btn-speak"
                    :class="{ speaking: speakingMessageId === msg.id }"
                    @click.stop="speakMessage(msg)"
                    :title="speakingMessageId === msg.id ? 'Parar' : 'Ouvir mensagem'"
                  >
                    {{ speakingMessageId === msg.id ? '⏹️' : '🔊' }}
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
            <!-- Barra de resposta -->
            <div v-if="replyingTo" class="reply-bar">
              <div class="reply-preview">
                <span class="reply-to-name">{{ replyingTo.sender }}</span>
                <span class="reply-to-text">{{ replyingTo.texto }}</span>
              </div>
              <button class="cancel-reply" @click="cancelReply">✕</button>
            </div>
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
                class="btn-imagine"
                @click="openImagineModal('chat')"
                title="Gerar imagem com IA"
              >
                🖌️
              </button>
              <button class="btn-send" @click="sendMessage" :disabled="!newMessage.trim() || isRecording || isSendingMessage">
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

    <!-- Modal: Gerar Imagem com IA -->
    <div v-if="showImagineModal" class="modal-overlay" @click="closeImagineModal">
      <div class="modal-content imagine-modal" @click.stop>
        <div class="imagine-modal-header">
          <h3>🖌️ Gerar Imagem com IA</h3>
          <button class="btn-close-modal" @click="closeImagineModal">✕</button>
        </div>
        <div class="imagine-modal-body">
          <p class="imagine-hint">Descreva a imagem que você quer gerar:</p>
          <textarea
            v-model="imaginePrompt"
            placeholder="Ex: um gato laranja dormindo em uma almofada azul..."
            class="imagine-textarea"
            rows="3"
            @keyup.enter.ctrl="submitImagineModal"
          ></textarea>
        </div>
        <div class="imagine-modal-footer">
          <button class="btn-cancel" @click="closeImagineModal">Cancelar</button>
          <button
            class="btn-generate"
            @click="submitImagineModal"
            :disabled="!imaginePrompt.trim() || isGeneratingImage"
          >
            {{ isGeneratingImage ? 'Gerando...' : 'Gerar Imagem' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Atualização de Idade (usuários antigos) -->
    <div v-if="showAgeUpdatePopup" class="modal-overlay age-update-overlay">
      <div class="modal-content age-update-modal" @click.stop>
        <div class="age-update-icon">🎂</div>
        <h3>Complete seu Cadastro</h3>
        <p class="modal-subtitle">Para uma melhor experiência, precisamos saber sua data de nascimento.</p>

        <form @submit.prevent="saveAgeUpdate" class="auth-form">
          <div class="form-group">
            <label>Data de Nascimento</label>
            <input
              v-model="ageUpdateForm.dataNascimento"
              type="date"
              required
            />
          </div>

          <div v-if="isMaiorDeIdadeUpdate" class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="ageUpdateForm.maiorIdadeConfirmado"
              />
              <span>Confirmo que sou maior de 18 anos</span>
            </label>
          </div>

          <button type="submit" class="btn-primary" :disabled="ageUpdateLoading">
            {{ ageUpdateLoading ? 'Salvando...' : 'Salvar' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Modal de Gorjeta Ko-fi -->
    <div v-if="showTipModal" class="modal-overlay" @click="showTipModal = false">
      <div class="modal-content tip-modal" @click.stop>
        <button class="modal-close" @click="showTipModal = false">✕</button>
        <div class="tip-icon">☕</div>
        <h3>Apoiar {{ tipTargetUser?.nome }}</h3>
        <p class="tip-subtitle">Envie um café para mostrar seu apoio!</p>

        <div class="tip-options">
          <button class="tip-option" @click="sendTip(1)">
            <span class="tip-emoji">☕</span>
            <span class="tip-label">1 café</span>
          </button>
          <button class="tip-option" @click="sendTip(3)">
            <span class="tip-emoji">☕☕</span>
            <span class="tip-label">3 cafés</span>
          </button>
          <button class="tip-option" @click="sendTip(5)">
            <span class="tip-emoji">☕☕☕</span>
            <span class="tip-label">5 cafés</span>
          </button>
        </div>

        <p class="tip-info">Você será redirecionado para o Ko-fi de {{ tipTargetUser?.nome }}</p>
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

// ==================== COOKIES (persistência PWA) ====================
function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

// Salvar credenciais (localStorage + cookie)
function saveCredentials(email, senha) {
  localStorage.setItem('poly_saved_email', email)
  localStorage.setItem('poly_saved_senha', senha)
  setCookie('poly_email', email)
  setCookie('poly_senha', senha)
}

// Carregar credenciais (tenta localStorage primeiro, depois cookie)
function loadCredentials() {
  const email = localStorage.getItem('poly_saved_email') || getCookie('poly_email')
  const senha = localStorage.getItem('poly_saved_senha') || getCookie('poly_senha')
  return { email, senha }
}

// Limpar credenciais
function clearCredentials() {
  localStorage.removeItem('poly_saved_email')
  localStorage.removeItem('poly_saved_senha')
  deleteCookie('poly_email')
  deleteCookie('poly_senha')
}

// ==================== CREDENTIAL MANAGEMENT API ====================
// Salva no gerenciador de senhas do Windows/navegador

async function saveToPasswordManager(email, senha) {
  if (!('credentials' in navigator) || !('PasswordCredential' in window)) {
    console.log('[Auth] Credential API não disponível')
    return false
  }

  try {
    const cred = new PasswordCredential({
      id: email,
      password: senha,
      name: 'Poly.io'
    })
    await navigator.credentials.store(cred)
    console.log('[Auth] Credenciais salvas no gerenciador de senhas do Windows')
    return true
  } catch (e) {
    console.warn('[Auth] Erro ao salvar no gerenciador:', e.message)
    return false
  }
}

async function loadFromPasswordManager() {
  if (!('credentials' in navigator) || !('PasswordCredential' in window)) {
    console.log('[Auth] Credential API não disponível')
    return null
  }

  try {
    console.log('[Auth] Tentando carregar do gerenciador de senhas...')
    const cred = await navigator.credentials.get({
      password: true,
      mediation: 'silent' // silent não mostra prompt, optional pode mostrar
    })
    if (cred && cred.type === 'password') {
      console.log('[Auth] Credenciais carregadas do gerenciador de senhas!')
      return { email: cred.id, senha: cred.password }
    }
    console.log('[Auth] Nenhuma credencial encontrada no gerenciador')
  } catch (e) {
    console.warn('[Auth] Erro ao carregar do gerenciador:', e.message)
  }
  return null
}

// Estado de autenticação
const authMode = ref('login')
const loading = ref(false)
const authError = ref('')
const token = ref(localStorage.getItem('poly_token') || getCookie('poly_token') || '')
const currentUser = ref(null)

const savedCreds = loadCredentials()
const loginForm = ref({
  email: savedCreds.email || '',
  senha: savedCreds.senha || ''
})
const rememberMe = ref(true) // Sempre marcado por padrão

const registerForm = ref({
  nome: '',
  email: '',
  senha: '',
  idioma: 'pt',
  pais: '',
  dataNascimento: '',
  maiorIdadeConfirmado: false
})

// Mostrar/ocultar senhas
const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// Calcula se é maior de idade baseado na data de nascimento
const isMaiorDeIdade = computed(() => {
  if (!registerForm.value.dataNascimento) return false
  const hoje = new Date()
  const nascimento = new Date(registerForm.value.dataNascimento)
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mes = hoje.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--
  }
  return idade >= 18
})

// Popup de atualização de idade (usuários antigos)
const showAgeUpdatePopup = ref(false)
const ageUpdateForm = ref({
  dataNascimento: '',
  maiorIdadeConfirmado: false
})
const ageUpdateLoading = ref(false)

// Calcula se é maior de idade no popup de atualização
const isMaiorDeIdadeUpdate = computed(() => {
  if (!ageUpdateForm.value.dataNascimento) return false
  const hoje = new Date()
  const nascimento = new Date(ageUpdateForm.value.dataNascimento)
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mes = hoje.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--
  }
  return idade >= 18
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
// Sistema de fixar e ordenar contatos (salva no backend)
const pinnedContacts = ref([])
const contactsOrder = ref([])

// Carregar configuração de contatos do backend
async function loadContactsConfigFromServer() {
  if (!token.value) return
  try {
    const res = await fetch(`${API_URL}/profile/contacts-config`, {
      headers: { 'Authorization': `Bearer ${token.value}` }
    })
    if (res.ok) {
      const config = await res.json()
      pinnedContacts.value = config.pinnedContacts || []
      contactsOrder.value = config.contactsOrder || []
    }
  } catch (e) {
    console.error('Erro ao carregar config de contatos:', e)
  }
}

// Salvar configuração de contatos no backend
async function saveContactsConfigToServer() {
  if (!token.value) return
  try {
    await fetch(`${API_URL}/profile/contacts-config`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pinnedContacts: pinnedContacts.value,
        contactsOrder: contactsOrder.value
      })
    })
  } catch (e) {
    console.error('Erro ao salvar config de contatos:', e)
  }
}

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
const replyingTo = ref(null) // Mensagem sendo respondida
const isSendingMessage = ref(false) // Previne cliques duplos
const savedBubbleColor = localStorage.getItem('poly_bubble_color')
console.log('[BubbleColor] Cor carregada do localStorage:', savedBubbleColor)
const messageBubbleColor = ref(savedBubbleColor || '#6366f1')
const messagesContainer = ref(null)
const myStatus = ref('online')
const isOtherTyping = ref(false) // Indica se o outro usuário está digitando
let typingTimeout = null // Timer para resetar o indicador

// Configurações de notificação
const notificacaoGlobalMudo = ref(localStorage.getItem('poly_mute_all') === 'true')
const darkMode = ref(localStorage.getItem('poly_theme') !== 'light') // dark por padrão
const conexoesMudas = ref(JSON.parse(localStorage.getItem('poly_mute_connections') || '[]'))

// Acessibilidade - tamanho da fonte
const messageFontSize = ref(parseInt(localStorage.getItem('poly_font_size')) || 14)
const showFontSizeMenu = ref(false)

// Modo narrativo da io (híbrido)
const ioNarrativeMode = ref(false)

// Contador de mensagens não lidas por conexão { connectionId: count }
const unreadCounts = ref(JSON.parse(localStorage.getItem('poly_unread_counts') || '{}'))

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
const myRooms = ref([])                  // Minhas salas (fundadores podem ter múltiplas)
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

// Encaminhar mensagem
const showForwardModal = ref(false)
const forwardingMessage = ref(null)
const forwardSearch = ref('')
const selectedForwardContacts = ref([])

// Modal de gerar imagem
const showImagineModal = ref(false)
const imaginePrompt = ref('')
const imagineContext = ref('chat') // 'chat' ou 'room'
const isGeneratingImage = ref(false)

const createRoomForm = reactive({
  name: '',
  description: '',
  is_private: false
})

// Computed
const isLoggedIn = computed(() => !!token.value && !!currentUser.value)
const isOwnProfile = computed(() => profileUser.value?.id === currentUser.value?.id)

// Contatos ordenados (fixados primeiro, depois ordem customizada)
const sortedConnections = computed(() => {
  const conns = [...connections.value]

  // Separar fixados e não fixados
  const pinned = conns.filter(c => pinnedContacts.value.includes(c.id))
  const notPinned = conns.filter(c => !pinnedContacts.value.includes(c.id))

  // Ordenar fixados pela ordem em pinnedContacts
  pinned.sort((a, b) => {
    return pinnedContacts.value.indexOf(a.id) - pinnedContacts.value.indexOf(b.id)
  })

  // Ordenar não fixados pela ordem customizada (se existir)
  notPinned.sort((a, b) => {
    const orderA = contactsOrder.value.indexOf(a.id)
    const orderB = contactsOrder.value.indexOf(b.id)
    // Se não está na ordem customizada, vai pro final
    if (orderA === -1 && orderB === -1) return 0
    if (orderA === -1) return 1
    if (orderB === -1) return -1
    return orderA - orderB
  })

  return [...pinned, ...notPinned]
})

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

// Contatos filtrados para encaminhamento
const filteredForwardContacts = computed(() => {
  // Todas as conexões já são aceitas (o backend filtra)
  // Excluir apenas io e o contato atual
  let contactsList = connections.value.filter(c =>
    c.nome?.toLowerCase() !== 'io' && // Excluir io pelo nome
    c.connectionId !== selectedConnection.value?.connectionId // Excluir contato atual
  )

  // Aplicar busca
  if (forwardSearch.value) {
    const search = forwardSearch.value.toLowerCase()
    contactsList = contactsList.filter(c =>
      c.nome?.toLowerCase().includes(search)
    )
  }

  return contactsList
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

// Detecta se a mensagem contém imagem gerada por IA (/imagine)
function isImagineMessage(text) {
  if (!text) return false
  return text.includes('[POLYIMG:')
}

// Extrai a URL da imagem gerada
function getImagineUrl(text) {
  if (!text) return null
  const match = text.match(/\[POLYIMG:(.*?)\]/)
  return match ? match[1] : null
}

// Extrai o texto antes da imagem (para mensagens da io)
function getImagineTextBefore(text) {
  if (!text) return ''
  const idx = text.indexOf('[POLYIMG:')
  if (idx === -1) return text
  return text.substring(0, idx).trim()
}

// Extrai o prompt/descrição da imagem gerada (texto após [POLYIMG:...])
function getImaginePrompt(text) {
  if (!text) return ''
  const match = text.match(/\[POLYIMG:.*?\](.*)/)
  return match ? match[1].trim() : ''
}

// Abre imagem em tela cheia
const fullscreenImageUrl = ref(null)
function openImageFullscreen(url) {
  fullscreenImageUrl.value = url
}
function closeImageFullscreen() {
  fullscreenImageUrl.value = null
}

// Handler para erro ao carregar imagem do /imagine
function handleImagineError(event) {
  const img = event.target
  const container = img.parentElement
  if (container) {
    const loading = container.querySelector('.imagine-loading')
    if (loading) {
      loading.innerHTML = '<span style="color: #ff6b6b;">Erro ao gerar imagem</span>'
    }
  }
}

// TTS - Text-to-Speech (ouvir mensagem traduzida)
const speakingMessageId = ref(null)
const ttsLangMap = {
  pt: 'pt-BR', en: 'en-US', es: 'es-ES', fr: 'fr-FR',
  de: 'de-DE', it: 'it-IT', ja: 'ja-JP', ko: 'ko-KR',
  zh: 'zh-CN', ru: 'ru-RU', ar: 'ar-SA'
}

function speakMessage(msg) {
  // Se já está falando essa mensagem, para
  if (speakingMessageId.value === msg.id) {
    speechSynthesis.cancel()
    speakingMessageId.value = null
    return
  }

  // Para qualquer fala anterior
  speechSynthesis.cancel()

  const texto = msg.texto || ''
  if (!texto.trim()) return

  const utterance = new SpeechSynthesisUtterance(texto)
  utterance.lang = ttsLangMap[currentUser.value?.idioma] || 'pt-BR'
  utterance.rate = 0.9

  utterance.onstart = () => {
    speakingMessageId.value = msg.id
  }

  utterance.onend = () => {
    speakingMessageId.value = null
  }

  utterance.onerror = () => {
    speakingMessageId.value = null
  }

  speechSynthesis.speak(utterance)
}

// TTS para transcrição de áudio
function speakTranscription(msg) {
  const id = 'audio-' + msg.id

  if (speakingMessageId.value === id) {
    speechSynthesis.cancel()
    speakingMessageId.value = null
    return
  }

  speechSynthesis.cancel()

  const texto = msg.traducaoAudio || msg.transcricao || ''
  if (!texto.trim()) return

  const utterance = new SpeechSynthesisUtterance(texto)
  utterance.lang = ttsLangMap[currentUser.value?.idioma] || 'pt-BR'
  utterance.rate = 0.9

  utterance.onstart = () => { speakingMessageId.value = id }
  utterance.onend = () => { speakingMessageId.value = null }
  utterance.onerror = () => { speakingMessageId.value = null }

  speechSynthesis.speak(utterance)
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
const experimentDropdownOpen = ref(false)

// Modal de perfil
const showProfileModal = ref(false)
const profileUser = ref(null)
const editingSocial = ref(false)
const socialTipoInput = ref('')
const socialUrlInput = ref('')
const editingKofi = ref(false)
const kofiUrlInput = ref('')
const codeCopied = ref(false)
const linkCopied = ref(false)
const editingName = ref(false)

// Modal de Gorjeta Ko-fi
const showTipModal = ref(false)
const tipTargetUser = ref(null)
const nameInput = ref('')
const nameInputRef = ref(null)

// io Friend (assistente personalizada)
const showIoFriendModal = ref(false)
const ioFriend = ref(null)              // io friend ativa (para chat)
const ioFriends = ref([])               // Todas as io friends do usuário (fundadores podem ter múltiplas)
const ioDailyUsage = ref({ count: 0, limit: 50, percentage: 0, remaining: 50 }) // Uso diário io Friend
const editingIoFriendId = ref(null)     // ID da io friend sendo editada (null = criando nova)
const savingIoFriend = ref(false)
const generatingAvatar = ref(false)
const ioFriendForm = ref({
  nome: '',
  personalidade: '',
  estilo_comunicacao: 'equilibrado',
  tom_emocional: 'gentil',
  nivel_iniciativa: 'equilibrado',
  usa_emojis: true,
  caracteristicas_extras: '',
  avatar_prompt: '',
  avatar_base64: '',
  genero: 'feminino',
  perfil_publico: '',
  cenario: '',
  exemplos_dialogo: '',
  publico: false
})

// Explorar io friends públicas
const publicIoFriends = ref([])
const loadingPublicIoFriends = ref(false)
const showExploreModal = ref(false)

// Experimentar io friend pública
const experimentingIoFriendId = ref(null) // id da io friend em experimento
const experimentingLoading = ref(null) // id da io friend sendo processada

// Modal de detalhes da io friend (curtir)
const showIoFriendDetailModal = ref(false)
const selectedIoFriendDetail = ref(null)
const selectedIoFriendCreator = ref(null)
const ioFriendLiked = ref(false)
const likingIoFriend = ref(false)

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

// Idiomas (17 idiomas - cobertura ~92% do mundo)
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
  ar: 'العربية',
  hi: 'हिन्दी',
  tr: 'Türkçe',
  nl: 'Nederlands',
  pl: 'Polski',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia'
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

// Gerar SVG da bandeira do país baseado no idioma
function generateFlagSvg(idioma, size = 80) {
  const flags = {
    // Brasil - Verde, amarelo, azul com estrelas
    pt: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#009739"/>
      <polygon points="50,15 90,50 50,85 10,50" fill="#FEDD00"/>
      <circle cx="50" cy="50" r="18" fill="#002776"/>
      <circle cx="44" cy="46" r="2" fill="#fff"/>
      <circle cx="56" cy="46" r="2" fill="#fff"/>
      <circle cx="50" cy="54" r="2" fill="#fff"/>
      <circle cx="44" cy="54" r="1.5" fill="#fff"/>
      <circle cx="56" cy="54" r="1.5" fill="#fff"/>
      <path d="M35 50 Q50 42 65 50" stroke="#fff" stroke-width="2" fill="none"/>
    </svg>`,
    // USA - Vermelho, branco, azul
    en: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#B22234"/>
      <rect x="2" y="20" width="96" height="8" fill="#fff"/>
      <rect x="2" y="36" width="96" height="8" fill="#fff"/>
      <rect x="2" y="52" width="96" height="8" fill="#fff"/>
      <rect x="2" y="68" width="96" height="8" fill="#fff"/>
      <rect x="2" y="10" width="45" height="40" fill="#3C3B6E"/>
      <text x="24" y="35" font-size="20" fill="#fff" text-anchor="middle">★</text>
    </svg>`,
    // Espanha - Vermelho e amarelo
    es: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#AA151B"/>
      <rect x="2" y="30" width="96" height="40" fill="#F1BF00"/>
      <circle cx="35" cy="50" r="8" fill="#AA151B" stroke="#F1BF00" stroke-width="2"/>
    </svg>`,
    // França - Azul, branco, vermelho
    fr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#fff"/>
      <path d="M50,2 A48,48 0 0,0 50,98 L50,2" fill="#EF4135"/>
      <path d="M50,2 A48,48 0 0,1 50,98 L50,2" fill="#0055A4" transform="rotate(180 50 50)"/>
    </svg>`,
    // Alemanha - Preto, vermelho, amarelo
    de: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#FFCC00"/>
      <path d="M50,2 A48,48 0 0,1 98,50 L2,50 A48,48 0 0,1 50,2" fill="#000"/>
      <rect x="2" y="35" width="96" height="30" fill="#DD0000"/>
    </svg>`,
    // Itália - Verde, branco, vermelho
    it: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#fff"/>
      <path d="M17,17 A48,48 0 0,0 17,83 L17,17" fill="#009246" transform="translate(-4,0)"/>
      <path d="M83,17 A48,48 0 0,1 83,83 L83,17" fill="#CE2B37" transform="translate(4,0)"/>
    </svg>`,
    // Japão - Branco com círculo vermelho
    ja: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#fff" stroke="#eee" stroke-width="1"/>
      <circle cx="50" cy="50" r="22" fill="#BC002D"/>
    </svg>`,
    // Coreia do Sul - Branco com Taeguk
    ko: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#fff" stroke="#eee" stroke-width="1"/>
      <circle cx="50" cy="50" r="20" fill="#C60C30"/>
      <path d="M50,30 A20,20 0 0,1 50,70 A10,10 0 0,1 50,50 A10,10 0 0,0 50,30" fill="#003478"/>
    </svg>`,
    // China - Vermelho com estrelas amarelas
    zh: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#DE2910"/>
      <text x="30" y="45" font-size="24" fill="#FFDE00">★</text>
      <text x="48" y="30" font-size="10" fill="#FFDE00">★</text>
      <text x="58" y="35" font-size="10" fill="#FFDE00">★</text>
      <text x="58" y="48" font-size="10" fill="#FFDE00">★</text>
      <text x="48" y="55" font-size="10" fill="#FFDE00">★</text>
    </svg>`,
    // Rússia - Branco, azul, vermelho
    ru: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#D52B1E"/>
      <path d="M50,2 A48,48 0 0,1 98,50 L2,50 A48,48 0 0,1 50,2" fill="#fff"/>
      <rect x="2" y="35" width="96" height="15" fill="#0039A6"/>
    </svg>`,
    // Arábia Saudita - Verde com espada e texto
    ar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#006C35"/>
      <rect x="20" y="58" width="60" height="4" rx="2" fill="#fff"/>
      <text x="50" y="48" font-size="12" fill="#fff" text-anchor="middle" font-family="Arial">ﷲ</text>
    </svg>`,
    // Índia - Laranja, branco, verde com Ashoka Chakra
    hi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#fff"/>
      <path d="M50,2 A48,48 0 0,1 98,50 L2,50 A48,48 0 0,1 50,2" fill="#FF9933"/>
      <path d="M50,98 A48,48 0 0,1 2,50 L98,50 A48,48 0 0,1 50,98" fill="#138808"/>
      <circle cx="50" cy="50" r="10" fill="none" stroke="#000080" stroke-width="2"/>
    </svg>`,
    // Turquia - Vermelho com lua e estrela
    tr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#E30A17"/>
      <circle cx="42" cy="50" r="16" fill="#fff"/>
      <circle cx="46" cy="50" r="13" fill="#E30A17"/>
      <text x="62" y="56" font-size="18" fill="#fff">★</text>
    </svg>`,
    // Holanda - Vermelho, branco, azul (horizontal)
    nl: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#21468B"/>
      <path d="M50,2 A48,48 0 0,1 98,50 L2,50 A48,48 0 0,1 50,2" fill="#AE1C28"/>
      <rect x="2" y="35" width="96" height="30" fill="#fff"/>
    </svg>`,
    // Polônia - Branco e vermelho
    pl: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#DC143C"/>
      <path d="M50,2 A48,48 0 0,1 98,50 L2,50 A48,48 0 0,1 50,2" fill="#fff"/>
    </svg>`,
    // Vietnã - Vermelho com estrela amarela
    vi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#DA251D"/>
      <text x="50" y="62" font-size="40" fill="#FFFF00" text-anchor="middle">★</text>
    </svg>`,
    // Indonésia - Vermelho e branco
    id: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="48" fill="#fff"/>
      <path d="M50,2 A48,48 0 0,1 98,50 L2,50 A48,48 0 0,1 50,2" fill="#CE1126"/>
    </svg>`
  }

  const svg = flags[idioma] || flags.pt
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

// Obter avatar do usuário (Kawaii/Pixel se salvou, senão Bandeira do país)
function getUserAvatarUrl(user, size = 80) {
  // io Friend tem avatar personalizado via IA
  if (user?.io_friend_avatar) {
    return user.io_friend_avatar
  }
  // io padrão (sem io friend) usa avatar fixo
  if (user?.email === 'io@poly.io' || user?.nome === 'io') {
    return '/io-avatar.png'
  }
  // Prioridade: Avatar personalizado (Kawaii/Pixel/Gravatar) > Bandeira do país
  if (user?.avatar_config) {
    // Tipo Gravatar - usa foto do Gravatar
    if (user.avatar_config.type === 'gravatar' && user.email) {
      return getGravatarUrl(user.email, size)
    }
    // Verificar se é pixel art
    if (user.avatar_config.type === 'pixel' && user.avatar_config.grid) {
      return generatePixelAvatarSvg(user.avatar_config.grid, size)
    }
    // Senão é Kawaii
    return generateAvatarSvg(user.avatar_config, size)
  }
  // Sem avatar configurado: usa bandeira do idioma/país
  if (user?.idioma) {
    return generateFlagSvg(user.idioma, size)
  }
  // Fallback: bandeira do Brasil
  return generateFlagSvg('pt', size)
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

// ==================== KAWAII AVATAR ====================

// Opções de personalização Kawaii
const avatarOptions = {
  // Cores de fundo
  backgrounds: [
    '#ffffff', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
    '#10b981', '#06b6d4', '#3b82f6', '#fbbf24', '#f472b6', '#a78bfa', '#34d399'
  ],
  // Estilos de olhos Kawaii
  eyeStyles: [
    'dots', 'happy', 'love', 'stars', 'sparkle', 'wink',
    'closed', 'surprised', 'angry', 'sad', 'dead', 'crying'
  ],
  // Estilos de boca
  mouthStyles: [
    'none', 'smile', 'open', 'cat', 'tongue', 'happy', 'sad',
    'neutral', 'teeth', 'o', 'w', 'd', '3'
  ],
  // Estilos de bochechas/blush
  blushStyles: ['none', 'light', 'heavy', 'hearts', 'lines'],
  // Sobrancelhas (opcional)
  eyebrowStyles: ['none', 'normal', 'worried', 'angry', 'sad'],
  // Acessórios
  accessories: ['none', 'bow', 'catEars', 'bunnyEars', 'flower', 'halo', 'horns', 'crown'],
  // Cores de acessórios
  accessoryColors: ['#ec4899', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#ffffff', '#1a1a1a']
}

// Tab atual do editor e tipo de avatar
const avatarEditorTab = ref('expression')
const avatarType = ref('kawaii') // 'kawaii', 'pixel' ou 'gravatar'

// ==================== PIXEL ART AVATAR ====================

// Paleta de cores para pixel art (16 cores)
const pixelPalette = [
  null, // Transparente
  '#1a1a1a', '#ffffff', '#9ca3af', // Preto, Branco, Cinza
  '#ef4444', '#f97316', '#fbbf24', '#facc15', // Vermelho, Laranja, Amarelo
  '#22c55e', '#10b981', '#06b6d4', '#3b82f6', // Verdes, Cyan, Azul
  '#8b5cf6', '#a855f7', '#ec4899', '#f472b6'  // Roxos, Rosas
]

// Estado do editor pixel
const pixelTool = ref('brush') // 'brush', 'eraser', 'fill'
const pixelColor = ref('#1a1a1a')
const isDrawingPixel = ref(false)

// Grid 16x16 (inicializa vazio ou carrega do localStorage)
const savedPixelGrid = localStorage.getItem('poly_pixel_avatar')
const createEmptyGrid = () => Array(32).fill(null).map(() => Array(32).fill(null))
const pixelGrid = ref(savedPixelGrid ? JSON.parse(savedPixelGrid) : createEmptyGrid())

// Funções do editor pixel
function startPixelDraw() {
  isDrawingPixel.value = true
}

function stopPixelDraw() {
  isDrawingPixel.value = false
}

function paintPixel(x, y) {
  if (pixelTool.value === 'brush') {
    pixelGrid.value[y][x] = pixelColor.value
  } else if (pixelTool.value === 'eraser') {
    pixelGrid.value[y][x] = null
  } else if (pixelTool.value === 'fill') {
    floodFill(x, y, pixelGrid.value[y][x], pixelColor.value)
  }
  // Salvar no localStorage
  localStorage.setItem('poly_pixel_avatar', JSON.stringify(pixelGrid.value))
}

function paintPixelIfDrawing(x, y) {
  if (isDrawingPixel.value && pixelTool.value !== 'fill') {
    paintPixel(x, y)
  }
}

function handlePixelTouch(event) {
  const touch = event.touches[0]
  const element = document.elementFromPoint(touch.clientX, touch.clientY)
  if (element?.classList.contains('pixel-cell')) {
    const row = element.parentElement
    const grid = row.parentElement
    const y = Array.from(grid.children).indexOf(row)
    const x = Array.from(row.children).indexOf(element)
    if (x >= 0 && y >= 0) {
      paintPixel(x, y)
    }
  }
}

function floodFill(x, y, targetColor, newColor) {
  if (targetColor === newColor) return
  if (x < 0 || x >= 32 || y < 0 || y >= 32) return
  if (pixelGrid.value[y][x] !== targetColor) return

  pixelGrid.value[y][x] = newColor
  floodFill(x + 1, y, targetColor, newColor)
  floodFill(x - 1, y, targetColor, newColor)
  floodFill(x, y + 1, targetColor, newColor)
  floodFill(x, y - 1, targetColor, newColor)
}

function clearPixelGrid() {
  pixelGrid.value = createEmptyGrid()
  localStorage.setItem('poly_pixel_avatar', JSON.stringify(pixelGrid.value))
}

// Gera SVG do pixel art
function generatePixelAvatarSvg(grid, size = 80) {
  const gridSize = grid?.length || 32
  const pixelSize = size / gridSize
  let rects = ''

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const color = grid[y]?.[x]
      if (color) {
        rects += `<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${color}"/>`
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#2d2d2d"/>
    ${rects}
  </svg>`

  return 'data:image/svg+xml,' + encodeURIComponent(svg.trim())
}

// ==================== KAWAII AVATAR ====================

// Configuração do avatar Kawaii (carrega do localStorage)
const savedAvatar = localStorage.getItem('poly_avatar')
const defaultAvatar = {
  background: '#6366f1',
  eyes: 'dots',
  mouth: 'smile',
  blush: 'light',
  eyebrows: 'none',
  accessory: 'none',
  accessoryColor: '#ec4899'
}
const myAvatar = ref(savedAvatar ? { ...defaultAvatar, ...JSON.parse(savedAvatar) } : defaultAvatar)

// URL do avatar do usuário atual (baseado no avatar_config do banco)
const myAvatarUrl = computed(() => {
  // Se currentUser tem avatar_config no banco
  if (currentUser.value?.avatar_config) {
    const config = currentUser.value.avatar_config
    // Gravatar explícito
    if (config.type === 'gravatar' && currentUser.value.email) {
      return getGravatarUrl(currentUser.value.email, 80)
    }
    // Pixel Art
    if (config.type === 'pixel' && config.grid) {
      return generatePixelAvatarSvg(config.grid, 80)
    }
    // Kawaii
    return generateAvatarSvg(config, 80)
  }
  // Sem avatar_config = usa bandeira do idioma
  if (currentUser.value?.idioma) {
    return generateFlagSvg(currentUser.value.idioma, 80)
  }
  // Fallback: bandeira do Brasil
  return generateFlagSvg('pt', 80)
})

const showAvatarModal = ref(false)
const editingAvatar = ref(null)

// Troca o tipo de avatar e inicializa editingAvatar se necessário
function switchAvatarType(type) {
  avatarType.value = type
  // Se mudar para kawaii e editingAvatar estiver null, inicializa
  if (type === 'kawaii' && !editingAvatar.value) {
    editingAvatar.value = { ...defaultAvatar }
  }
}

// Watch para salvar avatar quando muda
watch(myAvatar, (newAvatar) => {
  localStorage.setItem('poly_avatar', JSON.stringify(newAvatar))
}, { deep: true })

// Gera o SVG do avatar Kawaii como data URL
function generateAvatarSvg(config, size = 80) {
  const c = { ...defaultAvatar, ...config }

  // ========== OLHOS KAWAII (grandes e afastados) ==========
  let eyesSvg = ''
  // Posições: olho esquerdo cx=22, olho direito cx=58 (bem afastados)
  // Tamanho grande: raio 8-10
  switch (c.eyes) {
    case 'happy': // ^_^
      eyesSvg = `
        <path d="M14 32 Q22 24 30 32" stroke="#3d2314" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M50 32 Q58 24 66 32" stroke="#3d2314" stroke-width="3" fill="none" stroke-linecap="round"/>
      `
      break
    case 'love': // ♥_♥
      eyesSvg = `
        <path d="M18 28 L22 22 L26 28 L22 38 Z" fill="#ef4444"/>
        <path d="M54 28 L58 22 L62 28 L58 38 Z" fill="#ef4444"/>
      `
      break
    case 'stars': // ★_★
      eyesSvg = `
        <polygon points="22,22 24,28 30,28 25,32 27,38 22,35 17,38 19,32 14,28 20,28" fill="#fbbf24"/>
        <polygon points="58,22 60,28 66,28 61,32 63,38 58,35 53,38 55,32 50,28 56,28" fill="#fbbf24"/>
      `
      break
    case 'sparkle': // ✨_✨ (olhos grandes com brilhos)
      eyesSvg = `
        <circle cx="22" cy="30" r="10" fill="#3d2314"/>
        <circle cx="58" cy="30" r="10" fill="#3d2314"/>
        <circle cx="25" cy="27" r="3" fill="#fff"/>
        <circle cx="61" cy="27" r="3" fill="#fff"/>
        <circle cx="19" cy="33" r="1.5" fill="#fff"/>
        <circle cx="55" cy="33" r="1.5" fill="#fff"/>
      `
      break
    case 'wink': // •_~
      eyesSvg = `
        <circle cx="22" cy="30" r="9" fill="#3d2314"/>
        <circle cx="25" cy="27" r="3" fill="#fff"/>
        <circle cx="19" cy="33" r="1.5" fill="#fff"/>
        <path d="M50 32 Q58 24 66 32" stroke="#3d2314" stroke-width="3" fill="none" stroke-linecap="round"/>
      `
      break
    case 'closed': // -_-
      eyesSvg = `
        <path d="M14 30 Q22 34 30 30" stroke="#3d2314" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M50 30 Q58 34 66 30" stroke="#3d2314" stroke-width="3" fill="none" stroke-linecap="round"/>
      `
      break
    case 'surprised': // O_O
      eyesSvg = `
        <circle cx="22" cy="30" r="11" stroke="#3d2314" stroke-width="2" fill="#fff"/>
        <circle cx="22" cy="30" r="6" fill="#3d2314"/>
        <circle cx="58" cy="30" r="11" stroke="#3d2314" stroke-width="2" fill="#fff"/>
        <circle cx="58" cy="30" r="6" fill="#3d2314"/>
        <circle cx="24" cy="28" r="2" fill="#fff"/>
        <circle cx="60" cy="28" r="2" fill="#fff"/>
      `
      break
    case 'angry': // ><
      eyesSvg = `
        <path d="M14 26 L30 34 M14 34 L30 26" stroke="#3d2314" stroke-width="3" stroke-linecap="round"/>
        <path d="M50 26 L66 34 M50 34 L66 26" stroke="#3d2314" stroke-width="3" stroke-linecap="round"/>
      `
      break
    case 'sad': // ;_;
      eyesSvg = `
        <circle cx="22" cy="28" r="8" fill="#3d2314"/>
        <circle cx="58" cy="28" r="8" fill="#3d2314"/>
        <circle cx="24" cy="26" r="2.5" fill="#fff"/>
        <circle cx="60" cy="26" r="2.5" fill="#fff"/>
        <path d="M22 38 Q20 50 22 58" stroke="#6ee7ff" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M58 38 Q60 50 58 58" stroke="#6ee7ff" stroke-width="4" fill="none" stroke-linecap="round"/>
      `
      break
    case 'dead': // X_X
      eyesSvg = `
        <path d="M16 24 L28 36 M16 36 L28 24" stroke="#3d2314" stroke-width="4" stroke-linecap="round"/>
        <path d="M52 24 L64 36 M52 36 L64 24" stroke="#3d2314" stroke-width="4" stroke-linecap="round"/>
      `
      break
    case 'crying': // T_T
      eyesSvg = `
        <line x1="14" y1="26" x2="30" y2="26" stroke="#3d2314" stroke-width="3" stroke-linecap="round"/>
        <line x1="22" y1="26" x2="22" y2="38" stroke="#3d2314" stroke-width="3" stroke-linecap="round"/>
        <line x1="50" y1="26" x2="66" y2="26" stroke="#3d2314" stroke-width="3" stroke-linecap="round"/>
        <line x1="58" y1="26" x2="58" y2="38" stroke="#3d2314" stroke-width="3" stroke-linecap="round"/>
        <path d="M22 40 Q18 52 22 62" stroke="#6ee7ff" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M58 40 Q62 52 58 62" stroke="#6ee7ff" stroke-width="5" fill="none" stroke-linecap="round"/>
      `
      break
    default: // dots •_• (olhos grandes padrão)
      eyesSvg = `
        <circle cx="22" cy="30" r="9" fill="#3d2314"/>
        <circle cx="58" cy="30" r="9" fill="#3d2314"/>
        <circle cx="25" cy="27" r="3" fill="#fff"/>
        <circle cx="61" cy="27" r="3" fill="#fff"/>
        <circle cx="19" cy="33" r="1.5" fill="#fff"/>
        <circle cx="55" cy="33" r="1.5" fill="#fff"/>
      `
  }

  // ========== BOCA KAWAII (mais acima, entre os olhos) ==========
  let mouthSvg = ''
  // Boca centrada em cy=44-48 (mais para cima)
  switch (c.mouth) {
    case 'none':
      mouthSvg = ''
      break
    case 'open': // :O
      mouthSvg = `<ellipse cx="40" cy="46" rx="4" ry="5" fill="#3d2314"/>`
      break
    case 'cat': // :3
      mouthSvg = `
        <circle cx="36" cy="45" r="3" stroke="#3d2314" stroke-width="2" fill="none"/>
        <circle cx="44" cy="45" r="3" stroke="#3d2314" stroke-width="2" fill="none"/>
      `
      break
    case 'tongue': // :P
      mouthSvg = `
        <path d="M34 44 Q40 50 46 44" stroke="#3d2314" stroke-width="2" fill="none" stroke-linecap="round"/>
        <ellipse cx="40" cy="51" rx="4" ry="5" fill="#ff6b9d"/>
      `
      break
    case 'happy': // :D
      mouthSvg = `
        <path d="M32 44 Q40 54 48 44" stroke="#3d2314" stroke-width="2" fill="#3d2314"/>
        <path d="M34 44 Q40 48 46 44" fill="#ff6b9d"/>
      `
      break
    case 'sad': // :(
      mouthSvg = `<path d="M34 50 Q40 44 46 50" stroke="#3d2314" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
      break
    case 'neutral': // :|
      mouthSvg = `<line x1="35" y1="46" x2="45" y2="46" stroke="#3d2314" stroke-width="2.5" stroke-linecap="round"/>`
      break
    case 'teeth': // grimace
      mouthSvg = `
        <rect x="33" y="43" width="14" height="7" rx="2" fill="#3d2314"/>
        <line x1="36" y1="43" x2="36" y2="50" stroke="#fff" stroke-width="1.5"/>
        <line x1="40" y1="43" x2="40" y2="50" stroke="#fff" stroke-width="1.5"/>
        <line x1="44" y1="43" x2="44" y2="50" stroke="#fff" stroke-width="1.5"/>
      `
      break
    case 'o': // o
      mouthSvg = `<circle cx="40" cy="46" r="3" stroke="#3d2314" stroke-width="2" fill="none"/>`
      break
    case 'w': // w
      mouthSvg = `<path d="M33 45 L36 49 L40 45 L44 49 L47 45" stroke="#3d2314" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      break
    case 'd': // :d small happy
      mouthSvg = `<path d="M36 44 Q40 50 44 44" stroke="#3d2314" stroke-width="2" fill="#3d2314"/>`
      break
    case '3': // :3 pouty
      mouthSvg = `<path d="M36 46 Q40 42 44 46 Q40 50 36 46" stroke="#3d2314" stroke-width="2" fill="none"/>`
      break
    default: // smile :)
      mouthSvg = `<path d="M34 44 Q40 52 46 44" stroke="#3d2314" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
  }

  // ========== BLUSH/BOCHECHAS (abaixo dos olhos) ==========
  let blushSvg = ''
  // Posição: abaixo e ao lado dos olhos (cx=12 e cx=68, cy=44)
  switch (c.blush) {
    case 'light':
      blushSvg = `
        <ellipse cx="12" cy="44" rx="8" ry="5" fill="#ffb6c1" opacity="0.5"/>
        <ellipse cx="68" cy="44" rx="8" ry="5" fill="#ffb6c1" opacity="0.5"/>
      `
      break
    case 'heavy':
      blushSvg = `
        <ellipse cx="12" cy="44" rx="10" ry="6" fill="#ff9eb5" opacity="0.7"/>
        <ellipse cx="68" cy="44" rx="10" ry="6" fill="#ff9eb5" opacity="0.7"/>
      `
      break
    case 'hearts':
      blushSvg = `
        <path d="M8 42 L12 38 L16 42 L12 48 Z" fill="#ff6b9d" opacity="0.7"/>
        <path d="M64 42 L68 38 L72 42 L68 48 Z" fill="#ff6b9d" opacity="0.7"/>
      `
      break
    case 'lines':
      blushSvg = `
        <g stroke="#ff9eb5" stroke-width="2" opacity="0.7">
          <line x1="6" y1="42" x2="18" y2="42"/>
          <line x1="6" y1="46" x2="18" y2="46"/>
          <line x1="62" y1="42" x2="74" y2="42"/>
          <line x1="62" y1="46" x2="74" y2="46"/>
        </g>
      `
      break
  }

  // ========== SOBRANCELHAS (opcional) ==========
  let eyebrowsSvg = ''
  // Posição: acima dos olhos (cy=18-20)
  switch (c.eyebrows) {
    case 'normal':
      eyebrowsSvg = `
        <path d="M14 18 Q22 14 30 18" stroke="#3d2314" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M50 18 Q58 14 66 18" stroke="#3d2314" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      `
      break
    case 'worried':
      eyebrowsSvg = `
        <path d="M14 22 Q22 16 30 18" stroke="#3d2314" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M50 18 Q58 16 66 22" stroke="#3d2314" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      `
      break
    case 'angry':
      eyebrowsSvg = `
        <path d="M14 16 L30 22" stroke="#3d2314" stroke-width="3" stroke-linecap="round"/>
        <path d="M50 22 L66 16" stroke="#3d2314" stroke-width="3" stroke-linecap="round"/>
      `
      break
    case 'sad':
      eyebrowsSvg = `
        <path d="M14 22 L30 16" stroke="#3d2314" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M50 16 L66 22" stroke="#3d2314" stroke-width="2.5" stroke-linecap="round"/>
      `
      break
  }

  // ========== ACESSÓRIOS ==========
  let accessorySvg = ''
  const ac = c.accessoryColor || '#ec4899'
  switch (c.accessory) {
    case 'bow':
      accessorySvg = `
        <ellipse cx="16" cy="16" rx="8" ry="5" fill="${ac}"/>
        <ellipse cx="28" cy="16" rx="8" ry="5" fill="${ac}"/>
        <circle cx="22" cy="16" r="4" fill="${ac}"/>
        <circle cx="22" cy="16" r="2" fill="#fff" opacity="0.3"/>
      `
      break
    case 'catEars':
      accessorySvg = `
        <polygon points="12,24 20,4 28,24" fill="${ac}"/>
        <polygon points="52,24 60,4 68,24" fill="${ac}"/>
        <polygon points="16,22 20,10 24,22" fill="#ffb6c1"/>
        <polygon points="56,22 60,10 64,22" fill="#ffb6c1"/>
      `
      break
    case 'bunnyEars':
      accessorySvg = `
        <ellipse cx="22" cy="8" rx="6" ry="16" fill="${ac}"/>
        <ellipse cx="58" cy="8" rx="6" ry="16" fill="${ac}"/>
        <ellipse cx="22" cy="8" rx="3" ry="12" fill="#ffb6c1"/>
        <ellipse cx="58" cy="8" rx="3" ry="12" fill="#ffb6c1"/>
      `
      break
    case 'flower':
      accessorySvg = `
        <circle cx="14" cy="18" r="5" fill="${ac}"/>
        <circle cx="10" cy="14" r="5" fill="${ac}"/>
        <circle cx="18" cy="14" r="5" fill="${ac}"/>
        <circle cx="10" cy="22" r="5" fill="${ac}"/>
        <circle cx="18" cy="22" r="5" fill="${ac}"/>
        <circle cx="14" cy="18" r="3" fill="#fbbf24"/>
      `
      break
    case 'halo':
      accessorySvg = `
        <ellipse cx="40" cy="6" rx="18" ry="5" stroke="#fbbf24" stroke-width="3" fill="none"/>
        <ellipse cx="40" cy="6" rx="18" ry="5" stroke="#fff" stroke-width="1" fill="none" opacity="0.5"/>
      `
      break
    case 'horns':
      accessorySvg = `
        <path d="M18 24 Q12 10 8 4" stroke="${ac}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M62 24 Q68 10 72 4" stroke="${ac}" stroke-width="6" fill="none" stroke-linecap="round"/>
      `
      break
    case 'crown':
      accessorySvg = `
        <path d="M20 22 L24 6 L32 16 L40 4 L48 16 L56 6 L60 22 Z" fill="${ac}"/>
        <circle cx="24" cy="8" r="2" fill="#fff"/>
        <circle cx="40" cy="6" r="2" fill="#fff"/>
        <circle cx="56" cy="8" r="2" fill="#fff"/>
      `
      break
  }

  // ========== MONTAR SVG KAWAII ==========
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="${size}" height="${size}">
      <circle cx="40" cy="40" r="40" fill="${c.background}"/>
      ${accessorySvg}
      ${eyebrowsSvg}
      ${eyesSvg}
      ${mouthSvg}
      ${blushSvg}
    </svg>
  `

  return 'data:image/svg+xml,' + encodeURIComponent(svg.trim())
}

// Abre o modal de edição de avatar
function openAvatarEditor() {
  // Carregar do banco se tiver, senão é bandeira (padrão)
  if (currentUser.value?.avatar_config) {
    const config = currentUser.value.avatar_config
    if (config.type === 'pixel') {
      pixelGrid.value = config.grid || createEmptyGrid()
      avatarType.value = 'pixel'
    } else if (config.type === 'gravatar') {
      avatarType.value = 'gravatar'
    } else {
      // É Kawaii
      editingAvatar.value = { ...defaultAvatar, ...config }
      avatarType.value = 'kawaii'
    }
  } else {
    // Sem avatar_config = bandeira (padrão)
    avatarType.value = 'flag'
    editingAvatar.value = { ...defaultAvatar }
  }
  avatarEditorTab.value = 'expression'
  showAvatarModal.value = true
}

// Salva o avatar editado (local + backend)
async function saveAvatar() {
  showAvatarModal.value = false

  // Sincronizar com o banco de dados
  if (currentUser.value?.id) {
    try {
      if (avatarType.value === 'flag') {
        // Usar Bandeira - limpar avatar_config
        await fetch(`${API_URL}/users/${currentUser.value.id}/avatar`, {
          method: 'PUT',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ avatarConfig: null })
        })
        // Atualizar currentUser para refletir a mudança
        currentUser.value.avatar_config = null
      } else if (avatarType.value === 'kawaii') {
        // Salvar Kawaii
        myAvatar.value = { ...editingAvatar.value }
        await fetch(`${API_URL}/users/${currentUser.value.id}/avatar`, {
          method: 'PUT',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ avatarConfig: myAvatar.value })
        })
        // Atualizar currentUser para refletir a mudança
        currentUser.value.avatar_config = myAvatar.value
      } else if (avatarType.value === 'pixel') {
        // Salvar Pixel Art
        const pixelConfig = { type: 'pixel', grid: pixelGrid.value }
        await fetch(`${API_URL}/users/${currentUser.value.id}/avatar`, {
          method: 'PUT',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ avatarConfig: pixelConfig })
        })
        // Atualizar currentUser para refletir a mudança
        currentUser.value.avatar_config = pixelConfig
      } else {
        // Usar Gravatar - salvar type: gravatar
        const gravatarConfig = { type: 'gravatar' }
        await fetch(`${API_URL}/users/${currentUser.value.id}/avatar`, {
          method: 'PUT',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ avatarConfig: gravatarConfig })
        })
        // Atualizar currentUser para refletir a mudança
        currentUser.value.avatar_config = gravatarConfig
      }
    } catch (error) {
      console.error('Erro ao salvar avatar no servidor:', error)
    }
  }
}

// Cancela a edição do avatar
function cancelAvatarEdit() {
  editingAvatar.value = null
  showAvatarModal.value = false
}

// Abrir modal de perfil
async function openProfile(user) {
  if (user.is_io_friend || user.io_friend_avatar) {
    // io Friend - usar dados já carregados (não buscar do /users pois não tem io_friend data)
    profileUser.value = { ...user }
    if (ioFriend.value) {
      profileUser.value.nome = ioFriend.value.nome
      profileUser.value.io_friend_avatar = ioFriend.value.avatar_base64
    }
  } else {
    // Buscar dados completos do usuário (inclui io friend criada)
    try {
      const res = await fetch(`${API_URL}/users/${user.id}`, {
        headers: authHeaders()
      })
      const userData = await res.json()
      // Para o próprio usuário, mesclar com currentUser para ter dados mais atualizados
      if (user.id === currentUser.value.id) {
        profileUser.value = { ...currentUser.value, ...userData }
      } else {
        profileUser.value = userData
      }
    } catch (e) {
      profileUser.value = user.id === currentUser.value.id ? { ...currentUser.value } : user
    }
  }
  socialTipoInput.value = profileUser.value.social_tipo || ''
  socialUrlInput.value = profileUser.value.social_url || ''
  kofiUrlInput.value = profileUser.value.kofi_url || ''
  editingSocial.value = false
  editingKofi.value = false
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

// Salvar URL da loja Ko-fi
async function saveKofi() {
  if (!kofiUrlInput.value.trim()) {
    alert('Digite a URL da sua loja Ko-fi')
    return
  }

  try {
    const res = await fetch(`${API_URL}/profile/kofi`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: kofiUrlInput.value.trim() })
    })
    if (res.ok) {
      const updated = await res.json()
      currentUser.value.kofi_url = updated.kofi_url
      profileUser.value.kofi_url = updated.kofi_url
      kofiUrlInput.value = updated.kofi_url
      editingKofi.value = false
    } else {
      const err = await res.json()
      alert(err.error || 'Erro ao salvar loja')
    }
  } catch (e) {
    console.error('Erro ao salvar Ko-fi:', e)
  }
}

// Remover URL da loja Ko-fi
async function removeKofi() {
  if (!confirm('Remover loja do perfil?')) return

  try {
    const res = await fetch(`${API_URL}/profile/kofi`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (res.ok) {
      currentUser.value.kofi_url = null
      profileUser.value.kofi_url = null
      kofiUrlInput.value = ''
      editingKofi.value = false
    }
  } catch (e) {
    console.error('Erro ao remover Ko-fi:', e)
  }
}

// ==================== io Friend ====================

// Carregar io friend ativa do usuário
async function loadIoFriend() {
  try {
    const res = await fetch(`${API_URL}/io-friend`, {
      headers: authHeaders()
    })
    if (res.ok) {
      const data = await res.json()
      ioFriend.value = data.ioFriend
      console.log('[io Friend]', ioFriend.value ? `Carregada: ${ioFriend.value.nome}` : 'Não tem (usando io padrão)')
    }
  } catch (e) {
    console.error('[io Friend] Erro ao carregar:', e)
  }
}

// Carregar uso diário de mensagens io Friend
async function loadIoDailyUsage() {
  try {
    const res = await fetch(`${API_URL}/io/daily-usage`, {
      headers: authHeaders()
    })
    if (res.ok) {
      const data = await res.json()
      ioDailyUsage.value = data
    }
  } catch (e) {
    console.error('[io Daily Usage] Erro ao carregar:', e)
  }
}

// Carregar TODAS as io friends do usuário (fundadores podem ter múltiplas)
async function loadAllIoFriends() {
  try {
    const res = await fetch(`${API_URL}/io-friends/mine`, {
      headers: authHeaders()
    })
    if (res.ok) {
      const data = await res.json()
      ioFriends.value = data.ioFriends || []
      console.log('[io Friends] Total:', ioFriends.value.length)
    }
  } catch (e) {
    console.error('[io Friends] Erro ao carregar:', e)
  }
}

// Abrir modal io friend (criar nova ou editar existente)
function openIoFriendModal(ioFriendToEdit = null) {
  if (ioFriendToEdit) {
    // Editando uma io friend específica
    editingIoFriendId.value = ioFriendToEdit.id
    ioFriendForm.value = {
      nome: ioFriendToEdit.nome || '',
      personalidade: ioFriendToEdit.personalidade || '',
      estilo_comunicacao: ioFriendToEdit.estilo_comunicacao || 'equilibrado',
      tom_emocional: ioFriendToEdit.tom_emocional || 'gentil',
      nivel_iniciativa: ioFriendToEdit.nivel_iniciativa || 'equilibrado',
      usa_emojis: ioFriendToEdit.usa_emojis !== false,
      caracteristicas_extras: ioFriendToEdit.caracteristicas_extras || '',
      avatar_prompt: ioFriendToEdit.avatar_prompt || '',
      avatar_base64: ioFriendToEdit.avatar_base64 || '',
      genero: ioFriendToEdit.genero || 'feminino',
      perfil_publico: ioFriendToEdit.perfil_publico || '',
      cenario: ioFriendToEdit.cenario || '',
      exemplos_dialogo: ioFriendToEdit.exemplos_dialogo || '',
      publico: ioFriendToEdit.publico || false
    }
  } else {
    // Criando nova io friend
    editingIoFriendId.value = null
    ioFriendForm.value = {
      nome: '',
      personalidade: '',
      estilo_comunicacao: 'equilibrado',
      tom_emocional: 'gentil',
      nivel_iniciativa: 'equilibrado',
      usa_emojis: true,
      caracteristicas_extras: '',
      avatar_prompt: '',
      avatar_base64: '',
      genero: 'feminino',
      perfil_publico: '',
      cenario: '',
      exemplos_dialogo: '',
      publico: false
    }
  }
  showIoFriendModal.value = true
}

// Gerar avatar via IA
async function generateIoFriendAvatar() {
  if (!ioFriendForm.value.avatar_prompt.trim()) return

  generatingAvatar.value = true

  try {
    const res = await fetch(`${API_URL}/io-friend/generate-avatar`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: ioFriendForm.value.avatar_prompt })
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error || 'Erro ao gerar avatar')
      return
    }

    ioFriendForm.value.avatar_base64 = data.avatar_base64
    console.log('[io Friend] Avatar gerado com sucesso!')
  } catch (e) {
    console.error('[io Friend] Erro ao gerar avatar:', e)
    alert('Erro ao gerar avatar')
  } finally {
    generatingAvatar.value = false
  }
}

// Salvar io friend (criar nova ou atualizar existente)
async function saveIoFriend() {
  if (!ioFriendForm.value.nome.trim()) {
    alert('Digite um nome para sua conexão virtual')
    return
  }

  savingIoFriend.value = true

  try {
    // Se editingIoFriendId existe, estamos editando uma específica
    // Se não, estamos criando nova
    const isEditing = editingIoFriendId.value !== null
    const method = isEditing ? 'PUT' : 'POST'
    const url = isEditing
      ? `${API_URL}/io-friend/${editingIoFriendId.value}`
      : `${API_URL}/io-friend`

    console.log('[io Friend] Salvando:', { isEditing, method, url, editingIoFriendId: editingIoFriendId.value })

    const res = await fetch(url, {
      method,
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ioFriendForm.value)
    })

    const data = await res.json()
    console.log('[io Friend] Resposta do servidor:', { ok: res.ok, data })

    if (!res.ok) {
      alert(data.error || 'Erro ao salvar')
      return
    }

    // Atualizar io friend ativa
    ioFriend.value = data.ioFriend

    // Recarregar lista de io friends
    console.log('[io Friend] Recarregando lista...')
    await loadAllIoFriends()
    console.log('[io Friend] Lista atualizada:', ioFriends.value.length, 'io friends')

    showIoFriendModal.value = false
    editingIoFriendId.value = null

    // Recarregar conexões para atualizar avatar no chat
    await loadConnections()

    // Se io/io friend estiver selecionado, atualizar com novos dados
    if (selectedConnection.value?.email === 'io@poly.io' || selectedConnection.value?.is_io_friend) {
      const updatedConn = connections.value.find(c => c.email === 'io@poly.io' || c.is_io_friend)
      if (updatedConn) {
        selectedConnection.value = { ...updatedConn }
      }
    }

    alert(`${ioFriendForm.value.nome} salva com sucesso! 🎉`)
  } catch (e) {
    console.error('[io Friend] Erro ao salvar:', e)
    alert('Erro ao salvar conexão virtual')
  } finally {
    savingIoFriend.value = false
  }
}

// Remover io friend (específica por ID ou a ativa)
async function removeIoFriend(ioFriendId = null) {
  const targetId = ioFriendId || editingIoFriendId.value || ioFriend.value?.id
  const targetFriend = ioFriends.value.find(f => f.id === targetId) || ioFriend.value

  if (!targetFriend) return
  if (!confirm(`Remover "${targetFriend.nome}"? Esta ação não pode ser desfeita.`)) return

  savingIoFriend.value = true

  try {
    const res = await fetch(`${API_URL}/io-friend/${targetId}`, {
      method: 'DELETE',
      headers: authHeaders()
    })

    if (res.ok) {
      // Recarregar lista e io friend ativa
      await loadAllIoFriends()
      await loadIoFriend()

      showIoFriendModal.value = false
      editingIoFriendId.value = null

      // Recarregar conexões para atualizar avatar
      await loadConnections()

      // Se io estiver selecionado, atualizar
      if (selectedConnection.value?.email === 'io@poly.io' || selectedConnection.value?.is_io_friend) {
        const updatedConn = connections.value.find(c => c.email === 'io@poly.io')
        if (updatedConn) {
          selectedConnection.value = { ...updatedConn }
        }
      }

      alert('io friend removida.')
    }
  } catch (e) {
    console.error('[io Friend] Erro ao remover:', e)
    alert('Erro ao remover io friend')
  } finally {
    savingIoFriend.value = false
  }
}

// Ativar uma io friend específica (usar como io no chat)
async function activateIoFriend(ioFriendId) {
  try {
    const res = await fetch(`${API_URL}/io-friend/${ioFriendId}/activate`, {
      method: 'POST',
      headers: authHeaders()
    })

    if (res.ok) {
      await loadIoFriend()
      await loadAllIoFriends()
      await loadConnections()

      // Atualizar profileUser com a nova io friend ativa (para mostrar no topo)
      if (profileUser.value?.id === currentUser.value?.id) {
        const activeFriend = ioFriends.value.find(f => f.id === ioFriendId)
        if (activeFriend) {
          profileUser.value.created_io_friend = {
            id: activeFriend.id,
            nome: activeFriend.nome,
            avatar_base64: activeFriend.avatar_base64,
            likes_count: activeFriend.likes_count || 0
          }
        }
      }

      // Atualizar chat se io estiver selecionado
      if (selectedConnection.value?.email === 'io@poly.io' || selectedConnection.value?.is_io_friend) {
        const updatedConn = connections.value.find(c => c.email === 'io@poly.io' || c.is_io_friend)
        if (updatedConn) {
          selectedConnection.value = { ...updatedConn }
        }
      }
    }
  } catch (e) {
    console.error('[io Friend] Erro ao ativar:', e)
  }
}

// Voltar para io padrão (desativar todas as io friends)
async function useDefaultIo() {
  if (!confirm('Voltar para a io padrão? Suas io friends continuarão salvas.')) return

  try {
    const res = await fetch(`${API_URL}/io-friend/deactivate-all`, {
      method: 'POST',
      headers: authHeaders()
    })

    if (res.ok) {
      ioFriend.value = null
      await loadAllIoFriends()
      await loadConnections()

      // Atualizar chat se io estiver selecionado
      if (selectedConnection.value?.email === 'io@poly.io' || selectedConnection.value?.is_io_friend) {
        const updatedConn = connections.value.find(c => c.email === 'io@poly.io')
        if (updatedConn) {
          selectedConnection.value = { ...updatedConn }
        }
      }
    }
  } catch (e) {
    console.error('[io Friend] Erro ao desativar:', e)
  }
}

// ==================== EXPLORAR IO FRIENDS PÚBLICAS ====================

// Carregar io friends públicas
async function loadPublicIoFriends() {
  loadingPublicIoFriends.value = true

  try {
    const res = await fetch(`${API_URL}/io-friends/public`)
    const data = await res.json()

    if (res.ok) {
      publicIoFriends.value = data.ioFriends || []
      console.log(`[Explorar] Carregadas ${publicIoFriends.value.length} io friends públicas`)
    }
  } catch (e) {
    console.error('[Explorar] Erro ao carregar:', e)
  } finally {
    loadingPublicIoFriends.value = false
  }
}

// Abrir modal de explorar
function openExploreModal() {
  showExploreModal.value = true
  loadPublicIoFriends()
}

// Obter label do gênero
function getGeneroLabel(genero) {
  const generos = {
    'feminino': '♀️ Feminino',
    'masculino': '♂️ Masculino',
    'nao_binario': '⚧️ Não-binário',
    'outro': '🤖 Outro'
  }
  return generos[genero] || genero
}

// Experimentar io friend pública (substitui temporariamente a io)
async function experimentIoFriend(bot) {
  experimentingLoading.value = bot.id

  try {
    const res = await fetch(`${API_URL}/io-friends/public/${bot.id}/experiment`, {
      method: 'POST',
      headers: authHeaders()
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error || 'Erro ao experimentar')
      return
    }

    // Marcar como experimentando
    experimentingIoFriendId.value = bot.id

    // Fechar modal e ir para o chat com a io
    showExploreModal.value = false

    // Recarregar conexões para atualizar nome/avatar da io
    await loadConnections()

    // Selecionar a io para conversar
    const ioConn = connections.value.find(c => c.email === 'io@poly.io')
    if (ioConn) {
      selectConnection(ioConn)
    }

    alert(`Experimentando ${bot.nome}! Converse com ela no chat. 🧪`)
  } catch (e) {
    console.error('[Experiment] Erro:', e)
    alert('Erro ao experimentar')
  } finally {
    experimentingLoading.value = null
  }
}

// Parar de experimentar io friend
async function stopExperimenting() {
  try {
    const res = await fetch(`${API_URL}/io-friends/experiment/stop`, {
      method: 'POST',
      headers: authHeaders()
    })

    if (res.ok) {
      experimentingIoFriendId.value = null
      await loadConnections()
      alert('Voltou para a io padrão!')
    }
  } catch (e) {
    console.error('[Experiment] Erro ao parar:', e)
  }
}

// Adotar io friend (usar como minha io permanentemente)
async function adoptIoFriend() {
  if (!experimentingIoFriendId.value) return

  try {
    const res = await fetch(`${API_URL}/io-friends/public/${experimentingIoFriendId.value}/adopt`, {
      method: 'POST',
      headers: authHeaders()
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error || 'Erro ao adotar')
      return
    }

    experimentingIoFriendId.value = null

    // Recarregar io friend e conexões
    await loadIoFriend()
    await loadConnections()

    alert(`${data.message || 'io adotada com sucesso!'} 💜`)
  } catch (e) {
    console.error('[Adopt] Erro:', e)
    alert('Erro ao adotar io friend')
  }
}

// ==================== SISTEMA DE TIERS E LIKES ====================

// Obter tier baseado no número de curtidas
function getIoFriendTier(likes) {
  const count = parseInt(likes) || 0
  if (count >= 5000) return 'lendario'
  if (count >= 3000) return 'diamante'
  if (count >= 1000) return 'ouro'
  if (count >= 500) return 'prata'
  return 'iniciante'
}

// Obter classe CSS do tier
function getIoFriendTierClass(likes) {
  return `tier-${getIoFriendTier(likes)}`
}

// Obter emoji do tier
function getIoFriendTierEmoji(likes) {
  const tier = getIoFriendTier(likes)
  const emojis = {
    iniciante: '❤️',
    prata: '🤍',
    ouro: '💛',
    diamante: '💎',
    lendario: '🔥'
  }
  return emojis[tier] || '❤️'
}

// Formatar número de curtidas
function formatLikes(count) {
  const num = parseInt(count) || 0
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace('.0', '') + 'K'
  }
  return num.toString()
}

// Abrir modal de detalhes da io friend (para curtir)
async function openIoFriendDetailModal(ioFriend, creator) {
  selectedIoFriendDetail.value = ioFriend
  selectedIoFriendCreator.value = creator
  ioFriendLiked.value = false
  showIoFriendDetailModal.value = true

  // Verificar se já curtiu
  if (ioFriend.publico) {
    try {
      const res = await fetch(`${API_URL}/io-friends/${ioFriend.id}/liked`, {
        headers: authHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        ioFriendLiked.value = data.liked
      }
    } catch (e) {
      console.error('[Like Check] Erro:', e)
    }
  }
}

// Curtir/descurtir io friend
async function toggleIoFriendLike() {
  if (!selectedIoFriendDetail.value) return
  likingIoFriend.value = true

  try {
    const method = ioFriendLiked.value ? 'DELETE' : 'POST'
    const res = await fetch(`${API_URL}/io-friends/${selectedIoFriendDetail.value.id}/like`, {
      method,
      headers: authHeaders()
    })

    if (res.ok) {
      const data = await res.json()
      ioFriendLiked.value = !ioFriendLiked.value
      selectedIoFriendDetail.value.likes_count = data.likes_count
    }
  } catch (e) {
    console.error('[Like] Erro:', e)
  } finally {
    likingIoFriend.value = false
  }
}

// Experimentar io friend a partir do modal de detalhes
async function experimentIoFriendFromModal() {
  if (!selectedIoFriendDetail.value) return
  showIoFriendDetailModal.value = false
  await experimentIoFriend(selectedIoFriendDetail.value)
}

// Carregar io friend em experimento
async function loadExperimentingIoFriend() {
  try {
    const res = await fetch(`${API_URL}/io-friends/experiment`, {
      headers: authHeaders()
    })

    if (res.ok) {
      const data = await res.json()
      if (data.experimenting) {
        experimentingIoFriendId.value = data.experimenting.id
        console.log(`[Experiment] Experimentando: ${data.experimenting.nome}`)
      }
    }
  } catch (e) {
    console.error('[Experiment] Erro ao carregar:', e)
  }
}

// Abrir modal de gorjeta Ko-fi
function openTipModal() {
  tipTargetUser.value = selectedConnection.value
  showTipModal.value = true
}

// Enviar gorjeta (redireciona para Ko-fi)
function sendTip(coffees) {
  if (!tipTargetUser.value?.kofi_url) return

  // Fecha o modal
  showTipModal.value = false

  // Envia mensagem de apoio no chat
  const tipMessage = `☕ Estou te enviando ${coffees} café${coffees > 1 ? 's' : ''} no Ko-fi! 💜`
  sendMessage(tipMessage)

  // Abre o Ko-fi em nova aba
  window.open(tipTargetUser.value.kofi_url, '_blank')
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
      body: JSON.stringify({
        ...loginForm.value,
        rememberMe: rememberMe.value
      })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || data.erro || 'Erro ao fazer login')
    }

    token.value = data.token
    currentUser.value = data.user
    localStorage.setItem('poly_token', data.token)
    setCookie('poly_token', data.token)

    // Verificar se precisa atualizar idade (usuários antigos)
    if (!data.user.data_nascimento) {
      showAgeUpdatePopup.value = true
    }

    // Carregar avatar do banco (se existir)
    if (data.user.avatar_config) {
      myAvatar.value = data.user.avatar_config
      localStorage.setItem('poly_avatar', JSON.stringify(data.user.avatar_config))
    }

    // Salvar credenciais se "Lembrar-me" estiver marcado
    if (rememberMe.value) {
      // Salvar no gerenciador de senhas do Windows (mais persistente!)
      await saveToPasswordManager(loginForm.value.email, loginForm.value.senha)

      // Salvar remember_token como backup
      if (data.rememberToken) {
        console.log('[Auth] Salvando remember_token...')
        await saveRememberToken(data.rememberToken)
        setCookie('poly_remember_token', data.rememberToken, 365)
      }
    } else {
      await clearRememberToken()
      deleteCookie('poly_remember_token')
    }

    initializeApp()
  } catch (error) {
    authError.value = error.message
  } finally {
    loading.value = false
  }
}

// Salvar atualização de idade (usuários antigos)
async function saveAgeUpdate() {
  if (!ageUpdateForm.value.dataNascimento) {
    alert('Por favor, informe sua data de nascimento')
    return
  }

  // Se for maior de idade, precisa confirmar
  if (isMaiorDeIdadeUpdate.value && !ageUpdateForm.value.maiorIdadeConfirmado) {
    alert('Por favor, confirme que você é maior de 18 anos')
    return
  }

  ageUpdateLoading.value = true
  try {
    const res = await fetch(`${API_URL}/users/update-age`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({
        dataNascimento: ageUpdateForm.value.dataNascimento,
        maiorIdadeConfirmado: ageUpdateForm.value.maiorIdadeConfirmado
      })
    })

    if (res.ok) {
      const data = await res.json()
      currentUser.value.data_nascimento = data.data_nascimento
      showAgeUpdatePopup.value = false
    } else {
      const error = await res.json()
      alert(error.error || 'Erro ao atualizar idade')
    }
  } catch (e) {
    console.error('Erro ao atualizar idade:', e)
    alert('Erro ao atualizar idade')
  } finally {
    ageUpdateLoading.value = false
  }
}

// Auto-login usando remember_token do servidor
async function tryAutoLoginWithToken() {
  // Tentar carregar do IndexedDB primeiro
  let rememberToken = await loadRememberToken()
  console.log('[Auth] Token do IndexedDB:', rememberToken ? 'encontrado' : 'não encontrado')

  // Fallback: cookie
  if (!rememberToken) {
    rememberToken = getCookie('poly_remember_token')
    console.log('[Auth] Token do Cookie:', rememberToken ? 'encontrado' : 'não encontrado')
  }

  if (!rememberToken) {
    console.log('[Auth] Nenhum remember_token encontrado')
    return false
  }

  try {
    console.log('[Auth] Tentando auto-login com remember_token...')
    const res = await fetch(`${API_URL}/auth/auto-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rememberToken })
    })

    if (!res.ok) {
      console.log('[Auth] Token inválido, limpando...')
      await clearRememberToken()
      deleteCookie('poly_remember_token')
      return false
    }

    const data = await res.json()

    token.value = data.token
    currentUser.value = data.user
    localStorage.setItem('poly_token', data.token)
    setCookie('poly_token', data.token)

    if (data.user.avatar_config) {
      myAvatar.value = data.user.avatar_config
    }

    console.log('[Auth] Auto-login bem-sucedido!')
    initializeApp()
    return true
  } catch (e) {
    console.error('[Auth] Erro no auto-login:', e)
    return false
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
  // Se não tem token, tenta autologin com credenciais salvas
  if (!token.value) {
    await tryAutoLogin()
    return
  }

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
    // Token inválido - tenta autologin
    logout()
    await tryAutoLogin()
  }
}

// Autologin com credenciais salvas
async function tryAutoLogin() {
  // 1. Primeiro, tentar gerenciador de senhas do Windows (mais persistente em PWA)
  const pmCreds = await loadFromPasswordManager()
  if (pmCreds && pmCreds.email && pmCreds.senha) {
    console.log('[Auth] Fazendo auto-login com credenciais do gerenciador...')
    loginForm.value.email = pmCreds.email
    loginForm.value.senha = pmCreds.senha
    rememberMe.value = true
    await login()
    return
  }

  // 2. Tentar auto-login com remember_token do servidor
  const success = await tryAutoLoginWithToken()
  if (success) return

  // 3. Fallback: tentar com credenciais do localStorage/cookie
  const { email, senha } = loadCredentials()
  if (email && senha) {
    console.log('[Auth] Fazendo auto-login com credenciais locais...')
    loginForm.value.email = email
    loginForm.value.senha = senha
    rememberMe.value = true
    await login()
  }
}

function logout() {
  token.value = ''
  currentUser.value = null
  localStorage.removeItem('poly_token')
  deleteCookie('poly_token')
  // Limpar remember_token
  clearRememberToken()
  deleteCookie('poly_remember_token')
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
  myRooms.value = []
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

// Carregar minhas salas (fundadores podem ter múltiplas)
async function loadMyRooms() {
  try {
    const res = await fetch(`${API_BASE}/api/rooms/mine`, {
      headers: { 'Authorization': `Bearer ${token.value}` }
    })
    if (res.ok) {
      myRooms.value = await res.json()
    }
  } catch (error) {
    console.error('Erro ao carregar minhas salas:', error)
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

    myRooms.value.push(data)
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

// Excluir uma das minhas salas
async function deleteMyRoom(roomId) {
  if (!roomId) return

  const confirmed = confirm('Tem certeza que deseja excluir esta sala?\nTodos os usuários serão removidos.')
  if (!confirmed) return

  try {
    const res = await fetch(`${API_BASE}/api/rooms/${roomId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token.value}` }
    })

    if (res.ok) {
      if (selectedRoom.value?.id === roomId) {
        selectedRoom.value = null
        roomMessages.value = []
        roomUsers.value = []
      }
      myRooms.value = myRooms.value.filter(r => r.id !== roomId)
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
async function sendRoomMessage() {
  if (!newRoomMessage.value.trim() || !selectedRoom.value || isRoomMuted.value) return

  let texto = newRoomMessage.value.trim()
  newRoomMessage.value = '' // Limpa imediatamente

  // Detectar comando /imagine
  if (texto.toLowerCase().startsWith('/imagine ')) {
    const prompt = texto.substring(9).trim() // Remove '/imagine '
    if (prompt) {
      try {
        // Mostrar mensagem de loading na sala
        const loadingMsg = {
          id: `loading-${Date.now()}`,
          senderId: currentUser.value?.id,
          senderNome: currentUser.value?.nome,
          texto: `[POLYIMG:loading]🎨 ${prompt}`,
          cor: roomMessageColor.value,
          corNome: roomNameColor.value,
          timestamp: new Date().toISOString(),
          isLoading: true
        }
        roomMessages.value.push(loadingMsg)
        scrollRoomToBottom()

        // Chamar backend para gerar imagem
        const res = await fetch(`${API_URL}/imagine`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ prompt })
        })

        // Remover mensagem de loading
        roomMessages.value = roomMessages.value.filter(m => m.id !== loadingMsg.id)

        if (!res.ok) {
          const errorData = await res.json()
          if (errorData.retry && errorData.estimated_time) {
            alert(`Modelo carregando, tente novamente em ${Math.ceil(errorData.estimated_time)}s`)
          } else {
            alert('Erro ao gerar imagem. Tente novamente.')
          }
          return
        }

        const data = await res.json()
        texto = `[POLYIMG:${data.imageUrl}]🎨 ${prompt}`
      } catch (error) {
        console.error('Erro ao gerar imagem:', error)
        roomMessages.value = roomMessages.value.filter(m => !m.isLoading)
        alert('Erro ao gerar imagem. Tente novamente.')
        return
      }
    }
  }

  socket.emit('sala-mensagem', {
    roomId: selectedRoom.value.id,
    texto: texto,
    cor: roomMessageColor.value,
    corNome: roomNameColor.value
  })
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
  if (isConnected) return '✓ Já estão conectados'

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
      const myRoomIndex = myRooms.value.findIndex(r => r.id === selectedRoom.value.id)
      if (myRoomIndex !== -1) {
        myRooms.value[myRoomIndex].status = 'active'
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
  // Carregar configuração de contatos do servidor
  await loadContactsConfigFromServer()

  // Carregar io friend do usuário (se existir)
  await loadIoFriend()

  // Carregar uso diário de mensagens io Friend
  await loadIoDailyUsage()

  // Carregar todas as io friends do usuário (fundadores podem ter múltiplas)
  await loadAllIoFriends()

  // Carregar io friend em experimento (se houver)
  await loadExperimentingIoFriend()

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
    loadNarrativeMode()
    loadMyRooms()

    // Configurar push notifications (solicita permissão)
    setupPushNotifications()
  }, 500)

  // Atualizar status online periodicamente
  setInterval(loadConnections, 30000)
}

// ==================== CONEXÕES ====================

async function loadConnections() {
  try {
    const res = await fetch(`${API_URL}/connections?_t=${Date.now()}`, {
      headers: authHeaders(),
      cache: 'no-store'
    })
    const data = await res.json()

    // Buscar quem está online e seus status
    let onlineUsers = {}
    try {
      const onlineRes = await fetch(`${API_URL}/users/online?_t=${Date.now()}`, {
        headers: authHeaders(),
        cache: 'no-store'
      })
      onlineUsers = await onlineRes.json()
    } catch (e) {
      console.error('Erro ao buscar online:', e)
    }

    connections.value = data.map(c => ({
      id: c.user_id,
      connectionId: c.connection_id,
      nome: c.nome,
      email: c.email,
      idioma: c.idioma,
      pais: c.pais,
      avatar_config: c.avatar_config,
      kofi_url: c.kofi_url,
      online: c.user_id in onlineUsers,
      status: onlineUsers[c.user_id] || 'offline',
      io_friend_avatar: c.io_friend_avatar || null,
      is_io_friend: c.is_io_friend || false,
      is_experimenting: c.is_experimenting || false
    }))

    // Sincronizar ordem dos contatos com localStorage
    syncContactsOrder()

    // Enviar arquivos pendentes para conexões que já estão online
    connections.value.forEach(conn => {
      if (conn.online && conn.status !== 'offline' && conn.status !== 'invisivel') {
        sendPendingFilesToUser(conn.id, conn.connectionId)
      }
    })

    // Atualizar contadores de não lidos do banco de dados
    data.forEach(c => {
      const connId = c.connection_id.toString()
      const dbCount = parseInt(c.unread_count) || 0
      if (dbCount > 0) {
        // Usar o maior valor entre localStorage e banco
        const localCount = unreadCounts.value[connId] || 0
        unreadCounts.value[connId] = Math.max(dbCount, localCount)
      }
    })
    localStorage.setItem('poly_unread_counts', JSON.stringify(unreadCounts.value))

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
      email: r.email,
      idioma: r.idioma,
      avatar_config: r.avatar_config
    }))
    sentRequests.value = (data.enviadas || []).map(r => ({
      id: r.user_id,
      nome: r.nome,
      email: r.email,
      avatar_config: r.avatar_config
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
  replyingTo.value = null // Limpar reply ao mudar de conversa
  sidebarOpen.value = false

  // Zerar contador de não lidas para esta conexão
  const connId = conn.connectionId.toString()
  if (unreadCounts.value[connId]) {
    delete unreadCounts.value[connId]
    localStorage.setItem('poly_unread_counts', JSON.stringify(unreadCounts.value))
  }

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
    // Adiciona timestamp para evitar cache em mobile
    let url = `${API_URL}/chat/${selectedConnection.value.connectionId}?_t=${Date.now()}`
    if (idiomaRecepcao.value) {
      url += `&idiomaDestino=${idiomaRecepcao.value}`
    }

    const res = await fetch(url, {
      headers: authHeaders(),
      cache: 'no-store' // Força busca sem cache
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
      showOriginal: false,
      repliedToId: m.repliedToId,
      repliedToText: m.repliedToText,
      repliedToSender: m.repliedToSender
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

// ==================== MODAL IMAGINE ====================
function openImagineModal(context) {
  imagineContext.value = context
  imaginePrompt.value = ''
  showImagineModal.value = true
}

function closeImagineModal() {
  showImagineModal.value = false
  imaginePrompt.value = ''
  isGeneratingImage.value = false
}

async function submitImagineModal() {
  const prompt = imaginePrompt.value.trim()
  if (!prompt || isGeneratingImage.value) return

  isGeneratingImage.value = true

  if (imagineContext.value === 'chat') {
    // Gerar imagem no chat privado
    newMessage.value = `/imagine ${prompt}`
    closeImagineModal()
    await sendMessage()
  } else if (imagineContext.value === 'room') {
    // Gerar imagem na sala
    newRoomMessage.value = `/imagine ${prompt}`
    closeImagineModal()
    await sendRoomMessage()
  }

  isGeneratingImage.value = false
}

async function sendMessage() {
  if (!newMessage.value.trim() || !selectedConnection.value) return
  if (isSendingMessage.value) return // Previne cliques duplos

  isSendingMessage.value = true

  // Parar indicador de digitação
  emitStoppedTyping()

  let texto = newMessage.value
  const repliedToId = replyingTo.value?.id || null
  newMessage.value = '' // Limpa imediatamente para UX
  replyingTo.value = null // Limpa reply

  // Detectar comando /imagine
  if (texto.trim().toLowerCase().startsWith('/imagine ')) {
    const prompt = texto.trim().substring(9).trim() // Remove '/imagine '
    if (prompt) {
      try {
        // Mostrar mensagem de loading
        const loadingMsg = {
          id: `loading-${Date.now()}`,
          euEnviei: true,
          texto: `[POLYIMG:loading]🎨 ${prompt}`,
          textoOriginal: `[POLYIMG:loading]🎨 ${prompt}`,
          enviadoEm: new Date().toISOString(),
          isLoading: true
        }
        messages.value.push(loadingMsg)
        scrollToBottom()

        // Chamar backend para gerar imagem
        const res = await fetch(`${API_URL}/imagine`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ prompt })
        })

        // Remover mensagem de loading
        messages.value = messages.value.filter(m => m.id !== loadingMsg.id)

        if (!res.ok) {
          const errorData = await res.json()
          if (errorData.retry && errorData.estimated_time) {
            alert(`Modelo carregando, tente novamente em ${Math.ceil(errorData.estimated_time)}s`)
          } else {
            alert('Erro ao gerar imagem. Tente novamente.')
          }
          isSendingMessage.value = false
          return
        }

        const data = await res.json()
        texto = `[POLYIMG:${data.imageUrl}]🎨 ${prompt}`
      } catch (error) {
        console.error('Erro ao gerar imagem:', error)
        messages.value = messages.value.filter(m => !m.isLoading)
        alert('Erro ao gerar imagem. Tente novamente.')
        isSendingMessage.value = false
        return
      }
    }
  }

  try {
    await fetch(`${API_URL}/chat/${selectedConnection.value.connectionId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ texto, repliedToId })
    })

    // Atualizar contador se enviou mensagem para io/io_friend
    if (selectedConnection.value?.email === 'io@poly.io' || selectedConnection.value?.is_io_friend) {
      loadIoDailyUsage()
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    newMessage.value = texto // Restaura se falhou
  } finally {
    isSendingMessage.value = false
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

    // Incrementar contador de não lidas se não está no chat ativo
    const isActiveChat = selectedConnection.value?.connectionId === msg.connectionId
    if (!isActiveChat) {
      const connId = msg.connectionId.toString()
      unreadCounts.value[connId] = (unreadCounts.value[connId] || 0) + 1
      localStorage.setItem('poly_unread_counts', JSON.stringify(unreadCounts.value))
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
    bubbleColor: euEnviei ? messageBubbleColor.value : null,
    repliedToId: msg.repliedToId,
    repliedToText: msg.repliedToText,
    repliedToSender: msg.repliedToSender
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
    const element = document.createElement('div')
    element.innerHTML = htmlContent
    element.style.position = 'absolute'
    element.style.left = '-9999px'
    element.style.width = '210mm'
    document.body.appendChild(element)

    // Pegar o div interno com o conteúdo
    const pdfContent = element.querySelector('#pdf-content')

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
    await html2pdf().set(opt).from(pdfContent).save()

    // Remover elemento temporário
    document.body.removeChild(element)

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

// ==================== ENCAMINHAR MENSAGEM ====================

function openForwardModal(msg) {
  forwardingMessage.value = msg
  forwardSearch.value = ''
  selectedForwardContacts.value = []
  showForwardModal.value = true
  msg.showMenu = false
}

async function forwardMessage() {
  if (!forwardingMessage.value || selectedForwardContacts.value.length === 0) return

  const textoOriginal = forwardingMessage.value.textoOriginal || forwardingMessage.value.texto

  try {
    // Enviar para cada contato selecionado
    for (const connectionId of selectedForwardContacts.value) {
      await fetch(`${API_URL}/chat/forward`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectionId,
          texto: textoOriginal
        })
      })
    }

    // Feedback visual
    const count = selectedForwardContacts.value.length

    // Fechar modal e limpar
    showForwardModal.value = false
    forwardingMessage.value = null
    selectedForwardContacts.value = []

    alert(`Mensagem encaminhada para ${count} contato(s)!`)
  } catch (error) {
    console.error('Erro ao encaminhar mensagem:', error)
    alert('Erro ao encaminhar mensagem')
  }
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

// Iniciar resposta a uma mensagem
function startReply(msg) {
  // Fechar menus
  messages.value.forEach(m => m.showMenu = false)

  // Determinar o nome do remetente
  const senderName = msg.euEnviei
    ? currentUser.value.nome
    : selectedConnection.value?.nome

  replyingTo.value = {
    id: msg.id,
    texto: msg.textoOriginal || msg.texto,
    sender: senderName
  }

  // Focar no input
  const inputEl = document.querySelector('.message-input input[type="text"]')
  if (inputEl) inputEl.focus()
}

// Cancelar resposta
function cancelReply() {
  replyingTo.value = null
}

// Scroll para mensagem original (quando clica no quote)
function scrollToMessage(messageId) {
  const el = document.querySelector(`[data-message-id="${messageId}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('highlight-message')
    setTimeout(() => el.classList.remove('highlight-message'), 2000)
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

// Função auxiliar para enviar arquivo ou salvar na fila se offline
async function sendOrQueueFile(connectionId, recipientId, fileName, fileType, fileData, isOnline) {
  const filePayload = {
    connectionId,
    recipientId,
    fileName,
    fileType,
    fileData
  }

  if (isOnline) {
    // Enviar direto
    socket.emit('enviar-arquivo', filePayload)
    console.log('[File] Enviado direto:', fileName)
  } else {
    // Salvar na fila para envio posterior
    await savePendingFile(filePayload)
    console.log('[File] Salvo na fila (usuário offline):', fileName)
  }

  // Adicionar na lista local de qualquer forma
  messages.value.push({
    id: `file-${Date.now()}`,
    euEnviei: true,
    isFile: true,
    fileName,
    fileType,
    fileData,
    enviadoEm: new Date().toISOString(),
    pending: !isOnline // Marcar como pendente se offline
  })
  scrollToBottom()
}

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

  const isOnline = selectedConnection.value.status !== 'offline' && selectedConnection.value.status !== 'invisivel'

  // Converter para base64 e enviar/enfileirar
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result
    sendOrQueueFile(
      selectedConnection.value.connectionId,
      selectedConnection.value.id,
      file.name,
      file.type,
      base64,
      isOnline
    )
  }
  reader.readAsDataURL(file)
}

// Handler para colar imagens com Ctrl+V (apenas chat 1:1, não io)
function handlePaste(event) {
  console.log('[Paste] Evento disparado', event.clipboardData)

  // Só funciona para conexões 1:1 (não io)
  if (!selectedConnection.value || selectedConnection.value.nome === 'io') {
    console.log('[Paste] Ignorado - sem conexão ou é io')
    return
  }

  const clipboardData = event.clipboardData || window.clipboardData
  if (!clipboardData) {
    console.log('[Paste] Sem clipboardData')
    return
  }

  const items = clipboardData.items || clipboardData.files
  console.log('[Paste] Items:', items?.length)
  if (!items || items.length === 0) return

  const isOnline = selectedConnection.value.status !== 'offline' && selectedConnection.value.status !== 'invisivel'

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    console.log('[Paste] Item:', item.type, item.kind)

    // Verificar se é uma imagem
    if (item.type && item.type.startsWith('image/')) {
      event.preventDefault()

      const file = item.getAsFile ? item.getAsFile() : item
      console.log('[Paste] Arquivo:', file)
      if (!file) return

      if (file.size > MAX_FILE_SIZE) {
        alert('Imagem muito grande! Máximo: 10MB')
        return
      }

      // Gerar nome do arquivo com timestamp
      const extension = file.type.split('/')[1] || 'png'
      const fileName = `screenshot_${Date.now()}.${extension}`

      // Converter para base64 e enviar/enfileirar
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result
        console.log('[Paste] Processando arquivo:', fileName, isOnline ? '(online)' : '(offline - enfileirando)')
        sendOrQueueFile(
          selectedConnection.value.connectionId,
          selectedConnection.value.id,
          fileName,
          file.type,
          base64,
          isOnline
        )
      }
      reader.readAsDataURL(file)
      return // Processar apenas uma imagem
    }
  }
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

// ==================== TRANSCRIÇÃO DE ÁUDIO ====================

async function transcreverAudio(msg) {
  if (!msg.audioData || msg.transcrevendo) return

  msg.transcrevendo = true

  try {
    // Buscar idiomas: remetente (quem enviou) e receptor (eu)
    const idiomaOrigem = selectedConnection.value?.idioma || 'pt'
    const idiomaDestino = currentUser.value?.idioma || 'pt'

    const response = await fetch(`${API_URL}/transcribe-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({
        audioData: msg.audioData,
        idiomaOrigem,
        idiomaDestino
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.details || data.error || 'Falha na transcrição')
    }

    msg.transcricao = data.transcricao
    msg.traducaoAudio = data.traducao
    msg.showOriginalAudio = false

    console.log('[Transcrição] Sucesso:', data.transcricao?.substring(0, 50))

  } catch (error) {
    console.error('[Transcrição] Erro:', error)
    alert('Erro na transcrição: ' + error.message)
  } finally {
    msg.transcrevendo = false
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
    // Enviar arquivos pendentes para este usuário
    sendPendingFilesToUser(userId, conn.connectionId)
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
        const store = database.createObjectStore('pendingFiles', { keyPath: 'id', autoIncrement: true })
        store.createIndex('recipientId', 'recipientId', { unique: false })
      }
    }
  })
}

// Salvar arquivo pendente no IndexedDB
async function savePendingFile(fileData) {
  if (!db) await initIndexedDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingFiles', 'readwrite')
    const store = tx.objectStore('pendingFiles')
    const request = store.add({
      ...fileData,
      savedAt: Date.now()
    })
    request.onsuccess = () => {
      console.log('[PendingFiles] Arquivo salvo para envio posterior:', fileData.fileName)
      resolve(request.result)
    }
    request.onerror = () => reject(request.error)
  })
}

// Buscar arquivos pendentes para um destinatário
async function getPendingFilesForUser(recipientId) {
  if (!db) await initIndexedDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingFiles', 'readonly')
    const store = tx.objectStore('pendingFiles')
    const request = store.getAll()
    request.onsuccess = () => {
      const files = request.result.filter(f => f.recipientId === recipientId)
      resolve(files)
    }
    request.onerror = () => reject(request.error)
  })
}

// Deletar arquivo pendente após envio
async function deletePendingFile(id) {
  if (!db) await initIndexedDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingFiles', 'readwrite')
    const store = tx.objectStore('pendingFiles')
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Enviar arquivos pendentes quando usuário ficar online
async function sendPendingFilesToUser(userId, connectionId) {
  try {
    const pendingFiles = await getPendingFilesForUser(userId)
    if (pendingFiles.length === 0) return

    console.log(`[PendingFiles] Enviando ${pendingFiles.length} arquivo(s) pendente(s) para usuário ${userId}`)

    for (const file of pendingFiles) {
      socket.emit('enviar-arquivo', {
        connectionId: connectionId,
        recipientId: file.recipientId,
        fileName: file.fileName,
        fileType: file.fileType,
        fileData: file.fileData
      })
      await deletePendingFile(file.id)
      console.log('[PendingFiles] Arquivo enviado e removido da fila:', file.fileName)
    }
  } catch (err) {
    console.error('[PendingFiles] Erro ao enviar arquivos pendentes:', err)
  }
}

// ==================== COMUNICAÇÃO COM SERVICE WORKER ====================
function sendMessageToSW(message) {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('Service Worker não disponível'))
      return
    }

    const messageChannel = new MessageChannel()
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data)
    }

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2])

    // Timeout de 3 segundos
    setTimeout(() => reject(new Error('Timeout')), 3000)
  })
}

// ==================== INDEXEDDB PARA REMEMBER TOKEN ====================
let authDb = null

async function initAuthDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PolyIO_Auth', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      authDb = request.result
      resolve(authDb)
    }
    request.onupgradeneeded = (event) => {
      const database = event.target.result
      if (!database.objectStoreNames.contains('auth')) {
        database.createObjectStore('auth', { keyPath: 'key' })
      }
    }
  })
}

async function saveRememberToken(token) {
  // Método 1: Cache API direto (funciona sem SW controller)
  if ('caches' in window) {
    try {
      const cache = await caches.open('poly-io-auth')
      const response = new Response(JSON.stringify({ token, savedAt: Date.now() }))
      await cache.put('/auth-token', response)
      console.log('[Auth] Token salvo no Cache API com sucesso')
    } catch (e) {
      console.error('[Auth] Erro ao salvar no Cache API:', e)
    }
  }

  // Método 2: IndexedDB
  try {
    if (!authDb) await initAuthDB()
    await new Promise((resolve, reject) => {
      const transaction = authDb.transaction(['auth'], 'readwrite')
      const store = transaction.objectStore('auth')
      const request = store.put({ key: 'remember_token', value: token })
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
    console.log('[Auth] Token salvo no IndexedDB')
  } catch (e) {
    console.error('[Auth] Erro IndexedDB:', e)
  }

  // Método 3: localStorage
  try {
    localStorage.setItem('poly_remember_token', token)
    console.log('[Auth] Token salvo no localStorage')
  } catch (e) {
    console.error('[Auth] Erro localStorage:', e)
  }

  return true
}

async function loadRememberToken() {
  // Método 1: Cache API direto
  if ('caches' in window) {
    try {
      const cache = await caches.open('poly-io-auth')
      const response = await cache.match('/auth-token')
      if (response) {
        const data = await response.json()
        if (data.token) {
          console.log('[Auth] Token carregado do Cache API')
          return data.token
        }
      }
    } catch (e) {
      console.error('[Auth] Erro ao carregar do Cache API:', e)
    }
  }

  // Método 2: localStorage
  try {
    const token = localStorage.getItem('poly_remember_token')
    if (token) {
      console.log('[Auth] Token carregado do localStorage')
      return token
    }
  } catch (e) {
    console.error('[Auth] Erro localStorage:', e)
  }

  // Método 3: IndexedDB
  try {
    if (!authDb) await initAuthDB()
    return new Promise((resolve) => {
      const transaction = authDb.transaction(['auth'], 'readonly')
      const store = transaction.objectStore('auth')
      const request = store.get('remember_token')
      request.onsuccess = () => {
        if (request.result?.value) {
          console.log('[Auth] Token carregado do IndexedDB')
        }
        resolve(request.result?.value || null)
      }
      request.onerror = () => resolve(null)
    })
  } catch (e) {
    console.error('[Auth] Erro IndexedDB:', e)
    return null
  }

  return null
}

async function clearRememberToken() {
  // Limpar do Cache API
  if ('caches' in window) {
    try {
      const cache = await caches.open('poly-io-auth')
      await cache.delete('/auth-token')
    } catch (e) { /* ignorar */ }
  }

  // Limpar do localStorage
  try {
    localStorage.removeItem('poly_remember_token')
  } catch (e) { /* ignorar */ }

  // Limpar do IndexedDB
  try {
    if (!authDb) await initAuthDB()
    return new Promise((resolve) => {
      const transaction = authDb.transaction(['auth'], 'readwrite')
      const store = transaction.objectStore('auth')
      const request = store.delete('remember_token')
      request.onsuccess = () => resolve(true)
      request.onerror = () => resolve(false)
    })
  } catch (e) {
    return false
  }
}

// ==================== PREFERÊNCIAS DO USUÁRIO (COR DO BALÃO) ====================

async function saveBubbleColor(color) {
  console.log('[BubbleColor] Salvando cor:', color)

  // Método 1: Service Worker (mais confiável em PWA)
  if (navigator.serviceWorker?.controller) {
    try {
      const messageChannel = new MessageChannel()
      navigator.serviceWorker.controller.postMessage(
        { type: 'SAVE_BUBBLE_COLOR', color },
        [messageChannel.port2]
      )
    } catch (e) {
      console.error('[BubbleColor] Erro ao salvar via SW:', e)
    }
  }

  // Método 2: Cache API direto
  if ('caches' in window) {
    try {
      const cache = await caches.open('poly-io-prefs')
      const response = new Response(JSON.stringify({ color, savedAt: Date.now() }))
      await cache.put('/bubble-color', response)
      console.log('[BubbleColor] Cor salva no Cache API:', color)
    } catch (e) {
      console.error('[BubbleColor] Erro ao salvar no Cache API:', e)
    }
  }

  // Método 3: IndexedDB
  try {
    if (!authDb) await initAuthDB()
    await new Promise((resolve, reject) => {
      const transaction = authDb.transaction(['auth'], 'readwrite')
      const store = transaction.objectStore('auth')
      const request = store.put({ key: 'bubble_color', value: color })
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
    console.log('[BubbleColor] Cor salva no IndexedDB:', color)
  } catch (e) {
    console.error('[BubbleColor] Erro IndexedDB:', e)
  }

  // Método 4: localStorage (backup)
  try {
    localStorage.setItem('poly_bubble_color', color)
  } catch (e) { /* ignorar */ }
}

async function loadBubbleColor() {
  // Método 1: Service Worker
  if (navigator.serviceWorker?.controller) {
    try {
      const color = await new Promise((resolve) => {
        const messageChannel = new MessageChannel()
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success && event.data.color) {
            resolve(event.data.color)
          } else {
            resolve(null)
          }
        }
        navigator.serviceWorker.controller.postMessage(
          { type: 'LOAD_BUBBLE_COLOR' },
          [messageChannel.port2]
        )
        setTimeout(() => resolve(null), 1000) // Timeout
      })
      if (color) {
        console.log('[BubbleColor] Cor carregada do SW:', color)
        return color
      }
    } catch (e) {
      console.error('[BubbleColor] Erro ao carregar via SW:', e)
    }
  }

  // Método 2: Cache API direto
  if ('caches' in window) {
    try {
      const cache = await caches.open('poly-io-prefs')
      const response = await cache.match('/bubble-color')
      if (response) {
        const data = await response.json()
        if (data.color) {
          console.log('[BubbleColor] Cor carregada do Cache API:', data.color)
          return data.color
        }
      }
    } catch (e) {
      console.error('[BubbleColor] Erro ao carregar do Cache API:', e)
    }
  }

  // Método 3: IndexedDB
  try {
    if (!authDb) await initAuthDB()
    const color = await new Promise((resolve) => {
      const transaction = authDb.transaction(['auth'], 'readonly')
      const store = transaction.objectStore('auth')
      const request = store.get('bubble_color')
      request.onsuccess = () => {
        if (request.result?.value) {
          console.log('[BubbleColor] Cor carregada do IndexedDB:', request.result.value)
          resolve(request.result.value)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => resolve(null)
    })
    if (color) return color
  } catch (e) {
    console.error('[BubbleColor] Erro IndexedDB:', e)
  }

  // Método 4: localStorage (backup)
  try {
    const color = localStorage.getItem('poly_bubble_color')
    if (color) {
      console.log('[BubbleColor] Cor carregada do localStorage:', color)
      return color
    }
  } catch (e) { /* ignorar */ }

  return null
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

function toggleTheme() {
  darkMode.value = !darkMode.value
  localStorage.setItem('poly_theme', darkMode.value ? 'dark' : 'light')
  applyTheme()
}

function applyTheme() {
  if (darkMode.value) {
    document.documentElement.classList.remove('light-theme')
  } else {
    document.documentElement.classList.add('light-theme')
  }
}

// Acessibilidade - aplicar tamanho da fonte
function applyFontSize() {
  localStorage.setItem('poly_font_size', messageFontSize.value)
  document.documentElement.style.setProperty('--message-font-size', messageFontSize.value + 'px')
}

// Fechar menu de fonte ao clicar fora
function closeFontSizeMenu(e) {
  if (!e.target.closest('.font-size-control')) {
    showFontSizeMenu.value = false
  }
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

// ==================== FIXAR E ORDENAR CONTATOS ====================

function isContactPinned(contactId) {
  return pinnedContacts.value.includes(contactId)
}

function togglePinContact(contactId) {
  const index = pinnedContacts.value.indexOf(contactId)
  if (index === -1) {
    // Fixar (máximo 5)
    if (pinnedContacts.value.length >= 5) {
      alert('Você pode fixar no máximo 5 contatos!')
      return
    }
    pinnedContacts.value.push(contactId)
  } else {
    // Desafixar
    pinnedContacts.value.splice(index, 1)
  }
  saveContactsConfigToServer()
}

function moveContact(contactId, direction) {
  const isPinned = pinnedContacts.value.includes(contactId)

  if (isPinned) {
    // Mover dentro dos fixados
    const index = pinnedContacts.value.indexOf(contactId)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= pinnedContacts.value.length) return

    // Trocar posições
    const temp = pinnedContacts.value[newIndex]
    pinnedContacts.value[newIndex] = pinnedContacts.value[index]
    pinnedContacts.value[index] = temp

    saveContactsConfigToServer()
  } else {
    // Mover dentro dos não fixados
    // Garantir que todos os contatos não fixados estão na lista de ordem
    const notPinnedIds = connections.value
      .filter(c => !pinnedContacts.value.includes(c.id))
      .map(c => c.id)

    // Sincronizar contactsOrder com contatos existentes
    // Manter ordem existente + adicionar novos no final
    const existingOrder = contactsOrder.value.filter(id => notPinnedIds.includes(id))
    const newIds = notPinnedIds.filter(id => !contactsOrder.value.includes(id))
    contactsOrder.value = [...existingOrder, ...newIds]

    const index = contactsOrder.value.indexOf(contactId)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= contactsOrder.value.length) return

    // Trocar posições
    const temp = contactsOrder.value[newIndex]
    contactsOrder.value[newIndex] = contactsOrder.value[index]
    contactsOrder.value[index] = temp

    saveContactsConfigToServer()
  }
}

function moveContactUp(contactId) {
  moveContact(contactId, 'up')
}

function moveContactDown(contactId) {
  moveContact(contactId, 'down')
}

// Sincronizar ordem dos contatos quando carregados do backend
function syncContactsOrder() {
  // Remover IDs de contatos que não existem mais
  pinnedContacts.value = pinnedContacts.value.filter(id =>
    connections.value.some(c => c.id === id)
  )
  saveContactsConfigToServer()

  // Sincronizar contactsOrder: manter ordem existente + novos no final
  const notPinnedIds = connections.value
    .filter(c => !pinnedContacts.value.includes(c.id))
    .map(c => c.id)

  const existingOrder = contactsOrder.value.filter(id => notPinnedIds.includes(id))
  const newIds = notPinnedIds.filter(id => !contactsOrder.value.includes(id))
  contactsOrder.value = [...existingOrder, ...newIds]
  saveContactsConfigToServer()
}

// ==================== MODO NARRATIVO DA IO ====================

async function loadNarrativeMode() {
  try {
    const res = await fetch(`${API_URL}/io/narrative-mode`, {
      headers: { 'Authorization': `Bearer ${token.value}` }
    })
    if (res.ok) {
      const data = await res.json()
      ioNarrativeMode.value = data.narrativeMode
    }
  } catch (e) {
    console.error('Erro ao carregar modo narrativo:', e)
  }
}

async function toggleNarrativeMode() {
  try {
    const newMode = !ioNarrativeMode.value
    const res = await fetch(`${API_URL}/io/narrative-mode`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ narrativeMode: newMode })
    })
    if (res.ok) {
      ioNarrativeMode.value = newMode
      // Feedback visual
      const msg = newMode
        ? '📖 Modo Híbrido ativado! io vai usar narrativa quando apropriado.'
        : '💬 Modo Normal ativado! io vai conversar normalmente.'
      alert(msg)
    }
  } catch (e) {
    console.error('Erro ao alternar modo narrativo:', e)
  }
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

function scrollRoomToBottom() {
  nextTick(() => {
    const container = document.querySelector('.messages-area')
    if (container) {
      container.scrollTop = container.scrollHeight
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

onMounted(async () => {
  // Aplicar tema salvo
  applyTheme()

  // Aplicar tamanho de fonte salvo
  applyFontSize()

  // Listener para fechar menu de fonte ao clicar fora
  document.addEventListener('click', closeFontSizeMenu)

  // Aguardar Service Worker estar pronto (importante para PWA)
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.ready
      console.log('[Auth] Service Worker pronto')
    } catch (e) {
      console.log('[Auth] SW não disponível')
    }
  }

  // IMPORTANTE: Inicializar IndexedDB de auth
  try {
    await initAuthDB()
    console.log('[Auth] IndexedDB inicializado')
  } catch (e) {
    console.error('[Auth] Erro ao inicializar IndexedDB:', e)
  }

  // Verificar se tem remember_token salvo
  const savedToken = await loadRememberToken()
  console.log('[Auth] Remember token encontrado:', savedToken ? 'SIM' : 'NÃO')

  checkResetToken()
  await checkAuth()

  // Fechar dropdown de status ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.status-dropdown-wrapper')) {
      statusDropdownOpen.value = false
    }
    if (!e.target.closest('.experiment-dropdown-wrapper')) {
      experimentDropdownOpen.value = false
    }
  })

  // Listener global para colar imagens com Ctrl+V no chat 1:1
  document.addEventListener('paste', handlePaste)
  console.log('[Paste] Listener global registrado')

  // Inicializar IndexedDB para arquivos pendentes
  try {
    await initIndexedDB()
    console.log('[IndexedDB] Inicializado para arquivos pendentes')
  } catch (e) {
    console.error('[IndexedDB] Erro ao inicializar:', e)
  }

  // Carregar cor do balão salva
  try {
    const savedColor = await loadBubbleColor()
    if (savedColor) {
      messageBubbleColor.value = savedColor
      console.log('[BubbleColor] Cor restaurada:', savedColor)
    }
  } catch (e) {
    console.error('[BubbleColor] Erro ao carregar cor:', e)
  }

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
  saveBubbleColor(newColor)
})
</script>

<style>
/* ==================== VARIÁVEIS DE TEMA ==================== */
:root {
  /* Dark Theme (padrão) */
  --bg-primary: #0a0a0a;
  --bg-secondary: #111;
  --bg-tertiary: #1a1a1a;
  --bg-card: #111;
  --bg-input: #1a1a1a;
  --bg-hover: #222;
  --bg-gradient: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);

  --text-primary: #fff;
  --text-secondary: #888;
  --text-muted: #666;

  --border-color: #222;
  --border-light: #333;

  --accent: #6366f1;
  --accent-hover: #5558e3;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #f43f5e;

  --shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.5);
}

/* Light Theme */
:root.light-theme {
  --bg-primary: #f5f5f5;
  --bg-secondary: #fff;
  --bg-tertiary: #f0f0f0;
  --bg-card: #fff;
  --bg-input: #f8f8f8;
  --bg-hover: #e8e8e8;
  --bg-gradient: linear-gradient(135deg, #f5f5f5 0%, #e8e8f0 100%);

  --text-primary: #1a1a1a;
  --text-secondary: #666;
  --text-muted: #999;

  --border-color: #e0e0e0;
  --border-light: #d0d0d0;

  --shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.12);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  transition: background 0.3s, color 0.3s;
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
  background: var(--bg-gradient);
  padding: 20px;
}

.auth-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.logo {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.logo-poly { color: var(--text-primary); }
.logo-io { color: var(--accent); }

.tagline {
  color: var(--text-muted);
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
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-tabs button.active {
  background: var(--accent);
  border-color: var(--accent);
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
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--accent);
}

/* Password toggle */
.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-wrapper input {
  flex: 1;
  padding-right: 45px;
}

.password-toggle {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 8px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.password-toggle:hover {
  opacity: 1;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.checkbox-group {
  margin-top: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #ccc;
  font-size: 0.9rem;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #6366f1;
  cursor: pointer;
}

.checkbox-label span {
  color: #10b981;
  font-weight: 500;
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

/* Modal de Atualização de Idade */
.age-update-overlay {
  z-index: 9999;
  background: rgba(0, 0, 0, 0.9);
}

.age-update-modal {
  text-align: center;
  max-width: 380px;
}

.age-update-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.age-update-modal h3 {
  color: #fff;
  margin-bottom: 8px;
}

.age-update-modal .modal-subtitle {
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 24px;
}

.age-update-modal .form-group {
  text-align: left;
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
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
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
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 1rem;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

.btn-close-sidebar:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.logo-small {
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-version {
  font-size: 0.6rem;
  color: var(--text-muted);
  font-weight: 400;
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
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
  background: var(--bg-tertiary);
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
  border: 1px solid var(--border-light);
  background: var(--bg-tertiary);
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-mute-all:hover {
  border-color: var(--border-color);
  background: var(--bg-hover);
}

.btn-mute-all.muted {
  background: var(--bg-hover);
  border-color: var(--warning);
}

/* Botão toggle de tema */
.btn-theme-toggle {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: var(--bg-tertiary);
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-theme-toggle:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
}

/* Controle de tamanho de fonte (Acessibilidade) */
.font-size-control {
  position: relative;
}

.btn-font-size {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: var(--bg-tertiary);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-font-size:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
}

.font-icon {
  font-family: serif;
}

.font-size-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px;
  min-width: 180px;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.font-size-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-align: center;
}

.font-size-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-hover);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.font-size-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #6366f1;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.font-size-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.font-size-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #6366f1;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.font-size-preview {
  text-align: center;
  margin-top: 12px;
  font-size: 1.2rem;
  font-weight: 600;
  color: #6366f1;
}

/* Light theme */
:root.light-theme .font-size-menu {
  background: #fff;
  border-color: #e5e7eb;
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

/* Contatos fixados */
.user-item.pinned {
  background: rgba(99, 102, 241, 0.15);
  border-left: 3px solid #6366f1;
}

.user-item.pinned:hover {
  background: rgba(99, 102, 241, 0.25);
}

.pin-icon {
  font-size: 0.7rem;
  margin-right: 4px;
}

/* Container de ações do contato */
.contact-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.user-item:hover .contact-actions {
  opacity: 1;
}

/* Botões de mover - setas brancas */
.btn-move {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: bold;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-move:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.btn-move:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

/* Light theme: setas brancas (fundo fica roxo no hover/active) */
:root.light-theme .btn-move {
  color: #fff;
}

:root.light-theme .btn-move:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* Botão fixar */
.btn-pin {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.75rem;
  opacity: 0.4;
  transition: all 0.2s;
}

.btn-pin:hover {
  opacity: 1;
  background: #333;
}

.btn-pin.pinned {
  opacity: 1;
  background: rgba(99, 102, 241, 0.3);
}

/* Botão modo narrativo da io */
.btn-narrative-mode {
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
  margin-right: 4px;
}

.btn-narrative-mode:hover {
  opacity: 1;
  background: #222;
}

.btn-narrative-mode.active {
  opacity: 1;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
}

/* Badge de mensagens não lidas */
.unread-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.4);
  animation: pulse-badge 2s infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(236, 72, 153, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 2px 12px rgba(236, 72, 153, 0.6);
  }
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

/* Light theme: cores do texto do status */
:root.light-theme .status-dropdown-item.online .status-name {
  color: #10b981;
}

:root.light-theme .status-dropdown-item.ausente .status-name {
  color: #f59e0b;
}

:root.light-theme .status-dropdown-item.ocupado .status-name {
  color: #ef4444;
}

:root.light-theme .status-dropdown-item.invisivel .status-name {
  color: #fff;
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
  border-bottom: 1px solid var(--border-color);
}

.sidebar-nav button {
  flex: 1;
  padding: 10px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-secondary);
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
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.nav-icon {
  font-size: 1.1rem;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--bg-hover);
  color: var(--text-primary);
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 10px;
}

.badge.highlight {
  background: var(--danger);
  color: #fff;
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
  color: var(--text-muted);
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

/* Light theme: hover e seleção com fundo roxo */
:root.light-theme .user-item:hover {
  background: #6366f1;
}

:root.light-theme .user-item:hover .user-info .name,
:root.light-theme .user-item:hover .user-info .lang {
  color: #fff;
}

:root.light-theme .user-item.active {
  background: #6366f1;
}

:root.light-theme .user-item.active .user-info .name,
:root.light-theme .user-item.active .user-info .lang {
  color: #fff;
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

.connection-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
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
  background: var(--bg-primary);
}

.no-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
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
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-secondary);
}

.chat-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-user .name {
  font-weight: 600;
  display: block;
  color: var(--text-primary);
}

.chat-user .status {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Contador diário io Friend (badge com barra interna) */
.io-daily-counter {
  margin-left: 12px;
}

/* Badge pill com barra de progresso interna */
.io-counter-badge {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  background: #1e1e3f;
  border: 1px solid #6366f1;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  overflow: hidden;
}

/* Barra de progresso dentro do badge (fundo) */
.badge-progress-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 100%;
  background: transparent;
}

.badge-progress-fill {
  height: 100%;
  background: rgba(99, 102, 241, 0.15);
  transition: width 0.3s ease;
}

.io-counter-badge .badge-icon {
  position: relative;
  z-index: 1;
  font-size: 0.9rem;
}

.io-counter-badge .badge-count {
  position: relative;
  z-index: 1;
  font-weight: 700;
  color: #fff;
}

.io-counter-badge .badge-limit {
  position: relative;
  z-index: 1;
  color: #6366f1;
}

/* Estado Warning (70-90%) */
.io-daily-counter.warning .io-counter-badge {
  border-color: #f59e0b;
}

.io-daily-counter.warning .badge-progress-fill {
  background: rgba(245, 158, 11, 0.2);
}

.io-daily-counter.warning .io-counter-badge .badge-limit {
  color: #f59e0b;
}

/* Estado Danger (90-100%) */
.io-daily-counter.danger .io-counter-badge {
  border-color: #ef4444;
  animation: pulse-danger 1.5s infinite;
}

.io-daily-counter.danger .badge-progress-fill {
  background: rgba(239, 68, 68, 0.25);
}

.io-daily-counter.danger .io-counter-badge .badge-limit {
  color: #ef4444;
}

@keyframes pulse-danger {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
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

/* Light theme: dropdown roxo com texto branco */
:root.light-theme .idioma-select {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

:root.light-theme .idioma-select:hover,
:root.light-theme .idioma-select:focus {
  border-color: #4f46e5;
  background: #4f46e5;
}

:root.light-theme .idioma-select option {
  background: #6366f1;
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

/* Light theme: badge roxo com texto branco */
:root.light-theme .translation-badge {
  background: #6366f1;
  color: #fff;
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

/* Botão de responder */
.btn-reply-msg {
  padding: 6px 10px;
  background: #333;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-reply-msg:hover {
  background: #444;
}

/* Quote da mensagem respondida */
.message-quote {
  background: rgba(99, 102, 241, 0.15);
  border-left: 3px solid #6366f1;
  padding: 6px 10px;
  margin-bottom: 8px;
  border-radius: 4px;
  cursor: pointer;
  max-width: 100%;
  transition: background 0.2s;
}

.message-quote:hover {
  background: rgba(99, 102, 241, 0.25);
}

.quote-sender {
  display: block;
  color: #6366f1;
  font-weight: 600;
  font-size: 0.75rem;
  margin-bottom: 2px;
}

.quote-text {
  display: block;
  color: #aaa;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Barra de resposta (acima do input) */
.reply-bar {
  display: flex;
  align-items: center;
  background: #1a1a2e;
  padding: 8px 12px;
  border-left: 3px solid #6366f1;
  margin-bottom: 8px;
  border-radius: 4px;
  gap: 10px;
}

.reply-preview {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.reply-to-name {
  display: block;
  color: #6366f1;
  font-weight: 600;
  font-size: 0.8rem;
}

.reply-to-text {
  display: block;
  color: #888;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cancel-reply {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 1rem;
  transition: color 0.2s;
}

.cancel-reply:hover {
  color: #fff;
}

/* Highlight quando clica no quote */
.message.highlight-message .message-content {
  animation: highlight-pulse 0.5s ease-out;
  box-shadow: 0 0 0 2px #6366f1;
}

@keyframes highlight-pulse {
  0% { transform: scale(1.02); }
  100% { transform: scale(1); }
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

.expiration-notice.experimenting {
  background: linear-gradient(135deg, #f59e0b20, #d9770620);
  border-bottom: 1px solid #f59e0b40;
  color: #f59e0b;
}

.btn-adopt-inline {
  background: linear-gradient(135deg, #a855f7, #7c3aed) !important;
  border: none !important;
  color: #fff !important;
  padding: 4px 12px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  font-size: 0.75rem !important;
  text-decoration: none !important;
  margin-left: 8px;
}

/* Dropdown de experimento no header */
.experiment-dropdown-wrapper {
  position: relative;
  margin-left: 12px;
}

.experiment-dropdown-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  border: none;
  color: #fff;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s;
}

.experiment-dropdown-btn:hover {
  background: linear-gradient(135deg, #9333ea, #6d28d9);
  transform: scale(1.02);
}

.experiment-dropdown-btn .experiment-icon {
  font-size: 14px;
}

.experiment-dropdown-btn .experiment-label {
  font-size: 12px;
}

.experiment-dropdown-btn .dropdown-arrow {
  font-size: 10px;
  opacity: 0.8;
}

.experiment-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 260px;
  background: #1e1e2e;
  border: 1px solid #3a3a4a;
  border-radius: 12px;
  overflow: hidden;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.experiment-dropdown-item {
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #2a2a3a;
}

.experiment-dropdown-item:last-child {
  border-bottom: none;
}

.experiment-dropdown-item:hover {
  background: #2a2a3a;
}

.experiment-dropdown-item.adopt:hover {
  background: rgba(168, 85, 247, 0.15);
}

.experiment-dropdown-item.cancel:hover {
  background: rgba(239, 68, 68, 0.1);
}

.experiment-item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.experiment-item-icon {
  font-size: 16px;
}

.experiment-item-name {
  font-weight: 600;
  font-size: 14px;
  color: #fff;
}

.experiment-dropdown-item.adopt .experiment-item-name {
  color: #a855f7;
}

.experiment-dropdown-item.cancel .experiment-item-name {
  color: #888;
}

.experiment-item-desc {
  font-size: 12px;
  color: #888;
  margin: 0;
  padding-left: 26px;
  line-height: 1.4;
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
  color: #fff;
}

/* Light theme: texto branco no balão roxo */
:root.light-theme .message.sent .message-content {
  color: #fff;
}

:root.light-theme .message.sent .message-time {
  color: rgba(255, 255, 255, 0.8);
}

:root.light-theme .message.sent .read-status {
  color: rgba(255, 255, 255, 0.7);
}

.message.received .message-content {
  background: var(--bg-hover);
  border-bottom-left-radius: 4px;
  color: var(--text-primary);
}

.message-text {
  font-size: var(--message-font-size, 14px);
  line-height: 1.5;
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

.btn-speak {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 2px 4px;
  margin-left: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-speak:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.btn-speak.speaking {
  color: #22c55e;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-secondary);
}

.input-row {
  display: flex;
  width: 100%;
}

.input-row input {
  flex: 1;
  padding: 14px 20px;
  background: var(--bg-input);
  border: 1px solid var(--border-light);
  border-radius: 24px;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
}

.input-row input:focus {
  border-color: var(--accent);
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
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-send:hover:not(:disabled) {
  background: var(--accent-hover);
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
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: 50%;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-attach:hover {
  border-color: var(--accent);
  color: var(--accent);
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

/* Botão de gerar imagem */
.btn-imagine {
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

.btn-imagine:hover {
  border-color: #a855f7;
  color: #a855f7;
  background: #1a1a2a;
}

/* Mensagem de áudio */
.audio-message {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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

/* Transcrição de áudio */
.btn-transcribe {
  background: rgba(99, 102, 241, 0.2);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-transcribe:hover {
  background: rgba(99, 102, 241, 0.4);
  transform: scale(1.1);
}

.transcribing-indicator {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.transcription-result {
  width: 100%;
  margin-top: 8px;
  padding: 10px 12px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border-left: 3px solid #6366f1;
}

.transcription-text {
  margin: 0;
  font-size: 0.9rem;
  color: #e0e0e0;
  line-height: 1.4;
}

.transcription-buttons {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.btn-original-audio,
.btn-speak-transcription {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 0.9rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-original-audio:hover,
.btn-speak-transcription:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-speak-transcription.speaking {
  color: #22c55e;
  animation: pulse 1s infinite;
}

.original-audio-text {
  margin: 6px 0 0 0;
  font-size: 0.8rem;
  color: #888;
  font-style: italic;
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
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 30px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.profile-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
}

.profile-close:hover {
  color: var(--text-primary);
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

/* Container para avatar + io friend badge */
.profile-avatar-container {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.profile-avatar-container .profile-avatar-large {
  margin: 0;
}

/* Badge da io Friend criada */
.profile-io-friend-badge {
  position: absolute;
  right: calc(50% - 75px);
  top: 0;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: 3px solid var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.profile-io-friend-badge:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.io-friend-mini-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.io-friend-mini-default {
  font-size: 20px;
}

/* Coroa para tier lendario */
.io-crown {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.2rem;
  z-index: 10;
  filter: drop-shadow(0 0 6px #ffd700);
  animation: crown-float 2s ease-in-out infinite;
}

@keyframes crown-float {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-3px); }
}

/* ============ TIER STYLES ============ */

/* Tier: Iniciante (0-499) */
.tier-iniciante .io-friend-mini-avatar,
.tier-iniciante.profile-io-friend-badge {
  border: 3px solid #3a3a4a;
}

/* Tier: Prata (500-999) */
.tier-prata.profile-io-friend-badge {
  background: linear-gradient(135deg, #a8a8a8, #e8e8e8, #a8a8a8);
  box-shadow: 0 0 10px rgba(200, 200, 200, 0.5);
}

/* Tier: Ouro (1000-2999) */
.tier-ouro.profile-io-friend-badge {
  background: linear-gradient(135deg, #b8860b, #ffd700, #b8860b);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
}

/* Tier: Diamante (3000-4999) */
.tier-diamante.profile-io-friend-badge {
  background: linear-gradient(135deg, #00d4ff, #00ffcc, #ff00ff, #00d4ff);
  animation: diamante-rotate 3s linear infinite;
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.7);
}

@keyframes diamante-rotate {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

/* Tier: Lendario (5000+) */
.tier-lendario.profile-io-friend-badge {
  background: conic-gradient(from 0deg, #ffd700, #ff6b00, #ff0080, #9933ff, #00d4ff, #ffd700);
  animation: lendario-rotate 4s linear infinite;
  box-shadow: 0 0 25px rgba(255, 215, 0, 0.8);
}

@keyframes lendario-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.tier-lendario .io-friend-mini-avatar {
  animation: lendario-pulse 2s ease-in-out infinite;
}

@keyframes lendario-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* ============ MODAL IO FRIEND DETAIL ============ */
.io-friend-detail-modal {
  max-width: 360px;
  text-align: center;
  padding: 30px;
}

.io-detail-avatar-container {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 20px;
  border-radius: 50%;
  padding: 4px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.io-detail-avatar-container.tier-prata {
  background: linear-gradient(135deg, #a8a8a8, #e8e8e8, #a8a8a8);
}

.io-detail-avatar-container.tier-ouro {
  background: linear-gradient(135deg, #b8860b, #ffd700, #b8860b);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.io-detail-avatar-container.tier-diamante {
  background: linear-gradient(135deg, #00d4ff, #00ffcc, #ff00ff, #00d4ff);
  animation: diamante-rotate 3s linear infinite;
  box-shadow: 0 0 25px rgba(0, 212, 255, 0.6);
}

.io-detail-avatar-container.tier-lendario {
  background: conic-gradient(from 0deg, #ffd700, #ff6b00, #ff0080, #9933ff, #00d4ff, #ffd700);
  animation: lendario-rotate 4s linear infinite;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.7);
}

.io-detail-crown {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.8rem;
  z-index: 10;
  filter: drop-shadow(0 0 8px #ffd700);
  animation: crown-float 2s ease-in-out infinite;
}

.io-detail-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  overflow: hidden;
}

.io-detail-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.io-detail-name {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: #fff;
}

.io-detail-tier-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 15px;
}

.io-detail-tier-badge.tier-iniciante {
  background: #2a2a3a;
  color: #888;
}

.io-detail-tier-badge.tier-prata {
  background: linear-gradient(135deg, #a8a8a8, #d0d0d0);
  color: #333;
}

.io-detail-tier-badge.tier-ouro {
  background: linear-gradient(135deg, #b8860b, #ffd700);
  color: #333;
}

.io-detail-tier-badge.tier-diamante {
  background: linear-gradient(135deg, #00d4ff, #00ffcc);
  color: #333;
}

.io-detail-tier-badge.tier-lendario {
  background: linear-gradient(135deg, #ffd700, #ff6b00);
  color: #333;
  animation: badge-glow 2s ease-in-out infinite alternate;
}

@keyframes badge-glow {
  0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
  100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
}

.io-detail-desc {
  color: #aaa;
  font-size: 0.9rem;
  margin-bottom: 15px;
  line-height: 1.5;
}

.io-detail-creator {
  color: #666;
  font-size: 0.85rem;
  margin-bottom: 20px;
}

.io-detail-creator strong {
  color: #888;
}

.btn-like-io {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  background: #2a2a3a;
  color: #fff;
}

.btn-like-io:hover {
  background: #3a3a4a;
  transform: scale(1.05);
}

.btn-like-io.liked {
  background: linear-gradient(135deg, #ec4899, #f43f5e);
  color: #fff;
}

.btn-like-io.liked:hover {
  transform: scale(1.05);
}

.btn-like-io .like-heart {
  font-size: 1.2rem;
}

.btn-experiment-detail {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 12px 20px;
  border: 1px solid #6366f1;
  border-radius: 10px;
  background: transparent;
  color: #6366f1;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-experiment-detail:hover {
  background: #6366f1;
  color: #fff;
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
  margin-bottom: 12px;
}

/* Badge Membro Fundador */
.founder-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: transparent;
  border: 1px solid #ffd700;
  color: #ffd700;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}

.btn-monitor {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 16px;
  transition: all 0.2s;
}

.btn-monitor:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.founder-star {
  display: inline-block;
  font-size: 0.8rem;
  animation: founder-star-spin 3s linear infinite;
}

@keyframes founder-star-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

/* Ko-fi Store */
.profile-store {
  margin-bottom: 20px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #222;
}

.store-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #ff5e5b, #ff9966);
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
}

.store-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 94, 91, 0.4);
}

.store-icon {
  font-size: 1.1rem;
}

.store-empty {
  color: #666;
  font-size: 0.85rem;
}

.store-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.btn-edit-store {
  padding: 8px 16px;
  background: #333;
  border: none;
  border-radius: 6px;
  color: #888;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-edit-store:hover {
  background: #444;
  color: #fff;
}

.store-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.store-info {
  font-size: 0.8rem;
  color: #888;
  text-align: center;
}

.store-info a {
  color: #ff5e5b;
  text-decoration: none;
}

.store-info a:hover {
  text-decoration: underline;
}

.store-input {
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
}

.store-input:focus {
  border-color: #ff5e5b;
  outline: none;
}

.store-buttons {
  display: flex;
  gap: 8px;
}

.store-buttons .btn-save {
  flex: 1;
  padding: 10px;
  background: #ff5e5b;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}

.store-buttons .btn-cancel {
  flex: 1;
  padding: 10px;
  background: #333;
  border: none;
  border-radius: 8px;
  color: #888;
  cursor: pointer;
}

.store-buttons .btn-remove {
  padding: 10px;
  background: #dc2626;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}

.store-buttons .btn-remove:hover {
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

  /* Área de mensagens da SALA no mobile */
  .room-wrapper {
    padding-top: 85px; /* Compensar header fixo */
  }

  .messages-area {
    margin-bottom: 100px; /* Compensar input fixo */
    padding-bottom: 20px;
  }

  /* Input da sala fixo no rodapé */
  .room-input-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    padding: 12px;
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
  .btn-call,
  .btn-imagine {
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

  /* Contador io no mobile */
  .io-daily-counter {
    margin-left: 8px;
  }

  .io-counter-badge {
    padding: 4px 10px;
    font-size: 0.7rem;
    gap: 4px;
  }

  .io-counter-badge .badge-icon {
    font-size: 0.75rem;
  }

  /* Setas de mover contato sempre visíveis no mobile */
  .contact-actions {
    opacity: 1;
  }

  .btn-move {
    width: 26px;
    height: 26px;
    font-size: 1rem;
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

/* Botão de gorjeta Ko-fi */
.btn-tip {
  background: #ff5e5b !important;
  font-size: 1.1rem;
  transition: all 0.2s;
}

.btn-tip:hover {
  background: #ff7875 !important;
  transform: scale(1.1);
}

/* Modal de Gorjeta Ko-fi */
.tip-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.tip-modal {
  background: linear-gradient(145deg, #1a1a2e 0%, #16162a 100%);
  border: 1px solid #6366f1;
  border-radius: 16px;
  padding: 30px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(99, 102, 241, 0.3);
}

.tip-modal h3 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  color: #fff;
}

.tip-modal .tip-subtitle {
  color: #888;
  margin-bottom: 24px;
  font-size: 0.95rem;
}

.tip-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.tip-options {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
}

.tip-option {
  flex: 1;
  padding: 16px 12px;
  background: #252540;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.tip-option:hover {
  border-color: #ff5e5b;
  background: #2a2a4a;
  transform: translateY(-2px);
}

.tip-emoji {
  font-size: 1.5rem;
}

.tip-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #ff5e5b;
}

.tip-info {
  font-size: 0.8rem;
  color: #666;
  margin-top: 12px;
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

/* Light theme: salas com fundo roxo e texto branco */
:root.light-theme .room-item {
  background: #6366f1;
}

:root.light-theme .room-item:hover {
  background: #5558e3;
}

:root.light-theme .room-item.active {
  background: #4f46e5;
}

:root.light-theme .room-item .room-info .name {
  color: #fff;
}

:root.light-theme .room-item .room-info .desc {
  color: rgba(255, 255, 255, 0.8);
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
  background: var(--bg-card);
  padding: 24px;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
}

.modal-content h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* Modal io Friend */
.io-friend-modal {
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.io-friend-subtitle {
  color: var(--text-secondary);
  margin: -8px 0 20px;
  font-size: 0.9rem;
}

.io-friend-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.io-friend-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.io-friend-form label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.io-friend-form input[type="text"],
.io-friend-form textarea,
.io-friend-form select {
  padding: 12px;
  background: #1a1a2a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  font-family: inherit;
}

.io-friend-form input:focus,
.io-friend-form textarea:focus,
.io-friend-form select:focus {
  outline: none;
  border-color: #a855f7;
}

.io-friend-form textarea {
  resize: none;
}

.radio-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.95rem;
}

.radio-option input[type="radio"] {
  accent-color: #a855f7;
}

.checkbox-group {
  padding: 8px 0;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-option input[type="checkbox"] {
  accent-color: #a855f7;
  width: 18px;
  height: 18px;
}

.io-friend-tip {
  margin-top: 16px;
  padding: 12px;
  background: rgba(168, 85, 247, 0.1);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Avatar da io friend */
.avatar-section {
  margin-bottom: 8px;
}

.avatar-preview-container {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #2a2a3a;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #333;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 2rem;
}

.avatar-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.avatar-controls input {
  padding: 10px 12px;
  background: #1a1a2a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
}

.btn-generate-avatar {
  padding: 10px 16px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-generate-avatar:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-generate-avatar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.avatar-hint {
  color: #666;
  font-size: 0.8rem;
  margin-top: 4px;
}

.btn-io-friend {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: linear-gradient(135deg, #a855f7, #6366f1);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-io-friend:hover {
  opacity: 0.9;
}

/* Lista de io friends do usuário */
.io-friends-section {
  margin-top: 12px;
}

.my-io-friends-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.my-io-friend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.io-friend-thumb {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.io-friend-name {
  flex: 1;
  font-size: 0.9rem;
  color: #fff;
}

.btn-edit-mini,
.btn-delete-mini {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 0.85rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-edit-mini:hover,
.btn-delete-mini:hover {
  opacity: 1;
}

.founder-io-limit {
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 8px;
}

.btn-use-default-io {
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-use-default-io:hover {
  background: rgba(255, 255, 255, 0.15);
}

.my-io-friend-item.active {
  border-color: #a855f7;
  background: rgba(168, 85, 247, 0.15);
}

.btn-star {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.4);
  padding: 0;
  transition: all 0.2s;
}

.btn-star:hover {
  color: #fbbf24;
  transform: scale(1.1);
}

.btn-star.active {
  color: #fbbf24;
}

.btn-explore {
  width: 100%;
  padding: 10px;
  margin-top: 8px;
  background: linear-gradient(135deg, #06b6d4, #3b82f6);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-explore:hover {
  opacity: 0.9;
}

/* ==================== LIGHT THEME: PERFIL ==================== */

/* Seção código de conexão */
:root.light-theme .friend-code-section {
  background: #6366f1;
}

:root.light-theme .friend-code-label {
  color: rgba(255, 255, 255, 0.8);
}

:root.light-theme .friend-code {
  color: #fff;
}

:root.light-theme .btn-copy {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

:root.light-theme .btn-copy:hover {
  background: rgba(255, 255, 255, 0.3);
}

:root.light-theme .btn-share-link {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
}

:root.light-theme .btn-share-link:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Botões de editar social */
:root.light-theme .btn-edit-social {
  background: #6366f1;
  color: #fff;
}

:root.light-theme .btn-edit-social:hover {
  background: #5558e3;
}

/* Inputs e selects */
:root.light-theme .social-select,
:root.light-theme .social-input {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #1f2937;
}

:root.light-theme .social-buttons .btn-cancel {
  background: #e5e7eb;
  color: #374151;
}

/* io Friends list */
:root.light-theme .my-io-friend-item {
  background: #6366f1;
  border-color: #6366f1;
}

:root.light-theme .my-io-friend-item.active {
  background: #7c3aed;
  border-color: #7c3aed;
}

:root.light-theme .io-friend-name {
  color: #fff;
}

:root.light-theme .btn-star {
  color: rgba(255, 255, 255, 0.6);
}

:root.light-theme .btn-star:hover,
:root.light-theme .btn-star.active {
  color: #fbbf24;
}

:root.light-theme .btn-edit-mini,
:root.light-theme .btn-delete-mini {
  filter: brightness(0) invert(1);
}

:root.light-theme .btn-use-default-io {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

:root.light-theme .btn-use-default-io:hover {
  background: #5558e3;
}

:root.light-theme .founder-io-limit {
  color: #6b7280;
}

/* Profile tip */
:root.light-theme .profile-tip {
  color: #6b7280;
}

/* Badge fundador - manter dourado */
:root.light-theme .founder-badge {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #1f2937;
}

/* Modal Explorar */
.explore-modal {
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.explore-subtitle {
  color: #9ca3af;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.explore-loading {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
}

.explore-empty {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
}

.explore-empty-hint {
  font-size: 0.85rem;
  margin-top: 8px;
}

.explore-grid {
  display: grid;
  gap: 16px;
}

.explore-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #1e1e2e;
  border-radius: 12px;
  border: 1px solid #333;
  transition: border-color 0.2s;
}

.explore-card:hover {
  border-color: #a855f7;
}

.explore-card-avatar {
  flex-shrink: 0;
}

.explore-card-avatar img {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  object-fit: cover;
}

.avatar-placeholder-large {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: #333;
  border-radius: 12px;
  font-size: 2rem;
}

.explore-card-info {
  flex: 1;
  min-width: 0;
}

.explore-card-name {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  color: #fff;
}

.explore-card-gender {
  font-size: 0.8rem;
  color: #9ca3af;
}

.explore-card-desc {
  margin: 8px 0;
  font-size: 0.85rem;
  color: #d1d5db;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.explore-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.explore-card-creator {
  color: #6b7280;
  font-size: 0.8rem;
}

.explore-card-likes {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.explore-card-likes.tier-iniciante {
  background: #2a2a3a;
  color: #888;
}

.explore-card-likes.tier-prata {
  background: linear-gradient(135deg, #a8a8a8, #d0d0d0);
  color: #333;
}

.explore-card-likes.tier-ouro {
  background: linear-gradient(135deg, #b8860b, #ffd700);
  color: #333;
}

.explore-card-likes.tier-diamante {
  background: linear-gradient(135deg, #00d4ff, #00ffcc);
  color: #333;
}

.explore-card-likes.tier-lendario {
  background: linear-gradient(135deg, #ffd700, #ff6b00);
  color: #333;
  animation: badge-glow 2s ease-in-out infinite alternate;
}

.btn-experiment-io {
  margin-top: 12px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
  width: 100%;
}

.btn-experiment-io:hover:not(:disabled) {
  background: linear-gradient(135deg, #d97706, #b45309);
  transform: translateY(-1px);
}

.btn-experiment-io:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.experimenting-badge {
  margin-top: 12px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 8px;
  text-align: center;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
}

.explore-card-experimenting {
  border-color: #10b981;
  background: linear-gradient(135deg, #1e1e2e, #0f2922);
}

/* Banner de experimento no chat */
.experiment-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: linear-gradient(135deg, #f59e0b20, #d9770620);
  border-bottom: 1px solid #f59e0b40;
  gap: 12px;
  flex-wrap: wrap;
}

.experiment-banner span {
  color: #f59e0b;
  font-size: 0.9rem;
}

.experiment-actions {
  display: flex;
  gap: 8px;
}

.btn-adopt {
  padding: 6px 12px;
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  border: none;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-adopt:hover {
  background: linear-gradient(135deg, #9333ea, #6d28d9);
}

.btn-stop-experiment {
  padding: 6px 12px;
  background: #333;
  border: 1px solid #555;
  color: #999;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-stop-experiment:hover {
  background: #444;
  color: #fff;
}

.explore-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #333;
}

.explore-tip {
  text-align: center;
  color: #9ca3af;
  font-size: 0.85rem;
}

/* Seção pública no form */
.public-section {
  padding: 16px;
  background: #1a1a2e;
  border-radius: 8px;
  border: 1px solid #333;
}

.public-hint {
  font-size: 0.85rem;
  color: #9ca3af;
  margin-bottom: 12px;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: #6b7280;
}

.btn-danger {
  background: #dc2626;
  color: #fff;
}

.btn-danger:hover {
  background: #b91c1c;
}

/* Modal Imagine (Gerar Imagem) */
.imagine-modal {
  max-width: 450px;
  padding: 0;
  overflow: hidden;
}

.imagine-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.imagine-modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.imagine-modal-body {
  padding: 20px;
}

.imagine-hint {
  margin: 0 0 12px 0;
  color: #888;
  font-size: 0.9rem;
}

.imagine-textarea {
  width: 100%;
  padding: 14px;
  background: #1a1a2a;
  border: 1px solid #333;
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  resize: none;
  font-family: inherit;
}

.imagine-textarea:focus {
  outline: none;
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.15);
}

.imagine-textarea::placeholder {
  color: #666;
}

.imagine-modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #333;
  justify-content: flex-end;
}

.imagine-modal-footer .btn-cancel {
  padding: 10px 20px;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.imagine-modal-footer .btn-cancel:hover {
  background: #444;
}

.imagine-modal-footer .btn-generate {
  padding: 10px 24px;
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.imagine-modal-footer .btn-generate:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
}

.imagine-modal-footer .btn-generate:disabled {
  background: #555;
  cursor: not-allowed;
  opacity: 0.6;
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
  background: var(--bg-hover);
  color: var(--text-primary);
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

/* Modal Encaminhar Mensagem */
.forward-modal {
  max-width: 420px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.forward-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.forward-header h3 {
  margin: 0;
  font-size: 16px;
  color: #fff;
}

.btn-close-forward {
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}

.btn-close-forward:hover {
  color: #fff;
}

.forward-search {
  padding: 12px 20px;
  border-bottom: 1px solid #333;
}

.forward-search-input {
  width: 100%;
  padding: 10px 14px;
  background: #0d1b2a;
  border: 1px solid #333;
  border-radius: 20px;
  color: #fff;
  font-size: 14px;
}

.forward-search-input:focus {
  outline: none;
  border-color: #6366f1;
}

.forward-preview {
  padding: 12px 20px;
  background: #0d1b2a;
  border-bottom: 1px solid #333;
}

.forward-preview-label {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}

.forward-preview-text {
  font-size: 13px;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.forward-contacts-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  max-height: 300px;
}

.forward-contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.forward-contact-item:hover {
  background: #1a2a3a;
}

.forward-contact-item.selected {
  background: rgba(99, 102, 241, 0.15);
}

.forward-checkbox {
  width: 20px;
  height: 20px;
  accent-color: #6366f1;
}

.forward-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.forward-avatar-letter {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #fff;
}

.forward-contact-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.forward-contact-name {
  font-size: 14px;
  color: #fff;
}

.forward-contact-lang {
  font-size: 11px;
  color: #888;
}

.no-contacts {
  text-align: center;
  color: #888;
  padding: 20px;
  font-size: 14px;
}

.forward-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid #333;
  background: #16213e;
}

.forward-selected-count {
  font-size: 13px;
  color: #888;
}

.btn-forward-send {
  padding: 10px 24px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-forward-send:hover:not(:disabled) {
  background: #5558e3;
}

.btn-forward-send:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}

/* Botão encaminhar no menu de ações */
.btn-forward-msg {
  background: none;
  border: none;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-forward-msg:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* ==================== AVATAR BUILDER ==================== */

.avatar-modal {
  max-width: 440px;
  padding: 0;
}

.avatar-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.avatar-modal-header h3 {
  margin: 0;
  font-size: 16px;
}

.btn-close-modal {
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
}

.btn-close-modal:hover {
  color: #fff;
}

.avatar-type-selector {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  background: #0d1b2a;
}

.avatar-type-selector button {
  flex: 1;
  padding: 10px 16px;
  background: #1a1a2e;
  border: 2px solid #333;
  color: #888;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-type-selector button:hover {
  border-color: #6366f1;
  color: #fff;
}

.avatar-type-selector button.active {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

.gravatar-info {
  padding: 20px;
  text-align: center;
  color: #888;
}

.gravatar-info a {
  color: #6366f1;
}

.gravatar-email {
  font-size: 14px;
  color: #fff;
  margin: 8px 0;
}

.gravatar-tip {
  font-size: 12px;
  color: #666;
  margin-top: 12px;
}

.avatar-preview-container {
  display: flex;
  justify-content: center;
  padding: 24px;
  background: #0d1b2a;
}

.avatar-preview-large {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 3px solid #6366f1;
}

.avatar-preview-large.pixel-preview {
  border-radius: 8px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* ==================== PIXEL EDITOR ==================== */

.pixel-editor {
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.pixel-tools {
  display: flex;
  gap: 8px;
}

.pixel-tools button {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 2px solid #333;
  background: #1a1a2e;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.pixel-tools button:hover {
  background: #2a2a4e;
  border-color: #6366f1;
}

.pixel-tools button.active {
  background: #6366f1;
  border-color: #6366f1;
}

.pixel-grid {
  display: flex;
  flex-direction: column;
  border: 2px solid #6366f1;
  border-radius: 4px;
  background: #2d2d2d;
  cursor: crosshair;
  touch-action: none;
}

.pixel-row {
  display: flex;
}

.pixel-cell {
  width: 8px;
  height: 8px;
  border: none;
  box-sizing: border-box;
  background-clip: padding-box;
}

.pixel-cell:hover {
  outline: 1px solid #6366f1;
  outline-offset: -1px;
  z-index: 1;
}

.pixel-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  max-width: 280px;
}

.pixel-color-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 2px solid #333;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
}

.pixel-color-btn:hover {
  transform: scale(1.15);
  border-color: #6366f1;
}

.pixel-color-btn.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px #6366f1;
}

.pixel-color-btn.transparent {
  background: linear-gradient(45deg, #444 25%, transparent 25%),
              linear-gradient(-45deg, #444 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #444 75%),
              linear-gradient(-45deg, transparent 75%, #444 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
  background-color: #222;
}

/* Mobile: ajustes para 32x32 */
@media (max-width: 480px) {
  .pixel-cell {
    width: 7px;
    height: 7px;
  }

  .pixel-color-btn {
    width: 28px;
    height: 28px;
  }

  .pixel-tools button {
    width: 38px;
    height: 38px;
  }
}

.avatar-options {
  padding: 16px 20px;
  max-height: 340px;
  overflow-y: auto;
}

.avatar-option-group {
  margin-bottom: 16px;
}

.avatar-option-group label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.avatar-color-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.avatar-color-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-color-btn:hover {
  transform: scale(1.1);
}

.avatar-color-btn.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px #6366f1;
}

.avatar-style-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.avatar-style-btn {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 2px solid #333;
  background: #1a1a2e;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-style-btn:hover {
  border-color: #6366f1;
  background: #252545;
}

.avatar-style-btn.active {
  border-color: #6366f1;
  background: #6366f1;
}

.avatar-modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #333;
}

.avatar-modal-footer .btn-secondary,
.avatar-modal-footer .btn-primary {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.avatar-modal-footer .btn-secondary {
  background: #333;
  color: #fff;
}

.avatar-modal-footer .btn-primary {
  background: #6366f1;
  color: #fff;
}

.avatar-modal-footer .btn-primary:hover {
  background: #5558e3;
}

/* Tabs de navegação do Avatar */
.avatar-tabs {
  display: flex;
  border-bottom: 1px solid #333;
  background: #0d1b2a;
}

.avatar-tabs button {
  flex: 1;
  padding: 12px 8px;
  background: transparent;
  border: none;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.avatar-tabs button:hover {
  color: #fff;
  background: rgba(99, 102, 241, 0.1);
}

.avatar-tabs button.active {
  color: #6366f1;
  border-bottom-color: #6366f1;
}

/* Opções de estilo com wrap */
.avatar-style-options.wrap {
  flex-wrap: wrap;
}

/* Botões pequenos */
.avatar-style-btn.small {
  width: 36px;
  height: 36px;
  font-size: 16px;
}

.avatar-color-btn.small {
  width: 28px;
  height: 28px;
}

/* Avatar customizado no sidebar */
.custom-avatar-small {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.current-user-avatar {
  position: relative;
}

.current-user-avatar:hover .custom-avatar-small {
  transform: scale(1.05);
}

.avatar-edit-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: #6366f1;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  border: 2px solid #16213e;
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

.room-user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
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

.room-imagine-btn {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  color: #fff;
  font-size: 1.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.room-imagine-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
}

.room-imagine-btn:active {
  transform: scale(0.98);
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
  }

  .participant-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
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

/* PWA Update Prompt - Barra discreta no topo */
.update-prompt {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.update-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  color: #fff;
  padding: 8px 16px;
  font-size: 0.85rem;
}

.update-actions {
  display: flex;
  gap: 8px;
}

.btn-update {
  background: #fff;
  color: #6366f1;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-update:hover {
  transform: scale(1.05);
}

.btn-later {
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-later:hover {
  background: rgba(255, 255, 255, 0.1);
}

@media (max-width: 480px) {
  .update-content {
    padding: 6px 12px;
    font-size: 0.8rem;
    gap: 8px;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* ==================== IMAGINE (Geração de Imagens) ==================== */
  .message.imagine-msg {
    max-width: 400px !important;
  }

  .message-content.imagine-content {
    max-width: 400px !important;
  }

  .imagine-message {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 400px;
  }

  .imagine-text-before {
    margin: 0 0 8px 0;
    font-size: 0.9rem;
    color: inherit;
    max-width: 400px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .imagine-prompt {
    margin: 0;
    font-size: 0.85rem;
    color: inherit;
    word-wrap: break-word;
    overflow-wrap: break-word;
    opacity: 0.8;
  }

  .imagine-image-container {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
  }

  .imagine-image {
    width: 100%;
    max-width: 400px;
    border-radius: 8px;
    cursor: pointer;
    display: block;
  }

  .imagine-image:hover {
    opacity: 0.9;
  }

  .imagine-loading {
    display: none;
  }

  .imagine-loading.active {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 200px;
    color: #fff;
    font-size: 0.85rem;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .imagine-download-removed {
    display: none;
    text-decoration: none;
  }

  .imagine-download:hover {
    text-decoration: underline;
  }

  /* Fullscreen Image Modal */
  .fullscreen-image-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  }

  .fullscreen-close {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 24px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fullscreen-close:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .fullscreen-image {
    max-width: 90vw;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 8px;
  }

  .fullscreen-download {
    margin-top: 20px;
    padding: 10px 20px;
    background: #667eea;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-size: 0.9rem;
  }

  .fullscreen-download:hover {
    background: #5a6fd6;
  }
}
</style>
// v4.1 - Ko-fi tips
