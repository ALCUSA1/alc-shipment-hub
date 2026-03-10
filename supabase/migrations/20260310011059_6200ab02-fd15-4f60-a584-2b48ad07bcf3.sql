ALTER TABLE public.conversations ADD COLUMN scope text NOT NULL DEFAULT 'external';

-- Backfill: mark conversations as 'internal' where all participants share the same company_name
UPDATE public.conversations c
SET scope = 'internal'
WHERE (
  SELECT COUNT(DISTINCT cp.company_name) 
  FROM public.conversation_participants cp 
  WHERE cp.conversation_id = c.id
) = 1
AND (
  SELECT COUNT(*) 
  FROM public.conversation_participants cp 
  WHERE cp.conversation_id = c.id
) > 1;