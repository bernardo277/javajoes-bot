const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ─── CARREGAR .env MANUALMENTE (apenas se existir, ex: desenvolvimento local) ──
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) process.env[key.trim()] = val.trim();
  });
}

const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
const TOKEN = process.env.ZAPI_TOKEN;
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
const PORT = process.env.PORT || 3000;
const ZAPI_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}`;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const app = express();
app.use(express.json());
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (_req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const ultimasRespostas = {};

// ─── SCRIPTS DO BOT ───────────────────────────────────────────────────────────

const SCRIPTS = {
  boasVindas: `Olá! Bem-vindo ao Java Joe's Pizzaria e Bistrô! 🍕

Meu nome é Giovana, fico feliz em te atender! Como posso te ajudar hoje?

1 - Nosso espaço
2 - Valores e funcionamento
3 - Reservas
4 - Localização e endereço
5 - Informações sobre o rodízio e à la carte
6 - Alterar uma reserva
7 - Falar com um dos nossos atendentes`,

  op1: `O Java Joe's é uma pizzaria com ambiente familiar e aconchegante, ideal para curtir com amigos e família. Nosso salão tem capacidade para cerca de 120 pessoas, com área kids de 18m² de muita diversão, oferecemos uma experiência completa com pizzas, massas, bebidas e sobremesas. 🍕

🎥 Quer conhecer nosso espaço antes de vir? Dá uma olhada no vídeo abaixo:
https://youtu.be/L1_fNXLwJHQ

Posso te ajudar com mais alguma coisa?
0 - Voltar ao menu principal`,

  op2: `💰 Rodízio (pizzas + massas + refil de bebidas):

Terça a quinta: R$ 59,99 com refil incluso (acima de 10 anos)
Sexta a domingo: R$ 64,99 (acima de 10 anos) + refil R$ 14,99 (opcional)

Crianças de 04 a 09 anos: R$ 43,99

🕒 Funcionamento:
Terça a Domingo: 18h às 23h
🚫 Segunda-feira: fechado

Posso te ajudar com mais alguma coisa?
0 - Voltar ao menu principal`,

  op3_info: `Garanta sua mesa no Java Joe's e venha viver uma experiência incrível com a gente! 🍕

📌 Condições para reserva:
Mínimo de 4 pessoas
Máximo de 50 pessoas

🎂 Aniversariante da semana TEM BENEFÍCIO ESPECIAL:
Com 10 convidados ou mais, o aniversariante ganha o rodízio por nossa conta! (desconto pessoal e intransferível)

Pode trazer:
🎂 Bolo
🍬 Docinhos
🎀 Decoração da mesa

Disponibilizamos 1 balcão para você montar tudo!

⚠️ Importante: a reserva fica garantida até 19h30 — chegue no horário para não perder sua mesa!

Para reservar agora, é só me enviar:
• Nome e sobrenome
• Telefone
• Data
• Quantidade de pessoas

💡 Dica: finais de semana costumam lotar… garanta sua vaga com antecedência!
_(Digite 0 para voltar ao menu principal)_`,

  op3_confirmar: (nome, data, pessoas) => `Perfeito! Aqui está o resumo da sua reserva:
👤 Nome: ${nome}
📅 Data: ${data}
👥 Pessoas: ${pessoas}
Deseja confirmar?
1 - Sim, confirmar
2 - Alterar informações
0 - Voltar ao menu principal`,

  diaFechado: `Ops! Infelizmente não funcionamos às segundas-feiras. 😕
Mas temos mesa disponível de terça a domingo, das 18h às 23h!
Quer escolher outro dia para sua reserva? 😊
_(Digite 0 para voltar ao menu principal)_`,

  minimoNaoAtingido: `Nossas reservas são para grupos a partir de 4 pessoas. 😊
Para grupos menores, fique à vontade para vir sem reserva — sempre tentamos acomodar nossos clientes!
⚠️ Lembrando que a disponibilidade depende do movimento do dia.

Posso te ajudar com mais alguma coisa?
0 - Voltar ao menu principal`,

  maximoUltrapassado: `Para grupos acima de 50 pessoas, o atendimento é feito diretamente com nossa equipe. 😊
Um de nossos atendentes entrará em contato para organizar tudo com você!

0 - Voltar ao menu principal`,

  op3_confirmado: `✅ Reserva confirmada! Te esperamos no Java Joe's. 🍕
⚠️ Lembrete: chegue até as 19h30 para confirmar sua mesa presencialmente. Reservas não confirmadas até esse horário podem ser liberadas para outros clientes.
Qualquer dúvida, é só chamar!

0 - Voltar ao menu principal`,

  op4: `Estamos localizados em:
📍 Rua Jagoroaba, 262 — Vila Valqueire, Rio de Janeiro
🚗 Estacionamento: há vagas disponíveis nas ruas ao redor do restaurante.
🗺️ Google Maps: https://maps.app.goo.gl/vUYaStfhhLQZNYBY7
Te esperamos! Qualquer dúvida, é só chamar. 😊

0 - Voltar ao menu principal`,

  op5: `Aqui no Java Joe's você escolhe como quer aproveitar:

🍕 Rodízio:
Mais de 30 sabores de pizzas (salgadas e doces) + massas variadas + acompanhamentos + refil de bebidas.

🍽️ À la carte:
Pizzas nos tamanhos 27cm, 35cm e 40cm, além de massas, entradas e sobremesas incríveis do nosso cardápio.

Quer conferir o cardápio completo? Um de nossos atendentes enviará para você pelo WhatsApp! 😊

Posso te ajudar com mais alguma coisa?
0 - Voltar ao menu principal`,

  cancelar_solicitar: `Tudo bem, sem problemas! 😊
Para cancelar sua reserva, me informe:
• Seu nome completo
• Data da reserva
_(Digite 0 para voltar ao menu principal)_`,

  cancelar_confirmado: `Reserva cancelada com sucesso! ✅
Sentiremos sua falta, mas esperamos te receber em breve no Java Joe's. 🍕
Qualquer coisa, é só chamar. Até a próxima!

0 - Voltar ao menu principal`,

  atendente: `Claro! Vou te conectar com um de nossos atendentes agora. 👋
Um momento — nossa equipe humana assumirá essa conversa em breve.
Enquanto isso, fique à vontade para aguardar aqui. 😊`,

  menuOpcoes: `Posso te ajudar com:

1 - Nosso espaço
2 - Valores e funcionamento
3 - Reservas
4 - Localização e endereço
5 - Informações sobre o rodízio e à la carte
6 - Alterar uma reserva
7 - Falar com um dos nossos atendentes
0 - Voltar ao menu principal`,

  fallback: `Hmm, não sei se consigo te ajudar com isso. 😊
Mas posso te ajudar com:

1 - Nosso espaço
2 - Valores e funcionamento
3 - Reservas
4 - Localização e endereço
5 - Informações sobre o rodízio e à la carte
6 - Alterar uma reserva
7 - Falar com um dos nossos atendentes
0 - Voltar ao menu principal`,

  inatividade: `Parece que você se afastou! 😊 Encerrando sua sessão por inatividade. Quando quiser continuar é só mandar uma mensagem!`,

  faq: {
    pagamento: `Aceitamos todas as formas de pagamento: cartão de crédito, débito, PIX e vale-refeição/alimentação. 😊\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    vegetariano: `Sim! Temos opções vegetarianas no cardápio. 🥗\nNossos garçons terão prazer em te orientar na sua visita.\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    glutenLactose: `Infelizmente não temos opções sem glúten ou sem lactose no momento.\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    meiaPorte: `Sim, trabalhamos com meia-porção! 😊\nPara mais detalhes, nossos garçons poderão te orientar na sua visita.\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    sinal: `Não cobramos nenhum sinal para reservas! 😊\nPedimos apenas que chegue até as 19h30 para confirmar sua mesa presencialmente.\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    semReserva: `Sim! Sempre tentamos acomodar nossos clientes, mesmo sem reserva. 😊\n⚠️ Lembrando que a disponibilidade depende do movimento do dia. Para garantir o seu lugar, recomendamos fazer uma reserva!\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    espera: `O tempo de espera varia de acordo com o movimento do dia. 😊\nPara garantir sua mesa e evitar espera, recomendamos fazer uma reserva!\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    bolo: `Sim, pode trazer seu bolo! 🎂😊\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    decoracao: `No momento não oferecemos serviço de decoração, mas você pode trazer sua própria decoração! 🎉\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    wifi: `Infelizmente não temos WiFi disponível. 😊\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    fumantes: `Sim, temos espaço para fumantes! 🚬\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    cadeirante: `Infelizmente nosso espaço ainda não é totalmente acessível para cadeirantes. Pedimos desculpas pela limitação. 🙏\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    musica: `No momento não temos música ao vivo ou DJ. 😊\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    delivery: `Fazemos entregas somente pelo iFood! 🛵\nNos encontre lá e aproveite nossas opções no conforto da sua casa. 😊\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    kids: `Sim, temos área kids! 🎉\nNosso espaço é ótimo para toda a família. As crianças ficam à vontade enquanto vocês aproveitam o nosso rodízio.\n\nE vem novidade por aí! 🎉 Em breve abre o Java Kids — um espaço feito especialmente para as crianças se divertirem. Quer ficar por dentro? Segue a gente no Instagram: 👉 instagram.com/javajoespizzariakids\n\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
    pets: `Infelizmente não aceitamos animais de estimação no restaurante, por questões de higiene e segurança alimentar. 🐾\nIsso inclui cachorros, gatos, pássaros, papagaios e demais animais.\nAgradecemos a compreensão!\n\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`,
  }
};

// ─── ESTADO POR USUÁRIO ───────────────────────────────────────────────────────
const userStates = {};

function getState(phone) {
  if (!userStates[phone]) {
    userStates[phone] = { step: 'idle', reserva: {}, lastActivity: Date.now(), phone };
  }
  return userStates[phone];
}

// ─── FUNÇÕES AUXILIARES ───────────────────────────────────────────────────────

function normalize(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ').trim();
}

function has(text, ...words) {
  return words.some(w => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(text);
  });
}

function isSegunda(text) {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/\bsegunda\b/.test(lower)) return true;
  const meses = { janeiro:0, fevereiro:1, marco:2, abril:3, maio:4, junho:5, julho:6, agosto:7, setembro:8, outubro:9, novembro:10, dezembro:11 };
  const m = lower.match(/(\d{1,2})\s+de\s+([a-z]+)/);
  if (m) {
    const dia = parseInt(m[1]);
    const mes = meses[m[2]];
    if (mes !== undefined) {
      const d = new Date(new Date().getFullYear(), mes, dia);
      if (d.getDay() === 1) return true;
    }
  }
  const m2 = lower.match(/(\d{1,2})\/(\d{1,2})/);
  if (m2) {
    const d = new Date(new Date().getFullYear(), parseInt(m2[2]) - 1, parseInt(m2[1]));
    if (d.getDay() === 1) return true;
  }
  return false;
}

function extrairNome(text) {
  const explicito = text.match(/(?:nome[:\s]+|meu nome [eé]\s+)([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{2,40}?)(?:\n|,|\.?$)/i);
  if (explicito) return explicito[1].trim();
  const verbos = /^(pode|quero|sim|não|nao|oi|olá|ola|tudo|ok|obrigado|isso|claro|então|entao|gostaria|preciso|manda|queria|quero|dia|para|seria|tenho|vou|sou)\b/i;
  const numeros = /\d/;
  // Testa cada segmento (separado por vírgula ou quebra de linha)
  const segmentos = text.trim().split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  for (const seg of segmentos) {
    if (numeros.test(seg)) continue; // pula segmentos com números (telefone, data, qtd)
    const nomeMatch = seg.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{2,40})$/i);
    if (nomeMatch && !verbos.test(seg)) return nomeMatch[1].trim();
  }
  return null;
}

function normalizarMes(mes) {
  const map = {
    'janeiro':'janeiro','fevereiro':'fevereiro','marco':'março','março':'março',
    'abril':'abril','maio':'maio','junho':'junho','julho':'julho',
    'agosto':'agosto','setembro':'setembro','outubro':'outubro',
    'novembro':'novembro','dezembro':'dezembro'
  };
  return map[mes.toLowerCase()] || mes;
}

function extrairData(text) {
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const m1 = text.match(/(\d{1,2})\s+de\s+([a-záéíóúâêîôûãõç]+)/i);
  if (m1) return `${m1[1]} de ${normalizarMes(m1[2])}`;
  const m2 = text.match(/dia\s+(\d{1,2})/i);
  if (m2) return `dia ${m2[1]}`;
  const m3 = text.match(/(\d{1,2})\/(\d{1,2})/);
  if (m3) {
    const mesNome = meses[parseInt(m3[2]) - 1] || m3[2];
    return `${m3[1]} de ${mesNome}`;
  }
  const diasSemana = ['segunda','terça','quarta','quinta','sexta','sábado','domingo'];
  for (const dia of diasSemana) {
    if (text.toLowerCase().includes(dia)) return dia;
  }
  return null;
}

function extrairPessoas(text) {
  const m = text.match(/(\d+)\s*(?:pessoas?|person|pax|convidados?|adultos?)/i) ||
            text.match(/(?:somos|éramos|seremos|para)\s+(\d+)/i);
  if (m) return `${m[1]} pessoas`;
  // Aceita número sozinho em qualquer linha (ex: o cliente manda "15" numa linha)
  for (const linha of text.trim().split('\n').reverse()) {
    const num = linha.trim().match(/^(\d+)$/);
    if (num) {
      const n = parseInt(num[1]);
      if (n >= 1 && n <= 100) return `${n} pessoas`;
    }
  }
  return null;
}

function verificarFAQ(msg) {
  if (has(msg, 'pix', 'cartao', 'pagamento', 'credito', 'debito', 'vr', 'va', 'vale refeicao', 'vale alimentacao')) return SCRIPTS.faq.pagamento;
  if (has(msg, 'vegetariano', 'vegano', 'vegetariana', 'vegana')) return SCRIPTS.faq.vegetariano;
  if (has(msg, 'gluten', 'lactose', 'intolerante')) return SCRIPTS.faq.glutenLactose;
  if (has(msg, 'meia porcao', 'meia-porcao', 'metade')) return SCRIPTS.faq.meiaPorte;
  if (has(msg, 'sinal', 'deposito', 'pagar para reservar')) return SCRIPTS.faq.sinal;
  if (has(msg, 'sem reserva', 'sem marcar', 'chegar sem')) return SCRIPTS.faq.semReserva;
  if (has(msg, 'espera', 'fila', 'esperar')) return SCRIPTS.faq.espera;
  if (has(msg, 'bolo', 'docinho', 'trazer bolo')) return SCRIPTS.faq.bolo;
  if (has(msg, 'decoracao', 'enfeite', 'balao', 'decorar')) return SCRIPTS.faq.decoracao;
  if (has(msg, 'wifi', 'internet', 'senha wifi')) return SCRIPTS.faq.wifi;
  if (has(msg, 'fumante', 'fumar', 'cigarro')) return SCRIPTS.faq.fumantes;
  if (has(msg, 'cadeirante', 'acessivel', 'acessibilidade', 'cadeira de rodas')) return SCRIPTS.faq.cadeirante;
  if (has(msg, 'musica ao vivo', 'banda', 'dj', 'show')) return SCRIPTS.faq.musica;
  if (has(msg, 'delivery', 'entrega', 'ifood', 'entregar', 'entregam', 'motoboy', 'rappi', 'uber eats', 'ubereats', 'retirada', 'retirar', 'buscar', 'pedir online', 'pedir pelo app', 'aplicativo', 'leva', 'levar', 'tele entrega', 'teleentrega', 'em casa')) return SCRIPTS.faq.delivery;
  if (has(msg, 'foto', 'fotos', 'video', 'videos', 'ver o espaco', 'como e o espaco', 'como e o salao', 'ver o salao', 'ver o ambiente', 'como e o ambiente', 'mostra o espaco', 'mostra o salao')) {
    return `Claro! Olha como é nosso espaço e nossa área kids! 😍🍕\n\nhttps://youtu.be/L1_fNXLwJHQ\n\nQualquer dúvida é só chamar.\n0 - Voltar ao menu principal`;
  }
  if (has(msg, 'kids', 'crianca', 'criancas', 'area infantil', 'filho', 'filhos', 'bebe', 'bebes')) {
    return `Sim, temos área kids! 🎉\nNosso espaço é ótimo para toda a família. As crianças ficam à vontade enquanto vocês aproveitam o nosso rodízio.\n\nVeja nosso espaço e área kids aqui 👇\nhttps://youtu.be/L1_fNXLwJHQ\n\nE vem novidade por aí! 🎉 Em breve abre o Java Kids — um espaço feito especialmente para as crianças se divertirem. Quer ficar por dentro? Segue a gente no Instagram: 👉 instagram.com/javajoespizzariakids\n\nPosso te ajudar com mais alguma coisa?\n0 - Voltar ao menu principal`;
  }
  if (has(msg, 'cachorro', 'gato', 'pet', 'animal', 'bicho', 'cao', 'dog', 'papagaio', 'passaro', 'ave', 'felino', 'canino', 'hamster', 'coelho', 'reptil', 'cobra', 'lagarto', 'tartaruga', 'roedor', 'porquinho')) return SCRIPTS.faq.pets;
  return null;
}

function getPendingQuestion(state) {
  if (state.step === 'reserva_aguarda_nome') return 'Qual é o seu nome completo? 😊';
  if (state.step === 'reserva_aguarda_data') return 'Qual a data desejada para a reserva?';
  if (state.step === 'reserva_aguarda_pessoas') return 'Para quantas pessoas será a reserva?';
  if (state.step === 'reserva_dados') return 'Pode me enviar: nome, data e quantidade de pessoas para a reserva.';
  return null;
}

function avancarReserva(state) {
  const { nome, data, pessoas } = state.reserva;
  if (!nome) { state.step = 'reserva_aguarda_nome'; return 'Qual é o seu nome completo? 😊\n_(Digite 0 para voltar ao menu principal)_'; }
  if (!data) { state.step = 'reserva_aguarda_data'; return 'Qual a data desejada para a reserva?\n_(Digite 0 para voltar ao menu principal)_'; }
  if (!pessoas) { state.step = 'reserva_aguarda_pessoas'; return 'Para quantas pessoas será a reserva?\n_(Digite 0 para voltar ao menu principal)_'; }
  const qtd = parseInt(pessoas);
  if (!isNaN(qtd) && qtd < 4) { state.step = 'menu'; return SCRIPTS.minimoNaoAtingido; }
  if (!isNaN(qtd) && qtd > 50) { state.step = 'menu'; return SCRIPTS.maximoUltrapassado; }
  const dataISO = converterDataParaISO(data);
  if (dataISO) {
    const dataReserva = new Date(dataISO + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    if (dataReserva < hoje) {
      state.step = 'reserva_aguarda_data';
      state.reserva = { ...state.reserva, data: null };
      return `Ops! 😅 A data *${data}* já passou.\nPor favor, informe uma data futura para sua reserva.\n_(Digite 0 para voltar ao menu principal)_`;
    }
  }
  state.step = 'reserva_confirm';
  return SCRIPTS.op3_confirmar(nome, data, pessoas);
}

function rotearMenuNumero(msg, state) {
  if (msg === '0') { state.step = 'menu'; state.reserva = {}; state.alteracao = {}; return SCRIPTS.boasVindas; }
  if (msg === '1') { state.step = 'menu'; return SCRIPTS.op1; }
  if (msg === '2') { state.step = 'menu'; return SCRIPTS.op2; }
  if (msg === '3') { state.step = 'reserva_dados'; state.reserva = {}; return SCRIPTS.op3_info; }
  if (msg === '4') { state.step = 'menu'; return SCRIPTS.op4; }
  if (msg === '5') { state.step = 'menu'; return SCRIPTS.op5; }
  if (msg === '6') { state.step = 'alterar_dados'; state.alteracao = {}; return `Para alterar sua reserva, me informe em uma mensagem:\n• Seu nome completo\n• Data da reserva\n• Nova quantidade de pessoas`; }
  if (msg === '7') { state.step = 'atendente_humano'; state.humanoAssumiuAt = Date.now(); return SCRIPTS.atendente; }

  return null;
}

// ─── SUPABASE ────────────────────────────────────────────────────────────────

function converterDataParaISO(dataStr) {
  if (!dataStr) return null;
  const meses = {
    'janeiro':'01','fevereiro':'02','marco':'03','março':'03',
    'abril':'04','maio':'05','junho':'06','julho':'07',
    'agosto':'08','setembro':'09','outubro':'10','novembro':'11','dezembro':'12'
  };
  const ano = new Date().getFullYear();
  const normalizado = dataStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // "31 de março" ou "31 de marco"
  const m1 = normalizado.match(/(\d{1,2})\s+de\s+([a-z]+)/);
  if (m1) {
    const mes = meses[m1[2]];
    if (mes) return `${ano}-${mes}-${m1[1].padStart(2, '0')}`;
  }
  // "31/03"
  const m2 = normalizado.match(/(\d{1,2})\/(\d{1,2})/);
  if (m2) return `${ano}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  // "dia 31" — assume mês atual
  const m3 = normalizado.match(/dia\s+(\d{1,2})/);
  if (m3) {
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}-${m3[1].padStart(2, '0')}`;
  }
  return null;
}

async function verificarDisponibilidade(dataISO, pessoasNova) {
  try {
    const resp = await axios.get(
      `${SUPABASE_URL}/rest/v1/reservas?data=eq.${dataISO}&select=pessoas`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const totalAtual = resp.data.reduce((sum, r) => sum + (r.pessoas || 0), 0);
    const vagasRestantes = 100 - totalAtual;
    return { disponivel: (totalAtual + pessoasNova) <= 100, vagasRestantes };
  } catch (err) {
    console.error('Erro ao verificar disponibilidade:', err.message);
    return { disponivel: true, vagasRestantes: 100 };
  }
}

async function salvarReservaSupabase(nome, whatsapp, dataISO, pessoas) {
  try {
    await axios.post(
      `${SUPABASE_URL}/rest/v1/reservas`,
      { nome, whatsapp, data: dataISO, pessoas: parseInt(pessoas), obs: '' },
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      }
    );
    console.log(`[${new Date().toLocaleTimeString()}] 📋 Reserva salva no Supabase: ${nome} | ${dataISO} | ${pessoas} pessoas`);
    return true;
  } catch (err) {
    console.error('Erro ao salvar reserva no Supabase:', err.response?.data || err.message);
    return false;
  }
}

async function buscarReserva(nome, dataISO) {
  try {
    const resp = await axios.get(
      `${SUPABASE_URL}/rest/v1/reservas?data=eq.${dataISO}&select=id,nome,data,pessoas`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (!resp.data || resp.data.length === 0) return null;
    const nomeNorm = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const match = resp.data.find(r => {
      const rNorm = r.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return rNorm.includes(nomeNorm) || nomeNorm.includes(rNorm) || rNorm.split(' ')[0] === nomeNorm.split(' ')[0];
    });
    return match || null;
  } catch (err) {
    console.error('Erro ao buscar reserva:', err.message);
    return null;
  }
}

async function atualizarReserva(id, novasPessoas) {
  try {
    await axios.patch(
      `${SUPABASE_URL}/rest/v1/reservas?id=eq.${id}`,
      { pessoas: novasPessoas },
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' } }
    );
    console.log(`[${new Date().toLocaleTimeString()}] ✏️ Reserva ${id} atualizada: ${novasPessoas} pessoas`);
    return true;
  } catch (err) {
    console.error('Erro ao atualizar reserva:', err.response?.data || err.message);
    return false;
  }
}

async function verificarDisponibilidadeAlteracao(dataISO, pessoasAntigas, pessoasNovas) {
  try {
    const resp = await axios.get(
      `${SUPABASE_URL}/rest/v1/reservas?data=eq.${dataISO}&select=pessoas`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const totalAtual = resp.data.reduce((sum, r) => sum + (r.pessoas || 0), 0);
    const totalNovo = totalAtual - pessoasAntigas + pessoasNovas;
    const vagasRestantes = 100 - totalAtual + pessoasAntigas;
    return { disponivel: totalNovo <= 100, vagasRestantes };
  } catch (err) {
    console.error('Erro ao verificar disponibilidade:', err.message);
    return { disponivel: true, vagasRestantes: 100 };
  }
}

// ─── BOT ─────────────────────────────────────────────────────────────────────

async function getBotReply(userMsg, state) {
  const msg = normalize(userMsg);

  // Opção 0: volta ao menu — mas não interrompe atendimento humano
  if (msg === '0' && state.step !== 'atendente_humano' && state.step !== 'humano_ativo') {
    state.step = 'menu';
    state.reserva = {};
    state.alteracao = {};
    return SCRIPTS.boasVindas;
  }

  // Bot silencioso durante atendimento humano
  if (state.step === 'atendente_humano' || state.step === 'humano_ativo') {
    if (Date.now() - (state.humanoAssumiuAt || 0) < 30 * 60 * 1000) return null;
    // 30 min passaram — bot retoma
    state.step = 'menu';
    state.humanoAssumiuAt = null;
  }

  // Fluxo de alteração de reserva (tudo em uma mensagem)
  if (state.step === 'alterar_dados') {
    const nome = extrairNome(userMsg) || userMsg.trim();
    const data = extrairData(userMsg);
    const pessoas = extrairPessoas(userMsg);
    const dataISO = converterDataParaISO(data);

    // Tenta alterar silenciosamente se tiver todas as infos
    if (dataISO && pessoas) {
      const novas = parseInt(pessoas);
      const reserva = await buscarReserva(nome, dataISO);
      if (reserva && novas >= 4 && novas <= 50) {
        const { disponivel } = await verificarDisponibilidadeAlteracao(dataISO, reserva.pessoas, novas);
        if (disponivel) {
          await atualizarReserva(reserva.id, novas);
          console.log(`[${new Date().toLocaleTimeString()}] ✏️ Alteração silenciosa: ${reserva.nome} | ${dataISO} | ${novas} pessoas`);
        }
      }
    }

    // Independente do resultado, direciona para atendente
    state.step = 'atendente_humano';
    state.humanoAssumiuAt = Date.now();
    state.alteracao = {};
    return `Ok, em breve um dos nossos atendentes irá te atender para confirmar sua alteração.\nObrigada pelo contato! 😊`;
  }

  // Escape de fluxo de reserva via número de menu
  const emFluxoReserva = ['reserva_dados', 'reserva_aguarda_nome', 'reserva_aguarda_data', 'reserva_aguarda_pessoas'].includes(state.step);
  if (emFluxoReserva) {
    const menuResp = rotearMenuNumero(msg, state);
    if (menuResp) { state.reserva = {}; return menuResp; }
  }

  // Confirmação da reserva
  if (state.step === 'reserva_confirm') {
    if (msg === '1' || has(msg, 'sim', 'confirmar', 'ok', 'pode', 'isso')) {
      if (state.reserva.data && isSegunda(state.reserva.data)) {
        state.step = 'reserva_aguarda_data';
        state.reserva = { ...state.reserva, data: null, _segunda: false };
        return SCRIPTS.diaFechado;
      }

      const dataISO = converterDataParaISO(state.reserva.data);
      const qtd = parseInt(state.reserva.pessoas);
      const dataNome = state.reserva.data;

      if (dataISO && !isNaN(qtd)) {
        const { disponivel, vagasRestantes } = await verificarDisponibilidade(dataISO, qtd);
        if (!disponivel) {
          state.step = 'reserva_aguarda_data';
          state.reserva = { ...state.reserva, data: null };
          if (vagasRestantes > 0) {
            return `Que pena! 😕 A data *${dataNome}* só tem *${vagasRestantes} vagas* disponíveis e você pediu ${qtd} pessoas.\n\nVou te direcionar para um atendente humano que poderá te ajudar a encontrar a melhor solução! 👋\n\nOu se preferir, escolha outra data para sua reserva.\n_(Digite 0 para voltar ao menu principal)_`;
          }
          return `Que pena! 😕 A data *${dataNome}* já está com lotação esgotada.\n\nVou te direcionar para um atendente humano que poderá te ajudar a encontrar a melhor solução! 👋\n\nOu se preferir, escolha outra data para sua reserva.\n_(Digite 0 para voltar ao menu principal)_`;
        }
      }

      // Salva no Supabase
      if (dataISO) {
        await salvarReservaSupabase(state.reserva.nome, state.phone, dataISO, qtd);
      }

      state.step = 'menu';
      state.reserva = {};
      return SCRIPTS.op3_confirmado;
    }
    if (msg === '2' || has(msg, 'alterar', 'mudar', 'corrigir', 'nao')) {
      state.step = 'reserva_dados';
      state.reserva = {};
      return 'Claro! Me informe novamente os dados corretos:\n• Seu nome completo\n• Data desejada\n• Quantidade de pessoas\n_(Digite 0 para voltar ao menu principal)_';
    }
    // Mudança de assunto durante confirmação
    const faqConfirm = verificarFAQ(msg);
    if (faqConfirm) {
      return faqConfirm + `\n\n---\n💬 Ainda na sua reserva: responda 1 para confirmar ou 2 para alterar.`;
    }
  }

  // Aguardando nome
  if (state.step === 'reserva_aguarda_nome') {
    const faq = verificarFAQ(msg);
    if (faq) return faq + `\n\n---\n💬 Continuando sua reserva: ${getPendingQuestion(state)}`;
    const nome = extrairNome(userMsg) || userMsg.trim();
    const data = extrairData(userMsg) || state.reserva.data || null;
    const pessoas = extrairPessoas(userMsg) || state.reserva.pessoas || null;
    state.reserva = { ...state.reserva, nome, data, pessoas };
    return avancarReserva(state);
  }

  // Aguardando data
  if (state.step === 'reserva_aguarda_data') {
    const faq = verificarFAQ(msg);
    if (faq) return faq + `\n\n---\n💬 Continuando sua reserva: ${getPendingQuestion(state)}`;
    if (isSegunda(userMsg)) {
      state.step = 'reserva_aguarda_data';
      return SCRIPTS.diaFechado;
    }
    const data = extrairData(userMsg) || userMsg.trim();
    const pessoas = extrairPessoas(userMsg) || state.reserva.pessoas || null;
    state.reserva = { ...state.reserva, data, pessoas, _segunda: false };
    return avancarReserva(state);
  }

  // Aguardando quantidade de pessoas
  if (state.step === 'reserva_aguarda_pessoas') {
    const faq = verificarFAQ(msg);
    if (faq) return faq + `\n\n---\n💬 Continuando sua reserva: ${getPendingQuestion(state)}`;
    const p = extrairPessoas(userMsg) || userMsg.trim();
    state.reserva = { ...state.reserva, pessoas: p };
    return avancarReserva(state);
  }

  // Recebendo dados da reserva (entrada inicial)
  if (state.step === 'reserva_dados') {
    const faqReserva = verificarFAQ(msg);
    if (faqReserva) return faqReserva + `\n\n---\n💬 Continuando sua reserva: ${getPendingQuestion(state)}`;
    const nome = extrairNome(userMsg) || state.reserva.nome || null;
    const data = extrairData(userMsg) || state.reserva.data || null;
    const pessoas = extrairPessoas(userMsg) || state.reserva.pessoas || null;
    const _segunda = isSegunda(userMsg);
    if (_segunda) {
      state.reserva = { nome, data: null, pessoas, _segunda: true };
      state.step = 'reserva_aguarda_data';
      return SCRIPTS.diaFechado;
    }
    state.reserva = { nome, data, pessoas, _segunda: false };
    return avancarReserva(state);
  }

  // Cancelamento
  if (state.step === 'cancelar_dados') {
    state.step = 'menu';
    return SCRIPTS.cancelar_confirmado;
  }

  const faqResp = verificarFAQ(msg);
  if (faqResp) return faqResp;

  const menuNumero = rotearMenuNumero(msg, state);
  if (menuNumero) return menuNumero;

  if (has(msg, 'nosso espaco', 'espaco', 'ambiente', 'salao', 'capacidade', 'estrutura')) { state.step = 'menu'; return SCRIPTS.op1; }
  if (has(msg, 'valores', 'horario', 'funcionamento', 'que horas', 'abre', 'fecha', 'preco', 'valor', 'quanto custa', 'caro', 'barato', 'cobram', 'cobra', 'custa', 'investimento', 'taxa', 'tarifa', 'mensalidade', 'preco do rodizio', 'quanto e')) { state.step = 'menu'; return SCRIPTS.op2; }
  if (has(msg, 'reserva', 'reservar', 'fazer reserva', 'quero reserva')) { state.step = 'reserva_dados'; state.reserva = {}; return SCRIPTS.op3_info; }
  if (has(msg, 'localizacao', 'endereco', 'onde fica', 'como chegar', 'maps', 'mapa')) { state.step = 'menu'; return SCRIPTS.op4; }
  if (has(msg, 'rodizio', 'a la carte', 'cardapio', 'sabores', 'pizza', 'massa', 'tamanho')) { state.step = 'menu'; return SCRIPTS.op5; }

  if (has(msg, 'cancelar', 'cancelamento', 'desmarcar', 'desistir')) {
    state.step = 'cancelar_dados';
    return SCRIPTS.cancelar_solicitar;
  }

  if (has(msg, 'atendente', 'humano', 'pessoa real', 'falar com alguem', 'atendimento humano')) {
    state.step = 'atendente_humano';
    state.humanoAssumiuAt = Date.now();
    return SCRIPTS.atendente;
  }

  if (has(msg, 'alterar reserva', 'mudar reserva', 'aumentar reserva', 'alterar minha reserva')) {
    state.step = 'alterar_dados';
    state.alteracao = {};
    return `Para alterar sua reserva, me informe em uma mensagem:\n• Seu nome completo\n• Data da reserva\n• Nova quantidade de pessoas`;
  }

  if (has(msg, 'duvida', 'pergunta', 'quero saber', 'pode me ajudar', 'me ajuda', 'preciso de ajuda', 'ajuda')) {
    state.step = 'menu';
    return SCRIPTS.menuOpcoes;
  }

  if (has(msg, 'oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'hello', 'boas')) {
    state.step = 'menu';
    return SCRIPTS.boasVindas;
  }

  if (has(msg, 'obrigado', 'obrigada', 'valeu', 'muito obrigado', 'muito obrigada', 'ate logo', 'tchau', 'ate mais', 'flw', 'fui', 'ate breve', 'ate', 'foi otimo', 'foi otima', 'era isso', 'era tudo', 'consegui', 'resolvido', 'perfeito obrigado', 'perfeito obrigada', 'ok obrigado', 'ok obrigada')) {
    state.step = 'menu';
    return `De nada! 😊 Foi um prazer te atender!\nSe precisar de mais alguma coisa, é só chamar. Te esperamos no Java Joe's! 🍕`;
  }

  if (state.step === 'idle') {
    state.step = 'menu';
    return SCRIPTS.boasVindas;
  }

  // Bot não sabe responder — silencioso, encaminha para humano
  state.step = 'atendente_humano';
  state.humanoAssumiuAt = Date.now();
  return null;
}

// ─── ENVIAR MENSAGEM VIA Z-API ─────────────────────────────────────────────────

async function enviarMensagem(phone, message) {
  try {
    await axios.post(`${ZAPI_URL}/send-text`, {
      phone,
      message
    }, {
      headers: { 'Client-Token': CLIENT_TOKEN }
    });
    ultimasRespostas[phone] = message;
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Enviado para ${phone}`);
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Erro ao enviar para ${phone}:`, err.response?.data || err.message);
  }
}

const DONO_PHONE = '5521973020782';

async function notificarDono(mensagem) {
  try {
    await axios.post(`${ZAPI_URL}/send-text`, {
      phone: DONO_PHONE,
      message: mensagem
    }, { headers: { 'Client-Token': CLIENT_TOKEN } });
  } catch (err) {
    console.error('Erro ao notificar dono:', err.message);
  }
}

async function enviarVideo(phone, videoUrl, caption = '') {
  try {
    await axios.post(`${ZAPI_URL}/send-video`, {
      phone,
      video: videoUrl,
      caption
    }, {
      headers: { 'Client-Token': CLIENT_TOKEN }
    });
    console.log(`[${new Date().toLocaleTimeString()}] 🎥 Vídeo enviado para ${phone}`);
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Erro ao enviar vídeo para ${phone}:`, err.response?.data || err.message);
  }
}

// ─── LEMBRETE DE RESERVA — ENVIO DIÁRIO ÀS 12H ────────────────────────────────

function horarioBrasil() {
  // Railway roda em UTC — Brasil é UTC-3
  const agora = new Date();
  agora.setHours(agora.getHours() - 3);
  return agora;
}

function saudacaoPorHorario() {
  const hora = horarioBrasil().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

async function enviarLembretesReserva() {
  try {
    const amanha = horarioBrasil();
    amanha.setDate(amanha.getDate() + 1);
    const dataISO = amanha.toISOString().split('T')[0];

    const resp = await axios.get(
      `${SUPABASE_URL}/rest/v1/reservas?data=eq.${dataISO}&select=nome,whatsapp,pessoas`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );

    const reservas = resp.data || [];
    console.log(`[${new Date().toLocaleTimeString()}] 📅 Lembretes: ${reservas.length} reserva(s) para amanhã`);

    for (const r of reservas) {
      if (!r.whatsapp) continue;
      const primeiroNome = (r.nome || '').split(' ')[0];
      const saudacao = saudacaoPorHorario();
      const msg = `Olá, ${primeiroNome}! ${saudacao} 😊\n\nAmanhã você tem uma reserva conosco para *${r.pessoas} ${r.pessoas === 1 ? 'pessoa' : 'pessoas'}*.\n\nEstamos te aguardando!\nSejam todos bem-vindos. 🍕`;
      await enviarMensagem(r.whatsapp, msg);
      await notificarDono(`🔔 Lembrete enviado para *${r.nome}* (${r.whatsapp})`);
      await new Promise(res => setTimeout(res, 2000)); // pausa entre envios
    }
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Erro ao enviar lembretes:`, err.message);
  }
}

// Verifica a cada 30s se é hora de enviar (10:00 horário Brasil)
let lembreteEnviadoHoje = null;
setInterval(() => {
  const agora = horarioBrasil();
  const hoje = agora.toDateString();
  const hora = agora.getHours();
  const min = agora.getMinutes();
  if (hora === 10 && min < 5 && lembreteEnviadoHoje !== hoje) {
    lembreteEnviadoHoje = hoje;
    enviarLembretesReserva();
  }
}, 30 * 1000);

// ─── TIMER — RETORNO DO BOT APÓS 30 MIN DE ATENDIMENTO HUMANO ─────────────────

const INATIVIDADE_MS = 30 * 60 * 1000;

const VINTE_QUATRO_HORAS = 24 * 60 * 60 * 1000;
const STEPS_RESERVA = ['reserva_dados', 'reserva_aguarda_nome', 'reserva_aguarda_data', 'reserva_aguarda_pessoas', 'reserva_confirm', 'cancelar_dados', 'alterar_dados'];

setInterval(() => {
  const agora = Date.now();
  for (const [phone, state] of Object.entries(userStates)) {
    // Fix 3: retorna silenciosamente após 30 min de atendimento humano
    if ((state.step === 'humano_ativo' || state.step === 'atendente_humano') && state.humanoAssumiuAt) {
      if (agora - state.humanoAssumiuAt >= INATIVIDADE_MS) {
        state.step = 'menu';
        state.humanoAssumiuAt = null;
        console.log(`[${new Date().toLocaleTimeString()}] 🤖 Bot retomou silenciosamente com ${phone}`);
      }
    }
    // Fix 4: limpa estado de reserva parado há mais de 24h
    if (STEPS_RESERVA.includes(state.step) && agora - state.lastActivity > VINTE_QUATRO_HORAS) {
      state.step = 'menu';
      state.reserva = {};
      state.alteracao = {};
      console.log(`[${new Date().toLocaleTimeString()}] 🧹 Estado antigo limpo para ${phone}`);
    }
  }
}, 60 * 1000);

// ─── WEBHOOK ──────────────────────────────────────────────────────────────────

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  const body = req.body;

  if (body?.isStatusReply) return;

  // Detectar quando humano assume a conversa (mensagem enviada pelo dono)
  if (body?.fromMe || body?.message?.fromMe) {
    const phoneAlvo = body?.phone || body?.message?.phone;
    if (phoneAlvo && userStates[phoneAlvo]) {
      userStates[phoneAlvo].step = 'humano_ativo';
      userStates[phoneAlvo].humanoAssumiuAt = Date.now();
      console.log(`[${new Date().toLocaleTimeString()}] 👤 Humano assumiu conversa com ${phoneAlvo}`);
    }
    return;
  }

  const phone = body?.phone || body?.message?.phone;
  const text = body?.message?.text?.message || body?.text?.message || body?.text;

  if (!phone || !text) return;

  console.log(`[${new Date().toLocaleTimeString()}] 📩 ${phone}: ${text}`);

  const state = getState(phone);
  state.lastActivity = Date.now();
  state.phone = phone;

  // Fix 2: debounce — aguarda 2s e responde só à última mensagem
  if (state._debounce) clearTimeout(state._debounce);
  state._debounce = setTimeout(async () => {
    state._debounce = null;
    const stepAntes = state.step;
    const reply = await getBotReply(state._ultimaMsg || text, state);
    state._ultimaMsg = null;
    if (reply && typeof reply === 'object' && reply.video) {
      await enviarMensagem(phone, reply.texto);
      await enviarVideo(phone, reply.video);
    } else if (reply) {
      await enviarMensagem(phone, reply);
    }
    if (stepAntes !== 'atendente_humano' && stepAntes !== 'humano_ativo' && state.step === 'atendente_humano') {
      await notificarDono(`👤 Cliente encaminhado para atendimento humano\nNúmero: *${phone}*`);
    }
  }, 2000);
  state._ultimaMsg = text;
});

app.get('/testar-lembrete', async (req, res) => {
  try {
    const amanha = horarioBrasil();
    amanha.setDate(amanha.getDate() + 1);
    const dataISO = amanha.toISOString().split('T')[0];

    const resp = await axios.get(
      `${SUPABASE_URL}/rest/v1/reservas?data=eq.${dataISO}&select=nome,whatsapp,pessoas`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );

    const reservas = resp.data || [];
    const info = reservas.map(r => ({ nome: r.nome, whatsapp: r.whatsapp, pessoas: r.pessoas }));

    if (reservas.length === 0) {
      return res.json({ dataConsultada: dataISO, reservas: 0, msg: 'Nenhuma reserva encontrada para amanhã.' });
    }

    await enviarLembretesReserva();
    res.json({ dataConsultada: dataISO, reservas: info, msg: '✅ Mensagens enviadas!' });
  } catch (err) {
    res.json({ erro: err.message });
  }
});

app.get('/ultima-resposta/:phone', (req, res) => {
  res.json({ msg: ultimasRespostas[req.params.phone] || null });
});

app.post('/reset-test/:phone', (req, res) => {
  delete userStates[req.params.phone];
  delete ultimasRespostas[req.params.phone];
  res.json({ ok: true });
});

app.get('/', (_req, res) => {
  res.send('🍕 Java Joe\'s Bot — Servidor rodando!');
});

// ─── INICIAR ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🍕 Java Joe's Bot iniciado!`);
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🔗 Instance: ${INSTANCE_ID}`);
  console.log(`\nAguardando mensagens...\n`);
});
