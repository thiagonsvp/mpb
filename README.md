# ⚽ Pelada App

App de gestão de peladas com sorteio de times equilibrados, controle de mensalidades e financeiro.

## Stack

- **Frontend**: React + Vite
- **Backend**: Supabase (PostgreSQL)
- **Deploy**: Vercel

---

## 1. Configurar o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto gratuito
2. No painel, vá em **SQL Editor**
3. Cole e execute o conteúdo de `supabase_schema.sql`
4. Vá em **Settings → API** e copie:
   - `Project URL`
   - `anon public key`

---

## 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:
```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

---

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

---

## 4. Deploy no Vercel

### Via GitHub (recomendado)
1. Suba o projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) → **New Project** → importe o repositório
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique em **Deploy**

### Via Vercel CLI
```bash
npm i -g vercel
vercel
# Responda as perguntas e configure as env vars quando solicitado
```

---

## Funcionalidades

### ⚽ Times
- Cadastro de jogadores com nível (1–5 estrelas) e posição
- Sorteio equilibrado (balanceado por rating) ou aleatório
- Histórico de sorteios salvo no banco

### 👥 Mensalidades
- Geração automática de cobranças para todos os jogadores ativos
- Controle por mês e status (Pendente / Pago / Atrasado)
- Marcar como pago lança receita automaticamente no financeiro

### 💰 Financeiro
- Lançamento de receitas e despesas
- Categorias: Mensalidade, Aluguel campo, Equipamento, Arbitragem, etc.
- Saldo em tempo real

---

## Estrutura do projeto

```
pelada-app/
├── src/
│   ├── lib/
│   │   └── supabase.js       # cliente Supabase
│   ├── pages/
│   │   ├── Times.jsx
│   │   ├── Mensalidades.jsx
│   │   └── Financeiro.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── supabase_schema.sql        # execute no Supabase SQL Editor
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```
