-- Enable pgvector
create extension if not exists vector;

-- Documents (uploaded files)
create table documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  mime_type  text,
  created_at timestamptz default now()
);

-- Document chunks with embeddings
-- Dimension matches EMBED_MODEL in shared/constants.ts
-- gemini-embedding-exp-03-07 → 3072 dims
-- text-embedding-004          → 768 dims
create table document_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  content     text not null,
  embedding   vector(3072),
  chunk_index integer not null
);

-- Chat sessions
create table chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Messages
create table messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz default now()
);

-- Indexes
create index on documents (user_id);
create index on document_chunks (document_id);
create index on chat_sessions (user_id);
create index on messages (session_id);
create index on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Row Level Security
alter table documents       enable row level security;
alter table document_chunks enable row level security;
alter table chat_sessions   enable row level security;
alter table messages        enable row level security;

create policy "own" on documents
  for all to authenticated using ((select auth.uid()) = user_id);

create policy "own" on chat_sessions
  for all to authenticated using ((select auth.uid()) = user_id);

create policy "own" on document_chunks
  for all to authenticated using (
    document_id in (select id from documents where user_id = (select auth.uid()))
  );

create policy "own" on messages
  for all to authenticated using (
    session_id in (select id from chat_sessions where user_id = (select auth.uid()))
  );

-- Similarity search function (called from lib/ai/rag.ts)
create or replace function match_chunks(
  query_embedding vector(3072),
  match_count     int default 5
)
returns table (id uuid, content text, similarity float)
language sql stable security definer
as $$
  select dc.id, dc.content, 1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where d.user_id = (select auth.uid())
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
