-- Add filter parameter so SupabaseVectorStore can call match_chunks without error.
-- The filter is accepted but not applied — RLS already scopes results to auth.uid().
create or replace function match_chunks(
  query_embedding vector(3072),
  match_count int default 5,
  filter jsonb default '{}'
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
