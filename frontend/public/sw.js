// Poly.io Service Worker - PWA + Push Notifications

const CACHE_NAME = 'poly-io-v3.63';
const AUTH_CACHE_NAME = 'poly-io-auth';

// Arquivos para cache offline
const urlsToCache = [
  '/',
  '/index.html'
];

// Instalar service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando versão:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
    // NÃO chama skipWaiting() aqui - espera o usuário clicar em "Atualizar"
  );
});

// Ativar service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Receber push notification
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);

  let data = {
    title: 'Poly.io',
    body: 'Nova notificação',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'poly-notification',
    data: {}
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: data.type === 'call', // Chamadas ficam até responder
    actions: data.type === 'call' ? [
      { action: 'accept', title: 'Atender' },
      { action: 'reject', title: 'Recusar' }
    ] : []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clique na notificação:', event.action);

  event.notification.close();

  const data = event.notification.data || {};

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já tem uma janela aberta, focar nela
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            // Enviar ação para o cliente
            client.postMessage({
              type: 'notification-click',
              action: event.action,
              data: data
            });
            return;
          }
        }
        // Se não tem janela aberta, abrir uma nova
        if (clients.openWindow) {
          let url = '/';
          if (data.type === 'call' && event.action === 'accept') {
            url = `/?acceptCall=${data.callerId}`;
          } else if (data.type === 'message' && data.connectionId) {
            url = `/?openChat=${data.connectionId}`;
          }
          return clients.openWindow(url);
        }
      })
  );
});

// Notificação fechada
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada');
});

// Mensagem do cliente (para SKIP_WAITING e AUTH)
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Recebido SKIP_WAITING, ativando nova versão...');
    self.skipWaiting();
  }

  // Salvar remember_token no cache do SW (persiste melhor em PWA)
  if (event.data && event.data.type === 'SAVE_AUTH_TOKEN') {
    try {
      const cache = await caches.open(AUTH_CACHE_NAME);
      const response = new Response(JSON.stringify({ token: event.data.token }));
      await cache.put('/auth-token', response);
      console.log('[SW] Token de auth salvo no cache');
      event.ports[0]?.postMessage({ success: true });
    } catch (e) {
      console.error('[SW] Erro ao salvar token:', e);
      event.ports[0]?.postMessage({ success: false, error: e.message });
    }
  }

  // Carregar remember_token do cache
  if (event.data && event.data.type === 'LOAD_AUTH_TOKEN') {
    try {
      const cache = await caches.open(AUTH_CACHE_NAME);
      const response = await cache.match('/auth-token');
      if (response) {
        const data = await response.json();
        console.log('[SW] Token de auth carregado do cache');
        event.ports[0]?.postMessage({ success: true, token: data.token });
      } else {
        event.ports[0]?.postMessage({ success: false, token: null });
      }
    } catch (e) {
      console.error('[SW] Erro ao carregar token:', e);
      event.ports[0]?.postMessage({ success: false, token: null });
    }
  }

  // Limpar remember_token do cache
  if (event.data && event.data.type === 'CLEAR_AUTH_TOKEN') {
    try {
      const cache = await caches.open(AUTH_CACHE_NAME);
      await cache.delete('/auth-token');
      console.log('[SW] Token de auth removido do cache');
      event.ports[0]?.postMessage({ success: true });
    } catch (e) {
      event.ports[0]?.postMessage({ success: false });
    }
  }
});

// Fetch com cache fallback
self.addEventListener('fetch', (event) => {
  // Ignorar requests não-GET e requests de API
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
