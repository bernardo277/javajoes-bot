# Memórias do Squad — Automação de Reservas Java Joe's

_Este arquivo é atualizado automaticamente após cada execução do pipeline._

## Aprendizados Acumulados

### Execução 2026-03-24-022352
- **Tipo de atendimento:** Primeiro contato genérico (sem dados de reserva)
- **Ação tomada:** Exibir menu de boas-vindas com 5 opções
- **Aprovado pelo usuário:** Sim, sem ajustes
- **Aprendizado:** Mensagens genéricas de "quero fazer uma reserva" devem receber o menu padrão de boas-vindas, não tentar extrair dados incompletos

## Padrões Identificados

### Regra: Saudação sem dados → menu de boas-vindas
Qualquer mensagem que seja apenas uma saudação (ex: "oi", "olá", "boa noite", "tudo bem?") sem informações de reserva deve sempre receber o menu de boas-vindas padrão. Definido por Bernardo em 2026-03-24.

### Execução 2026-03-24 (sessão 2 — reformulação completa)
- **Menu reformulado para 5 opções:** Nosso espaço / Valores e funcionamento / Reservas / Localização / Rodízio e à la carte
- **Atendente renomeada para Giovana** (não se apresenta mais como robô)
- **Novas regras de reserva:** mínimo 4 pessoas, máximo 50, benefício aniversariante com 10+ convidados
- **Decoração permitida:** bolo, docinhos, decoração de mesa — balcão disponível no restaurante
- **Bug corrigido:** digitar número de menu durante fluxo de reserva agora escapa o fluxo corretamente via `rotearMenuNumero()`
- **Bug corrigido:** "dúvida" / "tenho uma dúvida" agora exibe o menu de opções
- **Removido:** "Ou prefere falar com um atendente humano?" de todas as mensagens
- **Aprovado por Bernardo:** sistema perfeito ✅

### Execução 2026-03-24 (simulador)
- **Bugs corrigidos no simulador WhatsApp:**
  - Reserva com dados diretos ativava FAQ de pagamento → corrigido com detecção prioritária de dados de reserva
  - Após "dia fechado", bot perdia contexto da conversa → corrigido mantendo estado `reserva_dados`
  - Bot coletava campos faltantes com `[não informado]` → corrigido para perguntar um a um
  - FAQ durante coleta de nome/pessoas era tratada como dado → corrigido com `verificarFAQ()` universal
  - `extrairNome` pegava frases como "pode ser" como nome → corrigido para exigir nome próprio ou keyword "nome:"

### Execução 2026-03-24-035617
- **Tipo de atendimento:** Reserva em dia fechado (segunda-feira, 27/04, 10 pessoas, aniversário)
- **Ação tomada:** Script "dia fechado" aplicado — informar encerramento às segundas e convidar a reagendar
- **Aprovado pelo usuário:** Sim, sem ajustes
- **Aprendizado:** Novo script adicionado ao redator para reservas em segunda-feira; simulador corrigido para detectar dia da semana automaticamente

## Casos Especiais Tratados

### 2026-03-24 — Validação completa de scripts
Todos os scripts de FAQ foram testados e aprovados por Bernardo:
- Pagamento, cardápio, reservas, eventos, estrutura e delivery ✅
- Mensagens de menu (opções 1 a 5) ✅
- Fallback para perguntas fora do escopo ✅
- FAQs: pets, área kids, WiFi, fumantes, bolo próprio, delivery iFood, entre outras ✅
