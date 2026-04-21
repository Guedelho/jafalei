@AGENTS.md

## Project context

**jafalei** — "já falei" — assistente de perguntas e respostas para secretária. A secretária faz perguntas em linguagem natural e o sistema responde com base nos documentos carregados pelo administrador. UI e respostas em português (pt-BR).

## Stack

- **Next.js 16 App Router** — Tailwind 4 (PostCSS-based, sem `tailwind.config.*`), Supabase SSR via `@supabase/ssr`
- **AI**: `@google/generative-ai` — `CHAT_MODEL` (gemini-3-flash-preview) para chat; `EMBED_MODEL` (gemini-embedding-exp-03-07) para embeddings RAG. Constantes em `shared/constants.ts`.
  - Streaming via `generateContentStream`. Retry com backoff exponencial em erros transientes.
- **RAG**: documentos carregados em `documents`/`document_chunks`. Query → embed → `match_chunks` RPC (pgvector) → injetar contexto no system prompt.
- **Supabase Postgres** (sa-east-1) + pgvector. RLS em todas as tabelas com `(select auth.uid()) = user_id` para role `authenticated`. Service role em todas as queries server-side.
- **Auth**: Supabase Auth via cookies (SSR). `proxy.ts` sincroniza sessão e redireciona para `/login`. Rotas da API usam `getUserId()` de `@/lib/supabase/auth`.
- **Deployment**: Vercel. Use `vercel --prod` para deploy manual.

## Estrutura de pastas

```
src/
  proxy.ts                # middleware Next.js 16 (auth guard)
  shared/
    constants.ts          # CHAT_MODEL, EMBED_MODEL, EMBED_DIMS, limites
    models.ts             # tipos: Document, Message, ChatSession, SseEvent
  lib/
    supabase/
      server.ts           # createClient() — SSR com cookies
      admin.ts            # createAdmin() — service role
      auth.ts             # getUserId()
    ai/
      genai.ts            # singleton GoogleGenerativeAI
      embed.ts            # embedText(text) → number[]
      rag.ts              # retrieveContext(query) → string
    api/
      chat.ts             # funções tipadas de fetch (client-side)
      documents.ts
    server-utils.ts       # checkRateLimit, recordRateLimit
  app/
    (auth)/               # grupo autenticado — layout verifica sessão
      chat/               # página principal de chat
      documents/          # upload e listagem de documentos
    api/
      chat/route.ts       # POST: RAG + SSE streaming
      documents/route.ts  # GET list, POST upload+embed
      documents/[id]/route.ts  # DELETE
      auth/logout/route.ts
    login/                # página de login
```

## Convenções de API routes

- Auth: `getUserId()` de `@/lib/supabase/auth` — somente cookie, sem Bearer manual.
- Data: `createAdmin()` — nunca o anon client no servidor.
- Rate limiting: `checkRateLimit` + `recordRateLimit` de `@/lib/server-utils`.
- Erros: `console.error` no servidor, mensagem genérica em português para o cliente. Nunca vazar detalhes internos.

## Convenções client-side

- Auth via cookies — sem headers manuais nas chamadas fetch.
- Chamadas de API: usar funções tipadas de `lib/api/` — nunca `fetch` inline em componentes.
- JSON requests: adicionar `"Content-Type": "application/json"`. FormData não precisa de header extra.

## Streaming de chat (SSE)

O endpoint `/api/chat` retorna `text/event-stream`. Cada evento: `data: <json>\n\n`.
Tipos definidos em `SseEvent` (`shared/models.ts`): `chunk | done | error`.
O cliente (`chat-interface.tsx`) lê com `ReadableStream` + `getReader()`.

## Documentos e RAG

- Formatos aceitos: PDF (`pdf-parse`), TXT, DOCX (`mammoth`).
- Chunking: ~1000 chars com ~100 chars de overlap (`CHUNK_SIZE`, `CHUNK_OVERLAP` em `constants.ts`).
- Cada chunk é embedado e inserido em `document_chunks` com o vetor e `chunk_index`.
- Na query: embed da pergunta → `match_chunks` RPC (pgvector cosine similarity) → top-5 chunks → system prompt.

## Regras

- Não adicionar comentários inline salvo lógica genuinamente não-óbvia.
- Não criar novos arquivos quando editar um existente for suficiente.
- Sem código morto. Se não é chamado, deletar.
- Dimensão do vetor (`vector(3072)`) deve bater com `EMBED_DIMS` em `constants.ts` e com a migration SQL.
