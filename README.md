# Poly.io

> Chat sem barreiras de idioma

Cada pessoa escreve no seu idioma. A outra pessoa lê no idioma dela. Simples assim.

---

## Rodar Localmente

### Backend
```bash
cd C:\Poly.io\backend
npm install
npm run dev
```
Servidor: `http://localhost:3000`

### Frontend
```bash
cd C:\Poly.io\frontend
npm install
npm run dev
```
Frontend: `http://localhost:5174`

---

## Deploy em Produção (Grátis)

### 1. Subir código para GitHub

```bash
cd C:\Poly.io
git init
git add .
git commit -m "Poly.io - Chat com tradução automática"
```

Crie um repositório no GitHub e:
```bash
git remote add origin https://github.com/SEU_USER/poly-io.git
git push -u origin main
```

---

### 2. Deploy do Backend (Render)

1. Acesse: https://render.com
2. Crie conta grátis (pode usar GitHub)
3. Clique em **New > Web Service**
4. Conecte seu repositório GitHub
5. Configure:
   - **Name**: poly-io-api
   - **Root Directory**: backend
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Em **Environment Variables**, adicione:
   - `AZURE_TRANSLATOR_KEY` = (sua chave Azure - opcional)
   - `AZURE_TRANSLATOR_REGION` = eastus
7. Clique **Create Web Service**

Anote a URL gerada (ex: `https://poly-io-api.onrender.com`)

---

### 3. Deploy do Frontend (Vercel)

1. Acesse: https://vercel.com
2. Crie conta grátis (pode usar GitHub)
3. Clique em **Add New > Project**
4. Importe seu repositório
5. Configure:
   - **Root Directory**: frontend
   - **Framework Preset**: Vite
6. Em **Environment Variables**, adicione:
   - `VITE_API_URL` = https://poly-io-api.onrender.com (URL do Render)
7. Clique **Deploy**

Pronto! Seu chat estará em: `https://poly-io.vercel.app`

---

## Configurar Azure Translator (Opcional)

Para tradução de alta qualidade (2 milhões chars/mês grátis):

1. Acesse: https://portal.azure.com
2. Crie conta grátis
3. Busque "Translator" e crie um recurso
4. Tier: **Free F0**
5. Após criar, vá em **Keys and Endpoint**
6. Copie a **KEY 1**
7. Adicione no Render:
   - `AZURE_TRANSLATOR_KEY` = sua_key
   - `AZURE_TRANSLATOR_REGION` = eastus (ou sua região)

Sem Azure, o sistema usa MyMemory como fallback (também funciona bem).

---

## Estrutura do Projeto

```
C:\Poly.io\
├── backend/
│   ├── src/
│   │   └── server.js      # API + Socket.io + Tradução
│   ├── package.json
│   └── render.yaml        # Config Render
│
├── frontend/
│   ├── src/
│   │   ├── main.js
│   │   └── App.vue        # Interface do chat
│   ├── package.json
│   └── vercel.json        # Config Vercel
│
├── .gitignore
└── README.md
```

---

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Frontend | Vue.js 3 + Vite |
| Backend | Node.js + Express |
| Tempo Real | Socket.io |
| Tradução | Azure Translator / MyMemory |
| Deploy | Vercel + Render |

---

## Idiomas Suportados

- Português (pt)
- English (en)
- Español (es)
- Français (fr)
- Deutsch (de)
- Italiano (it)
- 日本語 (ja)
- 한국어 (ko)
- 中文 (zh)
- Русский (ru)
- العربية (ar)

---

## Custos

| Serviço | Custo |
|---------|-------|
| Vercel | Grátis |
| Render | Grátis |
| Azure Translator | Grátis (2M chars/mês) |
| MyMemory | Grátis |

**Total: R$ 0,00** 🎉

---

Feito com muito código e café ☕
