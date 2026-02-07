const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const webpush = require('web-push')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const { pool, initDatabase, limparMensagensExpiradas, verificarSalasInativas, generateFriendCode, generateRoomInviteCode } = require('./db')

// ==================== CONFIGURAÇÃO ====================

const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'poly-io-secret-key-change-in-production'
const AZURE_KEY = process.env.AZURE_TRANSLATOR_KEY || ''
const AZURE_REGION = process.env.AZURE_TRANSLATOR_REGION || 'eastus'

// VAPID Keys para Push Notifications (gerar novas em produção)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAf7-fGzM5Ao1xbv-QGu4pqL3cwLmQM'

// Configurar web-push
webpush.setVapidDetails(
  'mailto:contato@poly.io',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

// Armazenar subscriptions de push (em memória - em produção usar banco)
const pushSubscriptions = new Map() // odestinandoId -> subscription

// Configuração de Email (para reset de senha)
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com'
const EMAIL_PORT = process.env.EMAIL_PORT || 587
const EMAIL_USER = process.env.EMAIL_USER || ''
const EMAIL_PASS = process.env.EMAIL_PASS || ''
const EMAIL_FROM = process.env.EMAIL_FROM || 'Poly.io <noreply@poly.io>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://poly-io.vercel.app'

// Configurar transporter de email
const emailTransporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT == 465,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
})

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

// Mapa de usuários online (socket) e seus status
const usuariosOnline = new Map() // userId -> socketId
const usuariosStatus = new Map() // userId -> 'online' | 'ausente' | 'ocupado' | 'invisivel'

// ==================== SALAS - ARMAZENAMENTO EM MEMÓRIA ====================
const salaUsuarios = new Map()    // roomId -> Set<userId> - usuários ativos na sala
const salaMensagens = new Map()   // roomId -> [{id, senderId, senderNome, texto, textoOriginal, idiomaOriginal, timestamp, traducoesCache}]
const usuarioSala = new Map()     // odestinandoId -> roomId (qual sala o usuário está atualmente)
let mensagemIdCounter = 1         // contador para IDs de mensagens em memória

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

// Dicionário de gírias PT-BR → frases para melhor tradução
const GIRIAS_PT = {
  // Cumprimentos e despedidas
  'blz': 'tudo bem',
  'blz?': 'tudo bem?',
  'e ai': 'olá, como vai',
  'e aí': 'olá, como vai',
  'eai': 'olá, como vai',
  'eaí': 'olá, como vai',
  'fala': 'olá',
  'salve': 'olá',
  'opa': 'olá',
  'oi': 'olá',
  'flw': 'tchau, até mais',
  'vlw': 'valeu, obrigado',
  'vlw flw': 'valeu, tchau',
  'tmj': 'estamos juntos',
  'abs': 'abraços',
  'bjs': 'beijos',

  // Confirmações e reações
  'show': 'muito bom, excelente',
  'top': 'muito bom, excelente',
  'massa': 'muito bom, legal',
  'daora': 'muito bom, legal',
  'dahora': 'muito bom, legal',
  'brabo': 'muito bom, incrível',
  'braba': 'muito bom, incrível',
  'zika': 'muito bom, incrível',
  'irado': 'muito bom, incrível',
  'sinistro': 'muito bom, incrível',
  'animal': 'muito bom, incrível',
  'firmeza': 'combinado, certo',
  'fechou': 'combinado, certo',
  'suave': 'tranquilo, sem problemas',
  'sussa': 'tranquilo, sem problemas',
  'deboa': 'tranquilo, sem problemas',
  'dboa': 'tranquilo, sem problemas',
  'tranquilo': 'sem problemas, ok',
  'beleza': 'ok, tudo bem',
  'blz': 'ok, tudo bem',
  'pdc': 'pode crer, entendi',
  'dale': 'vamos lá',
  'partiu': 'vamos lá',
  'bora': 'vamos lá',
  'vambora': 'vamos embora',

  // Expressões
  'mano': 'amigo',
  'véi': 'amigo',
  'vei': 'amigo',
  'cara': 'amigo',
  'brother': 'amigo',
  'parça': 'parceiro, amigo',
  'truta': 'amigo',
  'mina': 'garota, mulher',
  'mlk': 'menino, garoto',
  'moleque': 'menino, garoto',
  'gata': 'mulher bonita',
  'gato': 'homem bonito',

  // Abreviações
  'vc': 'você',
  'vcs': 'vocês',
  'tb': 'também',
  'tbm': 'também',
  'pq': 'porque',
  'pra': 'para',
  'pro': 'para o',
  'oq': 'o que',
  'qdo': 'quando',
  'qnd': 'quando',
  'nd': 'nada',
  'ngm': 'ninguém',
  'msg': 'mensagem',
  'hj': 'hoje',
  'dps': 'depois',
  'obg': 'obrigado',
  'pfv': 'por favor',
  'ctz': 'certeza',
  'vdd': 'verdade',
  'tlgd': 'entendeu',
  'tlg': 'entende',
  'fds': 'fim de semana',
  'sdds': 'saudades',
  'sdd': 'saudade',

  // Risadas
  'kkk': 'haha',
  'kkkk': 'hahaha',
  'kkkkk': 'hahahaha',
  'rsrs': 'haha',
  'rsrsrs': 'hahaha',
  'hehe': 'hehe',
  'hehehe': 'hehehe',

  // Trabalho e cotidiano
  'trampo': 'trabalho',
  'trampar': 'trabalhar',
  'trampando': 'trabalhando',
  'rolê': 'passeio, saída',
  'role': 'passeio, saída',
  'rolezinho': 'passeio rápido',
  'corre': 'tarefa, compromisso',
  'correria': 'muitas tarefas',
  'grana': 'dinheiro',
  'din': 'dinheiro',
  'pila': 'dinheiro',
  'conto': 'mil reais',

  // Interjeições
  'eita': 'nossa, que surpresa',
  'caramba': 'nossa, impressionante',
  'mds': 'meu deus',
  'plmds': 'pelo amor de deus',
  'slc': 'que loucura',
  'slk': 'que loucura',
  'nmrl': 'não é mentira, sério',

  // Perguntas comuns
  'td bem': 'tudo bem',
  'td certo': 'tudo certo',
  'como vc ta': 'como você está',
  'como vc tá': 'como você está',
  'oq vc acha': 'o que você acha',
  'bora la': 'vamos lá',
  'bora lá': 'vamos lá'
}

// Função para expandir gírias antes da tradução
function expandirGirias(texto) {
  let textoExpandido = texto.toLowerCase()

  // Ordenar chaves por tamanho (maior primeiro) para evitar substituições parciais
  const chaves = Object.keys(GIRIAS_PT).sort((a, b) => b.length - a.length)

  for (const giria of chaves) {
    // Criar regex que encontra a gíria como palavra completa
    const regex = new RegExp(`\\b${giria.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    textoExpandido = textoExpandido.replace(regex, GIRIAS_PT[giria])
  }

  // Manter capitalização da primeira letra se o original tinha
  if (texto[0] === texto[0].toUpperCase()) {
    textoExpandido = textoExpandido.charAt(0).toUpperCase() + textoExpandido.slice(1)
  }

  return textoExpandido
}

function detectarIdioma(texto, idiomaFallback = null) {
  const textoLower = texto.toLowerCase()

  // Caracteres únicos do português (ã, õ, ç) - forte indicador
  if (/[ãõç]/i.test(texto)) return 'pt'

  // Palavras muito comuns em português (expandido com gírias e abreviações)
  const palavrasPT = /\b(olá|oi|tudo|bem|obrigado|obrigada|bom|dia|noite|tarde|irmão|amigo|amiga|como|vai|você|vocês|não|sim|isso|esse|essa|aqui|ali|agora|depois|antes|muito|pouco|legal|show|beleza|valeu|tchau|até|logo|então|porque|pra|pro|pela|pelo|meu|minha|seu|sua|nosso|nossa|dele|dela|está|estou|estava|são|foi|ser|ter|fazer|faz|quero|quer|pode|posso|vou|vamos|vem|veio|acho|gosto|gostei|também|ainda|já|mais|menos|sempre|nunca|onde|quando|quem|qual|quanto|coisa|pessoa|gente|cara|mano|parceiro|top|massa|demais|testando|teste|funciona|funcionou|chegou|chegando|mensagem|sala|chat|entendi|entendeu|fala|falou|disse|diz|preciso|precisa|queria|gostaria|poderia|seria|estão|eram|fomos|temos|tinha|tenho|ficou|fica|ficar|olha|olhe|veja|viu|né|pois|aliás|inclusive|enfim|afinal|aliás|realmente|certeza|claro|lógico|verdade|mentira|sério|jura|nossa|caramba|uau|eita|opa|ops|haha|kkk|rsrs|hehe|véi|vei|mina|mlk|moleque|firmeza|suave|partiu|bora|vambora|tmj|slk|pprt|flw|vlw|pdc|truta|zika|brabo|braba|chave|dale|daora|irado|sinistro|animal|vc|tb|tbm|pq|qdo|oq|nd|ngm|msg|hj|abs|bjs|blz|fmz|pfv|obg|dps|qnd|ctz|mds|pqp|vsf|krl|carai|poh|pow|poha|nmrl|slc|tamo|junto|sfd|plmds|plmdds|sdds|sdd|mozao|mozão|gata|gato|lindao|lindão|lindona|tmb|pse|vdd|vddc|tlgd|tlg|fds|pdp|crlh|merm|papo|reto|trampando|trampo|rolê|role|rolezinho|fechou|dboa|deboa|sussa|sussegado|tranquilao|trampar|zoeira|zueira|zuera|zoas|zoando|zuando|corre|correria|tramoia|parada|bagulho|migué|migue|enrolado|desenrola|vaza|vazou|ralar|ralei|perrengue|perreco|busao|busão|metro|metrô|uber|motoboy|ifood|pix|nubank|inter|c6|banco|grana|din|dinheiro|real|reais|conto|pila|boleto|cartao|cartão|credito|crédito|debito|débito)\b/i
  if (palavrasPT.test(textoLower)) return 'pt'

  // Acentos típicos do português com palavras
  if (/[áàâéêíóôú]/i.test(texto) && /\b\w{3,}\b/.test(texto)) return 'pt'

  // Terminações típicas do português
  if (/\b\w+(ção|ções|ando|endo|indo|ado|ido|oso|osa|eiro|eira|mente)\b/i.test(texto)) return 'pt'

  // Espanhol (expandido com gírias e expressões)
  if (/[ñ¿¡]/i.test(texto)) return 'es'
  if (/\b(hola|gracias|buenos|buenas|cómo|estás|está|qué|por|favor|mucho|muy|también|pero|porque|cuando|donde|quien|ahora|después|antes|siempre|nunca|todo|nada|algo|alguien|nadie|tengo|tienes|tiene|tenemos|tienen|quiero|quieres|quiere|puedo|puedes|puede|vamos|voy|vas|viene|vengo|hacer|hago|haces|dice|digo|dices|estoy|estas|somos|soy|eres|esto|esta|estos|estas|ese|esa|aquí|allí|ahí|luego|pronto|tarde|mañana|ayer|hoy|semana|mes|año|casa|trabajo|amigo|amiga|familia|vida|amor|tiempo|cosa|día|noche|agua|comida|dinero|carro|coche|ciudad|país|mundo|gente|hombre|mujer|niño|niña|chico|chica|jefe|genial|guay|mola|tío|tía|vale|venga|claro|bueno|pues|oye|mira|ojalá|chévere|bacán|chido|padre|órale|ándale|güey|wey|neta|chamba|jalar|plata|lana|feria|paro|bronca|chingón|cabrón|pendejo|güero|cuate|carnal|compa|pana|parcero|marico|coño|hostia|joder|flipar|currar|quedar|ligar|molar)\b/i.test(textoLower)) return 'es'

  // Francês (expandido com gírias e expressões)
  if (/\b(bonjour|salut|merci|beaucoup|comment|ça|va|oui|non|je|tu|il|elle|nous|vous|ils|elles|suis|est|sont|avec|pour|dans|sur|très|bien|mal|aujourd'hui|demain|hier|maintenant|toujours|jamais|encore|aussi|même|tout|tous|rien|quelque|autre|nouveau|petit|grand|bon|beau|vieux|jeune|premier|dernier|avoir|être|faire|dire|aller|voir|savoir|pouvoir|vouloir|venir|prendre|donner|parler|aimer|penser|trouver|laisser|mettre|sembler|rester|partir|quoi|pourquoi|parce|donc|mais|ou|comme|quand|si|plus|moins|mieux|super|génial|cool|sympa|chouette|mec|meuf|nana|gars|mdr|lol|ptdr|bcp|stp|dsl|jsp|tkt|cad|càd|pk|pcq|bref|genre|grave|trop|vachement|carrément|kiffer|craindre|galérer|bosser|taffer|bouffer|piger|capter|bagnole|fric|thune|blé|pote|poulette|naze|relou|chiant|ouf|chanmé|daron|daronne)\b/i.test(textoLower)) return 'fr'

  // Alemão (expandido com expressões comuns)
  if (/[äöüß]/i.test(texto)) return 'de'
  if (/\b(hallo|danke|bitte|guten|tag|morgen|abend|wie|geht|gut|schlecht|ja|nein|ich|du|er|sie|wir|ihr|bin|ist|sind|haben|sein|werden|können|müssen|wollen|sollen|machen|gehen|kommen|sehen|wissen|denken|nehmen|geben|finden|sagen|fragen|bleiben|heißen|leben|arbeiten|brauchen|glauben|halten|lassen|stehen|verstehen|versuchen|suchen|bringen|zeigen|führen|sprechen|liegen|kennen|setzen|spielen|laufen|lesen|schreiben|lernen|fahren|essen|trinken|schlafen|kaufen|verkaufen|warten|helfen|tschüss|servus|grüß|gott|mahlzeit|prost|genau|stimmt|klar|natürlich|eigentlich|vielleicht|wahrscheinlich|bestimmt|sicher|leider|hoffentlich|übrigens|jedenfalls|trotzdem|deswegen|deshalb|außerdem|geil|krass|cool|mega|hammer|alter|digga|ey|mann|mensch|mist|scheiße|verdammt|quatsch|blödsinn|wahnsinn|irre|toll|super|prima|wunderbar|herrlich|schrecklich|furchtbar|egal|doof|blöd|komisch|seltsam|merkwürdig)\b/i.test(textoLower)) return 'de'

  // Italiano (expandido com expressões comuns)
  if (/\b(ciao|grazie|buongiorno|buonasera|come|stai|bene|male|sì|no|io|tu|lui|lei|noi|voi|loro|sono|sei|è|siamo|siete|hanno|essere|avere|fare|dire|andare|venire|vedere|sapere|potere|volere|dovere|stare|dare|prendere|mettere|trovare|pensare|credere|parlare|sentire|lasciare|portare|tenere|capire|vivere|uscire|entrare|tornare|restare|rimanere|partire|arrivare|passare|chiamare|mangiare|bere|dormire|lavorare|studiare|giocare|leggere|scrivere|ascoltare|guardare|aspettare|cercare|provare|amare|piacere|cosa|questo|quello|qui|qua|là|adesso|ora|poi|dopo|prima|sempre|mai|ancora|anche|solo|tutto|niente|qualcosa|qualcuno|nessuno|altro|nuovo|grande|piccolo|buono|bello|brutto|certo|vero|proprio|stesso|ogni|quale|quanto|perché|quindi|però|allora|dunque|infatti|insomma|prego|scusa|scusi|perfetto|bellissimo|fantastico|magnifico|terribile|orribile|pazzesco|incredibile|assurdo|boh|mah|beh|dai|ecco|figurati|magari|macché|mica|caspita|cavolo|accidenti|mannaggia|porca|miseria|madonna|mamma|mia|ragazzi|amici|fratello|sorella|zio|zia|nonno|nonna|figo|fico|ganzo|forte|tosto|sballo|casino|bordello|incasinato|incazzato|rompere|fregare|fregarsi|beccare|sgamare|sbolognare)\b/i.test(textoLower)) return 'it'

  // Russo (cirílico)
  if (/[а-яА-ЯёЁ]/.test(texto)) return 'ru'

  // Japonês
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(texto)) return 'ja'

  // Coreano
  if (/[\uAC00-\uD7AF]/.test(texto)) return 'ko'

  // Chinês
  if (/[\u4E00-\u9FFF]/.test(texto)) return 'zh-Hans'

  // Árabe
  if (/[\u0600-\u06FF]/.test(texto)) return 'ar'

  // Palavras comuns em inglês (expandido com gírias e expressões)
  if (/\b(the|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|can|may|might|must|shall|this|that|these|those|what|which|who|whom|where|when|why|how|hello|hi|hey|thanks|thank|please|sorry|yes|no|yeah|nope|okay|ok|good|bad|great|nice|cool|awesome|amazing|wonderful|terrible|horrible|really|very|much|many|some|any|all|every|each|both|few|more|most|other|another|same|different|new|old|big|small|long|short|high|low|good|better|best|bad|worse|worst|first|last|next|want|need|like|love|hate|know|think|believe|understand|remember|forget|see|hear|feel|look|watch|listen|say|tell|ask|answer|speak|talk|read|write|learn|teach|work|play|make|take|give|get|put|keep|let|begin|start|stop|end|finish|try|help|use|find|show|change|move|run|walk|come|go|leave|stay|live|die|kill|buy|sell|pay|spend|save|send|receive|open|close|turn|hold|carry|bring|pull|push|throw|catch|break|fix|build|create|destroy|cut|eat|drink|sleep|wake|sit|stand|lie|fall|rise|grow|become|seem|appear|happen|matter|mean|suppose|wonder|hope|wish|expect|wait|meet|join|follow|lead|fight|win|lose|beat|hit|shoot|pick|choose|decide|agree|disagree|accept|refuse|allow|prevent|cause|affect|include|involve|require|provide|offer|suggest|recommend|consider|realize|recognize|imagine|guess|assume|admit|deny|claim|argue|explain|describe|mention|discuss|announce|confirm|reveal|discover|notice|observe|approach|enter|exit|cross|pass|reach|touch|grab|release|drop|lift|lower|raise|hang|attach|remove|add|subtract|multiply|divide|count|measure|weigh|compare|match|fit|suit|belong|contain|consist|depend|relate|connect|separate|combine|mix|blend|spread|cover|fill|empty|wrap|pack|unpack|fold|unfold|tie|untie|lock|unlock|switch|adjust|arrange|organize|prepare|plan|schedule|manage|control|handle|deal|cope|face|solve|resolve|achieve|accomplish|succeed|fail|improve|develop|progress|advance|update|upgrade|maintain|support|assist|serve|treat|care|protect|defend|attack|threaten|warn|blame|criticize|praise|encourage|motivate|inspire|influence|impress|convince|persuade|attract|interest|bore|annoy|irritate|frustrate|disappoint|satisfy|please|excite|thrill|scare|frighten|shock|surprise|amaze|astonish|confuse|puzzle|embarrass|shame|humiliate|insult|offend|hurt|harm|damage|injure|heal|cure|recover|relax|calm|stress|worry|fear|doubt|trust|respect|admire|appreciate|value|deserve|earn|owe|afford|cost|charge|fine|tip|bribe|steal|rob|cheat|lie|trick|fool|joke|tease|mock|laugh|smile|cry|weep|sob|scream|shout|yell|whisper|murmur|mumble|stutter|cough|sneeze|yawn|sigh|breathe|swallow|chew|bite|lick|suck|blow|smell|taste|touch|scratch|rub|pat|stroke|hug|kiss|shake|wave|nod|bow|kneel|squat|crouch|crawl|climb|jump|leap|hop|skip|slide|slip|trip|stumble|fall|crash|bump|collide|smash|crush|squeeze|press|push|pull|drag|lift|drop|throw|catch|kick|punch|slap|pinch|poke|stab|slice|chop|grind|mash|stir|pour|spill|drip|splash|spray|squirt|leak|flood|drown|sink|float|swim|dive|surf|sail|row|paddle|fly|soar|glide|hover|land|crash|explode|burst|pop|snap|crack|break|shatter|tear|rip|cut|slice|dice|carve|sculpt|mold|shape|form|design|draw|paint|color|shade|highlight|erase|delete|copy|paste|print|scan|fax|email|text|call|ring|answer|hang|dial|connect|disconnect|log|sign|register|subscribe|unsubscribe|follow|unfollow|like|dislike|share|post|comment|reply|forward|send|receive|download|upload|install|uninstall|update|upgrade|restart|reboot|shutdown|power|charge|drain|plug|unplug|connect|disconnect|sync|backup|restore|reset|clear|wipe|format|encrypt|decrypt|compress|decompress|zip|unzip|extract|archive|store|retrieve|search|find|locate|track|trace|monitor|scan|detect|identify|recognize|verify|validate|authenticate|authorize|permit|allow|deny|block|ban|restrict|limit|cap|quota|budget|allocate|distribute|assign|delegate|outsource|insource|hire|fire|employ|unemploy|retire|resign|quit|leave|stay|remain|return|come|go|arrive|depart|travel|commute|migrate|immigrate|emigrate|relocate|move|transfer|shift|switch|swap|exchange|trade|barter|negotiate|bargain|haggle|bid|auction|sell|buy|purchase|acquire|obtain|get|receive|accept|reject|refuse|decline|deny|ignore|dismiss|discard|dispose|recycle|reuse|reduce|conserve|preserve|protect|guard|secure|insure|ensure|guarantee|warrant|certify|license|permit|approve|authorize|sanction|endorse|recommend|suggest|propose|offer|present|introduce|announce|declare|proclaim|assert|claim|state|express|convey|communicate|transmit|broadcast|publish|release|issue|distribute|circulate|spread|propagate|promote|advertise|market|brand|label|tag|mark|stamp|seal|sign|initial|autograph|forge|fake|counterfeit|imitate|copy|duplicate|replicate|reproduce|clone|multiply|divide|split|separate|segregate|isolate|quarantine|contain|confine|restrict|limit|bound|border|edge|margin|frame|outline|silhouette|shadow|reflection|image|picture|photo|snapshot|portrait|selfie|video|clip|movie|film|show|series|episode|season|documentary|news|report|article|story|tale|novel|book|magazine|newspaper|journal|blog|post|tweet|status|update|notification|alert|warning|error|message|note|memo|letter|email|text|chat|conversation|discussion|debate|argument|dispute|conflict|fight|battle|war|peace|truce|treaty|agreement|contract|deal|arrangement|settlement|compromise|resolution|solution|answer|response|reply|reaction|feedback|review|rating|score|grade|rank|level|tier|class|category|type|kind|sort|variety|range|spectrum|scale|degree|extent|amount|quantity|number|figure|statistic|data|information|knowledge|wisdom|intelligence|brain|mind|thought|idea|concept|theory|hypothesis|assumption|premise|conclusion|inference|deduction|induction|logic|reason|argument|evidence|proof|fact|truth|reality|fiction|fantasy|imagination|dream|nightmare|vision|hallucination|illusion|delusion|perception|sensation|feeling|emotion|mood|temperament|personality|character|trait|habit|behavior|action|activity|task|job|work|duty|responsibility|obligation|commitment|promise|vow|oath|pledge|guarantee|assurance|confidence|trust|faith|belief|opinion|view|perspective|standpoint|position|stance|attitude|approach|method|technique|strategy|tactic|plan|scheme|plot|conspiracy|secret|mystery|puzzle|riddle|enigma|paradox|dilemma|problem|issue|matter|concern|worry|anxiety|stress|pressure|tension|strain|burden|load|weight|mass|volume|density|thickness|depth|height|width|length|size|dimension|shape|form|structure|pattern|design|style|fashion|trend|fad|craze|mania|obsession|addiction|dependency|habit|routine|ritual|tradition|custom|culture|society|community|group|team|crew|gang|club|organization|institution|company|corporation|business|enterprise|venture|startup|project|program|initiative|campaign|movement|revolution|evolution|development|growth|progress|advancement|improvement|enhancement|upgrade|update|revision|modification|alteration|change|transformation|conversion|transition|shift|switch|swap|exchange|trade|transaction|deal|agreement|contract|partnership|collaboration|cooperation|alliance|union|merger|acquisition|takeover|buyout|investment|funding|financing|loan|credit|debt|mortgage|insurance|tax|fee|charge|cost|price|value|worth|benefit|advantage|gain|profit|revenue|income|salary|wage|pay|compensation|bonus|reward|prize|award|trophy|medal|certificate|diploma|degree|qualification|credential|license|permit|authorization|approval|consent|permission|clearance|access|entry|admission|acceptance|inclusion|participation|involvement|engagement|commitment|dedication|devotion|loyalty|allegiance|support|backing|endorsement|recommendation|referral|introduction|connection|contact|network|relationship|bond|tie|link|association|affiliation|membership|belonging|identity|self|ego|personality|character|nature|essence|soul|spirit|mind|heart|body|health|wellness|fitness|strength|power|energy|force|drive|motivation|ambition|goal|aim|objective|target|purpose|intention|plan|strategy|approach|method|way|manner|style|technique|skill|ability|capability|capacity|potential|talent|gift|aptitude|competence|expertise|proficiency|mastery|excellence|quality|standard|level|grade|rank|position|status|standing|reputation|image|brand|identity|recognition|fame|celebrity|popularity|influence|impact|effect|result|outcome|consequence|implication|significance|importance|relevance|value|worth|merit|virtue|strength|advantage|benefit|gain|profit|return|yield|output|product|result|achievement|accomplishment|success|victory|triumph|win|conquest|domination|supremacy|leadership|authority|power|control|command|rule|governance|management|administration|supervision|oversight|regulation|policy|law|legislation|statute|code|rule|guideline|standard|norm|convention|protocol|procedure|process|system|method|approach|strategy|plan|program|project|initiative|campaign|effort|attempt|try|endeavor|undertaking|venture|enterprise|business|operation|activity|action|step|move|measure|decision|choice|option|alternative|possibility|opportunity|chance|prospect|potential|promise|hope|expectation|anticipation|prediction|forecast|projection|estimate|calculation|assessment|evaluation|analysis|study|research|investigation|inquiry|examination|inspection|review|audit|check|test|trial|experiment|demonstration|presentation|exhibition|display|show|performance|act|scene|episode|chapter|section|part|piece|segment|portion|fraction|percentage|ratio|proportion|share|stake|interest|investment|contribution|donation|gift|present|offering|sacrifice|concession|compromise|trade|exchange|swap|deal|transaction|agreement|contract|pact|treaty|alliance|partnership|collaboration|cooperation|coordination|integration|unification|consolidation|merger|acquisition|takeover|buyout|investment|funding|financing|sponsorship|support|backing|endorsement|approval|authorization|permission|consent|agreement|acceptance|acknowledgment|recognition|appreciation|gratitude|thanks|praise|compliment|flattery|admiration|respect|esteem|regard|honor|tribute|homage|salute|greeting|welcome|farewell|goodbye|bye|later|soon|now|today|tomorrow|yesterday|week|month|year|decade|century|millennium|era|age|period|time|moment|instant|second|minute|hour|day|night|morning|afternoon|evening|dawn|dusk|sunrise|sunset|noon|midnight|spring|summer|autumn|fall|winter|season|weather|climate|temperature|heat|cold|warm|cool|hot|freezing|boiling|mild|moderate|extreme|severe|intense|strong|weak|powerful|mighty|feeble|frail|fragile|delicate|tender|soft|hard|tough|rough|smooth|sharp|dull|blunt|pointed|flat|round|square|circular|oval|rectangular|triangular|spherical|cylindrical|conical|pyramidal|cubic|linear|curved|straight|bent|twisted|spiral|zigzag|wavy|bumpy|lumpy|uneven|irregular|asymmetric|symmetric|balanced|proportional|harmonious|beautiful|pretty|handsome|attractive|gorgeous|stunning|magnificent|splendid|wonderful|marvelous|fantastic|fabulous|incredible|amazing|astonishing|surprising|shocking|startling|alarming|frightening|terrifying|horrifying|disgusting|revolting|repulsive|offensive|unpleasant|disagreeable|uncomfortable|awkward|embarrassing|shameful|disgraceful|scandalous|outrageous|ridiculous|absurd|silly|foolish|stupid|idiotic|moronic|crazy|insane|mad|lunatic|psycho|weirdo|freak|nerd|geek|dork|loser|jerk|idiot|moron|fool|dummy|dumbass|asshole|bastard|bitch|slut|whore|damn|dammit|shit|crap|fuck|fucking|hell|bloody|goddamn|jesus|christ|god|lord|holy|sacred|divine|blessed|cursed|damned|doomed|screwed|fucked|busted|caught|trapped|stuck|stranded|lost|confused|puzzled|baffled|bewildered|perplexed|mystified|stumped|clueless|ignorant|unaware|oblivious|naive|innocent|gullible|trusting|suspicious|skeptical|doubtful|uncertain|unsure|hesitant|reluctant|unwilling|resistant|defiant|rebellious|disobedient|naughty|mischievous|playful|cheerful|joyful|happy|glad|pleased|satisfied|content|comfortable|relaxed|calm|peaceful|serene|tranquil|quiet|silent|still|motionless|stationary|fixed|stable|steady|firm|solid|strong|powerful|mighty|dominant|superior|excellent|outstanding|exceptional|extraordinary|remarkable|notable|significant|important|major|main|primary|principal|chief|leading|top|best|finest|greatest|highest|supreme|ultimate|absolute|total|complete|full|whole|entire|overall|general|common|usual|normal|regular|standard|typical|average|ordinary|plain|simple|basic|fundamental|essential|necessary|required|mandatory|compulsory|obligatory|optional|voluntary|free|liberal|generous|kind|nice|friendly|pleasant|agreeable|likable|lovable|adorable|cute|sweet|charming|delightful|enjoyable|entertaining|amusing|funny|hilarious|witty|clever|smart|intelligent|brilliant|genius|talented|gifted|skilled|expert|professional|experienced|qualified|capable|competent|efficient|effective|productive|successful|prosperous|wealthy|rich|affluent|luxurious|extravagant|lavish|opulent|magnificent|grand|majestic|royal|noble|dignified|respectable|honorable|ethical|moral|virtuous|righteous|just|fair|equal|balanced|neutral|objective|impartial|unbiased|honest|truthful|sincere|genuine|authentic|real|actual|true|correct|accurate|precise|exact|perfect|flawless|impeccable|immaculate|spotless|clean|pure|fresh|new|modern|contemporary|current|present|existing|actual|real|genuine|authentic|original|unique|special|particular|specific|individual|personal|private|confidential|secret|hidden|concealed|disguised|camouflaged|invisible|transparent|clear|obvious|evident|apparent|visible|noticeable|prominent|conspicuous|striking|remarkable|extraordinary|unusual|uncommon|rare|scarce|limited|restricted|exclusive|selective|elite|premium|luxury|deluxe|superior|excellent|outstanding|exceptional|phenomenal|sensational|spectacular|breathtaking|stunning|gorgeous|beautiful|pretty|lovely|attractive|appealing|inviting|welcoming|warm|friendly|hospitable|generous|kind|caring|loving|affectionate|tender|gentle|soft|mild|moderate|reasonable|sensible|practical|realistic|pragmatic|logical|rational|reasonable|fair|just|right|correct|proper|appropriate|suitable|fitting|matching|compatible|consistent|coherent|logical|sensible|reasonable|understandable|comprehensible|clear|plain|simple|easy|straightforward|uncomplicated|effortless|smooth|seamless|flawless|perfect|ideal|optimal|best|finest|greatest|highest|top|leading|dominant|superior|excellent|outstanding|exceptional|extraordinary|remarkable|notable|significant|important|major|critical|crucial|vital|essential|necessary|required|needed|wanted|desired|preferred|favored|popular|common|widespread|prevalent|dominant|mainstream|conventional|traditional|classic|timeless|eternal|permanent|lasting|enduring|persistent|continuous|constant|steady|stable|reliable|dependable|trustworthy|faithful|loyal|devoted|dedicated|committed|determined|resolute|firm|strong|powerful|mighty|forceful|vigorous|energetic|dynamic|active|lively|vibrant|vivid|bright|brilliant|radiant|glowing|shining|sparkling|glittering|dazzling|blinding|overwhelming|overpowering|dominating|controlling|commanding|authoritative|influential|powerful|mighty|strong|robust|sturdy|solid|firm|stable|secure|safe|protected|guarded|defended|shielded|covered|wrapped|enclosed|contained|confined|restricted|limited|bounded|bordered|framed|outlined|defined|specified|detailed|elaborate|complex|complicated|intricate|sophisticated|advanced|developed|evolved|mature|grown|expanded|extended|enlarged|increased|multiplied|doubled|tripled|quadrupled|maximized|optimized|improved|enhanced|upgraded|updated|modernized|renovated|restored|repaired|fixed|corrected|adjusted|modified|altered|changed|transformed|converted|translated|interpreted|explained|clarified|simplified|summarized|condensed|compressed|reduced|minimized|decreased|diminished|lowered|dropped|fallen|declined|deteriorated|worsened|degraded|damaged|harmed|hurt|injured|wounded|broken|shattered|destroyed|ruined|devastated|demolished|annihilated|eliminated|eradicated|exterminated|wiped|cleared|cleaned|purified|filtered|refined|processed|treated|handled|managed|controlled|regulated|governed|ruled|led|guided|directed|conducted|supervised|monitored|observed|watched|seen|viewed|noticed|detected|discovered|found|located|identified|recognized|acknowledged|admitted|confessed|revealed|disclosed|exposed|uncovered|unveiled|displayed|shown|demonstrated|illustrated|exemplified|represented|symbolized|signified|meant|implied|suggested|indicated|pointed|referred|mentioned|cited|quoted|stated|declared|announced|proclaimed|published|released|issued|distributed|circulated|spread|propagated|transmitted|broadcasted|communicated|conveyed|expressed|articulated|verbalized|vocalized|spoken|said|told|talked|discussed|debated|argued|disputed|contested|challenged|questioned|doubted|suspected|wondered|pondered|contemplated|considered|thought|believed|assumed|supposed|imagined|dreamed|fantasized|wished|hoped|expected|anticipated|predicted|forecasted|projected|estimated|calculated|computed|measured|weighed|assessed|evaluated|analyzed|examined|inspected|reviewed|audited|checked|tested|tried|attempted|endeavored|strived|struggled|fought|battled|competed|rivaled|opposed|resisted|defied|rebelled|revolted|protested|objected|complained|criticized|blamed|accused|charged|convicted|sentenced|punished|penalized|fined|imprisoned|jailed|detained|arrested|captured|caught|seized|grabbed|snatched|stolen|robbed|burgled|looted|plundered|pillaged|ravaged|devastated|destroyed|ruined|wrecked|crashed|smashed|shattered|broken|damaged|harmed|hurt|injured|wounded|killed|murdered|assassinated|executed|slaughtered|massacred|genocide|holocaust|atrocity|crime|offense|violation|infringement|breach|transgression|sin|wrongdoing|misconduct|misbehavior|malpractice|negligence|carelessness|recklessness|irresponsibility|incompetence|inefficiency|failure|defeat|loss|setback|disappointment|frustration|anger|rage|fury|wrath|hatred|hostility|animosity|enmity|antagonism|opposition|resistance|defiance|rebellion|revolt|revolution|uprising|insurrection|mutiny|coup|overthrow|takeover|conquest|invasion|occupation|colonization|imperialism|exploitation|oppression|persecution|discrimination|prejudice|bias|racism|sexism|homophobia|xenophobia|intolerance|bigotry|fanaticism|extremism|radicalism|terrorism|violence|aggression|brutality|cruelty|savagery|barbarism|inhumanity|atrocity|horror|terror|fear|dread|panic|anxiety|worry|concern|apprehension|unease|discomfort|distress|anguish|agony|pain|suffering|misery|sorrow|grief|sadness|depression|despair|hopelessness|helplessness|powerlessness|weakness|vulnerability|fragility|sensitivity|tenderness|compassion|empathy|sympathy|pity|mercy|forgiveness|pardon|amnesty|clemency|leniency|tolerance|acceptance|understanding|patience|kindness|generosity|charity|philanthropy|altruism|selflessness|sacrifice|devotion|dedication|commitment|loyalty|faithfulness|fidelity|constancy|steadfastness|perseverance|persistence|determination|resolution|resolve|willpower|courage|bravery|valor|heroism|gallantry|chivalry|honor|dignity|pride|self|respect|esteem|confidence|assurance|certainty|conviction|belief|faith|trust|reliance|dependence|support|assistance|help|aid|relief|rescue|salvation|redemption|liberation|freedom|independence|autonomy|sovereignty|self|determination|choice|option|alternative|possibility|opportunity|chance|luck|fortune|fate|destiny|providence|karma|justice|fairness|equality|equity|balance|harmony|peace|tranquility|serenity|calm|quiet|silence|stillness|rest|relaxation|leisure|recreation|entertainment|amusement|fun|joy|happiness|pleasure|delight|satisfaction|contentment|fulfillment|achievement|accomplishment|success|victory|triumph|glory|fame|celebrity|renown|reputation|prestige|status|standing|position|rank|level|grade|class|category|type|kind|sort|variety|diversity|plurality|multiplicity|abundance|plenty|wealth|prosperity|affluence|luxury|comfort|convenience|ease|simplicity|clarity|transparency|openness|honesty|integrity|authenticity|genuineness|sincerity|truthfulness|accuracy|precision|exactness|correctness|validity|reliability|consistency|coherence|logic|reason|rationality|sanity|wisdom|knowledge|understanding|comprehension|insight|perception|awareness|consciousness|mindfulness|attention|focus|concentration|dedication|commitment|engagement|involvement|participation|contribution|cooperation|collaboration|teamwork|partnership|alliance|union|unity|solidarity|cohesion|integration|coordination|organization|structure|system|framework|foundation|basis|ground|root|origin|source|cause|reason|purpose|goal|aim|objective|target|destination|end|conclusion|result|outcome|consequence|effect|impact|influence|significance|importance|value|worth|merit|quality|standard|excellence|perfection|ideal|model|example|sample|specimen|instance|case|situation|circumstance|condition|state|status|position|location|place|site|spot|point|area|region|zone|territory|domain|realm|sphere|field|sector|industry|market|economy|business|commerce|trade|exchange|transaction|deal|agreement|contract|arrangement|settlement|resolution|solution|answer|response|reaction|feedback|comment|remark|observation|note|annotation|explanation|interpretation|analysis|evaluation|assessment|judgment|opinion|view|perspective|standpoint|position|stance|attitude|approach|method|technique|strategy|tactic|plan|scheme|design|pattern|model|template|format|structure|framework|system|process|procedure|protocol|rule|regulation|policy|law|principle|theory|concept|idea|notion|thought|belief|conviction|faith|trust|confidence|assurance|certainty|security|safety|protection|defense|guard|shield|barrier|obstacle|challenge|difficulty|problem|issue|matter|concern|worry|trouble|crisis|emergency|disaster|catastrophe|calamity|tragedy|misfortune|adversity|hardship|struggle|conflict|dispute|argument|debate|discussion|conversation|dialogue|communication|interaction|relationship|connection|link|bond|tie|association|affiliation|membership|belonging|identity|character|personality|nature|essence|quality|attribute|feature|characteristic|property|trait|aspect|element|component|part|piece|segment|section|division|department|branch|unit|group|team|crew|staff|personnel|workforce|labor|work|job|task|duty|responsibility|role|function|purpose|use|application|utilization|employment|operation|activity|action|behavior|conduct|performance|execution|implementation|realization|achievement|accomplishment|success|progress|advancement|development|growth|expansion|extension|increase|rise|climb|ascent|elevation|promotion|upgrade|improvement|enhancement|refinement|optimization|maximization|perfection|completion|finalization|conclusion|termination|end|finish|stop|halt|pause|break|rest|intermission|interval|gap|space|distance|length|width|height|depth|size|dimension|magnitude|extent|scope|range|span|reach|coverage|area|surface|volume|capacity|quantity|amount|number|figure|digit|numeral|count|total|sum|aggregate|whole|entirety|completeness|fullness|wholeness|integrity|unity|oneness|singularity|uniqueness|individuality|identity|self|ego|persona|character|personality|temperament|disposition|attitude|mentality|mindset|outlook|perspective|viewpoint|standpoint|position|stance|posture|pose|gesture|expression|look|appearance|image|impression|perception|conception|notion|idea|thought|concept|theory|hypothesis|assumption|premise|proposition|statement|claim|assertion|declaration|announcement|proclamation|decree|order|command|instruction|direction|guidance|advice|recommendation|suggestion|proposal|offer|bid|tender|application|request|demand|requirement|need|necessity|essential|must|obligation|duty|responsibility|commitment|promise|pledge|vow|oath|guarantee|assurance|warranty|insurance|protection|coverage|security|safety|defense|guard|shield|shelter|refuge|sanctuary|haven|retreat|escape|exit|way|path|route|road|street|avenue|boulevard|highway|freeway|motorway|expressway|lane|alley|passage|corridor|hall|lobby|foyer|entrance|entry|doorway|gateway|portal|threshold|boundary|border|edge|margin|rim|brim|lip|brink|verge|cusp|point|tip|peak|summit|top|apex|pinnacle|zenith|climax|culmination|height|maximum|ceiling|limit|cap|restriction|constraint|limitation|boundary|border|frontier|edge|end|extreme|utmost|ultimate|final|last|concluding|closing|ending|finishing|completing|terminating|stopping|halting|ceasing|quitting|leaving|departing|exiting|going|moving|traveling|journeying|voyaging|sailing|flying|driving|riding|walking|running|racing|rushing|hurrying|speeding|accelerating|advancing|progressing|proceeding|continuing|persisting|persevering|enduring|lasting|remaining|staying|waiting|expecting|anticipating|hoping|wishing|wanting|desiring|craving|longing|yearning|pining|missing|lacking|needing|requiring|demanding|requesting|asking|questioning|inquiring|investigating|researching|studying|examining|analyzing|evaluating|assessing|judging|deciding|determining|concluding|resolving|solving|fixing|repairing|mending|healing|curing|treating|caring|nurturing|nourishing|feeding|sustaining|supporting|maintaining|preserving|conserving|protecting|defending|guarding|shielding|sheltering|housing|accommodating|hosting|welcoming|receiving|accepting|embracing|adopting|adapting|adjusting|modifying|changing|altering|transforming|converting|translating|interpreting|explaining|clarifying|simplifying|summarizing|condensing|compressing|reducing|minimizing|decreasing|lowering|dropping|falling|declining|deteriorating|worsening|degrading|decaying|rotting|decomposing|disintegrating|crumbling|collapsing|falling|tumbling|toppling|overturning|capsizing|sinking|drowning|submerging|immersing|plunging|diving|descending|dropping|lowering|reducing|decreasing|diminishing|shrinking|contracting|compressing|squeezing|pressing|pushing|shoving|thrusting|forcing|driving|propelling|launching|projecting|throwing|hurling|flinging|tossing|pitching|casting|shooting|firing|blasting|exploding|bursting|erupting|spewing|gushing|flowing|streaming|pouring|flooding|overflowing|spilling|leaking|dripping|seeping|oozing|trickling|dribbling|drizzling|sprinkling|showering|raining|snowing|hailing|sleeting|freezing|icing|frosting|chilling|cooling|refreshing|reviving|rejuvenating|restoring|renewing|regenerating|recreating|rebuilding|reconstructing|remaking|redoing|repeating|reiterating|restating|rephrasing|rewording|rewriting|revising|editing|correcting|amending|modifying|adjusting|adapting|tailoring|customizing|personalizing|individualizing|specializing|focusing|concentrating|centering|targeting|aiming|directing|pointing|steering|guiding|leading|conducting|managing|controlling|regulating|governing|ruling|commanding|ordering|instructing|teaching|training|coaching|mentoring|tutoring|educating|informing|enlightening|illuminating|clarifying|explaining|demonstrating|showing|displaying|exhibiting|presenting|introducing|launching|releasing|publishing|broadcasting|transmitting|sending|delivering|distributing|dispensing|allocating|assigning|delegating|entrusting|committing|dedicating|devoting|sacrificing|offering|giving|donating|contributing|providing|supplying|furnishing|equipping|arming|preparing|readying|setting|arranging|organizing|structuring|systematizing|categorizing|classifying|sorting|grouping|clustering|bundling|packaging|wrapping|covering|coating|layering|stacking|piling|heaping|accumulating|collecting|gathering|assembling|compiling|combining|merging|integrating|incorporating|including|adding|attaching|connecting|linking|joining|uniting|bonding|binding|tying|fastening|securing|fixing|stabilizing|steadying|balancing|equalizing|leveling|smoothing|flattening|straightening|aligning|adjusting|calibrating|tuning|optimizing|maximizing|enhancing|improving|upgrading|updating|modernizing|renovating|refurbishing|restoring|repairing|fixing|mending|patching|sealing|closing|shutting|locking|securing|protecting|safeguarding|defending|guarding|watching|monitoring|observing|surveying|scanning|searching|seeking|looking|hunting|chasing|pursuing|following|tracking|tracing|trailing|shadowing|stalking|spying|snooping|prying|probing|investigating|researching|studying|examining|inspecting|checking|testing|trying|experimenting|exploring|discovering|finding|locating|identifying|recognizing|distinguishing|differentiating|discriminating|separating|dividing|splitting|breaking|cutting|slicing|chopping|dicing|mincing|grinding|crushing|mashing|pulverizing|powdering|dusting|sprinkling|scattering|spreading|distributing|dispersing|diffusing|disseminating|propagating|transmitting|broadcasting|publishing|releasing|issuing|announcing|declaring|proclaiming|stating|expressing|articulating|verbalizing|vocalizing|speaking|talking|saying|telling|narrating|recounting|relating|describing|depicting|portraying|representing|symbolizing|signifying|meaning|implying|suggesting|indicating|pointing|showing|demonstrating|proving|confirming|verifying|validating|authenticating|certifying|guaranteeing|assuring|ensuring|securing|protecting|preserving|maintaining|sustaining|supporting|upholding|defending|advocating|promoting|advancing|furthering|fostering|encouraging|stimulating|motivating|inspiring|energizing|invigorating|revitalizing|rejuvenating|refreshing|renewing|restoring|recovering|healing|curing|remedying|fixing|solving|resolving|settling|concluding|finalizing|completing|finishing|ending|terminating|stopping|halting|ceasing|discontinuing|abandoning|quitting|leaving|departing|exiting|withdrawing|retreating|receding|declining|refusing|rejecting|denying|negating|contradicting|opposing|resisting|fighting|battling|struggling|striving|endeavoring|attempting|trying|testing|experimenting|exploring|venturing|risking|gambling|betting|wagering|speculating|investing|spending|paying|buying|purchasing|acquiring|obtaining|getting|receiving|accepting|taking|grabbing|seizing|capturing|catching|trapping|snaring|netting|hooking|luring|attracting|drawing|pulling|dragging|hauling|towing|carrying|bearing|holding|gripping|clutching|grasping|squeezing|pressing|pushing|shoving|thrusting|driving|propelling|launching|projecting|throwing|hurling|flinging|tossing|lobbing|pitching|bowling|rolling|spinning|rotating|turning|twisting|winding|coiling|curling|bending|flexing|stretching|extending|reaching|spreading|expanding|growing|developing|evolving|maturing|aging|weathering|wearing|eroding|corroding|rusting|decaying|rotting|decomposing|disintegrating|crumbling|breaking|shattering|smashing|crushing|destroying|demolishing|wrecking|ruining|devastating|ravaging|pillaging|plundering|looting|robbing|stealing|thieving|pilfering|swiping|snatching|grabbing|seizing|taking|removing|extracting|withdrawing|pulling|drawing|draining|emptying|evacuating|clearing|cleaning|purging|purifying|filtering|refining|processing|treating|handling|managing|controlling|regulating|adjusting|modifying|altering|changing|varying|fluctuating|oscillating|vibrating|shaking|trembling|quivering|shivering|quaking|rattling|clattering|banging|crashing|booming|thundering|rumbling|roaring|howling|screaming|shrieking|screeching|squealing|squeaking|creaking|groaning|moaning|sighing|breathing|panting|gasping|choking|coughing|sneezing|sniffling|snoring|yawning|stretching|relaxing|resting|sleeping|dreaming|waking|rising|getting|standing|sitting|lying|reclining|leaning|tilting|tipping|toppling|falling|dropping|sinking|descending|lowering|dipping|plunging|diving|submerging|immersing|soaking|drenching|saturating|flooding|overflowing|spilling|pouring|streaming|flowing|running|rushing|gushing|surging|swelling|rising|climbing|ascending|mounting|scaling|hiking|trekking|walking|strolling|wandering|roaming|rambling|meandering|drifting|floating|gliding|sliding|slipping|skating|skiing|surfing|sailing|cruising|voyaging|traveling|journeying|commuting|migrating|relocating|moving|shifting|transferring|transporting|conveying|carrying|bearing|holding|supporting|sustaining|maintaining|preserving|conserving|saving|storing|keeping|retaining|holding|possessing|owning|having|containing|including|comprising|consisting|constituting|forming|making|creating|producing|generating|manufacturing|fabricating|constructing|building|erecting|raising|establishing|founding|instituting|initiating|starting|beginning|commencing|launching|opening|introducing|presenting|offering|providing|supplying|delivering|distributing|dispensing|administering|managing|conducting|directing|leading|guiding|steering|navigating|piloting|driving|operating|running|working|functioning|performing|executing|implementing|applying|using|utilizing|employing|exploiting|leveraging|maximizing|optimizing|improving|enhancing|upgrading|advancing|developing|progressing|evolving|growing|expanding|extending|spreading|proliferating|multiplying|increasing|rising|climbing|soaring|skyrocketing|booming|thriving|flourishing|prospering|succeeding|winning|triumphing|conquering|overcoming|defeating|beating|surpassing|exceeding|excelling|outperforming|outdoing|outshining|overshadowing|dominating|controlling|commanding|ruling|governing|leading|heading|topping|ranking|rating|scoring|grading|evaluating|assessing|judging|measuring|weighing|calculating|computing|counting|numbering|quantifying|estimating|approximating|guessing|assuming|supposing|presuming|believing|thinking|considering|regarding|viewing|seeing|perceiving|noticing|observing|watching|monitoring|tracking|following|pursuing|chasing|hunting|seeking|searching|looking|scanning|examining|inspecting|checking|testing|trying|sampling|tasting|smelling|touching|feeling|sensing|experiencing|undergoing|suffering|enduring|tolerating|bearing|withstanding|resisting|opposing|fighting|battling|combating|struggling|striving|endeavoring|attempting|trying|working|laboring|toiling|sweating|exerting|straining|stressing|pressuring|pushing|driving|forcing|compelling|obligating|requiring|demanding|needing|wanting|desiring|wishing|hoping|expecting|anticipating|awaiting|waiting|pausing|hesitating|delaying|postponing|deferring|procrastinating|stalling|lingering|loitering|dawdling|lagging|trailing|following|pursuing|chasing|racing|rushing|hurrying|hastening|speeding|accelerating|quickening|expediting|facilitating|enabling|allowing|permitting|authorizing|approving|sanctioning|endorsing|supporting|backing|sponsoring|funding|financing|investing|contributing|donating|giving|offering|presenting|awarding|granting|bestowing|conferring|providing|supplying|furnishing|equipping|arming|preparing|readying|training|educating|teaching|instructing|coaching|mentoring|guiding|advising|counseling|consulting|recommending|suggesting|proposing|offering|presenting|submitting|tendering|bidding|applying|requesting|asking|questioning|inquiring|querying|probing|investigating|researching|studying|analyzing|examining|reviewing|evaluating|assessing|appraising|judging|rating|ranking|grading|scoring|measuring|quantifying|calculating|computing|determining|deciding|concluding|resolving|settling|agreeing|accepting|approving|confirming|ratifying|validating|certifying|authenticating|verifying|checking|testing|proving|demonstrating|showing|illustrating|exemplifying|representing|symbolizing|embodying|personifying|characterizing|defining|describing|explaining|clarifying|elaborating|detailing|specifying|particularizing|individualizing|customizing|tailoring|adapting|adjusting|modifying|altering|changing|transforming|converting|translating|interpreting|decoding|deciphering|understanding|comprehending|grasping|getting|catching|following|tracking|monitoring|observing|watching|seeing|viewing|witnessing|experiencing|feeling|sensing|perceiving|realizing|recognizing|identifying|distinguishing|differentiating|comparing|contrasting|matching|pairing|coupling|combining|merging|blending|mixing|integrating|incorporating|including|adding|supplementing|complementing|enhancing|enriching|improving|upgrading|advancing|developing|progressing|growing|expanding|extending|broadening|widening|deepening|strengthening|intensifying|amplifying|magnifying|enlarging|increasing|multiplying|doubling|tripling|maximizing|optimizing|perfecting|completing|finishing|concluding|ending|terminating|closing|shutting|sealing|locking|securing|fastening|tightening|strengthening|reinforcing|supporting|bracing|propping|holding|maintaining|sustaining|preserving|protecting|defending|guarding|shielding|sheltering|covering|wrapping|enclosing|surrounding|encircling|encompassing|embracing|including|containing|holding|comprising|consisting|constituting|forming|shaping|molding|sculpting|carving|crafting|creating|making|producing|manufacturing|fabricating|assembling|constructing|building|erecting|raising|establishing|founding|instituting|organizing|arranging|setting|placing|positioning|locating|situating|installing|mounting|fixing|attaching|connecting|linking|joining|uniting|combining|merging|fusing|welding|bonding|gluing|sticking|adhering|clinging|holding|gripping|clutching|grasping|seizing|grabbing|snatching|catching|trapping|capturing|arresting|detaining|confining|imprisoning|jailing|incarcerating|locking|restraining|restricting|limiting|constraining|controlling|regulating|governing|managing|administering|directing|conducting|leading|guiding|steering|navigating|piloting|driving|operating|running|working|functioning|performing|executing|accomplishing|achieving|attaining|reaching|obtaining|acquiring|gaining|earning|winning|securing|getting|receiving|accepting|taking|collecting|gathering|assembling|accumulating|amassing|stockpiling|hoarding|storing|saving|preserving|conserving|protecting|maintaining|keeping|retaining|holding|possessing|owning|having|enjoying|appreciating|valuing|treasuring|cherishing|loving|adoring|worshiping|revering|respecting|honoring|admiring|praising|complimenting|flattering|commending|congratulating|applauding|cheering|celebrating|commemorating|observing|marking|noting|recording|documenting|logging|registering|filing|archiving|storing|saving|backing|copying|duplicating|replicating|reproducing|cloning|imitating|mimicking|copying|emulating|following|adopting|embracing|accepting|receiving|welcoming|greeting|meeting|encountering|facing|confronting|challenging|opposing|resisting|fighting|battling|combating|struggling|contending|competing|rivaling|vying|racing|running|sprinting|dashing|rushing|hurrying|hastening|speeding|accelerating|quickening|moving|going|traveling|journeying|commuting|driving|riding|flying|sailing|cruising|touring|visiting|exploring|discovering|finding|locating|identifying|recognizing|knowing|understanding|comprehending|grasping|learning|studying|researching|investigating|examining|analyzing|evaluating|assessing|reviewing|critiquing|judging|rating|ranking|scoring|grading|measuring|testing|checking|verifying|confirming|validating|proving|demonstrating|showing|displaying|exhibiting|presenting|performing|acting|playing|entertaining|amusing|delighting|pleasing|satisfying|gratifying|fulfilling|completing|finishing|accomplishing|achieving|succeeding|winning|triumphing|prevailing|overcoming|conquering|defeating|beating|besting|surpassing|exceeding|excelling|outperforming|dominating|leading|heading|topping|ruling|governing|controlling|managing|directing|conducting|supervising|overseeing|monitoring|watching|observing|noticing|seeing|viewing|looking|glancing|peeking|peering|staring|gazing|examining|inspecting|scrutinizing|studying|analyzing|evaluating|assessing|judging|determining|deciding|choosing|selecting|picking|opting|preferring|favoring|liking|loving|enjoying|appreciating|valuing|respecting|admiring|praising|honoring|celebrating|commemorating|remembering|recalling|recollecting|reminiscing|reflecting|contemplating|meditating|thinking|pondering|considering|deliberating|weighing|evaluating|assessing|judging|deciding|determining|concluding|resolving|settling|agreeing|consenting|accepting|approving|endorsing|supporting|backing|advocating|promoting|championing|defending|protecting|guarding|shielding|sheltering|harboring|housing|accommodating|hosting|entertaining|serving|helping|assisting|aiding|supporting|sustaining|maintaining|preserving|conserving|saving|rescuing|liberating|freeing|releasing|letting|allowing|permitting|enabling|empowering|authorizing|approving|sanctioning|licensing|certifying|qualifying|validating|confirming|verifying|authenticating|proving|demonstrating|showing|revealing|disclosing|exposing|uncovering|discovering|finding|detecting|sensing|feeling|perceiving|noticing|observing|seeing|watching|witnessing|experiencing|undergoing|suffering|enduring|bearing|tolerating|accepting|embracing|welcoming|receiving|getting|obtaining|acquiring|gaining|earning|deserving|meriting|warranting|justifying|explaining|clarifying|illuminating|enlightening|educating|informing|telling|saying|speaking|talking|communicating|conveying|expressing|articulating|voicing|uttering|pronouncing|enunciating|declaring|announcing|proclaiming|stating|asserting|claiming|maintaining|insisting|arguing|contending|debating|discussing|conversing|chatting|gossiping|rumoring|spreading|circulating|distributing|disseminating|propagating|promoting|advertising|marketing|selling|trading|exchanging|bartering|negotiating|bargaining|dealing|transacting|conducting|performing|executing|implementing|applying|using|utilizing|employing|operating|running|working|functioning|serving|helping|assisting|supporting|aiding|facilitating|enabling|allowing|permitting|letting|granting|giving|providing|supplying|furnishing|equipping|preparing|readying|setting|arranging|organizing|planning|scheduling|programming|coordinating|managing|directing|leading|guiding|steering|controlling|regulating|adjusting|modifying|changing|altering|varying|adapting|customizing|tailoring|fitting|suiting|matching|coordinating|harmonizing|balancing|equalizing|stabilizing|steadying|securing|fixing|repairing|mending|restoring|renovating|refurbishing|upgrading|improving|enhancing|developing|advancing|progressing|growing|expanding|extending|spreading|proliferating|multiplying|increasing|rising|climbing|ascending|mounting|elevating|raising|lifting|hoisting|boosting|promoting|advancing|upgrading|improving|enhancing|strengthening|reinforcing|supporting|backing|endorsing|approving|favoring|preferring|choosing|selecting|picking|taking|getting|obtaining|acquiring|securing|winning|earning|gaining|achieving|accomplishing|succeeding|thriving|flourishing|prospering|booming|growing|developing|evolving|maturing|aging|declining|deteriorating|worsening|failing|losing|falling|dropping|sinking|descending|lowering|decreasing|diminishing|reducing|shrinking|contracting|withdrawing|retreating|receding|backing|reversing|returning|coming|going|moving|traveling|journeying|voyaging|sailing|flying|soaring|gliding|floating|drifting|wandering|roaming|exploring|discovering|finding|seeking|searching|hunting|chasing|pursuing|following|tracking|tracing|monitoring|watching|observing|seeing|viewing|looking|scanning|examining|inspecting|checking|testing|trying|attempting|endeavoring|striving|struggling|fighting|battling|competing|contending|vying|racing|running|moving|acting|performing|functioning|working|operating|serving|helping|contributing|participating|engaging|involving|including|adding|joining|connecting|linking|associating|relating|corresponding|matching|fitting|suiting|agreeing|conforming|complying|obeying|following|respecting|honoring|observing|keeping|maintaining|sustaining|supporting|upholding|defending|protecting|preserving|conserving|saving|storing|keeping|holding|retaining|possessing|owning|having|containing|including|comprising|consisting|constituting|forming|making|creating|producing|generating|causing|effecting|resulting|leading|bringing|carrying|bearing|holding|supporting|sustaining|maintaining|continuing|lasting|enduring|persisting|remaining|staying|living|existing|being|becoming|growing|developing|evolving|changing|transforming|converting|turning|shifting|moving|going|coming|arriving|reaching|attaining|achieving|accomplishing|succeeding|winning|gaining|obtaining|acquiring|getting|receiving|accepting|taking|having|holding|keeping|maintaining|sustaining|supporting|preserving|protecting|defending|guarding|securing|ensuring|guaranteeing|promising|pledging|committing|dedicating|devoting|sacrificing|offering|giving|providing|supplying|delivering|distributing|sharing|dividing|splitting|separating|distinguishing|differentiating|discriminating|selecting|choosing|picking|preferring|favoring|liking|loving|enjoying|appreciating|valuing|respecting|admiring|praising|honoring|celebrating|commemorating|remembering|recalling|reflecting|thinking|considering|contemplating|meditating|pondering|wondering|questioning|doubting|suspecting|fearing|worrying|concerning|caring|minding|noticing|observing|seeing|watching|looking|viewing|examining|inspecting|checking|testing|trying|attempting|endeavoring|striving|working|laboring|toiling|struggling|fighting|battling|competing|contending|opposing|resisting|defying|challenging|questioning|doubting|suspecting|distrusting|fearing|dreading|worrying|concerning|troubling|bothering|annoying|irritating|frustrating|disappointing|displeasing|dissatisfying|upsetting|disturbing|alarming|frightening|scaring|terrifying|horrifying|shocking|stunning|amazing|astonishing|surprising|impressing|affecting|touching|moving|stirring|exciting|thrilling|delighting|pleasing|satisfying|gratifying|fulfilling|completing|finishing|ending|concluding|terminating|stopping|halting|ceasing|quitting|leaving|departing|going|moving|traveling|journeying|commuting|driving|riding|walking|running|racing|rushing|hurrying|hastening|speeding|accelerating|advancing|progressing|proceeding|continuing|persisting|persevering|enduring|lasting|remaining|staying|living|existing|surviving|thriving|flourishing|prospering|succeeding|winning|triumphing|prevailing|overcoming|conquering|defeating|beating|surpassing|exceeding|excelling|outperforming|dominating|leading|heading|ruling|governing|controlling|managing|directing|conducting|supervising|overseeing|monitoring|watching|observing|noticing|seeing|perceiving|sensing|feeling|experiencing|undergoing|suffering|enduring|bearing|tolerating|accepting|receiving|welcoming|greeting|meeting|encountering|facing|confronting|addressing|handling|dealing|managing|coping|struggling|fighting|resisting|opposing|objecting|protesting|complaining|criticizing|blaming|accusing|charging|prosecuting|convicting|sentencing|punishing|penalizing|fining|imprisoning|jailing|confining|restricting|limiting|constraining|controlling|regulating|governing|ruling|leading|guiding|directing|steering|navigating|piloting|driving|operating|running|managing|administering|conducting|performing|executing|implementing|applying|using|utilizing|employing|exploiting|maximizing|optimizing|improving|enhancing|developing|advancing|progressing|growing|expanding|extending|spreading|increasing|multiplying|doubling|tripling|maximizing|peaking|climaxing|culminating|concluding|ending|finishing|completing|accomplishing|achieving|attaining|reaching|arriving|coming|getting|obtaining|acquiring|gaining|earning|winning|securing|ensuring|guaranteeing|promising|pledging|vowing|swearing|declaring|announcing|proclaiming|stating|saying|telling|speaking|talking|communicating|conveying|expressing|articulating|verbalizing|vocalizing|uttering|pronouncing|voicing|sounding|ringing|calling|naming|labeling|tagging|marking|branding|stamping|sealing|signing|endorsing|approving|authorizing|permitting|allowing|enabling|empowering|strengthening|reinforcing|supporting|backing|promoting|advancing|furthering|fostering|encouraging|motivating|inspiring|stimulating|exciting|thrilling|delighting|pleasing|satisfying|gratifying|fulfilling|rewarding|compensating|paying|remunerating|funding|financing|sponsoring|supporting|backing|investing|contributing|donating|giving|offering|presenting|awarding|granting|bestowing|conferring|providing|supplying|furnishing|equipping|arming|preparing|readying|training|educating|teaching|instructing|coaching|mentoring|guiding|advising|counseling|consulting|recommending|suggesting|proposing|offering|tendering|bidding|applying|requesting|asking|demanding|requiring|needing|wanting|desiring|wishing|hoping|expecting|anticipating|awaiting|waiting|pausing|stopping|halting|ceasing|ending|finishing|completing|concluding|terminating|closing|shutting|locking|sealing|securing|fastening|tightening|strengthening|reinforcing|supporting|bracing|holding|maintaining|sustaining|preserving|protecting|defending|guarding|shielding|sheltering|covering|hiding|concealing|masking|disguising|camouflaging|pretending|faking|simulating|imitating|copying|mimicking|emulating|following|pursuing|chasing|hunting|seeking|searching|looking|scanning|examining|inspecting|checking|testing|trying|sampling|tasting|experiencing|enjoying|appreciating|loving|liking|preferring|choosing|selecting|picking|taking|getting|obtaining|acquiring|gaining|earning|winning|achieving|accomplishing|succeeding|thriving|flourishing|prospering|growing|developing|evolving|advancing|progressing|improving|enhancing|upgrading|updating|modernizing|renovating|restoring|repairing|fixing|mending|healing|curing|treating|caring|nurturing|supporting|helping|assisting|aiding|serving|providing|supplying|delivering|distributing|sharing|giving|offering|presenting|showing|displaying|exhibiting|demonstrating|performing|acting|playing|entertaining|amusing|delighting|pleasing|satisfying|fulfilling|completing|finishing|ending|concluding|wrapping|stopping|halting|ceasing|terminating|closing|shutting|locking|sealing|securing|protecting|defending|guarding|watching|monitoring|observing|seeing|viewing|looking|examining|inspecting|checking|testing|verifying|confirming|validating|proving|demonstrating|showing|illustrating|explaining|clarifying|describing|depicting|portraying|representing|symbolizing|meaning|signifying|indicating|pointing|directing|guiding|leading|steering|navigating|piloting|driving|operating|running|managing|controlling|regulating|adjusting|modifying|changing|altering|transforming|converting|translating|interpreting|understanding|comprehending|grasping|learning|studying|researching|investigating|exploring|discovering|finding|locating|identifying|recognizing|knowing|remembering|recalling|reflecting|thinking|considering|pondering|contemplating|meditating|focusing|concentrating|attending|noticing|observing|watching|seeing|viewing|looking|glancing|staring|gazing|examining|inspecting|scrutinizing|analyzing|evaluating|assessing|judging|rating|ranking|grading|scoring|measuring|calculating|computing|counting|numbering|quantifying|estimating|approximating|guessing|assuming|supposing|believing|thinking|considering|regarding|viewing|seeing|perceiving|sensing|feeling|experiencing|living|existing|being|becoming|growing|developing|evolving|changing|transforming|adapting|adjusting|modifying|altering|varying|fluctuating|changing|shifting|moving|transitioning|progressing|advancing|developing|improving|enhancing|upgrading|updating|modernizing|revolutionizing|transforming|converting|changing|altering|modifying|adjusting|adapting|customizing|tailoring|personalizing|individualizing|specializing|focusing|concentrating|dedicating|committing|devoting|sacrificing|giving|offering|providing|supplying|delivering|bringing|carrying|transporting|conveying|transmitting|sending|dispatching|shipping|mailing|emailing|texting|messaging|communicating|contacting|reaching|connecting|linking|joining|uniting|combining|merging|integrating|incorporating|including|adding|supplementing|complementing|enhancing|improving|upgrading|advancing|developing|progressing|growing|expanding|extending|spreading|increasing|multiplying|maximizing|optimizing|perfecting|completing|finishing|accomplishing|achieving|succeeding|winning|triumphing|prevailing|dominating|leading|heading|topping|ranking|rating|scoring|grading|evaluating|assessing|judging|determining|deciding|concluding|resolving|settling|agreeing|accepting|approving|confirming|validating|certifying|guaranteeing|ensuring|securing|protecting|defending|preserving|maintaining|sustaining|supporting|upholding|advocating|promoting|championing|fighting|battling|struggling|striving|endeavoring|attempting|trying|testing|experimenting|exploring|discovering|finding|identifying|recognizing|acknowledging|admitting|confessing|revealing|disclosing|exposing|showing|demonstrating|proving|confirming|verifying|validating|authenticating|certifying|licensing|permitting|authorizing|approving|endorsing|supporting|backing|sponsoring|funding|financing|investing|contributing|donating|giving|sharing|distributing|allocating|assigning|delegating|entrusting|committing|dedicating|devoting|sacrificing|offering|presenting|awarding|granting|bestowing|conferring|providing|supplying|furnishing|equipping|preparing|readying|setting|arranging|organizing|structuring|planning|designing|creating|making|producing|manufacturing|fabricating|constructing|building|erecting|establishing|founding|instituting|initiating|starting|beginning|launching|opening|introducing|presenting|offering|providing|delivering|executing|implementing|performing|conducting|managing|directing|leading|guiding|steering|controlling|regulating|governing|ruling|commanding|ordering|instructing|teaching|training|coaching|mentoring|advising|counseling|consulting|helping|assisting|supporting|aiding|serving|working|functioning|operating|running|performing|executing|accomplishing|achieving|succeeding|completing|finishing|ending|concluding|terminating|stopping|halting|ceasing|pausing|waiting|resting|relaxing|recovering|healing|improving|progressing|advancing|developing|growing|expanding|flourishing|thriving|prospering|succeeding|winning|achieving|accomplishing|completing|finishing|ending)\b/i.test(textoLower)) return 'en'

  // Fallback: se tem mais de 3 palavras e nenhum acento, provavelmente inglês
  const palavras = texto.trim().split(/\s+/)
  if (palavras.length >= 3 && !/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(texto)) return 'en'

  // Fallback inteligente: usa idioma do perfil do remetente se disponível
  if (idiomaFallback) {
    console.log(`[Idioma] Usando fallback do perfil: '${idiomaFallback}' para "${texto.substring(0, 50)}"`)
    return idiomaFallback
  }

  // Fallback final: inglês (apenas se não tiver idioma do remetente)
  console.log(`[Idioma] Fallback para 'en': "${texto.substring(0, 50)}"`)
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

  // Pré-processar gírias PT-BR para melhor tradução
  let textoParaTraduzir = texto
  if (idiomaOrigem === 'pt') {
    const textoExpandido = expandirGirias(texto)
    if (textoExpandido !== texto.toLowerCase()) {
      console.log(`  [Gírias] "${texto}" → "${textoExpandido}"`)
      textoParaTraduzir = textoExpandido
    }
  }

  let azureOrigem = idiomaOrigem === 'zh' ? 'zh-Hans' : idiomaOrigem
  let azureDestino = idiomaDestino === 'zh' ? 'zh-Hans' : idiomaDestino

  if (AZURE_KEY) {
    try {
      return await traduzirComAzure(textoParaTraduzir, azureOrigem, azureDestino)
    } catch (error) {
      console.log('  [Azure] Erro:', error.message)
    }
  }

  try {
    return await traduzirComMyMemory(textoParaTraduzir, idiomaOrigem, idiomaDestino)
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

    // Gerar código de amigo único
    let codigoAmigo = generateFriendCode()
    let tentativas = 0
    while (tentativas < 10) {
      const exists = await pool.query('SELECT id FROM users WHERE codigo_amigo = $1', [codigoAmigo])
      if (exists.rows.length === 0) break
      codigoAmigo = generateFriendCode()
      tentativas++
    }

    // Criar usuário
    const result = await pool.query(
      'INSERT INTO users (nome, email, senha_hash, idioma, pais, codigo_amigo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nome, email, idioma, pais, codigo_amigo, criado_em',
      [nome.trim(), email.toLowerCase(), senhaHash, idioma || 'pt', pais || null, codigoAmigo]
    )

    const user = result.rows[0]
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' })

    console.log(`[Auth] Novo usuário: ${user.nome} (${user.email}) - Código: ${user.codigo_amigo}`)

    res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        idioma: user.idioma,
        pais: user.pais,
        codigo_amigo: user.codigo_amigo
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
        pais: user.pais,
        codigo_amigo: user.codigo_amigo
      },
      token
    })
  } catch (error) {
    console.error('[Auth] Erro no login:', error.message)
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

// Esqueci minha senha - Solicitar reset
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório' })
  }

  try {
    // Verificar se email existe
    const result = await pool.query('SELECT id, nome FROM users WHERE email = $1', [email.toLowerCase()])

    if (result.rows.length === 0) {
      // Por segurança, não revelamos se o email existe ou não
      return res.json({ message: 'Se o email existir, você receberá um link de recuperação' })
    }

    const user = result.rows[0]

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex')
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    // Invalidar tokens anteriores do usuário
    await pool.query('UPDATE password_resets SET usado = TRUE WHERE user_id = $1 AND usado = FALSE', [user.id])

    // Salvar novo token
    await pool.query(
      'INSERT INTO password_resets (user_id, token, expira_em) VALUES ($1, $2, $3)',
      [user.id, token, expiraEm]
    )

    // Montar link de reset
    const resetLink = `${FRONTEND_URL}?reset=${token}`

    // Enviar email
    if (EMAIL_USER && EMAIL_PASS) {
      await emailTransporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: 'Poly.io - Recuperação de Senha',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">Poly.io</h2>
            <p>Olá <strong>${user.nome}</strong>,</p>
            <p>Você solicitou a recuperação de senha da sua conta.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Redefinir Senha
              </a>
            </p>
            <p style="color: #888; font-size: 14px;">Este link expira em 1 hora.</p>
            <p style="color: #888; font-size: 14px;">Se você não solicitou esta recuperação, ignore este email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">Poly.io - Chat sem barreiras de idioma</p>
          </div>
        `
      })
      console.log(`[Auth] Email de reset enviado para: ${email}`)
    } else {
      console.log(`[Auth] Email não configurado. Token de reset: ${token}`)
    }

    res.json({ message: 'Se o email existir, você receberá um link de recuperação' })
  } catch (error) {
    console.error('[Auth] Erro ao solicitar reset:', error.message)
    res.status(500).json({ error: 'Erro ao processar solicitação' })
  }
})

// Verificar token de reset
app.get('/api/auth/verify-reset-token/:token', async (req, res) => {
  const { token } = req.params

  try {
    const result = await pool.query(
      `SELECT pr.*, u.email FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = $1 AND pr.usado = FALSE AND pr.expira_em > NOW()`,
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Link inválido ou expirado' })
    }

    res.json({ valid: true, email: result.rows[0].email })
  } catch (error) {
    console.error('[Auth] Erro ao verificar token:', error.message)
    res.status(500).json({ error: 'Erro ao verificar link' })
  }
})

// Resetar senha
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, novaSenha } = req.body

  if (!token || !novaSenha) {
    return res.status(400).json({ error: 'Token e nova senha são obrigatórios' })
  }

  if (novaSenha.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' })
  }

  try {
    // Verificar token válido
    const result = await pool.query(
      `SELECT pr.*, u.id as user_id FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = $1 AND pr.usado = FALSE AND pr.expira_em > NOW()`,
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Link inválido ou expirado' })
    }

    const resetInfo = result.rows[0]

    // Hash da nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 10)

    // Atualizar senha do usuário
    await pool.query('UPDATE users SET senha_hash = $1 WHERE id = $2', [senhaHash, resetInfo.user_id])

    // Marcar token como usado
    await pool.query('UPDATE password_resets SET usado = TRUE WHERE id = $1', [resetInfo.id])

    console.log(`[Auth] Senha resetada para user_id: ${resetInfo.user_id}`)

    res.json({ message: 'Senha alterada com sucesso!' })
  } catch (error) {
    console.error('[Auth] Erro ao resetar senha:', error.message)
    res.status(500).json({ error: 'Erro ao alterar senha' })
  }
})

// Dados do usuário logado
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, email, idioma, pais, social_tipo, social_url, codigo_amigo, criado_em FROM users WHERE id = $1',
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

// Atualizar rede social do perfil
app.put('/api/profile/social', authMiddleware, async (req, res) => {
  try {
    const { tipo, url } = req.body

    if (!tipo || !url) {
      return res.status(400).json({ error: 'Tipo e URL são obrigatórios' })
    }

    await pool.query(
      'UPDATE users SET social_tipo = $1, social_url = $2 WHERE id = $3',
      [tipo, url.trim(), req.userId]
    )

    const result = await pool.query(
      'SELECT id, nome, email, idioma, pais, social_tipo, social_url, codigo_amigo FROM users WHERE id = $1',
      [req.userId]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('[Profile] Erro ao atualizar rede social:', error.message)
    res.status(500).json({ error: 'Erro ao atualizar rede social' })
  }
})

// Remover rede social do perfil
app.delete('/api/profile/social', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET social_tipo = NULL, social_url = NULL WHERE id = $1',
      [req.userId]
    )

    res.json({ message: 'Rede social removida' })
  } catch (error) {
    console.error('[Profile] Erro ao remover rede social:', error.message)
    res.status(500).json({ error: 'Erro ao remover rede social' })
  }
})

// Excluir conta do usuário
app.delete('/api/auth/account', authMiddleware, async (req, res) => {
  try {
    // Deletar usuário (conexões e mensagens são deletadas via CASCADE)
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING email',
      [req.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    console.log(`[Auth] Conta excluída: ${result.rows[0].email}`)

    res.json({ message: 'Conta excluída com sucesso' })
  } catch (error) {
    console.error('[Auth] Erro ao excluir conta:', error.message)
    res.status(500).json({ error: 'Erro ao excluir conta' })
  }
})

// ==================== ROTAS DE USUÁRIOS ====================

// Listar usuários online com status (DEVE vir antes de /api/users/:id)
app.get('/api/users/online', authMiddleware, (req, res) => {
  const onlineUsers = {}
  for (const [userId, socketId] of usuariosOnline.entries()) {
    const status = usuariosStatus.get(userId) || 'online'
    // Invisível não aparece na lista
    if (status !== 'invisivel') {
      onlineUsers[userId] = status
    }
  }
  res.json(onlineUsers)
})

// Atualizar meu status
app.post('/api/users/status', authMiddleware, (req, res) => {
  const { status } = req.body
  const validStatus = ['online', 'ausente', 'ocupado', 'invisivel']

  if (!validStatus.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' })
  }

  usuariosStatus.set(req.userId, status)

  // Notificar todos sobre mudança de status
  io.emit('status-atualizado', { userId: req.userId, status })

  console.log(`[Status] Usuário ${req.userId} mudou para ${status}`)
  res.json({ status })
})

// Buscar usuário por código de amigo
app.get('/api/users/code/:codigo', authMiddleware, async (req, res) => {
  try {
    const codigo = req.params.codigo.toUpperCase().trim()

    const result = await pool.query(
      'SELECT id, nome, idioma, pais, codigo_amigo FROM users WHERE codigo_amigo = $1 AND id != $2',
      [codigo, req.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Código não encontrado' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('[Users] Erro ao buscar por código:', error.message)
    res.status(500).json({ error: 'Erro ao buscar usuário' })
  }
})

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
      'SELECT id, nome, email, idioma, pais, social_tipo, social_url, criado_em FROM users WHERE id = $1',
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
      // Se foi recusada ou removida, deletar para permitir nova solicitação
      if (conn.status === 'recusada') {
        await pool.query('DELETE FROM connections WHERE id = $1', [conn.id])
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

// ==================== PUSH NOTIFICATIONS ====================

// Retornar chave pública VAPID
app.get('/api/push/vapid-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY })
})

// Registrar subscription de push
app.post('/api/push/subscribe', authMiddleware, async (req, res) => {
  const { subscription } = req.body

  if (!subscription) {
    return res.status(400).json({ error: 'Subscription é obrigatória' })
  }

  // Salvar subscription
  pushSubscriptions.set(req.userId, subscription)
  console.log(`[Push] Subscription registrada para usuário ${req.userId}`)

  res.json({ message: 'Subscription registrada com sucesso' })
})

// Remover subscription
app.delete('/api/push/subscribe', authMiddleware, (req, res) => {
  pushSubscriptions.delete(req.userId)
  console.log(`[Push] Subscription removida para usuário ${req.userId}`)
  res.json({ message: 'Subscription removida' })
})

// Função para enviar push notification
async function sendPushNotification(userId, payload) {
  const subscription = pushSubscriptions.get(userId)

  if (!subscription) {
    console.log(`[Push] Usuário ${userId} não tem subscription`)
    return false
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    console.log(`[Push] Notificação enviada para usuário ${userId}`)
    return true
  } catch (error) {
    console.error(`[Push] Erro ao enviar para ${userId}:`, error.message)
    // Se a subscription expirou, remover
    if (error.statusCode === 410) {
      pushSubscriptions.delete(userId)
    }
    return false
  }
}

// ==================== ROTAS DE CHAT ====================

// Buscar histórico de mensagens
app.get('/api/chat/:connectionId', authMiddleware, async (req, res) => {
  try {
    // Idioma de destino personalizado (opcional - se não passar, usa o padrão do perfil)
    const idiomaDestino = req.query.idiomaDestino

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
        m.idioma_destino,
        m.enviado_em,
        m.lido,
        m.editado,
        u.nome as sender_nome
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.connection_id = $1
      ORDER BY m.enviado_em ASC
    `, [req.params.connectionId])

    // Buscar reações de todas as mensagens de uma vez
    const messageIds = result.rows.map(m => m.id)
    let reactionsMap = {}
    if (messageIds.length > 0) {
      const reactionsResult = await pool.query(`
        SELECT message_id, emoji, COUNT(*) as count,
               array_agg(user_id) as user_ids
        FROM message_reactions
        WHERE message_id = ANY($1)
        GROUP BY message_id, emoji
      `, [messageIds])

      reactionsResult.rows.forEach(r => {
        if (!reactionsMap[r.message_id]) {
          reactionsMap[r.message_id] = []
        }
        reactionsMap[r.message_id].push({
          emoji: r.emoji,
          count: parseInt(r.count),
          userIds: r.user_ids
        })
      })
    }

    // Formatar mensagens (traduz sob demanda apenas se idioma diferente do salvo)
    const messages = await Promise.all(result.rows.map(async (msg) => {
      let texto

      if (msg.sender_id === req.userId) {
        // Mensagem que EU enviei - mostrar original
        texto = msg.texto_original
      } else if (idiomaDestino && idiomaDestino !== msg.idioma_destino) {
        // Usuário escolheu outro idioma no dropdown - traduzir
        texto = await traduzirTexto(msg.texto_original, msg.idioma_original, idiomaDestino)
      } else {
        // Comportamento padrão - usar tradução já salva (idioma do cadastro)
        texto = msg.texto_traduzido
      }

      return {
        id: msg.id,
        senderId: msg.sender_id,
        senderNome: msg.sender_nome,
        texto,
        textoOriginal: msg.texto_original,
        idiomaOriginal: msg.idioma_original,
        enviadoEm: msg.enviado_em,
        lido: msg.lido,
        editado: msg.editado || false,
        euEnviei: msg.sender_id === req.userId,
        reactions: reactionsMap[msg.id] || []
      }
    }))

    res.json(messages)
  } catch (error) {
    console.error('[Chat] Erro ao buscar histórico:', error.message)
    res.status(500).json({ error: 'Erro ao buscar mensagens' })
  }
})

// Traduzir texto sob demanda (para mensagens novas quando idioma diferente)
app.post('/api/translate', authMiddleware, async (req, res) => {
  const { texto, idiomaOrigem, idiomaDestino } = req.body

  if (!texto || !idiomaOrigem || !idiomaDestino) {
    return res.status(400).json({ error: 'Parâmetros inválidos' })
  }

  try {
    if (idiomaOrigem === idiomaDestino) {
      return res.json({ traduzido: texto })
    }

    const traduzido = await traduzirTexto(texto, idiomaOrigem, idiomaDestino)
    res.json({ traduzido })
  } catch (error) {
    console.error('[Translate] Erro:', error.message)
    res.status(500).json({ error: 'Erro ao traduzir' })
  }
})

// Enviar mensagem
app.post('/api/chat/:connectionId', authMiddleware, async (req, res) => {
  const { texto } = req.body

  if (!texto || !texto.trim()) {
    return res.status(400).json({ error: 'Mensagem vazia' })
  }

  try {
    // Verificar conexão e buscar dados (incluindo idioma do remetente para fallback)
    const connResult = await pool.query(`
      SELECT
        c.*,
        CASE WHEN c.user_a_id = $2 THEN u2.id ELSE u1.id END as destinatario_id,
        CASE WHEN c.user_a_id = $2 THEN u2.idioma ELSE u1.idioma END as destinatario_idioma,
        CASE WHEN c.user_a_id = $2 THEN u2.nome ELSE u1.nome END as destinatario_nome,
        CASE WHEN c.user_a_id = $2 THEN u1.idioma ELSE u2.idioma END as remetente_idioma
      FROM connections c
      JOIN users u1 ON c.user_a_id = u1.id
      JOIN users u2 ON c.user_b_id = u2.id
      WHERE c.id = $1 AND (c.user_a_id = $2 OR c.user_b_id = $2) AND c.status = 'aceita'
    `, [req.params.connectionId, req.userId])

    if (connResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }

    const conn = connResult.rows[0]

    // Detectar idioma (usa idioma do perfil do remetente como fallback)
    const idiomaOriginal = detectarIdioma(texto, conn.remetente_idioma)
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
      idiomaOriginal: idiomaOriginal,
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

// ==================== REAÇÕES EM MENSAGENS ====================

// Adicionar reação a uma mensagem
app.post('/api/chat/message/:messageId/reaction', authMiddleware, async (req, res) => {
  const { emoji } = req.body
  const { messageId } = req.params

  if (!emoji) {
    return res.status(400).json({ error: 'Emoji obrigatório' })
  }

  try {
    // Verificar se a mensagem existe e o usuário tem acesso
    const msgCheck = await pool.query(`
      SELECT m.id, m.connection_id, c.user_a_id, c.user_b_id
      FROM messages m
      JOIN connections c ON m.connection_id = c.id
      WHERE m.id = $1 AND (c.user_a_id = $2 OR c.user_b_id = $2)
    `, [messageId, req.userId])

    if (msgCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Mensagem não encontrada' })
    }

    // Inserir ou atualizar reação
    const result = await pool.query(`
      INSERT INTO message_reactions (message_id, user_id, emoji)
      VALUES ($1, $2, $3)
      ON CONFLICT (message_id, user_id, emoji) DO NOTHING
      RETURNING *
    `, [messageId, req.userId, emoji])

    // Buscar todas as reações da mensagem
    const reactions = await pool.query(`
      SELECT emoji, COUNT(*) as count,
             array_agg(user_id) as user_ids
      FROM message_reactions
      WHERE message_id = $1
      GROUP BY emoji
    `, [messageId])

    // Emitir via Socket.io para o outro usuário
    const msg = msgCheck.rows[0]
    const outroUserId = msg.user_a_id === req.userId ? msg.user_b_id : msg.user_a_id
    const outroSocketId = usuariosOnline.get(outroUserId)
    if (outroSocketId) {
      io.to(outroSocketId).emit('reacao-mensagem', {
        messageId: parseInt(messageId),
        connectionId: msg.connection_id,
        reactions: reactions.rows,
        userId: req.userId,
        emoji
      })
    }

    res.json({ reactions: reactions.rows })
  } catch (error) {
    console.error('[Reactions] Erro ao adicionar:', error.message)
    res.status(500).json({ error: 'Erro ao adicionar reação' })
  }
})

// Remover reação de uma mensagem
app.delete('/api/chat/message/:messageId/reaction', authMiddleware, async (req, res) => {
  const { emoji } = req.body
  const { messageId } = req.params

  try {
    // Buscar info da mensagem antes de deletar
    const msgCheck = await pool.query(`
      SELECT m.id, m.connection_id, c.user_a_id, c.user_b_id
      FROM messages m
      JOIN connections c ON m.connection_id = c.id
      WHERE m.id = $1 AND (c.user_a_id = $2 OR c.user_b_id = $2)
    `, [messageId, req.userId])

    await pool.query(`
      DELETE FROM message_reactions
      WHERE message_id = $1 AND user_id = $2 AND emoji = $3
    `, [messageId, req.userId, emoji])

    // Buscar reações atualizadas
    const reactions = await pool.query(`
      SELECT emoji, COUNT(*) as count,
             array_agg(user_id) as user_ids
      FROM message_reactions
      WHERE message_id = $1
      GROUP BY emoji
    `, [messageId])

    // Emitir via Socket.io para o outro usuário
    if (msgCheck.rowCount > 0) {
      const msg = msgCheck.rows[0]
      const outroUserId = msg.user_a_id === req.userId ? msg.user_b_id : msg.user_a_id
      const outroSocketId = usuariosOnline.get(outroUserId)
      if (outroSocketId) {
        io.to(outroSocketId).emit('reacao-mensagem', {
          messageId: parseInt(messageId),
          connectionId: msg.connection_id,
          reactions: reactions.rows
        })
      }
    }

    res.json({ reactions: reactions.rows })
  } catch (error) {
    console.error('[Reactions] Erro ao remover:', error.message)
    res.status(500).json({ error: 'Erro ao remover reação' })
  }
})

// Buscar reações de uma mensagem
app.get('/api/chat/message/:messageId/reactions', authMiddleware, async (req, res) => {
  try {
    const reactions = await pool.query(`
      SELECT emoji, COUNT(*) as count,
             array_agg(user_id) as user_ids
      FROM message_reactions
      WHERE message_id = $1
      GROUP BY emoji
    `, [req.params.messageId])

    res.json({ reactions: reactions.rows })
  } catch (error) {
    console.error('[Reactions] Erro ao buscar:', error.message)
    res.status(500).json({ error: 'Erro ao buscar reações' })
  }
})

// Excluir uma mensagem específica (apenas o remetente pode excluir)
app.delete('/api/chat/message/:messageId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM messages
      WHERE id = $1 AND sender_id = $2
      RETURNING id
    `, [req.params.messageId, req.userId])

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Mensagem não encontrada ou sem permissão' })
    }

    res.json({ message: 'Mensagem excluída' })
  } catch (error) {
    console.error('[Chat] Erro ao excluir mensagem:', error.message)
    res.status(500).json({ error: 'Erro ao excluir mensagem' })
  }
})

// Editar uma mensagem (apenas o remetente pode editar)
app.put('/api/chat/message/:messageId', authMiddleware, async (req, res) => {
  const { texto } = req.body

  if (!texto || !texto.trim()) {
    return res.status(400).json({ error: 'Texto vazio' })
  }

  try {
    // Buscar mensagem original para pegar dados de tradução
    const msgResult = await pool.query(`
      SELECT m.*, c.user_a_id, c.user_b_id
      FROM messages m
      JOIN connections c ON m.connection_id = c.id
      WHERE m.id = $1 AND m.sender_id = $2
    `, [req.params.messageId, req.userId])

    if (msgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mensagem não encontrada ou sem permissão' })
    }

    const msg = msgResult.rows[0]
    const destinatarioId = msg.user_a_id === req.userId ? msg.user_b_id : msg.user_a_id

    // Buscar idioma do destinatário e do remetente (para fallback)
    const usersResult = await pool.query('SELECT id, idioma FROM users WHERE id = ANY($1)', [[destinatarioId, req.userId]])
    const idiomaDestino = usersResult.rows.find(u => u.id === destinatarioId)?.idioma || 'pt'
    const idiomaRemetente = usersResult.rows.find(u => u.id === req.userId)?.idioma || 'pt'

    // Detectar idioma (usa idioma do perfil do remetente como fallback)
    const idiomaOriginal = detectarIdioma(texto.trim(), idiomaRemetente)
    const textoTraduzido = await traduzirTexto(texto.trim(), idiomaOriginal, idiomaDestino)

    // Atualizar mensagem
    const result = await pool.query(`
      UPDATE messages
      SET texto_original = $1, texto_traduzido = $2, idioma_original = $3, editado = true
      WHERE id = $4 AND sender_id = $5
      RETURNING id, texto_original, texto_traduzido, idioma_original, editado
    `, [texto.trim(), textoTraduzido, idiomaOriginal, req.params.messageId, req.userId])

    // Emitir atualização via Socket para o outro usuário
    const recipientSocketId = usuariosOnline.get(destinatarioId)
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('mensagem-editada', {
        messageId: parseInt(req.params.messageId),
        connectionId: msg.connection_id,
        texto: textoTraduzido,
        textoOriginal: texto.trim()
      })
    }

    res.json({
      id: result.rows[0].id,
      texto: texto.trim(),
      textoTraduzido,
      editado: true
    })
  } catch (error) {
    console.error('[Chat] Erro ao editar mensagem:', error.message)
    res.status(500).json({ error: 'Erro ao editar mensagem' })
  }
})

// ==================== ROTAS DE SALAS ====================

// Listar salas ativas (apenas públicas)
app.get('/api/rooms', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.name,
        r.description,
        r.owner_id,
        r.created_at,
        r.last_activity_at,
        r.max_users,
        r.is_private,
        r.invite_code,
        u.nome as owner_nome
      FROM rooms r
      JOIN users u ON r.owner_id = u.id
      WHERE r.status = 'active' AND r.is_private = FALSE
      ORDER BY r.last_activity_at DESC
      LIMIT 50
    `)

    // Adicionar contagem de usuários online em cada sala
    const rooms = result.rows.map(room => ({
      ...room,
      online_count: salaUsuarios.get(room.id)?.size || 0
    }))

    res.json(rooms)
  } catch (error) {
    console.error('[Rooms] Erro ao listar:', error.message)
    res.status(500).json({ error: 'Erro ao listar salas' })
  }
})

// Buscar minha sala (se existir)
app.get('/api/rooms/mine', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM rooms WHERE owner_id = $1 AND status != 'deleted'
    `, [req.userId])

    if (result.rows.length === 0) {
      return res.json(null)
    }

    const room = result.rows[0]
    room.online_count = salaUsuarios.get(room.id)?.size || 0

    res.json(room)
  } catch (error) {
    console.error('[Rooms] Erro ao buscar minha sala:', error.message)
    res.status(500).json({ error: 'Erro ao buscar sala' })
  }
})

// Buscar sala por código de convite (deve vir antes de :id)
app.get('/api/rooms/invite/:code', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.*,
        u.nome as owner_nome
      FROM rooms r
      JOIN users u ON r.owner_id = u.id
      WHERE r.invite_code = $1 AND r.status != 'deleted'
    `, [req.params.code.toUpperCase()])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada ou código inválido' })
    }

    const room = result.rows[0]

    // Verificar se usuário está banido
    const banCheck = await pool.query(
      'SELECT 1 FROM room_bans WHERE room_id = $1 AND user_id = $2',
      [room.id, req.userId]
    )

    if (banCheck.rows.length > 0) {
      return res.status(403).json({ error: 'Você está banido desta sala' })
    }

    room.online_count = salaUsuarios.get(room.id)?.size || 0
    res.json(room)
  } catch (error) {
    console.error('[Rooms] Erro ao buscar sala por convite:', error.message)
    res.status(500).json({ error: 'Erro ao buscar sala' })
  }
})

// Detalhes de uma sala
app.get('/api/rooms/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.*,
        u.nome as owner_nome,
        u.idioma as owner_idioma
      FROM rooms r
      JOIN users u ON r.owner_id = u.id
      WHERE r.id = $1 AND r.status != 'deleted'
    `, [req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada' })
    }

    const room = result.rows[0]
    room.online_count = salaUsuarios.get(room.id)?.size || 0

    // Verificar se usuário está banido
    const banCheck = await pool.query(
      'SELECT 1 FROM room_bans WHERE room_id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    )
    room.is_banned = banCheck.rows.length > 0

    // Verificar se usuário está silenciado
    const muteCheck = await pool.query(
      'SELECT 1 FROM room_mutes WHERE room_id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    )
    room.is_muted = muteCheck.rows.length > 0

    res.json(room)
  } catch (error) {
    console.error('[Rooms] Erro ao buscar sala:', error.message)
    res.status(500).json({ error: 'Erro ao buscar sala' })
  }
})

// Criar sala
app.post('/api/rooms', authMiddleware, async (req, res) => {
  const { name, description, is_private } = req.body

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome da sala é obrigatório' })
  }

  if (name.trim().length > 50) {
    return res.status(400).json({ error: 'Nome deve ter no máximo 50 caracteres' })
  }

  try {
    // Verificar se usuário já tem uma sala ativa
    const existing = await pool.query(
      'SELECT id FROM rooms WHERE owner_id = $1 AND status != \'deleted\'',
      [req.userId]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Você já possui uma sala. Exclua a atual para criar outra.' })
    }

    // Gerar código de convite único
    let inviteCode = generateRoomInviteCode()
    let codeExists = true
    while (codeExists) {
      const check = await pool.query('SELECT id FROM rooms WHERE invite_code = $1', [inviteCode])
      if (check.rows.length === 0) {
        codeExists = false
      } else {
        inviteCode = generateRoomInviteCode()
      }
    }

    // Criar sala
    const result = await pool.query(`
      INSERT INTO rooms (owner_id, name, description, is_private, invite_code)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.userId, name.trim(), description?.trim() || null, is_private || false, inviteCode])

    const room = result.rows[0]
    console.log(`[Rooms] Sala criada: "${room.name}" (${room.is_private ? 'privada' : 'pública'}) por usuário ${req.userId}`)

    res.json(room)
  } catch (error) {
    console.error('[Rooms] Erro ao criar sala:', error.message)
    res.status(500).json({ error: 'Erro ao criar sala' })
  }
})

// Atualizar sala (apenas dono)
app.put('/api/rooms/:id', authMiddleware, async (req, res) => {
  const { name, description } = req.body

  try {
    const result = await pool.query(`
      UPDATE rooms
      SET name = COALESCE($1, name), description = COALESCE($2, description)
      WHERE id = $3 AND owner_id = $4 AND status != 'deleted'
      RETURNING *
    `, [name?.trim(), description?.trim(), req.params.id, req.userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada ou sem permissão' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('[Rooms] Erro ao atualizar sala:', error.message)
    res.status(500).json({ error: 'Erro ao atualizar sala' })
  }
})

// Excluir sala (apenas dono)
app.delete('/api/rooms/:id', authMiddleware, async (req, res) => {
  try {
    // Verificar se é o dono
    const room = await pool.query(
      'SELECT id, owner_id FROM rooms WHERE id = $1',
      [req.params.id]
    )

    if (room.rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada' })
    }

    if (room.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Apenas o dono pode excluir a sala' })
    }

    // Notificar todos os usuários na sala
    const roomId = parseInt(req.params.id)
    const usersInRoom = salaUsuarios.get(roomId)
    if (usersInRoom) {
      for (const odestinandoId of usersInRoom) {
        const socketId = usuariosOnline.get(odestinandoId)
        if (socketId) {
          io.to(socketId).emit('sala-encerrada', { roomId })
        }
      }
    }

    // Limpar dados em memória
    salaUsuarios.delete(roomId)
    salaMensagens.delete(roomId)

    // Marcar como deleted no banco
    await pool.query(
      'UPDATE rooms SET status = \'deleted\' WHERE id = $1',
      [req.params.id]
    )

    console.log(`[Rooms] Sala ${roomId} excluída pelo dono`)
    res.json({ message: 'Sala excluída' })
  } catch (error) {
    console.error('[Rooms] Erro ao excluir sala:', error.message)
    res.status(500).json({ error: 'Erro ao excluir sala' })
  }
})

// Banir usuário da sala (apenas dono)
app.post('/api/rooms/:id/ban/:odestinandoId', authMiddleware, async (req, res) => {
  try {
    const roomId = parseInt(req.params.id)
    const targetUserId = parseInt(req.params.odestinandoId)

    // Verificar se é o dono da sala
    const room = await pool.query(
      'SELECT owner_id FROM rooms WHERE id = $1 AND status != \'deleted\'',
      [roomId]
    )

    if (room.rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada' })
    }

    if (room.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Apenas o dono pode banir usuários' })
    }

    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Não pode banir a si mesmo' })
    }

    // Adicionar ban
    await pool.query(`
      INSERT INTO room_bans (room_id, user_id, banned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (room_id, user_id) DO NOTHING
    `, [roomId, targetUserId, req.userId])

    // Remover usuário da sala (se estiver)
    const usersInRoom = salaUsuarios.get(roomId)
    if (usersInRoom) {
      usersInRoom.delete(targetUserId)
    }
    if (usuarioSala.get(targetUserId) === roomId) {
      usuarioSala.delete(targetUserId)
    }

    // Notificar usuário banido
    const targetSocketId = usuariosOnline.get(targetUserId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('banido-da-sala', { roomId })
    }

    // Notificar outros na sala
    io.to(`room-${roomId}`).emit('usuario-saiu-sala', {
      odestinandoId: targetUserId,
      motivo: 'banido'
    })

    console.log(`[Rooms] Usuário ${targetUserId} banido da sala ${roomId}`)
    res.json({ message: 'Usuário banido' })
  } catch (error) {
    console.error('[Rooms] Erro ao banir:', error.message)
    res.status(500).json({ error: 'Erro ao banir usuário' })
  }
})

// Remover ban (apenas dono)
app.delete('/api/rooms/:id/ban/:odestinandoId', authMiddleware, async (req, res) => {
  try {
    const roomId = parseInt(req.params.id)
    const targetUserId = parseInt(req.params.odestinandoId)

    // Verificar se é o dono
    const room = await pool.query(
      'SELECT owner_id FROM rooms WHERE id = $1',
      [roomId]
    )

    if (room.rows.length === 0 || room.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Sem permissão' })
    }

    await pool.query(
      'DELETE FROM room_bans WHERE room_id = $1 AND user_id = $2',
      [roomId, targetUserId]
    )

    res.json({ message: 'Ban removido' })
  } catch (error) {
    console.error('[Rooms] Erro ao remover ban:', error.message)
    res.status(500).json({ error: 'Erro ao remover ban' })
  }
})

// Silenciar usuário na sala (apenas dono)
app.post('/api/rooms/:id/mute/:odestinandoId', authMiddleware, async (req, res) => {
  try {
    const roomId = parseInt(req.params.id)
    const targetUserId = parseInt(req.params.odestinandoId)

    // Verificar se é o dono
    const room = await pool.query(
      'SELECT owner_id FROM rooms WHERE id = $1 AND status != \'deleted\'',
      [roomId]
    )

    if (room.rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada' })
    }

    if (room.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Apenas o dono pode silenciar usuários' })
    }

    // Adicionar mute
    await pool.query(`
      INSERT INTO room_mutes (room_id, user_id, muted_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (room_id, user_id) DO NOTHING
    `, [roomId, targetUserId, req.userId])

    // Notificar usuário silenciado
    const targetSocketId = usuariosOnline.get(targetUserId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('silenciado-na-sala', { roomId })
    }

    console.log(`[Rooms] Usuário ${targetUserId} silenciado na sala ${roomId}`)
    res.json({ message: 'Usuário silenciado' })
  } catch (error) {
    console.error('[Rooms] Erro ao silenciar:', error.message)
    res.status(500).json({ error: 'Erro ao silenciar usuário' })
  }
})

// Remover silenciamento (apenas dono)
app.delete('/api/rooms/:id/mute/:odestinandoId', authMiddleware, async (req, res) => {
  try {
    const roomId = parseInt(req.params.id)
    const targetUserId = parseInt(req.params.odestinandoId)

    // Verificar se é o dono
    const room = await pool.query(
      'SELECT owner_id FROM rooms WHERE id = $1',
      [roomId]
    )

    if (room.rows.length === 0 || room.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Sem permissão' })
    }

    await pool.query(
      'DELETE FROM room_mutes WHERE room_id = $1 AND user_id = $2',
      [roomId, targetUserId]
    )

    // Notificar usuário
    const targetSocketId = usuariosOnline.get(targetUserId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('dessilenciado-na-sala', { roomId })
    }

    res.json({ message: 'Silenciamento removido' })
  } catch (error) {
    console.error('[Rooms] Erro ao remover mute:', error.message)
    res.status(500).json({ error: 'Erro ao remover silenciamento' })
  }
})

// Listar usuários silenciados (apenas dono)
app.get('/api/rooms/:id/mutes', authMiddleware, async (req, res) => {
  try {
    const roomId = parseInt(req.params.id)

    // Verificar se é o dono
    const room = await pool.query(
      'SELECT owner_id FROM rooms WHERE id = $1',
      [roomId]
    )

    if (room.rows.length === 0 || room.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Sem permissão' })
    }

    const result = await pool.query(
      'SELECT user_id FROM room_mutes WHERE room_id = $1',
      [roomId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('[Rooms] Erro ao listar mutes:', error.message)
    res.status(500).json({ error: 'Erro ao listar silenciados' })
  }
})

// Reativar sala (apenas dono)
app.post('/api/rooms/:id/reactivate', authMiddleware, async (req, res) => {
  try {
    const roomId = parseInt(req.params.id)

    // Verificar se é o dono
    const room = await pool.query(
      'SELECT owner_id, status FROM rooms WHERE id = $1',
      [roomId]
    )

    if (room.rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada' })
    }

    if (room.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Apenas o dono pode reativar a sala' })
    }

    if (room.rows[0].status === 'deleted') {
      return res.status(400).json({ error: 'Sala excluída não pode ser reativada' })
    }

    if (room.rows[0].status === 'active') {
      return res.status(400).json({ error: 'Sala já está ativa' })
    }

    // Reativar: mudar status para active e resetar last_activity_at
    await pool.query(`
      UPDATE rooms
      SET status = 'active', last_activity_at = NOW()
      WHERE id = $1
    `, [roomId])

    console.log(`[Rooms] Sala ${roomId} reativada pelo dono`)
    res.json({ message: 'Sala reativada com sucesso' })
  } catch (error) {
    console.error('[Rooms] Erro ao reativar sala:', error.message)
    res.status(500).json({ error: 'Erro ao reativar sala' })
  }
})

// Listar usuários banidos (apenas dono)
app.get('/api/rooms/:id/bans', authMiddleware, async (req, res) => {
  try {
    const roomId = parseInt(req.params.id)

    // Verificar se é o dono
    const room = await pool.query(
      'SELECT owner_id FROM rooms WHERE id = $1',
      [roomId]
    )

    if (room.rows.length === 0 || room.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Sem permissão' })
    }

    const result = await pool.query(`
      SELECT rb.*, u.nome, u.email
      FROM room_bans rb
      JOIN users u ON rb.user_id = u.id
      WHERE rb.room_id = $1
    `, [roomId])

    res.json(result.rows)
  } catch (error) {
    console.error('[Rooms] Erro ao listar bans:', error.message)
    res.status(500).json({ error: 'Erro ao listar banidos' })
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

io.on('connection', (socket) => {
  console.log('[Socket] Conectado:', socket.id)

  socket.on('autenticar', async (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      const userId = decoded.userId
      usuariosOnline.set(userId, socket.id)
      usuariosStatus.set(userId, usuariosStatus.get(userId) || 'online')
      socket.userId = userId
      console.log(`[Socket] Usuário ${userId} online`)

      // Notificar todos sobre o novo usuário online
      const status = usuariosStatus.get(userId)
      if (status !== 'invisivel') {
        io.emit('usuario-online', { userId, status })
      }
    } catch (error) {
      console.log('[Socket] Token inválido')
    }
  })

  // Indicador de digitação
  socket.on('digitando', (data) => {
    if (!socket.userId) return

    const { recipientId, connectionId } = data
    const recipientSocketId = usuariosOnline.get(recipientId)

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('usuario-digitando', {
        senderId: socket.userId,
        connectionId
      })
    }
  })

  // Parou de digitar
  socket.on('parou-digitar', (data) => {
    if (!socket.userId) return

    const { recipientId, connectionId } = data
    const recipientSocketId = usuariosOnline.get(recipientId)

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('usuario-parou-digitar', {
        senderId: socket.userId,
        connectionId
      })
    }
  })

  // Marcar mensagens como lidas
  socket.on('marcar-lidas', async (data) => {
    if (!socket.userId) return

    const { connectionId, senderId } = data

    try {
      // Marcar todas as mensagens não lidas do remetente como lidas
      const result = await pool.query(`
        UPDATE messages
        SET lido = TRUE
        WHERE connection_id = $1
          AND sender_id = $2
          AND lido = FALSE
        RETURNING id
      `, [connectionId, senderId])

      if (result.rowCount > 0) {
        // Notificar o remetente que suas mensagens foram lidas
        const senderSocketId = usuariosOnline.get(senderId)
        if (senderSocketId) {
          io.to(senderSocketId).emit('mensagens-lidas', {
            connectionId,
            leitoPor: socket.userId,
            messageIds: result.rows.map(r => r.id)
          })
        }
      }
    } catch (error) {
      console.error('[Socket] Erro ao marcar mensagens como lidas:', error.message)
    }
  })

  // ==================== CHAMADA DE VÍDEO (Jitsi) ====================

  // Iniciar chamada de vídeo/áudio
  socket.on('iniciar-chamada', async (data) => {
    if (!socket.userId) return

    const { recipientId, connectionId, roomName, audioOnly } = data
    const recipientSocketId = usuariosOnline.get(recipientId)
    const tipoLigacao = audioOnly ? 'áudio' : 'vídeo'

    // Buscar nome do chamador
    let callerName = 'Usuário'
    try {
      const result = await pool.query('SELECT nome FROM users WHERE id = $1', [socket.userId])
      if (result.rows.length > 0) callerName = result.rows[0].nome
    } catch (e) {}

    if (recipientSocketId) {
      // Usuário online via socket
      io.to(recipientSocketId).emit('chamada-recebida', {
        callerId: socket.userId,
        callerName,
        connectionId,
        roomName,
        audioOnly: audioOnly || false
      })
      console.log(`[Chamada ${tipoLigacao}] ${socket.userId} -> ${recipientId} sala: ${roomName}`)
    } else {
      // Usuário offline - tentar enviar push notification
      const pushSent = await sendPushNotification(recipientId, {
        title: `${callerName} está ligando...`,
        body: audioOnly ? 'Ligação de voz' : 'Chamada de vídeo',
        icon: '/icon-192.png',
        tag: 'incoming-call',
        type: 'call',
        data: {
          type: 'call',
          callerId: socket.userId,
          callerName,
          connectionId,
          roomName,
          audioOnly: audioOnly || false
        }
      })

      if (pushSent) {
        console.log(`[Chamada] Push enviado para ${recipientId}`)
        // Aguardar resposta por push (a pessoa pode abrir o app)
      } else {
        socket.emit('chamada-erro', {
          error: 'Usuário está offline e não tem notificações ativadas.'
        })
      }
    }
  })

  // Aceitar chamada
  socket.on('aceitar-chamada', (data) => {
    if (!socket.userId) return

    const { callerId, roomName } = data
    const callerSocketId = usuariosOnline.get(callerId)

    if (callerSocketId) {
      io.to(callerSocketId).emit('chamada-aceita', {
        odestinandoId: socket.userId,
        roomName
      })
      console.log(`[Chamada] Aceita por ${socket.userId}`)
    }
  })

  // Recusar chamada
  socket.on('recusar-chamada', (data) => {
    if (!socket.userId) return

    const { callerId } = data
    const callerSocketId = usuariosOnline.get(callerId)

    if (callerSocketId) {
      io.to(callerSocketId).emit('chamada-recusada', {
        odestinandoId: socket.userId
      })
      console.log(`[Chamada] Recusada por ${socket.userId}`)
    }
  })

  // Encerrar chamada
  socket.on('encerrar-chamada', (data) => {
    if (!socket.userId) return

    const { recipientId } = data
    const recipientSocketId = usuariosOnline.get(recipientId)

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('chamada-encerrada', {
        odestinandoId: socket.userId
      })
      console.log(`[Chamada] Encerrada por ${socket.userId}`)
    }
  })

  // Transferência de arquivo (P2P via socket, sem salvar no servidor)
  socket.on('enviar-arquivo', (data) => {
    if (!socket.userId) return

    const { connectionId, recipientId, fileName, fileType, fileData } = data

    // Verificar se o destinatário está online
    const recipientSocketId = usuariosOnline.get(recipientId)
    if (recipientSocketId) {
      // Enviar arquivo diretamente para o destinatário
      io.to(recipientSocketId).emit('arquivo-recebido', {
        connectionId,
        senderId: socket.userId,
        fileName,
        fileType,
        fileData
      })
      console.log(`[Arquivo] ${socket.userId} -> ${recipientId}: ${fileName}`)
    } else {
      // Destinatário offline - avisar o remetente
      socket.emit('arquivo-erro', {
        error: 'Usuário offline. O arquivo não pode ser entregue.'
      })
    }
  })

  // Transferência de áudio (P2P via socket, sem salvar no servidor)
  socket.on('enviar-audio', (data) => {
    if (!socket.userId) return

    const { connectionId, recipientId, audioData } = data

    // Verificar se o destinatário está online
    const recipientSocketId = usuariosOnline.get(recipientId)
    if (recipientSocketId) {
      // Enviar áudio diretamente para o destinatário
      io.to(recipientSocketId).emit('audio-recebido', {
        connectionId,
        senderId: socket.userId,
        audioData
      })
      console.log(`[Áudio] ${socket.userId} -> ${recipientId}`)
    } else {
      // Destinatário offline - avisar o remetente
      socket.emit('audio-erro', {
        error: 'Usuário offline. O áudio não pode ser entregue.'
      })
    }
  })

  // ==================== SALAS - SOCKET EVENTS ====================

  // Entrar em uma sala
  socket.on('entrar-sala', async (data) => {
    if (!socket.userId) return

    const { roomId } = data
    const odestinandoId = socket.userId

    try {
      // Verificar se sala existe e está ativa
      const roomResult = await pool.query(
        'SELECT * FROM rooms WHERE id = $1 AND status = \'active\'',
        [roomId]
      )

      if (roomResult.rows.length === 0) {
        socket.emit('sala-erro', { error: 'Sala não encontrada ou inativa' })
        return
      }

      const room = roomResult.rows[0]

      // Verificar se usuário está banido
      const banCheck = await pool.query(
        'SELECT 1 FROM room_bans WHERE room_id = $1 AND user_id = $2',
        [roomId, odestinandoId]
      )

      if (banCheck.rows.length > 0) {
        socket.emit('sala-erro', { error: 'Você está banido desta sala' })
        return
      }

      // Verificar limite de usuários
      const usersInRoom = salaUsuarios.get(roomId) || new Set()
      if (usersInRoom.size >= room.max_users && !usersInRoom.has(odestinandoId)) {
        socket.emit('sala-cheia', {
          roomId,
          message: 'Esta sala está cheia no momento. Você pode criar outra sala com a mesma temática.'
        })
        return
      }

      // Sair da sala anterior se estiver em uma
      const salaAnterior = usuarioSala.get(odestinandoId)
      if (salaAnterior && salaAnterior !== roomId) {
        socket.leave(`room-${salaAnterior}`)
        const usersAnterior = salaUsuarios.get(salaAnterior)
        if (usersAnterior) {
          usersAnterior.delete(odestinandoId)
        }
        io.to(`room-${salaAnterior}`).emit('usuario-saiu-sala', { odestinandoId })
      }

      // Entrar na nova sala
      socket.join(`room-${roomId}`)
      usersInRoom.add(odestinandoId)
      salaUsuarios.set(roomId, usersInRoom)
      usuarioSala.set(odestinandoId, roomId)

      // Buscar dados do usuário
      const userResult = await pool.query(
        'SELECT nome, idioma FROM users WHERE id = $1',
        [odestinandoId]
      )
      const user = userResult.rows[0]

      // Verificar se está silenciado
      const muteCheck = await pool.query(
        'SELECT 1 FROM room_mutes WHERE room_id = $1 AND user_id = $2',
        [roomId, odestinandoId]
      )
      const isMuted = muteCheck.rows.length > 0

      // Notificar todos na sala
      io.to(`room-${roomId}`).emit('usuario-entrou-sala', {
        odestinandoId,
        nome: user.nome,
        idioma: user.idioma
      })

      // Enviar lista de usuários atualmente na sala
      const usersData = []
      const userIdsInRoom = Array.from(usersInRoom)
      for (const odestinandoUid of userIdsInRoom) {
        const uResult = await pool.query(
          'SELECT id, nome, idioma FROM users WHERE id = $1',
          [odestinandoUid]
        )
        if (uResult.rows.length > 0) {
          usersData.push(uResult.rows[0])
        }
      }

      console.log(`[Salas] Usuários na sala ${roomId}:`, usersData.map(u => u.nome).join(', '))

      socket.emit('sala-entrou', {
        roomId,
        room,
        users: usersData,
        isMuted,
        isOwner: room.owner_id === odestinandoId
      })

      // Atualizar última atividade da sala
      await pool.query(
        'UPDATE rooms SET last_activity_at = NOW(), status = CASE WHEN status = \'hidden\' THEN \'active\' ELSE status END WHERE id = $1',
        [roomId]
      )

      console.log(`[Salas] Usuário ${odestinandoId} entrou na sala ${roomId}`)
    } catch (error) {
      console.error('[Salas] Erro ao entrar:', error.message)
      socket.emit('sala-erro', { error: 'Erro ao entrar na sala' })
    }
  })

  // Sair de uma sala
  socket.on('sair-sala', () => {
    if (!socket.userId) return

    const odestinandoId = socket.userId
    const roomId = usuarioSala.get(odestinandoId)

    if (roomId) {
      socket.leave(`room-${roomId}`)
      const usersInRoom = salaUsuarios.get(roomId)
      if (usersInRoom) {
        usersInRoom.delete(odestinandoId)
      }
      usuarioSala.delete(odestinandoId)

      io.to(`room-${roomId}`).emit('usuario-saiu-sala', { odestinandoId })
      console.log(`[Salas] Usuário ${odestinandoId} saiu da sala ${roomId}`)
    }
  })

  // Enviar mensagem na sala
  socket.on('sala-mensagem', async (data) => {
    if (!socket.userId) return

    const { roomId, texto, cor, corNome } = data
    const senderId = socket.userId

    if (!texto || !texto.trim()) return

    try {
      // Verificar se está na sala
      if (usuarioSala.get(senderId) !== roomId) {
        socket.emit('sala-erro', { error: 'Você não está nesta sala' })
        return
      }

      // Verificar se está silenciado
      const muteCheck = await pool.query(
        'SELECT 1 FROM room_mutes WHERE room_id = $1 AND user_id = $2',
        [roomId, senderId]
      )

      if (muteCheck.rows.length > 0) {
        socket.emit('sala-erro', { error: 'Você está silenciado nesta sala' })
        return
      }

      // Buscar dados do remetente
      const userResult = await pool.query(
        'SELECT nome, idioma FROM users WHERE id = $1',
        [senderId]
      )
      const sender = userResult.rows[0]

      // Detectar idioma da mensagem (usa idioma do perfil do remetente como fallback)
      const idiomaOriginal = detectarIdioma(texto, sender.idioma)
      console.log(`[Salas] Idioma detectado: ${idiomaOriginal} para texto: "${texto.substring(0, 30)}..."`)

      // Criar mensagem em memória
      const mensagem = {
        id: mensagemIdCounter++,
        senderId: senderId,
        senderNome: sender.nome,
        texto: texto.trim(),
        cor: cor || '#ffffff',
        corNome: corNome || '#ffffff',
        idiomaOriginal,
        timestamp: Date.now(),
        traducoesCache: new Map() // Cache de traduções por idioma
      }

      // Guardar mensagem (com limite de 100 por sala)
      let mensagens = salaMensagens.get(roomId) || []
      mensagens.push(mensagem)
      if (mensagens.length > 100) {
        mensagens = mensagens.slice(-100)
      }
      salaMensagens.set(roomId, mensagens)

      // Buscar TODOS os usuários na sala com seus idiomas de uma vez
      const usersInRoom = salaUsuarios.get(roomId) || new Set()
      const userIdsArray = Array.from(usersInRoom)

      // Buscar idiomas de todos os usuários
      const usersDataResult = await pool.query(
        'SELECT id, idioma FROM users WHERE id = ANY($1)',
        [userIdsArray]
      )

      // Criar mapa de userId -> idioma
      const userIdiomaMap = new Map()
      const idiomasNecessarios = new Set()

      for (const row of usersDataResult.rows) {
        userIdiomaMap.set(row.id, row.idioma)
        idiomasNecessarios.add(row.idioma)
      }

      console.log(`[Salas] Idiomas na sala: ${Array.from(idiomasNecessarios).join(', ')}`)

      // Traduzir para cada idioma necessário (diferente do original)
      const traducoes = { [idiomaOriginal]: texto.trim() }
      for (const idioma of idiomasNecessarios) {
        if (idioma !== idiomaOriginal) {
          console.log(`[Salas] Traduzindo de ${idiomaOriginal} para ${idioma}`)
          traducoes[idioma] = await traduzirTexto(texto.trim(), idiomaOriginal, idioma)
          console.log(`[Salas] Tradução: "${traducoes[idioma]}"`)
        }
      }

      // Enviar para cada usuário na sala com tradução apropriada
      for (const recipientId of usersInRoom) {
        const socketId = usuariosOnline.get(recipientId)
        if (socketId) {
          const userIdioma = userIdiomaMap.get(recipientId) || 'pt'
          const textoParaEnviar = traducoes[userIdioma] || texto.trim()

          console.log(`[Salas] Enviando para user ${recipientId} (idioma: ${userIdioma}): "${textoParaEnviar.substring(0, 30)}..."`)

          io.to(socketId).emit('sala-nova-mensagem', {
            id: mensagem.id,
            roomId,
            senderId: senderId,
            senderNome: sender.nome,
            texto: textoParaEnviar,
            textoOriginal: texto.trim(),
            cor: mensagem.cor,
            corNome: mensagem.corNome,
            idiomaOriginal,
            timestamp: mensagem.timestamp,
            euEnviei: recipientId === senderId
          })
        }
      }

      // Atualizar última atividade
      await pool.query(
        'UPDATE rooms SET last_activity_at = NOW(), status = CASE WHEN status = \'hidden\' THEN \'active\' ELSE status END WHERE id = $1',
        [roomId]
      )

      console.log(`[Salas] Mensagem na sala ${roomId} por ${senderId}`)
    } catch (error) {
      console.error('[Salas] Erro ao enviar mensagem:', error.message)
    }
  })

  // Digitando na sala
  socket.on('sala-digitando', (data) => {
    if (!socket.userId) return

    const { roomId } = data
    const odestinandoId = socket.userId

    if (usuarioSala.get(odestinandoId) === roomId) {
      socket.to(`room-${roomId}`).emit('sala-usuario-digitando', {
        odestinandoId,
        roomId
      })
    }
  })

  // Parou de digitar na sala
  socket.on('sala-parou-digitar', (data) => {
    if (!socket.userId) return

    const { roomId } = data
    const odestinandoId = socket.userId

    if (usuarioSala.get(odestinandoId) === roomId) {
      socket.to(`room-${roomId}`).emit('sala-usuario-parou-digitar', {
        odestinandoId,
        roomId
      })
    }
  })

  // Kick usuário (apenas dono - via socket para ação rápida)
  socket.on('sala-kick', async (data) => {
    if (!socket.userId) return

    const { roomId, targetUserId } = data

    try {
      // Verificar se é o dono
      const roomResult = await pool.query(
        'SELECT owner_id FROM rooms WHERE id = $1',
        [roomId]
      )

      if (roomResult.rows.length === 0 || roomResult.rows[0].owner_id !== socket.userId) {
        socket.emit('sala-erro', { error: 'Sem permissão' })
        return
      }

      // Remover usuário da sala
      const usersInRoom = salaUsuarios.get(roomId)
      if (usersInRoom) {
        usersInRoom.delete(targetUserId)
      }
      if (usuarioSala.get(targetUserId) === roomId) {
        usuarioSala.delete(targetUserId)
      }

      // Notificar usuário removido
      const targetSocketId = usuariosOnline.get(targetUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit('expulso-da-sala', { roomId })
        const targetSocket = io.sockets.sockets.get(targetSocketId)
        if (targetSocket) {
          targetSocket.leave(`room-${roomId}`)
        }
      }

      // Notificar sala
      io.to(`room-${roomId}`).emit('usuario-saiu-sala', {
        odestinandoId: targetUserId,
        motivo: 'expulso'
      })

      console.log(`[Salas] Usuário ${targetUserId} expulso da sala ${roomId}`)
    } catch (error) {
      console.error('[Salas] Erro ao expulsar:', error.message)
    }
  })

  socket.on('disconnect', () => {
    if (socket.userId) {
      const odestinandoId = socket.userId

      // Remover de sala se estiver em uma
      const roomId = usuarioSala.get(odestinandoId)
      if (roomId) {
        const usersInRoom = salaUsuarios.get(roomId)
        if (usersInRoom) {
          usersInRoom.delete(odestinandoId)
        }
        usuarioSala.delete(odestinandoId)
        io.to(`room-${roomId}`).emit('usuario-saiu-sala', { odestinandoId })
      }

      usuariosOnline.delete(odestinandoId)
      usuariosStatus.delete(odestinandoId)
      console.log(`[Socket] Usuário ${odestinandoId} offline`)
      io.emit('usuario-offline', odestinandoId)
    }
  })
})

// ==================== INICIAR SERVIDOR ====================

// Limpar mensagens de sala expiradas (em memória)
function limparMensagensSala() {
  const agora = Date.now()
  const expiracaoMs = 60 * 60 * 1000 // 1 hora

  for (const [roomId, mensagens] of salaMensagens.entries()) {
    const mensagensValidas = mensagens.filter(m => (agora - m.timestamp) < expiracaoMs)
    if (mensagensValidas.length !== mensagens.length) {
      salaMensagens.set(roomId, mensagensValidas)
      console.log(`[Salas] Limpeza: ${mensagens.length - mensagensValidas.length} mensagens expiradas na sala ${roomId}`)
    }
  }
}

async function startServer() {
  try {
    // Inicializar banco de dados
    await initDatabase()

    // Limpar mensagens expiradas a cada 30 minutos (chat privado - 24h)
    setInterval(limparMensagensExpiradas, 30 * 60 * 1000)
    // Rodar uma vez ao iniciar também
    limparMensagensExpiradas()

    // Limpar mensagens de sala a cada 10 minutos
    setInterval(limparMensagensSala, 10 * 60 * 1000)

    // Verificar salas inativas uma vez por dia
    setInterval(verificarSalasInativas, 24 * 60 * 60 * 1000)
    // Rodar uma vez ao iniciar também
    verificarSalasInativas()

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
