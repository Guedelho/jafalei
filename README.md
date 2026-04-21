# jafalei

"Já falei" — assistente de perguntas e respostas para secretária, alimentado por RAG sobre documentos carregados.

## Setup

### 1. Variáveis de ambiente

```bash
cp .env.example .env.local
# Preencher os 4 valores em .env.local
```

| Variável                        | Onde obter                        |
| ------------------------------- | --------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase → Project Settings → API |
| `GOOGLE_GENERATIVE_AI_API_KEY`  | Google AI Studio → API Keys       |

### 2. Banco de dados

No Supabase Dashboard:

1. Database → Extensions → habilitar **vector**
2. SQL Editor → colar e executar `supabase/migrations/0001_init.sql`
3. Authentication → Settings → desabilitar confirmação de email
4. Authentication → Users → criar conta da secretária

### 3. Desenvolvimento local

```bash
npm install
npm run dev
# Abrir http://localhost:3000
```

## Uso

- **Login**: acessar com as credenciais criadas no Supabase
- **Documentos** (`/documents`): fazer upload de PDFs, TXTs ou DOCXs com as informações relevantes
- **Chat** (`/chat`): fazer perguntas sobre o conteúdo dos documentos

## Deploy (Vercel)

```bash
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GOOGLE_GENERATIVE_AI_API_KEY
vercel --prod
```
