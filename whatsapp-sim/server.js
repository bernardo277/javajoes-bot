import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file manually (no dotenv dependency needed)
const __envPath = join(dirname(fileURLToPath(import.meta.url)), '.env');
if (existsSync(__envPath)) {
  readFileSync(__envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  });
}

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sua_chave_aqui') {
  console.error('\n❌ Configure sua ANTHROPIC_API_KEY no arquivo whatsapp-sim/.env\n');
  process.exit(1);
}
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Load agent files
const agentsDir = join(__dirname, '..', 'squads', 'reservas-java-joes', 'agents');
const redatorContent = readFileSync(join(agentsDir, 'redator.agent.md'), 'utf-8');
const gerenteContent = readFileSync(join(agentsDir, 'gerente-reservas.agent.md'), 'utf-8');
const analistaContent = readFileSync(join(agentsDir, 'analista.agent.md'), 'utf-8');

const SYSTEM_PROMPT = `Você é o assistente virtual do Java Joe's Pizzaria e Bistro, atendendo via WhatsApp.

Você incorpora os papéis de três agentes integrados:

## ANALISTA (identifica o tipo de mensagem)
${analistaContent}

## GERENTE DE RESERVAS (valida regras do restaurante)
${gerenteContent}

## REDATOR (escreve a resposta final)
${redatorContent}

---

## INSTRUÇÕES DE OPERAÇÃO

1. Analise a mensagem do cliente
2. Aplique as regras do restaurante se necessário
3. Responda APENAS com a mensagem final para o WhatsApp — sem explicações, sem prefixos como "Resposta:", sem formatação markdown extra
4. Use exatamente os scripts definidos no Redator, sem improviso
5. Seja conciso — respostas de WhatsApp são curtas`;

const client = new Anthropic();

// Store conversation history per session
const sessions = new Map();

app.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message and sessionId required' });
  }

  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }

  const history = sessions.get(sessionId);
  history.push({ role: 'user', content: message });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history,
    });

    const assistantMessage = response.content[0].text;
    history.push({ role: 'assistant', content: assistantMessage });

    res.json({ reply: assistantMessage });
  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ error: 'Erro ao processar mensagem' });
  }
});

app.post('/reset', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) sessions.delete(sessionId);
  res.json({ ok: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n✅ WhatsApp Simulator rodando em http://localhost:${PORT}\n`);
});
