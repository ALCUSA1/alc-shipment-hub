
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';

COMMENT ON COLUMN public.support_tickets.priority IS 'Customer-visible priority: normal, attention_needed, urgent, critical';
